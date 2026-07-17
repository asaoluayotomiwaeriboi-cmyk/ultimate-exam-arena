const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const User = require('../models/User');
const Result = require('../models/Result');

const signToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

const getClientIP = (req) => {
  return (
    req.ip ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null)
  );
};

const calculateThreatLevel = (user) => {
  let level = 0;
  if (user.loginAttempts > 5) level = 2;
  else if (user.loginAttempts > 2) level = 1;
  if (user.lockedUntil && user.lockedUntil > Date.now()) level = 2;
  return level;
};

exports.register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      dateOfBirth,
      address,
      city,
      state,
      lga,
      school,
      jambNumber,
      targetUniversity,
      targetCourse,
      password,
      confirmPassword,
    } = req.body;

    // Validate required fields
    if (
      !name ||
      !email ||
      !phone ||
      !dateOfBirth ||
      !address ||
      !city ||
      !state ||
      !lga ||
      !school ||
      !password
    ) {
      return res
        .status(400)
        .json({ success: false, message: 'All required fields must be filled' });
    }

    // Validate password match
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    // Validate password strength (min 8 chars)
    if (password.length < 8) {
      return res
        .status(400)
        .json({ success: false, message: 'Password must be at least 8 characters' });
    }

    // Check if email already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Create user with all details
    const user = await User.create({
      name,
      email,
      phone,
      dateOfBirth,
      address,
      city,
      state,
      lga,
      school,
      jambNumber: jambNumber || null,
      targetUniversity: targetUniversity || null,
      targetCourse: targetCourse || null,
      password: hashed,
      role: 'student',
    });

    const token = signToken(user.id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        state: user.state,
        school: user.school,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password, mfaToken, adminCode } = req.body;
    const clientIP = getClientIP(req);

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > Date.now()) {
      return res
        .status(423)
        .json({ success: false, message: 'Account locked due to too many failed attempts' });
    }

    // For admin, require adminCode
    if (user.role === 'admin' && adminCode !== 'ADMIN2010') {
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) user.lockedUntil = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
      await user.save();
      return res.status(401).json({ success: false, message: 'Invalid admin code' });
    }

    // IP whitelisting for admin
    if (
      user.role === 'admin' &&
      user.ipWhitelist.length > 0 &&
      !user.ipWhitelist.includes(clientIP)
    ) {
      user.loginAttempts += 1;
      user.threatLevel = Math.max(user.threatLevel, 2);
      await user.save();
      return res.status(403).json({ success: false, message: 'IP not whitelisted' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) user.lockedUntil = Date.now() + 2 * 60 * 60 * 1000;
      user.threatLevel = calculateThreatLevel(user);
      await user.save();
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // MFA check
    if (user.mfaEnabled) {
      if (!mfaToken) {
        return res.status(401).json({ success: false, message: 'MFA token required' });
      }
      const verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: mfaToken,
        window: 2,
      });
      if (!verified) {
        user.loginAttempts += 1;
        user.threatLevel = calculateThreatLevel(user);
        await user.save();
        return res.status(401).json({ success: false, message: 'Invalid MFA token' });
      }
    }

    // Successful login
    user.loginAttempts = 0;
    user.lockedUntil = null;
    user.lastLogin = Date.now();
    user.threatLevel = 0;
    await user.save();

    const token = signToken(user.id);
    const history = await Result.find({ student: user.id, limit: 10 });
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        threatLevel: user.threatLevel,
      },
      history,
    });
  } catch (error) {
    next(error);
  }
};

