#!/usr/bin/env bash
# Applies the migrations to a throwaway database on a local Postgres and runs the RLS tests.
# Usage: supabase/tests/local/run.sh   (needs psql and a superuser connection; PG* env vars respected)
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
db="twofold_test_$$"
psql -X -q -v ON_ERROR_STOP=1 -d postgres -c "create database $db"
trap 'psql -X -q -d postgres -c "drop database if exists $db" >/dev/null' EXIT
run() { psql -X -q -t -o /dev/null -v ON_ERROR_STOP=1 -d "$db" -f "$1"; }
run "$here/shim.sql"
for f in "$here"/../../migrations/*.sql; do run "$f"; done
run "$here/rls_test.sql"
echo "All database tests passed."
