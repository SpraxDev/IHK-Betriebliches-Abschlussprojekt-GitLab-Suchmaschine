#!/bin/sh
set -e

echo 'User: root'
docker exec -t gitlab-suchmaschine-gitlab-1 grep 'Password:' /etc/gitlab/initial_root_password
