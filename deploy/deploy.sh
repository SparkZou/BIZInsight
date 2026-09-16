#!/usr/bin/env bash
# Server-side deploy for companies.aicloud.co.nz, run by .github/workflows/deploy.yml
# after it has uploaded the site build to frontend/build.new.
#
# The whole script is one function so that bash parses it completely before running any of it:
# the git checkout below may replace this very file, and bash otherwise reads a script as it goes.
set -euo pipefail

main() {
    local APP_DIR="${APP_DIR:-/opt/webApp/bizinsight}"
    local BRANCH="${BRANCH:-master}"
    local CADDYFILE="${CADDYFILE:-/opt/webApp/caddy/Caddyfile}"

    local DOCKER="docker"
    if ! docker info > /dev/null 2>&1; then DOCKER="sudo -n docker"; fi

    cd "$APP_DIR"
    git fetch --quiet origin "$BRANCH"
    git checkout --quiet -B "$BRANCH" "origin/$BRANCH"

    # Site build: swap in the new one with renames so there is never a half-copied build on disk.
    # bizinsight-web mounts ./frontend/build and is restarted below to pick it up.
    if [ -d frontend/build.new ]; then
        rm -rf frontend/build.old
        if [ -d frontend/build ]; then mv frontend/build frontend/build.old; fi
        mv frontend/build.new frontend/build
    fi

    # Rebuild images if needed (the API container runs "alembic upgrade head" on start); --remove-orphans
    # retires containers that are no longer in the compose file.
    $DOCKER compose up -d --build --remove-orphans
    # The web container only reads its build at start, so restart it after a swap.
    $DOCKER compose restart bizinsight-web

    wait_healthy() {
        local name="$1" status=""
        for attempt in $(seq 1 40); do
            status="$($DOCKER inspect --format '{{.State.Health.Status}}' "$name" 2> /dev/null || echo missing)"
            if [ "$status" = "healthy" ]; then return 0; fi
            sleep 3
        done
        echo "$name did not become healthy (status: $status)" >&2
        $DOCKER compose logs --tail 50 "$name" >&2
        return 1
    }

    wait_healthy bizinsight-backend
    wait_healthy bizinsight-web

    # One-time switch of the shared Caddy from the old nginx container to the Node site. Only the
    # upstream line of this site's block is touched; other sites in the file are left alone.
    # The Caddyfile is bind-mounted into the Caddy container as a single file, so it has to be
    # rewritten in place (same inode): "sed -i" would leave the container reading the old copy.
    if grep -q 'reverse_proxy bizinsight-frontend:80' "$CADDYFILE" 2> /dev/null; then
        local updated
        updated="$(sed 's/reverse_proxy bizinsight-frontend:80/reverse_proxy bizinsight-web:3000/' "$CADDYFILE")"
        printf '%s\n' "$updated" > "$CADDYFILE"
        $DOCKER exec shared-caddy caddy reload --config /etc/caddy/Caddyfile
        echo "Caddy now sends the site to bizinsight-web:3000."
    fi

    $DOCKER image prune -f > /dev/null
    echo "Deployed $(git rev-parse --short HEAD); bizinsight-backend and bizinsight-web are healthy."
}

main "$@"
