#!/bin/sh
set -e

cd "$(dirname "$0")"
docker compose --project-name gitlab-suchmaschine down
