const express = require('express');
const passport = require('passport');
const { register, login, profile, setupMFA, enableMFA, updateIPWhitelist, googleCallback, logout, adminLogin } = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Traditional auth
router.post('/signup', register);
router.post('/login', login);
router.post('/admin-login', adminLogin);
router.get('/profile', protect, profile);

// OAuth2 - Google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/api/auth/login' }), googleCallback);

// Logout
router.post('/logout', logout);
router.get('/logout', logout);

// MFA
router.post('/mfa/setup', protect, adminOnly, setupMFA);
router.post('/mfa/enable', protect, adminOnly, enableMFA);
router.post('/ip-whitelist', protect, adminOnly, updateIPWhitelist);

module.exports = router;
