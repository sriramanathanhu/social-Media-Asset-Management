# Social Media Portal - Deployment Guide

## ✅ Updated Nandi Auth Implementation

The application has been updated to use the **official Nandi Auth implementation** patterns based on the provided examples.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- PostgreSQL database
- Coolify deployment platform (recommended)

## 🔧 Environment Variables (Updated)

Create a `.env` file with these variables:

```bash
# Database Configuration - PostgreSQL
DATABASE_URL="postgresql://username:password@postgres:5432/social_media_portal?schema=public"

# Authentication - Nandi Auth (Official Implementation)
NEXT_AUTH_URL=https://auth.kailasa.ai
NEXT_AUTH_CLIENT_ID=1243-2739-1026-8361
AUTH_CLIENT_SECRET=qhDHH98ySeYaYWHKJRG2G3QKXZSVKWC5MLT4
NEXT_BASE_URL=https://yourdomain.com

# Public Environment Variables (for frontend)
NEXT_PUBLIC_NEXT_AUTH_URL=https://auth.kailasa.ai
NEXT_PUBLIC_NEXT_AUTH_CLIENT_ID=1243-2739-1026-8361
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

# Security
ENCRYPTION_KEY=your_32_character_encryption_key

# Application Configuration
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
```

## 🚀 Quick Start (Development)

1. Clone the repository:
```bash
git clone https://github.com/kklabai/social-media-portal.git
cd social-media-portal
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Configure `.env` file with the updated Nandi Auth variables above

4. Build and run:
```bash
docker-compose up -d
```

The application will be available at http://localhost:3000

## Production Deployment

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Setup Application

```bash
# Create application directory
sudo mkdir -p /opt/social-media-portal
cd /opt/social-media-portal

# Clone repository
sudo git clone https://github.com/kklabai/social-media-portal.git .

# Create environment file
sudo cp .env.example .env
sudo nano .env  # Edit with your production values
```

### 3. Configure SSL (Let's Encrypt)

```bash
# Update nginx.conf with your domain
sudo sed -i 's/your-domain.com/yourdomain.com/g' nginx/nginx.conf

# Generate SSL certificates
sudo docker-compose -f docker-compose.prod.yml run certbot

# Or use existing certificates
sudo mkdir -p nginx/ssl
sudo cp /path/to/cert.pem nginx/ssl/
sudo cp /path/to/key.pem nginx/ssl/
```

### 4. Deploy Application

```bash
# Build and start services
sudo docker-compose -f docker-compose.prod.yml up -d

# Check logs
sudo docker-compose -f docker-compose.prod.yml logs -f

# Run database migrations
sudo docker-compose -f docker-compose.prod.yml exec social-media-portal npx prisma migrate deploy
```

### 5. Import Initial Data (Optional)

```bash
# Copy CSV files to container
sudo docker cp csv-data social-media-portal:/app/

# Run import
sudo docker-compose -f docker-compose.prod.yml exec social-media-portal npx ts-node prisma/import-from-csv.ts
```

## 🔄 Deployment for Coolify

### 1. Update Environment Variables in Coolify:
```bash
NEXT_AUTH_URL=https://auth.kailasa.ai
NEXT_AUTH_CLIENT_ID=1243-2739-1026-8361
AUTH_CLIENT_SECRET=qhDHH98ySeYaYWHKJRG2G3QKXZSVKWC5MLT4
NEXT_BASE_URL=https://yourdomain.com

# Public variables (for frontend)
NEXT_PUBLIC_NEXT_AUTH_URL=https://auth.kailasa.ai
NEXT_PUBLIC_NEXT_AUTH_CLIENT_ID=1243-2739-1026-8361
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

