# Google OAuth2 Implementation Guide

## Overview

This document explains the Google OAuth2 authentication implementation for the CBT platform. The system now supports both traditional JWT-based authentication and modern OAuth2 flow with Google.

## Architecture

### Components Added

1. **Passport Strategies** (`backend/config/passport.js`) - Handles user serialization and deserialization
2. **OAuth Configuration** (`backend/config/oauth.js`) - Google OAuth2 strategy setup
3. **OAuth Endpoints** (in `backend/routes/auth.js`):
   - `GET /api/auth/google` - Start OAuth flow
   - `GET /api/auth/google/callback` - Handle OAuth callback
4. **OAuth Controller** (in `backend/controllers/authController.js`) - Handle OAuth callbacks
5. **Session Management** (`backend/server.js`) - Express session configuration
6. **Database Schema Update** - OAuth fields added to users table

### Key Features

- ✅ Backward compatible with existing JWT authentication
- ✅ Password-based login continues to work
- ✅ OAuth users automatically create accounts on first login
- ✅ Linking OAuth to existing email accounts
- ✅ Secure token storage
- ✅ Session-based OAuth + JWT token generation

## Setup Instructions

### 1. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google+ API
4. Go to "Credentials" and create OAuth 2.0 Client ID
5. Choose "Web application"
6. Add authorized redirect URIs:
   - Development: `http://localhost:4000/api/auth/google/callback`
   - Production: `https://yourdomain.com/api/auth/google/callback`
7. Copy your **Client ID** and **Client Secret**

### 2. Update Environment Variables

Edit `.env` file with your credentials:

```env
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback
FRONTEND_URL=http://localhost:3000
SESSION_SECRET=your-secure-random-string
NODE_ENV=development
```

### 3. Install Dependencies

Dependencies have been added to `package.json`:

- `passport` - Authentication middleware
- `passport-google-oauth20` - Google OAuth strategy
- `express-session` - Session management

If not installed, run:

```bash
npm install
```

### 4. Database Migration

The database schema has been automatically updated with OAuth fields when the server starts:

- `googleId` - Google unique identifier
- `googleAccessToken` - OAuth access token
- `googleRefreshToken` - OAuth refresh token
- `password` - Now nullable (for OAuth users)

Existing users' tables will be preserved.

## API Endpoints

### OAuth Flow

**Start OAuth Login**

```
GET /api/auth/google
```

Redirects to Google login page.

**OAuth Callback** (handled automatically)

```
GET /api/auth/google/callback
```

After user authorizes, redirected here with auth code.
Creates JWT token and redirects to frontend with token in query param:

```
http://localhost:3000?token=eyJhbGc...
```

### Traditional Authentication (Still Works)

**Register**

```
POST /api/auth/signup
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Login**

```
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

Response:

```json
{
  "success": true,
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "student"
  }
}
```

### Protected Routes

All existing protected routes work with both JWT and OAuth:

**Get Profile**

```
GET /api/auth/profile
Authorization: Bearer {JWT_TOKEN}
```

**Logout**

```
POST /api/auth/logout
or
GET /api/auth/logout
```

## Frontend Integration

### OAuth Login Button

Add this to your frontend (HTML/React):

```html
<!-- Simple Link -->
<a href="http://localhost:4000/api/auth/google" class="oauth-btn"> Sign in with Google </a>
```

```jsx
// React Component
<button
  onClick={() => {
    window.location.href = 'http://localhost:4000/api/auth/google';
  }}
>
  Sign in with Google
</button>
```

### Handle OAuth Redirect

After OAuth callback, the frontend receives token in URL:

```jsx
// React - Extract token from query params
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  if (token) {
    // Store token in localStorage
    localStorage.setItem('token', token);
    // Clear URL params
    window.history.replaceState({}, document.title, window.location.pathname);
    // Redirect to dashboard
    navigate('/dashboard');
  }
}, []);
```

### API Requests with Token

```javascript
// Using stored JWT token
const headers = {
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
};

fetch('/api/auth/profile', { headers })
  .then((r) => r.json())
  .then((data) => console.log(data));
```

