#!/bin/sh
set -e

cd "$(dirname "$0")"
docker compose --project-name gitlab-suchmaschine up --detach
echo 'Dev-Containers are starting... GitLab might take a while to be ready (docker logs -f gitlab-search-suchmaschine-1).'
