# Frontend OAuth Integration Examples

This document provides code examples for integrating Google OAuth2 into the frontend.

## HTML/Vanilla JavaScript

### Simple Login Page

```html
<!DOCTYPE html>
<html>
  <head>
    <title>CBT Login</title>
    <style>
      .auth-container {
        max-width: 400px;
        margin: 50px auto;
        padding: 20px;
        border: 1px solid #ccc;
        border-radius: 8px;
      }

      .auth-form {
        margin-bottom: 20px;
      }

      .form-group {
        margin-bottom: 15px;
      }

      input {
        width: 100%;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        box-sizing: border-box;
      }

      button {
        width: 100%;
        padding: 10px;
        margin-top: 10px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
      }

      .login-btn {
        background-color: #007bff;
        color: white;
      }

      .oauth-btn {
        background-color: #4285f4;
        color: white;
        text-decoration: none;
        display: block;
        text-align: center;
      }

      .oauth-btn:hover {
        background-color: #1f73e7;
      }

      .divider {
        text-align: center;
        margin: 20px 0;
        position: relative;
      }

      .divider::before {
        content: 'or';
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        padding: 0 10px;
      }
    </style>
  </head>
  <body>
    <div class="auth-container">
      <h2>Login to CBT Platform</h2>

      <!-- Traditional Login -->
      <div class="auth-form">
        <h3>Email & Password</h3>
        <div class="form-group">
          <input type="email" id="email" placeholder="Email" />
        </div>
        <div class="form-group">
          <input type="password" id="password" placeholder="Password" />
        </div>
        <button class="login-btn" onclick="handleTraditionalLogin()">Sign In</button>
      </div>

      <div class="divider"></div>

      <!-- OAuth Login -->
      <a href="http://localhost:4000/api/auth/google" class="oauth-btn"> Sign in with Google </a>
    </div>

    <script>
      async function handleTraditionalLogin() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
          const response = await fetch('http://localhost:4000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          const data = await response.json();

          if (data.success) {
            localStorage.setItem('token', data.token);
            window.location.href = '/dashboard';
          } else {
            alert('Login failed: ' + data.message);
          }
        } catch (error) {
          alert('Error: ' + error.message);
        }
      }

      // Handle OAuth callback
      window.addEventListener('load', () => {
        const token = new URLSearchParams(window.location.search).get('token');
        if (token) {
          localStorage.setItem('token', token);
          window.history.replaceState({}, document.title, window.location.pathname);
          window.location.href = '/dashboard';
        }
      });
    </script>
  </body>
</html>
```

## React Component Examples

### Login Component

```jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Handle OAuth callback on mount
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (token) {
      localStorage.setItem('token', token);
      window.history.replaceState({}, document.title, window.location.pathname);
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleTraditionalLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        navigate('/dashboard');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:4000/api/auth/google';
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>CBT Platform</h1>

        {error && <div className="error-message">{error}</div>}

        {/* Traditional Login */}
        <form onSubmit={handleTraditionalLogin}>
          <h2>Sign In</h2>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="divider">or</div>

        {/* OAuth Login */}
        <button className="oauth-button" onClick={handleGoogleLogin}>
          <img src="google-logo.png" alt="Google" />
          Sign in with Google
        </button>

        <p className="signup-link">
          Don't have an account? <a href="/signup">Sign up</a>
        </p>
      </div>
    </div>
  );
}
```

### Protected Route Component

```jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await fetch('http://localhost:4000/api/auth/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          setAuthenticated(true);
        } else {
          localStorage.removeItem('token');
          navigate('/login');
        }
      } catch (error) {
        console.error('Auth verification failed:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [navigate]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return authenticated ? children : null;
}
```

### API Client Hook

```jsx
import { useCallback } from 'react';

export function useAPI() {
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  const request = useCallback(async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers,
      },
    });

    if (response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
      return null;
    }

    return response.json();
  }, []);

  const get = useCallback(
    (url) => {
      return request(url);
    },
    [request]
  );

  const post = useCallback(
    (url, data) => {
      return request(url, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    [request]
  );

  return { request, get, post };
}

// Usage in components
export function useProfile() {
  const { get } = useAPI();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const data = await get('http://localhost:4000/api/auth/profile');
      if (data?.success) {
        setProfile(data.user);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [get]);

  return { profile, loading };
}
```

