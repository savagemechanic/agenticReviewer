#!/bin/bash
# Wait for postgres to be ready, then run Drizzle migrations
set -e

echo "Waiting for PostgreSQL..."
until pg_isready -h "${PGHOST:-postgres}" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}" 2>/dev/null; do
  sleep 1
done

echo "Running Drizzle migrations..."
cd /app
pnpm --filter @repo/db db:push

echo "Migrations complete."
