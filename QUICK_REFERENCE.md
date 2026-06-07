# Google OAuth2 - Quick Reference Guide

## TL;DR - What You Need to Do

### 1. Get Google Credentials (5 minutes)
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Create OAuth 2.0 Web credentials
- Copy **Client ID** and **Client Secret**

### 2. Configure Environment (2 minutes)
Edit `.env`:
```
GOOGLE_CLIENT_ID=your_id_here
GOOGLE_CLIENT_SECRET=your_secret_here
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback
SESSION_SECRET=any_random_string
```

### 3. Install & Start (1 minute)
```bash
npm install
npm run dev
```

### 4. Add Frontend Button (2 minutes)
```html
<a href="http://localhost:4000/api/auth/google">
  Sign in with Google
</a>
```

### 5. Handle OAuth Token (3 minutes)
```javascript
const token = new URLSearchParams(window.location.search).get('token');
if (token) {
  localStorage.setItem('token', token);
  // Redirect to dashboard
}
```

---

## API Endpoints

### OAuth Login
```
GET /api/auth/google
```
→ Redirects user to Google login

### OAuth Callback (Automatic)
```
GET /api/auth/google/callback
```
→ Backend handles automatically, redirects to frontend with token

### Traditional Login (Still Works)
```
POST /api/auth/login
Content-Type: application/json

{"email": "user@example.com", "password": "password"}
```

### Get Authenticated User
```
GET /api/auth/profile
Authorization: Bearer <JWT_TOKEN>
```

### Logout
```
POST /api/auth/logout
Authorization: Bearer <JWT_TOKEN>
```

---

## Frontend Integration - Copy & Paste

### React Login Component
```jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    // Handle OAuth callback
    const token = new URLSearchParams(window.location.search).get('token');
    if (token) {
      localStorage.setItem('token', token);
      navigate('/dashboard');
    }
  }, [navigate]);

  return (
    <>
      <h1>Login</h1>
      <a href="http://localhost:4000/api/auth/google" className="btn">
        Sign in with Google
      </a>
    </>
  );
}
```

### API Request Helper
```javascript
const API_URL = 'http://localhost:4000';

async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }

  return response.json();
}

// Usage
const profile = await apiCall('/api/auth/profile');
```

### Environment Variables (React)
```
# .env
REACT_APP_API_URL=http://localhost:4000
```

---

## How It Works

```
┌─────────────────────────────────────────────────────┐
│ User clicks "Sign in with Google"                   │
└──────────────────┬──────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────┐
│ Browser redirects to:                               │
│ GET /api/auth/google                                │
└──────────────────┬──────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────┐
│ Server redirects to Google OAuth login               │
└──────────────────┬──────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────┐
│ User logs in with Google account                    │
│ User authorizes app                                 │
└──────────────────┬──────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────┐
│ Google redirects back to:                           │
│ GET /api/auth/google/callback?code=...             │
└──────────────────┬──────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────┐
│ Backend exchanges code for Google profile           │
│ Creates/Links user in database                      │
│ Generates JWT token                                 │
└──────────────────┬──────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────┐
│ Server redirects to:                                │
│ http://localhost:3000?token=eyJhbGc...             │
└──────────────────┬──────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────┐
│ Frontend extracts token from URL                    │
│ Stores in localStorage                              │
│ Redirects to /dashboard                             │
└──────────────────┬──────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────┐
│ Can now use token to access protected API routes    │
└─────────────────────────────────────────────────────┘
```

---

## User Journey Examples

### First-Time OAuth User
1. Clicks "Sign in with Google"
2. Logs in with Google account
3. Authorizes app
4. **New account created automatically**
5. Receives JWT token
6. Logged in ✅

### Existing User (OAuth)
1. Clicks "Sign in with Google"
2. Logs in with Google account
3. **Account linked** to existing email
4. Receives JWT token
5. Logged in ✅

### Existing User (Password)
1. Enters email and password
2. Credentials validated
3. Receives JWT token
4. Logged in ✅

