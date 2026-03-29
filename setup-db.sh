#!/usr/bin/env bash

if [ $# -lt 1 ]; then
  echo 1>&2 "$0: not enough arguments"
  exit 2
fi

command -v docker >/dev/null 2>&1 || { echo "docker required." >&2; exit 1; }

PG_USER=postgres
PG_PASSWORD=password
PG_DB=postgres

PG_DEV_PORT=6311
PG_TEST_PORT=6312

function setup_pg_db {
  docker ps -q --filter "name=$1" | grep -q . && docker stop $1 && docker rm -fv $1
  docker run --name $1 -p $2:5432 -e POSTGRES_USER=$PG_USER -e POSTGRES_PASSWORD=$PG_PASSWORD -e POSTGRES_DB=$PG_DB -d postgres
  database_url="postgresql://$PG_USER:$PG_PASSWORD@localhost:$2/$PG_DB?sslmode=disable"
  echo "$1 [$database_url] running on $2"
}

case "$1" in
  setup_pg)
    setup_pg_db hirely_pg_dev $PG_DEV_PORT
    database_url="postgresql://$PG_USER:$PG_PASSWORD@localhost:$PG_DEV_PORT/$PG_DB?sslmode=disable"
    pnpm dbmate --url $database_url wait
    pnpm dbmate --url $database_url migrate up

    setup_pg_db hirely_pg_test $PG_TEST_PORT
    database_url="postgresql://$PG_USER:$PG_PASSWORD@localhost:$PG_TEST_PORT/$PG_DB?sslmode=disable"
    pnpm dbmate --url $database_url wait
    pnpm dbmate --url $database_url migrate up
    ;;
  rm_pg)
    docker rm -f hirely_pg_dev
    docker rm -f hirely_pg_test
    ;;
  reset_pg)
    docker rm -f hirely_pg_test
    setup_pg_db hirely_pg_test $PG_TEST_PORT
    database_url="postgresql://$PG_USER:$PG_PASSWORD@localhost:$PG_TEST_PORT/$PG_DB?sslmode=disable"
    pnpm dbmate --url $database_url wait
    pnpm dbmate --url $database_url migrate up
    ;;
  *)
    echo $"Usage: $0 {setup_pg|rm_pg|reset_pg}"
    exit 1
esac
