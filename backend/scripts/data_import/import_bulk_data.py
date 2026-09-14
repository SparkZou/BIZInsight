"""
Import Companies Office bulk data CSV files into PostgreSQL.

Run from the backend directory (DATABASE_URL is read from backend/.env):

    venv/bin/python scripts/data_import/import_bulk_data.py /path/to/csv_dir
    venv/bin/python scripts/data_import/import_bulk_data.py /path/to/csv_dir companies_director.csv

Each CSV becomes a table named after its file (companies_core_data.csv -> companies_core_data).
Column names are lower-cased, *_DATE columns become DATE (DD/MM/YYYY or YYYY-MM-DD) and
everything else is TEXT, so postcodes and identifiers keep their leading zeros. Each table is
built as "<name>__new" and swapped in once complete, so the site keeps serving the previous
data while a monthly refresh runs.
"""
import argparse
import csv
import os
import re
import sys
import time

import psycopg

# Add backend directory to path to import app modules
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from app.core.config import settings

# Trigram indexes back the ILIKE '%term%' searches in app/api/api_v1/endpoints/companies.py.
TRIGRAM_INDEXES = {
    "companies_core_data": ["entity_name", "nzbn"],
    "companies_director": ["first_name", "middle_names", "last_name"],
}

# Plain indexes for the dashboard queries; every table with an nzbn column also gets one on it.
BTREE_INDEXES = {
    "companies_core_data": ["registration_date", "entity_type"],
}

# Unparseable dates (e.g. 31/02/2020) become NULL instead of failing the whole file.
PARSE_DATE_FUNCTION = r"""
CREATE OR REPLACE FUNCTION pg_temp.parse_date(value text) RETURNS date
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
    IF value ~ '^\d{4}-\d{2}-\d{2}' THEN
        RETURN substr(value, 1, 10)::date;
    ELSIF value ~ '^\d{1,2}/\d{1,2}/\d{4}' THEN
        RETURN to_date(split_part(value, ' ', 1), 'DD/MM/YYYY');
    END IF;
    RETURN NULL;
EXCEPTION WHEN others THEN
    RETURN NULL;
END
$$;
"""


def identifier(name: str) -> str:
    """Turn a CSV header or file name into a lower-case PostgreSQL identifier."""
    cleaned = re.sub(r"[^a-z0-9_]+", "_", name.strip().lower()).strip("_")
    if cleaned and cleaned[0].isdigit():
        cleaned = f"c_{cleaned}"
    return cleaned


def quoted(name: str) -> str:
    # Names are already restricted to [a-z0-9_]; quoting only guards against reserved words.
    return f'"{name}"'


def table_name_for(csv_path: str) -> str:
    stem = identifier(os.path.splitext(os.path.basename(csv_path))[0])
    # Tolerate dated download names such as companies_core_data_2026-09.csv
    stem = re.sub(r"_\d{4}(_\d{2}){0,2}$", "", stem)
    return "companies_core_data" if stem == "companies" else stem


def read_columns(csv_path: str) -> list:
    with open(csv_path, newline="", encoding="utf-8-sig", errors="replace") as f:
        header = next(csv.reader(f))
    return [identifier(raw) or f"col_{index}" for index, raw in enumerate(header)]


def import_file(conn: psycopg.Connection, csv_path: str) -> None:
    table = table_name_for(csv_path)
    staging, new = f"{table}__staging", f"{table}__new"
    columns = read_columns(csv_path)
    started = time.monotonic()
    print(f"\n{os.path.basename(csv_path)} -> {table} ({len(columns)} columns)")

    with conn.cursor() as cur:
        cur.execute(f"DROP TABLE IF EXISTS {quoted(staging)}, {quoted(new)}")
        cur.execute(
            f"CREATE UNLOGGED TABLE {quoted(staging)} ({', '.join(f'{quoted(c)} text' for c in columns)})"
        )

        # Stream the file through COPY; decoding in Python replaces any invalid UTF-8 bytes.
        with open(csv_path, newline="", encoding="utf-8-sig", errors="replace") as f:
            with cur.copy(f"COPY {quoted(staging)} FROM STDIN WITH (FORMAT csv, HEADER true)") as copy:
                while chunk := f.read(1 << 20):
                    copy.write(chunk)

        select_list = ", ".join(
            f"pg_temp.parse_date({quoted(c)}) AS {quoted(c)}" if c.endswith("_date") else quoted(c)
            for c in columns
        )
        cur.execute(f"CREATE TABLE {quoted(new)} AS SELECT {select_list} FROM {quoted(staging)}")
        cur.execute(f"DROP TABLE {quoted(staging)}")

        # (index name, CREATE INDEX target) pairs. Indexes are built on the new table under a
        # temporary name and renamed after the swap, so names stay stable across refreshes.
        indexes = []
        if "nzbn" in columns:
            indexes.append((f"{table}_nzbn_idx", "(nzbn)"))
        for column in BTREE_INDEXES.get(table, []):
            if column in columns:
                indexes.append((f"{table}_{column}_idx", f"({quoted(column)})"))
        for column in TRIGRAM_INDEXES.get(table, []):
            if column in columns:
                indexes.append((f"{table}_{column}_trgm", f"USING gin ({quoted(column)} gin_trgm_ops)"))
        for name, target in indexes:
            cur.execute(f"CREATE INDEX {quoted(name + '__new')} ON {quoted(new)} {target}")
        cur.execute(f"ANALYZE {quoted(new)}")

        cur.execute(f"DROP TABLE IF EXISTS {quoted(table)}")
        cur.execute(f"ALTER TABLE {quoted(new)} RENAME TO {quoted(table)}")
        for name, _ in indexes:
            cur.execute(f"ALTER INDEX {quoted(name + '__new')} RENAME TO {quoted(name)}")
        rows = cur.execute(f"SELECT count(*) FROM {quoted(table)}").fetchone()[0]

    conn.commit()
    print(f"  [OK] {rows:,} rows in {time.monotonic() - started:.1f}s")


def main() -> int:
    parser = argparse.ArgumentParser(description="Import Companies Office bulk data CSVs into PostgreSQL")
    parser.add_argument("csv_dir", help="Directory containing the unzipped bulk data CSV files")
    parser.add_argument("files", nargs="*", help="Only import these CSV file names")
    args = parser.parse_args()

    files = args.files or sorted(name for name in os.listdir(args.csv_dir) if name.lower().endswith(".csv"))
    if not files:
        print(f"No CSV files found in {args.csv_dir}")
        return 1

    # psycopg takes a plain libpq URL, without SQLAlchemy's "+psycopg" driver suffix.
    conninfo = settings.DATABASE_URL.replace("postgresql+psycopg://", "postgresql://", 1)
    failed = []
    with psycopg.connect(conninfo) as conn:
        conn.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
        conn.execute(PARSE_DATE_FUNCTION)
        conn.commit()

        for name in files:
            try:
                import_file(conn, os.path.join(args.csv_dir, name))
            except Exception as e:
                conn.rollback()
                failed.append(name)
                print(f"  [ERROR] {e}")

    print(f"\nImported {len(files) - len(failed)}/{len(files)} files.")
    if failed:
        print("Failed: " + ", ".join(failed))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