### Account Linking
1. Register with: email `user@example.com` + password
2. Login via Google with email `user@example.com`
3. **Google linked to existing account**
4. Can now use both methods ✅

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "OAuth redirect URI mismatch" | Ensure `GOOGLE_CALLBACK_URL` matches Google Cloud Console |
| "Cannot find module 'passport'" | Run `npm install` |
| "Token is undefined" | Check that `FRONTEND_URL` is set and correct |
| "User not created" | Verify database schema was updated (check `googleId` column exists) |
| "Session not working" | Verify `SESSION_SECRET` is set in `.env` |
| "Frontend can't access API" | Check CORS settings and API URL in frontend |

---

## Files Changed

### New Files
- `backend/config/oauth.js` - OAuth strategy
- `backend/config/passport.js` - Passport setup

### Modified Files
- `backend/server.js` - Added session & passport middleware
- `backend/routes/auth.js` - Added OAuth routes
- `backend/controllers/authController.js` - Added OAuth handler
- `backend/middleware/auth.js` - Added optional auth
- `backend/models/User.js` - Added OAuth fields
- `backend/config/db.js` - Updated schema
- `package.json` - Added 3 dependencies
- `.env` - Added OAuth config
- `.env.example` - Added OAuth config example

### Documentation
- `OAUTH_SETUP.md` - Full setup guide
- `OAUTH_CHECKLIST.md` - Implementation checklist
- `FRONTEND_OAUTH_EXAMPLES.md` - Integration examples
- `IMPLEMENTATION_SUMMARY.md` - What was done
- `QUICK_REFERENCE.md` - This file

---

## Configuration Checklist

- [ ] Google credentials obtained
- [ ] `GOOGLE_CLIENT_ID` set in `.env`
- [ ] `GOOGLE_CLIENT_SECRET` set in `.env`
- [ ] `GOOGLE_CALLBACK_URL` set correctly
- [ ] `SESSION_SECRET` set in `.env`
- [ ] `FRONTEND_URL` set in `.env`
- [ ] `npm install` run
- [ ] Server starts with `npm run dev`
- [ ] OAuth button added to frontend
- [ ] Frontend handles token from URL
- [ ] API requests use token in Authorization header
- [ ] Traditional login still works
- [ ] Protected routes return 401 without token

---

## Environment Variables Needed

```env
# OAuth
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback

# Session
SESSION_SECRET=random_secret_string

# Frontend
FRONTEND_URL=http://localhost:3000

# Existing (unchanged)
PORT=4000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/ultimate_cbt
JWT_SECRET=your_jwt_secret
```

---

## Testing Checklist

- [ ] Click OAuth button → redirects to Google
- [ ] Complete Google login → gets token
- [ ] Token passed to frontend → stored in localStorage
- [ ] Can access `/api/auth/profile` with token
- [ ] Token valid for 1 hour
- [ ] Logout clears token
- [ ] Password login still works
- [ ] Same email OAuth + password → linked account

---

## Security Reminders

✅ Don't commit `.env` with real credentials
✅ Use HTTPS in production
✅ Keep `SESSION_SECRET` and `JWT_SECRET` secret
✅ Monitor login attempts
✅ Update dependencies regularly
✅ Use HTTPS for Google OAuth in production
✅ Set `NODE_ENV=production` in production

---

## Next Steps

1. **Get Google Credentials** (if not done)
   - Visit Google Cloud Console
   - Create OAuth 2.0 credentials
   - Copy Client ID and Secret

2. **Configure Backend** (if not done)
   - Update `.env` with credentials
   - Run `npm install`
   - Start server: `npm run dev`

3. **Update Frontend**
   - Add OAuth button
   - Handle token from URL params
   - Use token in API requests

4. **Test**
   - Try OAuth login
   - Try password login
   - Try accessing protected routes

5. **Deploy**
   - Update Google OAuth URI for production
   - Update `.env` with production URLs
   - Test in production environment

---

## Support Resources

- **Google OAuth Docs**: https://developers.google.com/identity/protocols/oauth2
- **Passport.js**: http://www.passportjs.org/
- **Backend Setup**: See `OAUTH_SETUP.md`
- **Frontend Examples**: See `FRONTEND_OAUTH_EXAMPLES.md`
- **Implementation Details**: See `IMPLEMENTATION_SUMMARY.md`

---

**Version**: 1.0
**Status**: ✅ Complete & Ready
**Backward Compatibility**: ✅ 100%
**Production Ready**: ✅ Yes (with Google credentials)
