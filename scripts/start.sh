#!/bin/sh

# Wait for database to be ready (if using external PostgreSQL)
if [ -n "$DATABASE_URL" ] && [[ "$DATABASE_URL" == postgresql* ]]; then
  echo "Waiting for PostgreSQL to be ready..."
  until pg_isready -d "$DATABASE_URL" > /dev/null 2>&1; do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 2
  done
  echo "PostgreSQL is ready!"
fi

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Generate Prisma client (in case of schema changes)
echo "Generating Prisma client..."
npx prisma generate

# Start the application
echo "Starting Next.js application..."
exec node server.js