# Database and Security
DATABASE_URL=postgresql://username:password@postgres:5432/social_media_portal?schema=public
ENCRYPTION_KEY=your_32_character_encryption_key
```

### 2. Remove Old Variables:
- Remove all `NANDI_*` prefixed variables 
- Remove `GOOGLE_*` OAuth variables (not needed)

### 3. Key Changes Made

#### Environment Variable Names
- `NANDI_SSO_URL` → `NEXT_AUTH_URL`
- `NANDI_APP_ID` → `NEXT_AUTH_CLIENT_ID` 
- `NANDI_CLIENT_SECRET` → `AUTH_CLIENT_SECRET`
- `NANDI_RETURN_URL` → `NEXT_BASE_URL`

#### Authentication Endpoints
- Login URL: `{NEXT_AUTH_URL}/auth/sign-in` (simplified format)
- Token Exchange: `{NEXT_AUTH_URL}/auth/session/exchange-token`
- Session Check: `{NEXT_AUTH_URL}/auth/get-session`

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_AUTH_URL` | Nandi Auth base URL | `https://auth.kailasa.ai` |
| `NEXT_AUTH_CLIENT_ID` | Your client ID in Nandi | `1243-2739-1026-8361` |
| `AUTH_CLIENT_SECRET` | Your client secret | `qhDHH98ySeYaYWHKJRG2G3QKXZSVKWC5MLT4` |
| `NEXT_BASE_URL` | Your application URL | `https://yourdomain.com` |
| `ENCRYPTION_KEY` | 32-character encryption key | Generate with: `openssl rand -base64 32 \| head -c 32` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Application port | `3000` |
| `DOMAIN` | Your domain (for SSL) | `localhost` |
| `ADMIN_EMAIL` | Admin email for Let's Encrypt | Required for SSL |
| `BACKUP_SCHEDULE` | Cron schedule for backups | `0 2 * * *` (2 AM daily) |

## Management Commands

### Backup Database

```bash
# Manual backup
docker-compose -f docker-compose.prod.yml exec backup sh -c 'sqlite3 /data/prod.db ".backup /backups/manual-$(date +%Y%m%d-%H%M%S).db"'

# List backups
ls -la ./backups/
```

### Update Application

```bash
# Pull latest changes
sudo git pull

# Rebuild and restart
sudo docker-compose -f docker-compose.prod.yml up -d --build

# Run migrations if needed
sudo docker-compose -f docker-compose.prod.yml exec social-media-portal npx prisma migrate deploy
```

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f social-media-portal
```

### Health Check

```bash
# Check application health
curl http://localhost:3000/api/health

# Check all services
docker-compose -f docker-compose.prod.yml ps
```

## Troubleshooting

### Container won't start

1. Check logs: `docker-compose logs social-media-portal`
2. Verify environment variables: `docker-compose config`
3. Check disk space: `df -h`

### Database errors

1. Check database file permissions: `ls -la ./data/`
2. Run migrations: `docker-compose exec social-media-portal npx prisma migrate deploy`
3. Reset database: `docker-compose exec social-media-portal npx prisma migrate reset`

### SSL certificate issues

1. Check certificate files: `ls -la nginx/ssl/`
2. Verify nginx config: `docker-compose exec nginx nginx -t`
3. Renew certificates: `docker-compose -f docker-compose.prod.yml run certbot renew`

## Security Recommendations

1. **Use strong encryption key**: Generate with `openssl rand -base64 32 | head -c 32`
2. **Limit exposed ports**: Only expose 80/443 through nginx
3. **Regular updates**: Keep Docker images and application updated
4. **Backup regularly**: Use the included backup service
5. **Monitor logs**: Set up log aggregation for security monitoring
6. **Use firewall**: Configure server firewall to limit access

## Performance Optimization

1. **Resource limits**: Add to docker-compose.yml:
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '2'
         memory: 2G
   ```

2. **Database optimization**: For large datasets, consider migrating to PostgreSQL

3. **Caching**: nginx already configured with static asset caching

4. **Monitoring**: Add Prometheus/Grafana for monitoring

## Support

For issues and questions:
- GitHub Issues: https://github.com/kklabai/social-media-portal/issues
- Documentation: See README.md