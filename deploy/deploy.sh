#!/usr/bin/env bash
# Server-side deploy for companies.aicloud.co.nz, run by .github/workflows/deploy.yml
# after it has uploaded the frontend build to frontend/dist.new.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/webApp/bizinsight}"
BRANCH="${BRANCH:-master}"

DOCKER="docker"
if ! docker info > /dev/null 2>&1; then DOCKER="sudo -n docker"; fi

cd "$APP_DIR"
git fetch --quiet origin "$BRANCH"
git checkout --quiet -B "$BRANCH" "origin/$BRANCH"

# Frontend: swap in the new build with renames so visitors never see a half-copied dist.
# The container mounts ./frontend, so nginx serves the new directory straight away.
if [ -d frontend/dist.new ]; then
    rm -rf frontend/dist.old
    if [ -d frontend/dist ]; then mv frontend/dist frontend/dist.old; fi
    mv frontend/dist.new frontend/dist
fi

# Backend: rebuild if needed; the container runs "alembic upgrade head" on start.
$DOCKER compose up -d --build --remove-orphans

for attempt in $(seq 1 40); do
    status="$($DOCKER inspect --format '{{.State.Health.Status}}' bizinsight-backend 2> /dev/null || echo missing)"
    if [ "$status" = "healthy" ]; then
        $DOCKER image prune -f > /dev/null
        echo "Deployed $(git rev-parse --short HEAD); bizinsight-backend is healthy."
        exit 0
    fi
    sleep 3
done

echo "bizinsight-backend did not become healthy (status: $status)" >&2
$DOCKER compose logs --tail 50 bizinsight-backend >&2
exit 1
