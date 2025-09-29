# Keycloak SSO Implementation Guide

## ✅ Keycloak Branch Implementation Complete

This branch (`feature/keycloak-sso`) implements **NextAuth.js with Keycloak provider** as a complete replacement for the Nandi Auth system.

## 🔧 Environment Variables

Update your environment with these Keycloak-specific variables:

```bash
# Database Configuration - PostgreSQL
DATABASE_URL="postgresql://username:password@postgres:5432/social_media_portal?schema=public"

# Authentication - Keycloak SSO with NextAuth.js
KEYCLOAK_URL=https://your-keycloak-server.com
KEYCLOAK_REALM=your-realm
KEYCLOAK_CLIENT_ID=your-client-id
KEYCLOAK_CLIENT_SECRET=your-client-secret

# NextAuth Configuration
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-nextauth-secret-key

# Public Environment Variables (for frontend)
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

# Security
ENCRYPTION_KEY=your_32_character_encryption_key

# Application Configuration
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
```

## 🚀 Key Changes Made

### 1. Authentication System
- **Replaced**: Custom Nandi Auth implementation
- **Added**: NextAuth.js with Keycloak provider
- **Benefits**: Industry standard, better security, easier maintenance

### 2. Database Schema Updates
- **Updated User model**: Added NextAuth.js compatibility (String IDs)
- **Added NextAuth models**: Account, Session, VerificationToken
- **Maintained**: Existing application models and relationships

### 3. Files Created/Modified

#### New Files:
- ✅ `app/api/auth/[...nextauth]/route.ts` - NextAuth configuration
- ✅ `app/providers.tsx` - SessionProvider wrapper
- ✅ `app/api/auth/error/page.tsx` - Error handling page

#### Modified Files:
- ✅ `app/page.tsx` - Updated to use NextAuth hooks
- ✅ `app/layout.tsx` - Added SessionProvider
- ✅ `prisma/schema.prisma` - NextAuth.js compatibility
- ✅ `.env.example` - Keycloak environment variables
- ✅ `docker-compose.yml` - Updated environment variables
- ✅ `package.json` - Added NextAuth.js dependencies

#### Removed Files:
- ❌ `app/api/auth/callback/` - Replaced by NextAuth
- ❌ `app/api/auth/session/` - Replaced by NextAuth

## 🔄 Keycloak Server Setup

### 1. Create Keycloak Client

1. **Login to Keycloak Admin Console**
2. **Create or Select Realm**
3. **Create New Client**:
   - **Client ID**: `social-media-portal`
   - **Client Protocol**: `openid-connect`
   - **Access Type**: `confidential`

4. **Configure Client Settings**:
   ```
   Valid Redirect URIs: https://yourdomain.com/api/auth/callback/keycloak
   Web Origins: https://yourdomain.com
   ```

5. **Get Client Secret**:
   - Go to "Credentials" tab
   - Copy the "Secret" value

### 2. Configure User Attributes (Optional)

Add custom attributes for role mapping:
- Go to Realm Settings > User Profile
- Add custom attributes as needed

### 3. User Management

Users can be:
- **Created in Keycloak**: Admin creates users directly
- **Self-registered**: Enable user registration in realm settings
- **Federated**: Connect to LDAP/Active Directory

## 🎯 Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant App
    participant NextAuth
    participant Keycloak
    participant Database
    
    User->>App: Click "Sign in with Keycloak SSO"
    App->>NextAuth: signIn('keycloak')
    NextAuth->>Keycloak: Redirect to Keycloak login
    Keycloak->>User: Show login form
    User->>Keycloak: Enter credentials
    Keycloak->>NextAuth: Return with auth code
    NextAuth->>Keycloak: Exchange code for tokens
    Keycloak->>NextAuth: Return user info & tokens
    NextAuth->>Database: Store/update user & session
    NextAuth->>App: Redirect to dashboard
    App->>User: Show authenticated dashboard
```

## 🔒 Security Features

### NextAuth.js Built-in Security:
- **CSRF Protection**: Automatic CSRF token validation
- **Secure Sessions**: Database-backed sessions with expiration
- **JWT Security**: Secure token handling and validation
- **Cookie Security**: HttpOnly, SameSite, Secure cookies

### Keycloak Security:
- **OAuth 2.0/OIDC**: Industry standard protocols
- **Multi-factor Authentication**: Built-in 2FA support
- **Role-based Access**: Fine-grained permission control
- **Session Management**: Centralized session control

## 🧪 Testing the Implementation

### 1. Local Development

1. **Start Keycloak**: Ensure Keycloak server is running
2. **Configure Environment**: Set up `.env` with Keycloak details
3. **Database Migration**: Run `npm run db:push` to update schema
4. **Start Application**: `npm run dev`
5. **Test Login**: Click "Sign in with Keycloak SSO"

### 2. Verification Steps

1. **Login Flow**: Should redirect to Keycloak, then back to dashboard
2. **Session Persistence**: Refresh should maintain authentication
3. **Logout**: Should clear session and redirect to login
4. **Error Handling**: Invalid credentials should show error page
5. **Database**: Check User, Account, Session tables for data

## 🔄 Switching Between Auth Methods

### Switch to Keycloak (This Branch):
```bash
git checkout feature/keycloak-sso
# Update environment variables for Keycloak
# Run database migration: npm run db:push
# Deploy with Keycloak configuration
```

### Switch Back to Nandi Auth:
```bash
git checkout main  # or your main branch
# Update environment variables for Nandi Auth
# Restore original database schema if needed
# Deploy with Nandi configuration
```

## 📋 Deployment Checklist

### Environment Variables:
- [ ] `KEYCLOAK_URL` - Your Keycloak server URL
- [ ] `KEYCLOAK_REALM` - Realm name in Keycloak
- [ ] `KEYCLOAK_CLIENT_ID` - Client ID from Keycloak
- [ ] `KEYCLOAK_CLIENT_SECRET` - Client secret from Keycloak
- [ ] `NEXTAUTH_URL` - Your application URL
- [ ] `NEXTAUTH_SECRET` - Random secret for NextAuth

### Keycloak Configuration:
- [ ] Client created with correct redirect URIs
- [ ] Client secret generated and configured
- [ ] Users created or registration enabled
- [ ] Realm settings configured

### Database:
- [ ] Schema updated with NextAuth models
- [ ] Existing users migrated if needed
- [ ] Database permissions configured

### Application:
- [ ] Build successful with new dependencies
- [ ] Environment variables loaded correctly
- [ ] Redirect URIs match Keycloak configuration

## 🆘 Troubleshooting

### Common Issues:

1. **"Client not found" Error**:
   - Verify `KEYCLOAK_CLIENT_ID` matches Keycloak client
   - Check realm name in `KEYCLOAK_REALM`

2. **"Invalid redirect URI" Error**:
   - Verify redirect URI in Keycloak client settings
   - Format: `https://yourdomain.com/api/auth/callback/keycloak`

3. **"Database connection" Error**:
   - Run `npx prisma db push` to update schema
   - Verify database connection

4. **Session not persisting**:
   - Check `NEXTAUTH_SECRET` is set
   - Verify database session table exists

### Debug Mode:
Set `NODE_ENV=development` to enable NextAuth debug logging.

## 📝 Notes

- **Clean Implementation**: Complete replacement of Nandi Auth
- **Production Ready**: Built with industry standards
- **Scalable**: Easy to add more OAuth providers
- **Maintainable**: Standard NextAuth.js patterns
- **Secure**: Multiple layers of security protection

This Keycloak implementation provides enterprise-grade authentication with the flexibility to switch back to Nandi Auth by simply changing branches and environment variables.