# Coolify Deployment Guide

This guide provides step-by-step instructions for deploying the Social Media Portal using Coolify.

## 🚀 Pre-Deployment Setup

### 1. Environment Variables Configuration

Set the following environment variables in your Coolify application:

#### Required Environment Variables

```env
# Database Configuration - PostgreSQL (Required)
DATABASE_URL=postgresql://username:password@host:5432/social_media_portal

# Authentication - Nandi SSO
NANDI_SSO_URL=https://auth.kailasa.ai
NANDI_APP_ID=your_app_id_here
NANDI_RETURN_URL=https://yourdomain.com/api/auth/sso/callback

# NextAuth Configuration
NEXTAUTH_URL=https://yourdomain.com
NEXT_PUBLIC_AUTH_URL=https://auth.kailasa.ai
NEXT_PUBLIC_AUTH_CLIENT_ID=your_client_id_here
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

# Security (Generate a secure 32-character key)
ENCRYPTION_KEY=your_32_character_encryption_key_here

# Application Configuration
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
NEXT_TELEMETRY_DISABLED=1
```

### 2. Database Setup

#### PostgreSQL Setup (Required)

**Option A: Using Coolify's Built-in PostgreSQL Service**
1. In your Coolify project, add a **PostgreSQL service**:
   - Click "New Service" → "PostgreSQL"
   - Choose PostgreSQL version (14 or higher recommended)
   - Set database name: `social_media_portal`
   - Set username and strong password
   - Deploy the PostgreSQL service

2. **Get the connection string**:
   - Once deployed, copy the internal connection URL
   - Format: `postgresql://username:password@postgres-service:5432/social_media_portal`

3. **Set DATABASE_URL** in your application environment variables

**Option B: External PostgreSQL Provider**
You can use external providers like:
- **Supabase** (postgres://...)
- **Railway** (postgres://...)
- **AWS RDS** (postgres://...)
- **Google Cloud SQL** (postgres://...)

**Database Requirements:**
- PostgreSQL 12+ (14+ recommended)
- Database name: `social_media_portal`
- UTF8 encoding
- At least 100MB storage (grows with data)

## 📋 Coolify Configuration

### 1. Application Setup

1. **Create New Application** in Coolify
2. **Source**: Connect your Git repository
3. **Build Pack**: Docker
4. **Dockerfile**: Uses the existing `Dockerfile` in the project root

### 2. Domain Configuration

1. Set your custom domain in Coolify
2. Enable SSL/TLS certificate
3. Coolify will handle the reverse proxy automatically (no nginx needed)

### 3. Resource Allocation

**Recommended Resources:**
- **CPU**: 1-2 cores
- **Memory**: 1-2 GB RAM
- **Storage**: 10-20 GB (depending on database size)

### 4. Health Check Configuration

The application includes a built-in health check at `/api/health`

Coolify will automatically detect and use the Docker health check:
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"
```

## 🔧 Deployment Process

### 1. Build Configuration

The Docker build process:
1. **Build Stage**: Installs dependencies, generates Prisma client, builds Next.js app
2. **Production Stage**: Creates optimized production image
3. **Startup**: Runs database migrations and starts the application

### 2. Database Migration

The startup script automatically:
1. Waits for PostgreSQL to be ready (if using PostgreSQL)
2. Runs `prisma migrate deploy`
3. Generates Prisma client
4. Starts the Next.js application

### 3. Persistent Data

Configure persistent storage in Coolify for:
- Mount `/app/uploads` for file uploads (if using file upload features)

## 🛠️ Post-Deployment

### 1. Initial Setup

1. Access your deployed application
2. The first user to log in via SSO will be created as an admin
3. Create ecosystems and assign users as needed

### 2. Database Seeding (Optional)

If you want to import sample data:
```bash
# Access the container via Coolify terminal or SSH
# Run the import script
npm run db:seed
```

**Note**: The database will be automatically migrated on startup, so no manual migration is needed.

### 3. Monitoring

Monitor your application through:
- Coolify dashboard
- Application logs
- Health check endpoint: `https://yourdomain.com/api/health`

## 🔍 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Verify `DATABASE_URL` is correct
   - Ensure database server is accessible
   - Check network connectivity

2. **Authentication Issues**
   - Verify all Nandi SSO environment variables
   - Check that `NANDI_RETURN_URL` matches your domain
   - Ensure `ENCRYPTION_KEY` is exactly 32 characters

3. **Build Failures**
   - Check if all dependencies are properly installed
   - Verify Prisma schema is valid
   - Review build logs in Coolify

### Debug Commands

```bash
# Check application status
curl https://yourdomain.com/api/health

# View logs
docker logs your_container_name

# Access container shell
docker exec -it your_container_name sh

# Check database connection
npx prisma db pull
```

## 🔄 Updates and Maintenance

### Deploying Updates

1. Push changes to your Git repository
2. Coolify will automatically trigger a new deployment
3. Zero-downtime deployment ensures continuous availability

### Database Migrations

Database migrations run automatically during deployment via the startup script.

### Backup Strategy

For production deployments:
1. **PostgreSQL Backups**: Use Coolify's built-in PostgreSQL backup features
2. **External Backups**: Set up `pg_dump` scheduled backups for external PostgreSQL
3. **Application Data**: Back up uploaded files if using file uploads
4. Test backup restoration procedures regularly

## 📚 Additional Resources

- [Coolify Documentation](https://coolify.io/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma Production Guide](https://www.prisma.io/docs/guides/deployment)

## 🎯 Production Optimizations

The application is pre-configured with:
- ✅ Docker multi-stage builds for smaller images
- ✅ Prisma client generation optimization
- ✅ Next.js standalone output for better performance
- ✅ Health checks for monitoring
- ✅ Non-root user for security
- ✅ Automatic database migrations
- ✅ Production environment variables
- ✅ Removed unnecessary nginx (Coolify handles reverse proxy)