# 🔧 Troubleshooting Guide - Social Media Portal

Common deployment issues and their solutions for Coolify deployment.

## 🚨 Database Connection Issues

### **Error: DATABASE_URL validation failed**
```
Error: the URL must start with the protocol `postgresql://` or `postgres://`
```

**Causes:**
- DATABASE_URL not set in Coolify environment variables
- Incorrect DATABASE_URL format
- Using HTTP URL instead of PostgreSQL connection string

**Solutions:**

1. **Check Environment Variables in Coolify:**
   - Go to Application → Environment Variables
   - Verify `DATABASE_URL` is set correctly

2. **Correct Format Examples:**
   ```bash
   # Coolify internal PostgreSQL
   DATABASE_URL="postgresql://postgres:password@postgresql-service:5432/social_media_portal"
   
   # External providers
   DATABASE_URL="postgresql://username:password@host.com:5432/database_name"
   ```

3. **Get Coolify PostgreSQL URL:**
   - Go to your PostgreSQL service in Coolify
   - Copy the internal connection string
   - Use that exact string in your app's environment variables

### **Error: Permission denied, unlink Prisma client**
```
EACCES: permission denied, unlink '/app/node_modules/.prisma/client/index.js'
```

**Solution:** This is fixed in the updated Dockerfile and startup script. Redeploy your application.

## 🌐 404 Page Not Found

### **Application shows 404 after successful deployment**

**Causes:**
- Database migration failed (app won't start properly)
- Environment variables not set correctly
- Domain/proxy configuration issues

**Debugging Steps:**

1. **Check Coolify Logs:**
   - Look for database connection errors
   - Verify "Ready in XXXms" message appears
   - Check for any startup failures

2. **Verify Domain Configuration:**
   - Ensure domain is correctly set in Coolify
   - Check Cloudflare DNS settings point to Coolify
   - Verify SSL/TLS certificates are valid

3. **Test Health Endpoint:**
   ```bash
   curl https://yourdomain.com/api/health
   ```
   Should return JSON with status information.

## 🗄️ PostgreSQL Service Issues

### **PostgreSQL service not accessible**

**Setup PostgreSQL in Coolify:**

1. **Create PostgreSQL Service:**
   ```
   Service Type: PostgreSQL
   Version: 14 or 15
   Database Name: social_media_portal
   Username: postgres (or custom)
   Password: [strong password]
   ```

2. **Network Configuration:**
   - Ensure both services are in same Coolify project
   - Use internal service names for DATABASE_URL
   - Don't use localhost or external IPs for internal services

3. **Connection String Format:**
   ```
   postgresql://[username]:[password]@[service-name]:5432/[database]
   ```

## 🔐 Environment Variable Checklist

### **Required Variables:**
```env
# Database (REQUIRED)
DATABASE_URL=postgresql://postgres:password@postgresql-service:5432/social_media_portal

# Authentication (REQUIRED)
NANDI_SSO_URL=https://auth.kailasa.ai
NANDI_APP_ID=your_app_id
NANDI_RETURN_URL=https://yourdomain.com/api/auth/sso/callback
NEXTAUTH_URL=https://yourdomain.com
NEXT_PUBLIC_AUTH_URL=https://auth.kailasa.ai
NEXT_PUBLIC_AUTH_CLIENT_ID=your_client_id
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

# Security (REQUIRED)
ENCRYPTION_KEY=your_32_character_encryption_key_here

# Application
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
NEXT_TELEMETRY_DISABLED=1
```

## 🔍 Debugging Commands

### **Check Container Status:**
```bash
# In Coolify terminal/shell
docker ps
docker logs container_name
```

### **Test Database Connection:**
```bash
# Inside container
pg_isready -d "$DATABASE_URL"
npx prisma db pull
```

### **Check Environment Variables:**
```bash
# Inside container
env | grep DATABASE_URL
env | grep NANDI
```

### **Manual Migration:**
```bash
# If automatic migration fails
npx prisma migrate deploy
npx prisma generate
```

## 🚀 Deployment Checklist

### **Before Deployment:**
- [ ] PostgreSQL service created and running
- [ ] All environment variables set correctly
- [ ] Domain configured in Coolify
- [ ] DNS pointing to Coolify server

### **After Deployment:**
- [ ] Check application logs for errors
- [ ] Verify database migrations completed
- [ ] Test health endpoint: `/api/health`
- [ ] Test login flow
- [ ] Verify SSL certificate works

## 🆘 Common Error Messages

### **"Connection refused"**
- PostgreSQL service not running
- Incorrect service name in DATABASE_URL
- Network connectivity issues

**Fix:** Check PostgreSQL service status in Coolify

### **"Authentication failed"**
- Wrong username/password in DATABASE_URL
- Database doesn't exist

**Fix:** Verify PostgreSQL credentials and database name

### **"Ready in XXXms" but 404 errors**
- Application started but routing issues
- Check domain configuration and proxy settings

### **"Schema validation failed"**
- DATABASE_URL format incorrect
- Missing required environment variables

**Fix:** Use exact PostgreSQL connection string format

## 📞 Getting Help

### **Check These First:**
1. Coolify application logs
2. PostgreSQL service logs
3. Environment variables are set
4. Health endpoint responds

### **Useful Log Commands:**
```bash
# Application logs
docker logs your_app_container

# PostgreSQL logs
docker logs your_postgres_container

# Real-time logs
docker logs -f container_name
```

### **Support Resources:**
- [Coolify Documentation](https://coolify.io/docs)
- [Prisma Database Connection](https://www.prisma.io/docs/reference/database-reference/connection-urls)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)

---

## 🔄 Quick Fix for Current Issue

Based on your error, follow these steps:

1. **Set DATABASE_URL correctly in Coolify**
2. **Redeploy the application** (new Dockerfile fixes permissions)
3. **Check logs** for "✅ Database setup completed successfully"
4. **Test** https://ecosystem.ecitizen.media/api/health

The updated startup script will give you clear error messages if something is still wrong.