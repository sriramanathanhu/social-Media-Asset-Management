# Build stage
FROM node:20-alpine AS builder

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copy package files and Prisma schema BEFORE installing dependencies
COPY package*.json ./
COPY prisma ./prisma/

# Set NODE_ENV to development for build (includes devDependencies)
ENV NODE_ENV=development

# Install all dependencies (no postinstall script now)
RUN npm ci --legacy-peer-deps

# Generate Prisma client AFTER dependencies are installed
RUN npx prisma generate

# Copy all source code
COPY . .

# Ensure Next.js environment file exists
RUN touch next-env.d.ts

# Set NODE_ENV to production for build (resolve NODE_ENV warning)
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application (with Prisma generation included)
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

# Install PostgreSQL client and curl for database operations and healthcheck
RUN apk add --no-cache libc6-compat postgresql-client curl

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy essential application files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma schema and package files (needed for runtime operations)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

# Install only production dependencies including Prisma
RUN npm ci --only=production --legacy-peer-deps

# Note: Prisma client will be generated at runtime with proper dependencies now available

# Create uploads directory
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads

# Copy startup script
COPY --chown=nextjs:nodejs scripts/start.sh ./start.sh
RUN chmod +x ./start.sh

# Ensure proper permissions for Prisma
RUN chown -R nextjs:nodejs /app/node_modules/.prisma
RUN chown -R nextjs:nodejs /app/prisma

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
# Ensure Next.js listens on all interfaces in Docker
ENV NEXT_PORT=3000

# Health check - Use curl for better compatibility with Coolify
HEALTHCHECK --interval=30s --timeout=15s --start-period=30s --retries=3 \
  CMD curl -f http://127.0.0.1:3000/api/health || exit 1

# Start the application
CMD ["./start.sh"]
