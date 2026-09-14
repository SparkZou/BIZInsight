#!/usr/bin/env bash
# Server-side deploy for companies.aicloud.co.nz, run by .github/workflows/deploy.yml
# after it has uploaded the frontend build to frontend/dist.new.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/bizinsight}"
BRANCH="${BRANCH:-master}"
SERVICE="bizinsight-api"
SUDO=""
if [ "$(id -u)" -ne 0 ]; then SUDO="sudo -n"; fi

cd "$APP_DIR"
git fetch --quiet origin "$BRANCH"
git reset --hard --quiet "origin/$BRANCH"

# Backend: dependencies, migrations, restart.
cd "$APP_DIR/backend"
[ -d venv ] || python3 -m venv venv
venv/bin/pip install --quiet --upgrade pip
venv/bin/pip install --quiet -r requirements.txt
venv/bin/alembic upgrade head
$SUDO systemctl restart "$SERVICE"

# Frontend: swap in the new build in one step so visitors never see a half-copied dist.
cd "$APP_DIR/frontend"
if [ -d dist.new ]; then
    rm -rf dist.old
    [ -d dist ] && mv dist dist.old
    mv dist.new dist
fi

for attempt in $(seq 1 15); do
    if curl -fsS http://127.0.0.1:8001/ > /dev/null; then
        echo "Deployed $(git -C "$APP_DIR" rev-parse --short HEAD); API is up."
        exit 0
    fi
    sleep 2
done
echo "API did not come up; check: journalctl -u $SERVICE -n 50" >&2
exit 1
