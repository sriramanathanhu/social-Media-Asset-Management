# Local Development Setup Guide

This document explains the differences between the production environment (main branch) and local development setup.

## Quick Start

```bash
# Switch to dev branch
git checkout dev

# Install dependencies
npm install

# Set up local database
DATABASE_URL="file:/absolute/path/to/prisma/dev.db" npx prisma db push

# Start development server
npm run dev
```

## Branch Structure

- **`main`** - Production-ready code running on cloud server
- **`dev`** - Local development branch with SQLite database
- **`feature/*`** - Feature branches (merge into dev first)

## Key Differences: Production vs Local

### 1. Database Configuration

| Aspect | Production (main) | Local Development (dev) |
|--------|------------------|------------------------|
| Database | PostgreSQL on server | SQLite (file-based) |
| Provider | `postgresql` | `sqlite` |
| Connection | Network connection string | Absolute file path |
| Location | Remote database server | `prisma/dev.db` |

**Production:**
```bash
DATABASE_URL="postgresql://username:password@postgres:5432/social_media_portal?schema=public"
```

**Local:**
```bash
DATABASE_URL="file:/Users/hinduismnow/Downloads/For_Upload/social-media-portal-main/prisma/dev.db"
```

### 2. Environment Configuration

#### `.env.local` (Local Development)
```bash
# Database - SQLite with absolute path
DATABASE_URL="file:/absolute/path/to/prisma/dev.db"

# Application URLs - localhost
NEXT_BASE_URL=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Environment
NODE_ENV=development
PORT=3000

# Authentication (same as production)
NEXT_AUTH_URL=https://auth.kailasa.ai
NEXT_AUTH_CLIENT_ID=1243-2739-1026-8361
AUTH_CLIENT_SECRET=qhDHH98ySeYaYWHKJRG2G3QKXZSVKWC5MLT4
```

#### `.env.example` (Production Reference)
```bash
# Database - PostgreSQL
DATABASE_URL="postgresql://username:password@postgres:5432/social_media_portal"

# Application URLs - production domain
NEXT_BASE_URL=https://yourdomain.com
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

# Environment
NODE_ENV=production
```

### 3. Code Changes in `dev` Branch

#### `prisma/schema.prisma`
```prisma
datasource db {
  provider = "sqlite"  // Changed from "postgresql"
  url      = env("DATABASE_URL")
}
```

#### `app/platforms/[id]/edit/page.tsx`
Fixed Image component empty src console errors:
```tsx
// Before (caused console errors)
<Image src={totpQRCode} alt="TOTP QR Code" width={200} height={200} />

// After (conditional rendering)
{totpQRCode && (
  <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
    <Image src={totpQRCode} alt="TOTP QR Code" width={200} height={200} />
  </div>
)}
```

#### `package.json`
Added Playwright for automated testing:
```json
"devDependencies": {
  "playwright": "^1.55.1"
}
```

## Local Database Setup

### Initial Setup

1. **Create the database file:**
```bash
DATABASE_URL="file:./prisma/dev.db" npx prisma db push
```

2. **Add admin users:**
```bash
sqlite3 prisma/dev.db "INSERT INTO User (email, name, role, created_at, updated_at)
VALUES ('youremail@example.com', 'Your Name', 'admin', datetime('now'), datetime('now'));"
```

3. **Verify users:**
```bash
sqlite3 prisma/dev.db "SELECT id, email, role FROM User;"
```

### Current Admin Users in Local DB

- `vyahutamit38@gmail.com` → admin
- `sri.ramanatha@kailasaafrica.org` → admin
- `vyahut@gmail.com` → admin

## Common Issues & Solutions

### Issue: "Error code 14: Unable to open the database file"
**Solution:** Use absolute path in DATABASE_URL instead of relative path:
```bash
# ❌ Wrong (relative path)
DATABASE_URL="file:./prisma/dev.db"

# ✅ Correct (absolute path)
DATABASE_URL="file:/Users/hinduismnow/Downloads/For_Upload/social-media-portal-main/prisma/dev.db"
```

### Issue: Image component empty src console errors
**Status:** Fixed in dev branch with conditional rendering

### Issue: User shows as "normal user" instead of "admin"
**Solution:** Ensure database connection is working and user exists in database with admin role

## Development Workflow

### Working on New Features

1. **Switch to dev branch:**
```bash
git checkout dev
```

2. **Create feature branch from dev:**
```bash
git checkout -b feature/your-feature-name
```

3. **Make your changes and commit:**
```bash
git add .
git commit -m "feat: your feature description"
```

4. **Merge back to dev:**
```bash
git checkout dev
git merge feature/your-feature-name
```

5. **When ready for production:**
```bash
git checkout main
git merge dev
# Update DATABASE_URL to PostgreSQL before deploying!
```

### Important: Before Deploying to Production

1. **Revert database provider:**
```prisma
datasource db {
  provider = "postgresql"  // Change back from "sqlite"
  url      = env("DATABASE_URL")
}
```

2. **Update environment variables:**
```bash
DATABASE_URL="postgresql://..."
NEXT_BASE_URL=https://yourdomain.com
NODE_ENV=production
```

3. **Test thoroughly in staging environment**

## Files Not in Git (Local Only)

- `.env.local` - Your local environment configuration
- `prisma/dev.db` - Local SQLite database
- `prisma/dev.db-journal` - SQLite journal file
- `.next/` - Next.js build cache
- `node_modules/` - Dependencies

## Commit History

```
522d9fe (HEAD -> dev) 🔧 Local development setup with SQLite and bug fixes
02b782a (origin/main, main) 🔧 Fix API authentication and add data seeding system
3013f14 🔒 SECURITY FIX: Protect user management endpoints
28b59v2 Nandi oAuth fixes and removed Google OAuth
```

## Testing

Run automated tests (requires Playwright):
```bash
npm test
```

For manual testing:
1. Start server: `npm run dev`
2. Navigate to: http://localhost:3000
3. Click "Sign in with SSO"
4. Login with admin email
5. Verify admin access and functionality

## Support

For issues specific to local setup, check:
1. Database file exists and has correct permissions
2. `.env.local` has absolute path for DATABASE_URL
3. Admin user exists in local database
4. Server is running on correct port (3000)

---

Last Updated: October 1, 2025