exports.googleCallback = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication failed' });
    }

    const user = req.user;
    user.loginAttempts = 0;
    user.lockedUntil = null;
    user.threatLevel = 0;
    user.lastLogin = Date.now();
    await user.save();

    const token = signToken(user.id);
    const history = await Result.find({ student: user.id, limit: 10 });

    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}?token=${token}`;
    res.redirect(redirectUrl);
  } catch (error) {
    next(error);
  }
};

exports.logout = (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
};

exports.setupMFA = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const secret = speakeasy.generateSecret({
      name: 'Ultimate Exam Arena Admin',
      issuer: 'Ultimate Exam Arena',
    });
    user.mfaSecret = secret.base32;
    await user.save();
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
    res.json({ success: true, qrCodeUrl, secret: secret.base32 });
  } catch (error) {
    next(error);
  }
};

exports.enableMFA = async (req, res, next) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 2,
    });
    if (!verified) {
      return res.status(400).json({ success: false, message: 'Invalid token' });
    }
    user.mfaEnabled = true;
    await user.save();
    res.json({ success: true, message: 'MFA enabled' });
  } catch (error) {
    next(error);
  }
};

exports.updateIPWhitelist = async (req, res, next) => {
  try {
    const { ips } = req.body;
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    user.ipWhitelist = ips;
    await user.save();
    res.json({ success: true, message: 'IP whitelist updated' });
  } catch (error) {
    next(error);
  }
};

exports.profile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const history = await Result.find({ student: user.id, limit: 10 });
    res.json({ success: true, user: user.toObject(), history });
  } catch (error) {
    next(error);
  }
};

const adminAttemptStore = new Map();

exports.adminLogin = async (req, res, next) => {
  try {
    const { email, password, accessCode } = req.body;
    const clientIP = getClientIP(req);

    if (!email || !password || !accessCode) {
      return res
        .status(400)
        .json({ success: false, message: 'Email, password, and access code are required' });
    }

    const MAX_ATTEMPTS = parseInt(process.env.ADMIN_MAX_ATTEMPTS || '5', 10);
    const LOCKOUT_MS = parseInt(process.env.ADMIN_LOCKOUT_MS || String(30 * 60 * 1000), 10); // 30 mins
    const RATE_WINDOW_MS = 60 * 1000; // 1 minute
    const RATE_LIMIT = parseInt(process.env.ADMIN_RATE_LIMIT || '20', 10); // max attempts per minute

    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@ultimateexamarena.com';
    const key = email === ADMIN_EMAIL ? email : clientIP;
    const now = Date.now();
    const record = adminAttemptStore.get(key) || { attempts: 0, timestamps: [], lockedUntil: null };

    const recordFailure = () => {
      record.attempts += 1;
      record.timestamps.push(now);
      record.timestamps = record.timestamps.filter((t) => t > now - RATE_WINDOW_MS);
      if (record.attempts >= MAX_ATTEMPTS) {
        record.lockedUntil = now + LOCKOUT_MS;
      }
      adminAttemptStore.set(key, record);
    };

    const respondFailure = (message) => {
      if (record.lockedUntil && record.lockedUntil > now) {
        return res.status(429).json({
          success: false,
          message: 'Too many failed attempts. Please try again later.',
          lockedUntil: record.lockedUntil,
        });
      }
      return res.status(401).json({ success: false, message });
    };

    // Clean old timestamps and check rate limit
    record.timestamps = record.timestamps.filter((t) => t > now - RATE_WINDOW_MS);
    if (record.timestamps.length >= RATE_LIMIT) {
      record.lockedUntil = now + LOCKOUT_MS;
      adminAttemptStore.set(key, record);
      return res.status(429).json({ success: false, message: 'Too many requests, try again later', lockedUntil: record.lockedUntil });
    }

    // Check existing lockout
    if (record.lockedUntil && record.lockedUntil > now) {
      return res.status(429).json({ success: false, message: 'Locked', lockedUntil: record.lockedUntil });
    }

    // Verify admin email
    if (email !== ADMIN_EMAIL) {
      recordFailure();
      return respondFailure('Invalid credentials');
    }

    // Verify access code
    const ADMIN_ACCESS_CODE = process.env.ADMIN_ACCESS_CODE || 'UEA-ADMIN-7749';
    if (accessCode !== ADMIN_ACCESS_CODE) {
      recordFailure();
      return respondFailure('Invalid credentials');
    }

    // Verify password — support plain env password for local testing
    const adminPasswordPlain = process.env.ADMIN_PASSWORD || 'admin1234';
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH || null;
    let passwordMatch = false;
    if (adminPasswordHash) {
      passwordMatch = await bcrypt.compare(password, adminPasswordHash);
    } else {
      passwordMatch = password === adminPasswordPlain;
    }

    if (!passwordMatch) {
      recordFailure();
      return respondFailure('Invalid credentials');
    }

    // Passed all checks — reset attempts
    adminAttemptStore.delete(key);

    // Check IP whitelist if configured
    const whitelist = process.env.ADMIN_IP_WHITELIST?.split(',').map((ip) => ip.trim()) || [];
    if (whitelist.length > 0 && !whitelist.includes(clientIP)) {
      return res.status(403).json({ success: false, message: 'IP not whitelisted' });
    }

    const token = jwt.sign(
      {
        id: 'admin',
        role: 'admin',
        email: email,
      },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: 'admin',
        email: email,
        role: 'admin',
        name: 'Administrator',
      },
    });
  } catch (error) {
    next(error);
  }
};
