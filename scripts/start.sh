#!/bin/sh

# Validate DATABASE_URL
echo "Validating DATABASE_URL..."
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set!"
  exit 1
fi

if ! echo "$DATABASE_URL" | grep -E "^postgres(ql)?://" > /dev/null; then
  echo "❌ ERROR: DATABASE_URL must start with postgresql:// or postgres://"
  echo "Current DATABASE_URL: $DATABASE_URL"
  exit 1
fi

echo "✅ DATABASE_URL is valid"

# Wait for database to be ready
echo "Waiting for PostgreSQL to be ready..."
until pg_isready -d "$DATABASE_URL" > /dev/null 2>&1; do
  echo "PostgreSQL is unavailable - sleeping for 2 seconds..."
  sleep 2
done
echo "✅ PostgreSQL is ready!"

# Fix permissions for Prisma client
echo "Setting up Prisma permissions..."
chown -R nextjs:nodejs /app/node_modules/.prisma 2>/dev/null || true
chmod -R 755 /app/node_modules/.prisma 2>/dev/null || true

# Generate Prisma client first (before migrations)
echo "Generating Prisma client..."
npx prisma generate || {
  echo "❌ Failed to generate Prisma client"
  exit 1
}

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy || {
  echo "❌ Database migration failed"
  exit 1
}

echo "✅ Database setup completed successfully"

# Start the application
echo "Starting Next.js application..."
exec node server.js