## User Data Flow

### First-time OAuth User

1. User clicks "Sign in with Google"
2. Redirected to Google login
3. User authorizes app
4. Google redirects to callback with auth code
5. Backend exchanges code for user profile
6. **New user account created** with Google profile data
7. JWT token generated
8. Frontend receives token and can access protected routes

### Existing User Linking

1. User with account logs in via OAuth using same email
2. Backend finds existing user by email
3. **Links Google account** to existing user
4. Updates OAuth tokens
5. Generates JWT token
6. User seamlessly continues with their existing account

### Returning OAuth User

1. User logs in with Google
2. Backend finds user by googleId
3. Updates last login
4. Generates fresh JWT token
5. User authenticated

## Security Considerations

### ✅ Implemented

- OAuth tokens stored in database
- Session-based for sensitive operations
- JWT tokens have 1-hour expiration
- HTTPS recommended for production
- Secure cookie settings in production mode
- Password now optional (nullable for OAuth users)

### ⚠️ Additional Recommendations

- Use environment variables for all secrets (done ✓)
- Enable HTTPS in production
- Implement CSRF protection if needed
- Add rate limiting to auth endpoints
- Monitor failed OAuth attempts
- Use refresh tokens for long-lived sessions

## Troubleshooting

### OAuth Callback Error

**Problem**: Redirect URI mismatch
**Solution**: Verify `GOOGLE_CALLBACK_URL` in .env matches Google Cloud Console settings

### Session Errors

**Problem**: "passport.initialize()" not found
**Solution**: Ensure `backend/config/passport.js` is required in server.js

### User Not Created

**Problem**: OAuth user not appearing in database
**Solution**: Check database permissions and ensure OAuth fields exist in users table

### Token Not Generated

**Problem**: Blank token in redirect URL
**Solution**: Ensure `JWT_SECRET` is set in .env and `googleCallback` completes successfully

### Email Already Exists Error

**Problem**: User tries OAuth with existing email
**Solution**: This is handled automatically - existing user account is linked

## Testing OAuth Flow

### Local Testing

1. Start backend: `npm run dev`
2. Start frontend (if separate): `npm start` or similar
3. Click "Sign in with Google" button
4. Complete Google authentication
5. Should redirect back with JWT token

### Testing Password Login (Verify Not Broken)

1. Register new account: `POST /api/auth/signup`
2. Login with email/password: `POST /api/auth/login`
3. Should receive JWT token
4. Token should work with protected routes

## Database Schema Updates

New fields in `users` table:

```sql
googleId TEXT UNIQUE           -- Google's unique user identifier
googleAccessToken TEXT         -- OAuth access token
googleRefreshToken TEXT        -- OAuth refresh token
password TEXT                  -- Made nullable (was NOT NULL)
```

## File Changes Summary

### New Files

- `backend/config/oauth.js` - Google OAuth strategy
- `backend/config/passport.js` - Passport configuration

### Modified Files

- `backend/server.js` - Added session and passport middleware
- `backend/routes/auth.js` - Added OAuth endpoints
- `backend/controllers/authController.js` - Added OAuth callback handler
- `backend/middleware/auth.js` - Added optional auth middleware
- `backend/models/User.js` - Added OAuth fields to model
- `backend/config/db.js` - Updated schema with OAuth fields
- `package.json` - Added new dependencies
- `.env` - Added OAuth configuration
- `.env.example` - Added OAuth configuration example

## Future Enhancements

Possible improvements:

- Add more OAuth providers (GitHub, Microsoft, Facebook)
- Implement refresh token rotation
- Add OAuth token refresh endpoint
- Store OAuth scope/permissions for audit
- Add disconnect OAuth account feature
- Implement account linking UI

## Support

For issues or questions:

1. Check Google Cloud Console OAuth settings
2. Verify all environment variables are set
3. Check browser console for errors
4. Check server logs for detailed errors
5. Ensure database migrations ran successfully
