"""
Import Companies Office bulk data CSV files into PostgreSQL.

Used by scripts/data_import/import_bulk_data.py (command line) and the /admin import page.

Each CSV becomes a table named after its file (companies_core_data.csv -> companies_core_data).
Column names are lower-cased, *_DATE columns become DATE (DD/MM/YYYY or YYYY-MM-DD) and
everything else is TEXT, so postcodes and identifiers keep their leading zeros. Each table is
built as "<name>__new" and swapped in once complete, so the site keeps serving the previous
data while a monthly refresh runs.
"""
import csv
import os
import re
import time
from typing import Callable, List

import psycopg

from app.core.config import settings

# The CSV files in the monthly Companies Office bulk data zip.
KNOWN_TABLES = {
    "charitable_trust_boards_core_data",
    "companies_abn",
    "companies_address_for_service",
    "companies_business_industry_classification",
    "companies_core_data",
    "companies_director",
    "companies_gst",
    "companies_insolvency",
    "companies_public_address",
    "companies_registered_office_address",
    "companies_shareholder",
    "companies_trading_area",
    "companies_trading_name",
    "companies_website",
    "maori_business_identifier",
    "other_incorporated_entities_core_data",
    "public_sector_entities_core_data",
    "retirement_villages_core_data",
    "unincorporated_entities_core_data",
}

# Columns the API depends on. Every other table only needs its key column (see required_columns).
REQUIRED_COLUMNS = {
    "companies_core_data": {"nzbn", "entity_name", "entity_type", "entity_status", "registration_date"},
    "companies_director": {"nzbn", "first_name", "middle_names", "last_name"},
    "retirement_villages_core_data": {"entity_number"},
}

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


def read_columns(csv_path: str) -> List[str]:
    with open(csv_path, newline="", encoding="utf-8-sig", errors="replace") as f:
        header = next(csv.reader(f))
    return [identifier(raw) or f"col_{index}" for index, raw in enumerate(header)]


def required_columns(table: str) -> set:
    return REQUIRED_COLUMNS.get(table, {"nzbn"})


def validate_csv(csv_path: str) -> List[str]:
    """Problems that would make importing this file fail or break the site; empty if it looks fine."""
    name = os.path.basename(csv_path)
    table = table_name_for(csv_path)
    if table not in KNOWN_TABLES:
        return [f"{name}: not one of the {len(KNOWN_TABLES)} Companies Office bulk data files"]
    try:
        columns = read_columns(csv_path)
    except StopIteration:
        return [f"{name}: the file is empty"]
    except csv.Error as e:
        return [f"{name}: could not read the header row ({e})"]
    missing = sorted(required_columns(table) - set(columns))
    if missing:
        return [f"{name}: missing column(s) {', '.join(column.upper() for column in missing)}"]
    return []


def connect() -> psycopg.Connection:
    """Open a connection ready for import_file."""
    # psycopg takes a plain libpq URL, without SQLAlchemy's "+psycopg" driver suffix.
    conninfo = settings.DATABASE_URL.replace("postgresql+psycopg://", "postgresql://", 1)
    conn = psycopg.connect(conninfo)
    conn.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    conn.execute(PARSE_DATE_FUNCTION)
    conn.commit()
    return conn


def import_file(conn: psycopg.Connection, csv_path: str, log: Callable[[str], None] = print) -> int:
    """Load one CSV into its table, swapping it in when complete. Returns the number of rows."""
    table = table_name_for(csv_path)
    staging, new = f"{table}__staging", f"{table}__new"
    columns = read_columns(csv_path)
    started = time.monotonic()
    log(f"{os.path.basename(csv_path)} -> {table} ({len(columns)} columns)")

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
    log(f"  [OK] {rows:,} rows in {time.monotonic() - started:.1f}s")
    return rows
