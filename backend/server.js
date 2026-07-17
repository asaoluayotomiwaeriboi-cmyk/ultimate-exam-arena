const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const os = require('os');
const session = require('express-session');
const passport = require('passport');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const examRoutes = require('./routes/exams');
const dashboardRoutes = require('./routes/dashboard');
const featuresRoutes = require('./routes/features');
const { errorHandler } = require('./middleware/errorHandler');
const Clara = require('./ai/Clara');

// If Render (or another host) mounts a secret file at /etc/secrets/.env, load it first.
// Otherwise fall back to local .env.
const secretEnvPath = '/etc/secrets/.env';
if (fs.existsSync(secretEnvPath)) {
  dotenv.config({ path: secretEnvPath });
  console.log('Loaded environment from', secretEnvPath);
} else {
  dotenv.config();
}

// Validate critical environment variables early
try {
  const validateEnv = require('./config/validateEnv');
  validateEnv();
} catch (e) {
  console.warn('Environment validation module failed to load:', e.message);
}

// Diagnostic: show whether DATABASE_URL is present and a short masked preview
const _mask = (s) => {
  if (!s) return '<empty>';
  const visible = 6;
  if (s.length <= visible * 2) return '*****';
  return `${s.slice(0, visible)}...${s.slice(-visible)}`;
};
const _dbUrl = process.env.DATABASE_URL || '';
console.log(
  'DATABASE_URL present:',
  _dbUrl ? 'yes' : 'no',
  'protocol ok:',
  _dbUrl.startsWith && (_dbUrl.startsWith('postgres://') || _dbUrl.startsWith('postgresql://'))
    ? 'yes'
    : 'no',
  'masked:',
  _mask(_dbUrl)
);

// Require DB and passport after environment is loaded so DATABASE_URL is available.
const db = require('./config/db');
const passportConfig = require('./config/passport');
const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Initialize AI assistants
const tylaAI = new Clara();
// Placeholder for additional AI assistant (Chris). Implement or replace with real client.
const chrisAI = {
  validateQuestion: async () => ({ message: 'Not implemented' }),
  suggestQuestionFormat: async () => ({ message: 'Not implemented' }),
  getQuestionCreationTips: async () => [],
  validateBulkImport: async () => ({}),
};

app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'ultimate-exam-arena-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/features', featuresRoutes);

// Simple public health endpoints for platform probes
app.get('/health', (_req, res) => {
  res.json({ success: true, uptime: process.uptime() });
});

// Accept common typo for convenience
app.get('/healtz', (_req, res) => {
  res.json({ success: true, uptime: process.uptime(), note: 'alias for /health' });
});

// AI Assistant endpoints
app.post('/api/ai/tyla/ask', async (req, res) => {
  const response = await tylaAI.askQuestion(req.body.question);
  res.json({ success: true, data: response });
});

app.post('/api/ai/tyla/exam-tips', async (req, res) => {
  const tips = await tylaAI.getExamTips(req.body.subject);
  res.json({ success: true, data: tips });
});

app.post('/api/ai/tyla/analyze', async (req, res) => {
  const feedback = await tylaAI.analyzePerformance(req.body.performanceData);
  res.json({ success: true, data: feedback });
});

app.post('/api/ai/chris/validate-question', async (req, res) => {
  const validation = await chrisAI.validateQuestion(req.body.question);
  res.json({ success: true, data: validation });
});

app.post('/api/ai/chris/question-format', async (req, res) => {
  const format = await chrisAI.suggestQuestionFormat(req.body.subject, req.body.examBody);
  res.json({ success: true, data: format });
});

app.post('/api/ai/chris/question-tips', async (req, res) => {
  const tips = await chrisAI.getQuestionCreationTips();
  res.json({ success: true, data: tips });
});

app.post('/api/ai/chris/validate-bulk', async (req, res) => {
  const validation = await chrisAI.validateBulkImport(req.body.questions);
  res.json({ success: true, data: validation });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, message: 'API route not found' });
});

// Serve secret admin login page at /admin-login (no public link)
app.get('/admin-login', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'admin-login.html'));
});

app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.use(errorHandler);

function getLocalIPs() {
  const nets = os.networkInterfaces();
  const results = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        results.push(net.address);
      }
    }
  }
  return results;
}

const startServer = async () => {
  try {
    if (db.ready) {
      await db.ready;
    }

    const server = app.listen(PORT, HOST, () => {
      const localIPs = getLocalIPs();
      console.log(`Ultimate Exam Arena server running on http://${HOST}:${PORT}`);
      if (HOST === '0.0.0.0' && localIPs.length) {
        console.log(`Accessible on local network at:
  ${localIPs.map((ip) => `http://${ip}:${PORT}`).join('\n  ')}`);
      }
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(
          `Port ${PORT} is already in use. Stop the running process or set a different PORT in your .env file.`
        );
        process.exit(1);
      }
      console.error('Server error:', error);
      process.exit(1);
    });
  } catch (error) {
    console.error('Failed to initialize database before starting:', error);
    process.exit(1);
  }
};

startServer();
