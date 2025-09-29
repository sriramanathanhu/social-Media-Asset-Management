#!/bin/sh

set -e  # Exit on any error

# Color codes for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
  echo "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_error() {
  echo "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

log_success() {
  echo "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1"
}

log_warning() {
  echo "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Validate required environment variables
log "Validating environment variables..."

if [ -z "$DATABASE_URL" ]; then
  log_error "DATABASE_URL environment variable is not set!"
  log "Required format: postgresql://username:password@host:port/database"
  log "For Coolify, try: postgresql://username:password@postgres:5432/database_name"
  exit 1
fi

if ! echo "$DATABASE_URL" | grep -E "^postgres(ql)?://" > /dev/null; then
  log_error "DATABASE_URL must start with postgresql:// or postgres://"
  log "Current DATABASE_URL: $(echo "$DATABASE_URL" | sed 's/:[^:@]*@/:***@/g')"  # Hide password
  exit 1
fi

log_success "DATABASE_URL format is valid"

# Extract database connection details for troubleshooting
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

log "Database connection details:"
log "  Host: $DB_HOST"
log "  Port: $DB_PORT"
log "  Database: $DB_NAME"

# Wait for database to be ready with timeout
log "Waiting for PostgreSQL to be ready..."
MAX_WAIT=60  # Maximum wait time in seconds
WAIT_COUNT=0

until pg_isready -d "$DATABASE_URL" > /dev/null 2>&1; do
  if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
    log_error "Database did not become ready within ${MAX_WAIT} seconds"
    log "Troubleshooting steps:"
    log "1. Check if PostgreSQL service is running in Coolify"
    log "2. Verify DATABASE_URL credentials and hostname"
    log "3. Ensure database '$DB_NAME' exists"
    log "4. Check network connectivity between containers"
    exit 1
  fi
  log "PostgreSQL is unavailable - waiting... ($((WAIT_COUNT+1))/${MAX_WAIT})"
  sleep 2
  WAIT_COUNT=$((WAIT_COUNT + 2))
done

log_success "PostgreSQL is ready!"

# Test database connection with Prisma
log "Testing database connection..."
if ! npx prisma db seed --preview-feature > /dev/null 2>&1; then
  log_warning "Database connection test with seed failed, but continuing..."
fi

# Fix permissions for Prisma client
log "Setting up Prisma permissions..."
chown -R nextjs:nodejs /app/node_modules/.prisma 2>/dev/null || true
chmod -R 755 /app/node_modules/.prisma 2>/dev/null || true

# Generate Prisma client first (before migrations)
log "Generating Prisma client..."
if ! npx prisma generate; then
  log_error "Failed to generate Prisma client"
  log "This might indicate a Prisma schema issue or missing dependencies"
  exit 1
fi

log_success "Prisma client generated successfully"

# Run database migrations with detailed error reporting
log "Running database migrations..."
if ! npx prisma migrate deploy 2>&1 | tee /tmp/migration.log; then
  log_error "Database migration failed!"
  log "Migration error details:"
  cat /tmp/migration.log
  
  log "Common solutions:"
  log "1. Check if the database user has CREATE/ALTER permissions"
  log "2. Verify the database '$DB_NAME' exists and is accessible"
  log "3. Ensure DATABASE_URL credentials are correct"
  log "4. Check if this is the first deployment (may need 'prisma db push')"
  
  # For first-time deployments or SQLite->PostgreSQL migration conflicts, use db push
  log "Migration failed. Attempting 'prisma db push' for PostgreSQL deployment..."
  log "This will create the schema directly without using migration files"
  if npx prisma db push --accept-data-loss 2>&1 | tee /tmp/push.log; then
    log_success "Database schema synchronized with 'db push'"
    log "Note: Migration history will be reset for PostgreSQL compatibility"
  else
    log_error "Both migration and db push failed. Check database configuration."
    cat /tmp/push.log
    exit 1
  fi
else
  log_success "Database migrations completed successfully"
fi

# Validate database setup
log "Validating database setup..."
if npx prisma db seed --preview-feature > /dev/null 2>&1; then
  log_success "Database validation passed"
else
  log_warning "Database validation failed, but application will still start"
fi

log_success "Database setup completed successfully"

# Start the application
log "Starting Next.js application..."
log "Application will be available on port 3000"
log "Health check endpoint: http://localhost:3000/api/health"

exec node server.js