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
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    const token = signToken(req.user.id);
    res.redirect(`/dashboard.html?token=${token}`);
  }
);

// Logout
router.post('/logout', logout);
router.get('/logout', logout);

// MFA
router.post('/mfa/setup', protect, adminOnly, setupMFA);
router.post('/mfa/enable', protect, adminOnly, enableMFA);
router.post('/ip-whitelist', protect, adminOnly, updateIPWhitelist);

module.exports = router;
