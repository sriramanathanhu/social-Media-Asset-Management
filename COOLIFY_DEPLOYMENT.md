# Coolify Deployment Guide

This guide will help you deploy the Social Media Portal application on Coolify with PostgreSQL.

## Prerequisites

- Coolify instance running
- Access to Coolify dashboard
- Git repository with your code

## Step 1: Set Up PostgreSQL Database Service

1. **Create PostgreSQL Service:**
   - Go to your Coolify dashboard
   - Click "New Resource" → "Database" → "PostgreSQL"
   - Set service name: `postgres` (this will be used in DATABASE_URL)
   - Set database name: `social_media_portal`
   - Set username and password (remember these for DATABASE_URL)
   - Deploy the PostgreSQL service

2. **Note Database Connection Details:**
   - Service hostname: `postgres` (or your chosen service name)
   - Port: `5432` (default)
   - Database: `social_media_portal`
   - Username: (what you set)
   - Password: (what you set)

## Step 2: Create Application Service

1. **Create New Application:**
   - Click "New Resource" → "Application"
   - Choose "Git Repository"
   - Connect your repository: `sriramanathanhu/social-Media-Asset-Management`
   - Branch: `main`

2. **Configure Build Settings:**
   - Build Pack: `Dockerfile`
   - Dockerfile: `Dockerfile` (or `Dockerfile.debug` for detailed logs)
   - Build Command: (leave empty)

## Step 3: Configure Environment Variables

Set these environment variables in Coolify:

### Required Variables

```bash
# Database Configuration
# IMPORTANT: Replace 'your_username' with your actual PostgreSQL username
# The logs show it's looking for 'ecosystemuser' - ensure this matches your PostgreSQL service
DATABASE_URL=postgresql://ecosystemuser:your_password@postgres:5432/social_media_portal?schema=public

# Application Settings
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
NEXT_TELEMETRY_DISABLED=1

# Security (generate a secure 32-character key)
ENCRYPTION_KEY=your_32_character_encryption_key_here
```

### Authentication Variables (Optional)

```bash
# Nandi SSO Configuration
NANDI_SSO_URL=https://auth.kailasa.ai
NANDI_APP_ID=your_app_id_here
NANDI_RETURN_URL=https://yourdomain.com/api/auth/sso/callback

# NextAuth Configuration
NEXTAUTH_URL=https://yourdomain.com
NEXT_PUBLIC_AUTH_URL=https://auth.kailasa.ai
NEXT_PUBLIC_AUTH_CLIENT_ID=your_client_id_here
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

## Step 4: Important DATABASE_URL Format

The DATABASE_URL format for Coolify is:
```
postgresql://username:password@postgres:5432/social_media_portal?schema=public
```

**Key points:**
- Use `postgres` as hostname (your PostgreSQL service name)
- Replace `username` and `password` with your actual PostgreSQL credentials
- The database name should match what you created in Step 1

## Step 5: Deploy Application

1. **Deploy:**
   - Click "Deploy" in the application dashboard
   - Wait for build to complete (should take 1-2 minutes)

2. **Monitor Deployment:**
   - Watch the build logs for any errors
   - Check the application logs after deployment

## Step 6: Verify Deployment

1. **Check Health:**
   - Visit: `https://yourdomain.com/api/health`
   - Should return: `{"status":"healthy","database":"connected"}`

2. **Access Application:**
   - Visit your application URL
   - Should load the dashboard

## Troubleshooting

### Common Issues

#### 1. Database Authentication Failed (P1000)
**Error:** `Authentication failed against database server, the provided database credentials for 'ecosystemuser' are not valid`

**Solutions:**
- **Check USERNAME**: Ensure your PostgreSQL service uses username `ecosystemuser` OR update your DATABASE_URL to match your actual username
- **Check PASSWORD**: Verify the password in your DATABASE_URL matches your PostgreSQL service password
- **Check PostgreSQL service**: Ensure it's running and accessible
- **Verify database exists**: Ensure database `social_media_portal` exists
- **Service naming**: Confirm your PostgreSQL service hostname matches (usually `postgres`)

**Debug Steps:**
1. Go to your PostgreSQL service in Coolify dashboard
2. Check the username and password configured
3. Update your DATABASE_URL to match exactly: `postgresql://actual_username:actual_password@postgres:5432/social_media_portal`

#### 2. Database Not Ready
**Error:** `PostgreSQL is unavailable`

**Solutions:**
- Ensure PostgreSQL service is deployed and running
- Check service name matches DATABASE_URL hostname
- Verify network connectivity between services

#### 3. Healthcheck Failing
**Error:** `connect ECONNREFUSED`

**Solutions:**
- Check if application started successfully in logs
- Verify database migrations completed
- Ensure PORT 3000 is properly exposed

#### 4. Migration Errors
**Error:** `Database migration failed` or `P3019: The datasource provider 'postgresql' specified in your schema does not match the one specified in the migration_lock.toml, 'sqlite'`

**Solutions:**
- **This is expected for first PostgreSQL deployment** - the app will automatically use `prisma db push` instead
- The startup script will handle SQLite→PostgreSQL migration conflicts automatically
- Check database permissions (CREATE, ALTER permissions required)
- Verify database exists and is accessible

#### 5. Redirect Loop (ERR_TOO_MANY_REDIRECTS)
**Error:** `This page isn't working - redirected you too many times`

**Solutions:**
- **This was fixed in the latest version** - authentication middleware improved
- Clear browser cookies and cache
- Check that authentication environment variables are properly set
- Verify `/api/auth/session` endpoint is accessible

### Debugging Steps

1. **Check Application Logs:**
   ```bash
   # In Coolify dashboard, check application logs for detailed error messages
   ```

2. **Use Debug Dockerfile:**
   - Change Dockerfile to `Dockerfile.debug` for verbose build logs
   - Redeploy to get detailed information

3. **Verify Database Connection:**
   ```bash
   # From Coolify terminal or logs, check:
   # 1. PostgreSQL service status
   # 2. Network connectivity between services
   # 3. Database credentials
   ```

4. **Test Health Endpoint:**
   ```bash
   curl https://yourdomain.com/api/health
   ```

## Database Schema

The application will automatically create all required tables on first deployment using Prisma migrations. The schema includes:

- Users
- Platforms (social media accounts)
- Ecosystems (groupings of platforms)
- User-Ecosystem relationships
- Platform history and credentials

## Security Notes

1. **Generate Secure Keys:**
   ```bash
   # Generate a secure encryption key:
   openssl rand -base64 32
   ```

2. **Environment Variables:**
   - Never commit actual credentials to Git
   - Use Coolify's environment variable system
   - Verify sensitive data is properly masked in logs

## Performance Optimization

1. **Database Connection Pooling:**
   - Already configured in Prisma client
   - No additional setup required

2. **Application Caching:**
   - Next.js automatic static optimization enabled
   - Standalone output for optimal Docker performance

3. **Health Monitoring:**
   - Health endpoint available at `/api/health`
   - Automatic container restart on failures

## Scaling

- Application is stateless and can be scaled horizontally
- Database connection pooling handles multiple instances
- Use Coolify's scaling features as needed

## Support

If you encounter issues:

1. Check this guide's troubleshooting section
2. Review application and database logs in Coolify
3. Ensure all environment variables are set correctly
4. Verify PostgreSQL service is healthy and accessible