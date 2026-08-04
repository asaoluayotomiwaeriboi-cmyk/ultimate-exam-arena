const express = require('express');
const passport = require('passport');
const {
  register,
  login,
  profile,
  setupMFA,
  enableMFA,
  updateIPWhitelist,
  googleCallback,
  logout,
  adminLogin,
  signToken,
} = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Traditional auth
router.post('/signup', register);
router.post('/login', login);
router.post('/admin-login', adminLogin);
router.get('/profile', protect, profile);

// OAuth2 - Google
router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({
      success: false,
      message: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
    });
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({
      success: false,
      message: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
    });
  }

  passport.authenticate('google', { failureRedirect: '/login.html?oauth=failed' })(req, res, next);
}, (req, res) => {
  const token = signToken(req.user.id);
  const frontendBaseUrl =
    process.env.FRONTEND_URL || process.env.BASE_URL || `http://localhost:${process.env.PORT || 5002}`;
  res.redirect(`${frontendBaseUrl.replace(/\/$/, '')}/dashboard.html?token=${token}`);
});

// Logout
router.post('/logout', logout);
router.get('/logout', logout);

// MFA
router.post('/mfa/setup', protect, adminOnly, setupMFA);
router.post('/mfa/enable', protect, adminOnly, enableMFA);
router.post('/ip-whitelist', protect, adminOnly, updateIPWhitelist);

module.exports = router;