### Logout Button

```jsx
import { useNavigate } from 'react-router-dom';

export function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:4000/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      navigate('/login');
    }
  };

  return (
    <button onClick={handleLogout} className="logout-btn">
      Logout
    </button>
  );
}
```

## CSS Styling

```css
/* Login page styling */
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  background: white;
  padding: 40px;
  border-radius: 10px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 400px;
}

.login-card h1 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
}

.login-card h2 {
  font-size: 18px;
  color: #555;
  margin-bottom: 20px;
}

.login-card form {
  margin-bottom: 30px;
}

.login-card input {
  width: 100%;
  padding: 12px;
  margin-bottom: 15px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 14px;
  transition: border-color 0.3s;
}

.login-card input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.login-card button {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.login-card button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

button[type='submit'] {
  background-color: #667eea;
  color: white;
  margin-top: 10px;
}

button[type='submit']:hover:not(:disabled) {
  background-color: #5568d3;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.oauth-button {
  background-color: #4285f4;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.oauth-button:hover {
  background-color: #1f73e7;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(66, 133, 244, 0.4);
}

.oauth-button img {
  width: 20px;
  height: 20px;
}

.divider {
  text-align: center;
  margin: 30px 0;
  position: relative;
  color: #999;
}

.divider::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 100%;
  height: 1px;
  background-color: #ddd;
  z-index: 0;
}

.divider {
  position: relative;
  z-index: 1;
  background: white;
  padding: 0 10px;
}

.error-message {
  background-color: #fee;
  color: #c33;
  padding: 12px;
  border-radius: 5px;
  margin-bottom: 20px;
  border-left: 4px solid #c33;
}

.signup-link {
  text-align: center;
  margin-top: 20px;
  color: #666;
}

.signup-link a {
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
}

.signup-link a:hover {
  text-decoration: underline;
}

.logout-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 600;
}

.logout-btn:hover {
  background-color: #c82333;
}
```

## Environment Configuration

```javascript
// .env.example (frontend)
REACT_APP_API_URL=http://localhost:4000
REACT_APP_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com

// .env.local (development)
REACT_APP_API_URL=http://localhost:4000
REACT_APP_GOOGLE_CLIENT_ID=your_dev_client_id.apps.googleusercontent.com

// .env.production (production)
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_GOOGLE_CLIENT_ID=your_prod_client_id.apps.googleusercontent.com
```

## Testing OAuth Integration

### Postman Collection

```json
{
  "info": {
    "name": "CBT OAuth API",
    "version": "1.0"
  },
  "item": [
    {
      "name": "Traditional Login",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/auth/login",
        "body": {
          "mode": "raw",
          "raw": "{\"email\":\"user@example.com\",\"password\":\"Password123!\"}"
        }
      }
    },
    {
      "name": "Get Profile",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/api/auth/profile",
        "header": {
          "Authorization": "Bearer {{token}}"
        }
      }
    },
    {
      "name": "Logout",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/auth/logout"
      }
    }
  ]
}
```

## Troubleshooting

### Token Not Persisting

```javascript
// Check if localStorage is available
if (typeof Storage !== 'undefined') {
  localStorage.setItem('token', token);
} else {
  // Use sessionStorage or alternative
  sessionStorage.setItem('token', token);
}
```

### CORS Issues

```javascript
// If frontend runs on different port:
// Update backend server.js CORS:
app.use(
  cors({
    origin: 'http://localhost:3000', // Frontend URL
    credentials: true,
  })
);
```

### OAuth Redirect Loop

```javascript
// Ensure callback URL is exact match:
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback
// No trailing slash, exact protocol/port
```

---

**Note**: Update `http://localhost:4000` and `http://localhost:3000` with your actual domain URLs in production.
