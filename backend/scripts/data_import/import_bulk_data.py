"""
Import Companies Office bulk data CSV files into PostgreSQL from the command line.

Run from the backend directory (DATABASE_URL is read from backend/.env):

    venv/bin/python scripts/data_import/import_bulk_data.py /path/to/csv_dir
    venv/bin/python scripts/data_import/import_bulk_data.py /path/to/csv_dir companies_director.csv

The /admin page runs the same import; app/services/bulk_import.py describes how tables are built.
"""
import argparse
import os
import sys

# Add backend directory to path to import app modules
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from app.services import bulk_import


def main() -> int:
    parser = argparse.ArgumentParser(description="Import Companies Office bulk data CSVs into PostgreSQL")
    parser.add_argument("csv_dir", help="Directory containing the unzipped bulk data CSV files")
    parser.add_argument("files", nargs="*", help="Only import these CSV file names")
    args = parser.parse_args()

    files = args.files or sorted(name for name in os.listdir(args.csv_dir) if name.lower().endswith(".csv"))
    if not files:
        print(f"No CSV files found in {args.csv_dir}")
        return 1

    failed = []
    with bulk_import.connect() as conn:
        for name in files:
            print()
            try:
                bulk_import.import_file(conn, os.path.join(args.csv_dir, name))
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
