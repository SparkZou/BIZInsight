#!/usr/bin/env bash
# Import a Companies Office bulk data zip into the live companies.aicloud.co.nz database.
#
#   bash /opt/webApp/bizinsight/deploy/import-bulk-data.sh /path/to/bulk-data.zip
#
# From Windows, deploy/import-bulk-data.ps1 uploads the zip and runs this for you.
# Each table is rebuilt next to the live one and swapped in when complete, so the site
# keeps serving the previous data while the import runs.
set -euo pipefail

ZIP="${1:?usage: import-bulk-data.sh /path/to/bulk-data.zip}"
APP_DIR="${APP_DIR:-/opt/webApp/bizinsight}"
BATCH="$(date +%Y%m%d-%H%M%S)"
TARGET="$APP_DIR/data/$BATCH"

cd "$APP_DIR"
mkdir -p "$TARGET"
python3 -m zipfile -e "$ZIP" "$TARGET"

# Accept zips that wrap the CSVs in a folder.
CORE_CSV="$(find "$TARGET" -name companies_core_data.csv | head -n 1)"
if [ -z "$CORE_CSV" ]; then
    echo "companies_core_data.csv not found in $ZIP - is this the Companies Office bulk data zip?" >&2
    rm -rf "$TARGET"
    exit 1
fi
CSV_DIR="$(dirname "$CORE_CSV")"

# ./data is mounted read-only into the backend container at /data.
echo "Importing $(find "$CSV_DIR" -maxdepth 1 -name '*.csv' | wc -l) CSV files from $(basename "$ZIP") ..."
docker compose exec -T bizinsight-backend \
    python scripts/data_import/import_bulk_data.py "/data/${CSV_DIR#"$APP_DIR/data/"}" < /dev/null

# Keep only this batch of CSVs on disk.
find "$APP_DIR/data" -mindepth 1 -maxdepth 1 ! -name "$BATCH" -exec rm -rf {} +
echo "Import complete; CSVs kept in data/$BATCH"
