const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const databasePath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'database', 'ultimate-exam-arena.db');

// Validate DATABASE_URL early to avoid pg throwing an uncaught ERR_INVALID_URL during Pool usage.
let usePostgres = Boolean(connectionString);
if (usePostgres) {
  try {
    // Quick sanity checks: no angle-brackets, and valid URL format
    if (connectionString.includes('<') || connectionString.includes('>')) {
      throw new Error('DATABASE_URL contains placeholder angle brackets');
    }
    // URL constructor will throw for invalid formats
    new URL(connectionString);
  } catch (err) {
    console.warn('DATABASE_URL appears invalid — falling back to SQLite. Error:', err.message);
    usePostgres = false;
  }
}

const normalizePostgresQuery = (sql, params = []) => {
  let index = 0;
  const text = sql.replace(/\?/g, () => `$${++index}`);
  return { text, values: params };
};

const sqliteRun = (dbInstance, sql, params = []) => {
  return new Promise((resolve, reject) => {
    dbInstance.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
};

const sqliteGet = (dbInstance, sql, params = []) => {
  return new Promise((resolve, reject) => {
    dbInstance.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
};

const sqliteAll = (dbInstance, sql, params = []) => {
  return new Promise((resolve, reject) => {
    dbInstance.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

const isProduction = process.env.NODE_ENV === 'production';

const setupSqliteFallback = async () => {
  const dir = path.dirname(databasePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const sqliteDb = new sqlite3.Database(databasePath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
      console.error('SQLite connection error:', err);
      process.exit(1);
    }
  });

  sqliteDb.run('PRAGMA foreign_keys = ON;');

  db = {
    query(sql, params = []) {
      return sqliteRun(sqliteDb, sql, params);
    },
    run(sql, params = [], cb) {
      const useReturning = /RETURNING\s+/i.test(sql);
      const p = useReturning
        ? sqliteAll(sqliteDb, sql, params).then((rows) => ({ rows }))
        : sqliteRun(sqliteDb, sql, params);
      if (typeof cb === 'function') {
        p.then((res) => cb(null, res)).catch((err) => cb(err));
      }
      return p;
    },
    get(sql, params = [], cb) {
      if (typeof params === 'function') {
        cb = params;
        params = [];
      }
      const p = sqliteGet(sqliteDb, sql, params);
      if (typeof cb === 'function') {
        p.then((row) => cb(null, row)).catch((err) => cb(err));
      }
      return p;
    },
    all(sql, params = [], cb) {
      if (typeof params === 'function') {
        cb = params;
        params = [];
      }
      const p = sqliteAll(sqliteDb, sql, params);
      if (typeof cb === 'function') {
        p.then((rows) => cb(null, rows)).catch((err) => cb(err));
      }
      return p;
    },
    prepare(sql) {
      return {
        run(...params) {
          let cb = null;
          if (typeof params[params.length - 1] === 'function') {
            cb = params.pop();
          }
          return db.run(sql, params, cb);
        },
        finalize(cb) {
          if (typeof cb === 'function') cb(null);
          return Promise.resolve();
        }
      };
    }
  };

  initDb = async () => {
    try {
      await sqliteRun(sqliteDb, `PRAGMA foreign_keys = ON;`);

      await sqliteRun(sqliteDb, `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT,
          role TEXT DEFAULT 'student',
          profile TEXT,
          mfaSecret TEXT,
          mfaEnabled INTEGER DEFAULT 0,
          loginAttempts INTEGER DEFAULT 0,
          lockedUntil INTEGER,
          ipWhitelist TEXT,
          threatLevel INTEGER DEFAULT 0,
          lastLogin INTEGER,
          googleId TEXT UNIQUE,
          googleAccessToken TEXT,
          googleRefreshToken TEXT,
          createdAt INTEGER DEFAULT (strftime('%s','now'))
        )
      `);

      await sqliteRun(sqliteDb, `
        CREATE TABLE IF NOT EXISTS subjects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          code TEXT UNIQUE NOT NULL,
          duration INTEGER NOT NULL,
          active INTEGER DEFAULT 1,
          createdAt INTEGER DEFAULT (strftime('%s','now'))
        )
      `);

      await sqliteRun(sqliteDb, `
        CREATE TABLE IF NOT EXISTS questions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          subject TEXT NOT NULL,
          questionText TEXT NOT NULL,
          choices TEXT NOT NULL,
          answer TEXT NOT NULL,
          createdAt INTEGER DEFAULT (strftime('%s','now'))
        )
      `);

      await sqliteRun(sqliteDb, `
        CREATE TABLE IF NOT EXISTS exam_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student INTEGER NOT NULL,
          subject TEXT NOT NULL,
          questions TEXT NOT NULL,
          answers TEXT,
          currentIndex INTEGER DEFAULT 0,
          startedAt INTEGER NOT NULL,
          expiresAt INTEGER,
          finished INTEGER DEFAULT 0,
          score INTEGER DEFAULT 0,
          warnings INTEGER DEFAULT 0,
          createdAt INTEGER DEFAULT (strftime('%s','now')),
          FOREIGN KEY (student) REFERENCES users (id)
        )
      `);

      await sqliteRun(sqliteDb, `
        CREATE TABLE IF NOT EXISTS results (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student INTEGER NOT NULL,
          subject TEXT NOT NULL,
          score INTEGER NOT NULL,
          totalQuestions INTEGER NOT NULL,
          answers TEXT,
          startedAt INTEGER NOT NULL,
          finishedAt INTEGER NOT NULL,
          createdAt INTEGER DEFAULT (strftime('%s','now')),
          FOREIGN KEY (student) REFERENCES users (id)
        )
      `);

      await sqliteRun(sqliteDb, `
        CREATE TABLE IF NOT EXISTS daily_exam_passwords (
          id TEXT PRIMARY KEY,
          examType TEXT NOT NULL DEFAULT 'UTME',
          password TEXT NOT NULL,
          passwordHash TEXT NOT NULL,
          createdAt INTEGER DEFAULT (strftime('%s','now')),
          expiresAt INTEGER NOT NULL,
          isActive INTEGER DEFAULT 1,
          generatedBy INTEGER,
          FOREIGN KEY (generatedBy) REFERENCES users (id)
        )
      `);

      await sqliteRun(sqliteDb, `
        CREATE TABLE IF NOT EXISTS password_distributions (
          id TEXT PRIMARY KEY,
          userId INTEGER NOT NULL,
          examType TEXT NOT NULL DEFAULT 'UTME',
          passwordId TEXT NOT NULL,
          sentAt INTEGER NOT NULL,
          emailAddress TEXT NOT NULL,
          wasViewed INTEGER DEFAULT 0,
          viewedAt INTEGER,
          verificationAttempts INTEGER DEFAULT 0,
          lastAttemptAt INTEGER,
          createdAt INTEGER DEFAULT (strftime('%s','now')),
          FOREIGN KEY (userId) REFERENCES users (id),
          FOREIGN KEY (passwordId) REFERENCES daily_exam_passwords (id)
        )
      `);

      await sqliteRun(sqliteDb, `
        CREATE TABLE IF NOT EXISTS password_verification_logs (
          id TEXT PRIMARY KEY,
          userId INTEGER NOT NULL,
          examType TEXT NOT NULL DEFAULT 'UTME',
          passwordId TEXT NOT NULL,
          isCorrect INTEGER NOT NULL,
          ipAddress TEXT,
          userAgent TEXT,
          attemptedAt INTEGER DEFAULT (strftime('%s','now')),
          FOREIGN KEY (userId) REFERENCES users (id),
          FOREIGN KEY (passwordId) REFERENCES daily_exam_passwords (id)
        )
      `);

      await sqliteRun(sqliteDb, `
        CREATE TABLE IF NOT EXISTS games (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          subject TEXT NOT NULL,
          difficulty TEXT DEFAULT 'medium',
          questions TEXT NOT NULL,
          createdBy INTEGER NOT NULL,
          createdAt INTEGER DEFAULT (strftime('%s','now')),
          FOREIGN KEY (createdBy) REFERENCES users (id)
        )
      `);

      await sqliteRun(sqliteDb, `
        CREATE TABLE IF NOT EXISTS dictionary (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          word TEXT UNIQUE NOT NULL,
          pronunciation TEXT,
          definition TEXT NOT NULL,
          partOfSpeech TEXT,
          example TEXT,
          synonyms TEXT,
          audioUrl TEXT,
          createdAt INTEGER DEFAULT (strftime('%s','now'))
        )
      `);

      await sqliteRun(sqliteDb, `
        CREATE TABLE IF NOT EXISTS syllabuses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          subject TEXT NOT NULL,
          examBody TEXT NOT NULL,
          topics TEXT,
          content TEXT NOT NULL,
          createdBy INTEGER NOT NULL,
          createdAt INTEGER DEFAULT (strftime('%s','now')),
          FOREIGN KEY (createdBy) REFERENCES users (id)
        )
      `);

      await sqliteRun(sqliteDb, `
        CREATE TABLE IF NOT EXISTS career_guides (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          profession TEXT UNIQUE NOT NULL,
          description TEXT NOT NULL,
          requiredSubjects TEXT,
          institutions TEXT,
          jobProspects TEXT,
          salary TEXT,
          skills TEXT,
          createdAt INTEGER DEFAULT (strftime('%s','now'))
        )
      `);

      await sqliteRun(sqliteDb, `
        CREATE TABLE IF NOT EXISTS exam_locks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          examId INTEGER NOT NULL,
          subject TEXT NOT NULL,
          lockedAt INTEGER NOT NULL,
          expiresAt INTEGER NOT NULL,
          ipAddress TEXT,
          userAgent TEXT,
          isActive INTEGER DEFAULT 1,
          createdAt INTEGER DEFAULT (strftime('%s','now')),
          FOREIGN KEY (userId) REFERENCES users (id)
        )
      `);

      await sqliteRun(sqliteDb, `
        CREATE TABLE IF NOT EXISTS question_shuffles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          examId INTEGER NOT NULL,
          shuffledQuestions TEXT NOT NULL,
          createdAt INTEGER DEFAULT (strftime('%s','now')),
          FOREIGN KEY (userId) REFERENCES users (id)
        )
      `);

      console.log(`SQLite connected and schema initialized at ${databasePath}`);
    } catch (error) {
      console.error('SQLite initialization error:', error);
      process.exit(1);
    }
  };

  await initDb();
};

let db = null;
let initDb = null;

if (usePostgres) {
  const pool = new Pool({ connectionString });

  db = {
    query(sql, params = []) {
      return pool.query(normalizePostgresQuery(sql, params));
    },
    run(sql, params = [], cb) {
      const p = pool.query(normalizePostgresQuery(sql, params));
      if (typeof cb === 'function') {
        p.then((res) => cb(null, res)).catch((err) => cb(err));
      }
      return p;
    },
    get(sql, params = [], cb) {
      if (typeof params === 'function') {
        cb = params;
        params = [];
      }
      const p = pool.query(normalizePostgresQuery(sql, params)).then((res) => res.rows[0]);
      if (typeof cb === 'function') {
        p.then((row) => cb(null, row)).catch((err) => cb(err));
      }
      return p;
    },
    all(sql, params = [], cb) {
      if (typeof params === 'function') {
        cb = params;
        params = [];
      }
      const p = pool.query(normalizePostgresQuery(sql, params)).then((res) => res.rows);
      if (typeof cb === 'function') {
        p.then((rows) => cb(null, rows)).catch((err) => cb(err));
      }
      return p;
    },
    prepare(sql) {
      return {
        run(...params) {
          let cb = null;
          if (typeof params[params.length - 1] === 'function') {
            cb = params.pop();
          }
          return db.run(sql, params, cb);
        },
        finalize(cb) {
          if (typeof cb === 'function') cb(null);
          return Promise.resolve();
        }
      };
    }
  };

  initDb = async () => {
    try {
      await pool.query('SELECT 1');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT,
          role TEXT DEFAULT 'student',
          profile TEXT,
          mfaSecret TEXT,
          mfaEnabled INTEGER DEFAULT 0,
          loginAttempts INTEGER DEFAULT 0,
          lockedUntil INTEGER,
          ipWhitelist TEXT,
          threatLevel INTEGER DEFAULT 0,
          lastLogin INTEGER,
          googleId TEXT UNIQUE,
          googleAccessToken TEXT,
          googleRefreshToken TEXT,
          createdAt INTEGER DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()))::INTEGER
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS subjects (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          code TEXT UNIQUE NOT NULL,
          duration INTEGER NOT NULL,
          active INTEGER DEFAULT 1,
          createdAt INTEGER DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()))::INTEGER
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS questions (
          id SERIAL PRIMARY KEY,
          subject TEXT NOT NULL,
          questionText TEXT NOT NULL,
          choices TEXT NOT NULL,
          answer TEXT NOT NULL,
          createdAt INTEGER DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()))::INTEGER
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS exam_sessions (
          id SERIAL PRIMARY KEY,
          student INTEGER NOT NULL,
          subject TEXT NOT NULL,
          questions TEXT NOT NULL,
          answers TEXT,
          currentIndex INTEGER DEFAULT 0,
          startedAt INTEGER NOT NULL,
          expiresAt INTEGER,
          finished INTEGER DEFAULT 0,
          score INTEGER DEFAULT 0,
          warnings INTEGER DEFAULT 0,
          createdAt INTEGER DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()))::INTEGER,
          FOREIGN KEY (student) REFERENCES users (id)
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS results (
          id SERIAL PRIMARY KEY,
          student INTEGER NOT NULL,
          subject TEXT NOT NULL,
          score INTEGER NOT NULL,
          totalQuestions INTEGER NOT NULL,
          answers TEXT,
          startedAt INTEGER NOT NULL,
          finishedAt INTEGER NOT NULL,
          createdAt INTEGER DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()))::INTEGER,
          FOREIGN KEY (student) REFERENCES users (id)
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS daily_exam_passwords (
          id TEXT PRIMARY KEY,
          examType TEXT NOT NULL DEFAULT 'UTME',
          password TEXT NOT NULL,
          passwordHash TEXT NOT NULL,
          createdAt INTEGER DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()))::INTEGER,
          expiresAt INTEGER NOT NULL,
          isActive INTEGER DEFAULT 1,
          generatedBy INTEGER,
          FOREIGN KEY (generatedBy) REFERENCES users (id)
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS password_distributions (
          id TEXT PRIMARY KEY,
          userId INTEGER NOT NULL,
          examType TEXT NOT NULL DEFAULT 'UTME',
          passwordId TEXT NOT NULL,
          sentAt INTEGER NOT NULL,
          emailAddress TEXT NOT NULL,
          wasViewed INTEGER DEFAULT 0,
          viewedAt INTEGER,
          verificationAttempts INTEGER DEFAULT 0,
          lastAttemptAt INTEGER,
          createdAt INTEGER DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()))::INTEGER,
          FOREIGN KEY (userId) REFERENCES users (id),
          FOREIGN KEY (passwordId) REFERENCES daily_exam_passwords (id)
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS password_verification_logs (
          id TEXT PRIMARY KEY,
          userId INTEGER NOT NULL,
          examType TEXT NOT NULL DEFAULT 'UTME',
          passwordId TEXT NOT NULL,
          isCorrect INTEGER NOT NULL,
          ipAddress TEXT,
          userAgent TEXT,
          attemptedAt INTEGER DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()))::INTEGER,
          FOREIGN KEY (userId) REFERENCES users (id),
          FOREIGN KEY (passwordId) REFERENCES daily_exam_passwords (id)
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS games (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          subject TEXT NOT NULL,
          difficulty TEXT DEFAULT 'medium',
          questions TEXT NOT NULL,
          createdBy INTEGER NOT NULL,
          createdAt INTEGER DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()))::INTEGER,
          FOREIGN KEY (createdBy) REFERENCES users (id)
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS dictionary (
          id SERIAL PRIMARY KEY,
          word TEXT UNIQUE NOT NULL,
          pronunciation TEXT,
          definition TEXT NOT NULL,
          partOfSpeech TEXT,
          example TEXT,
          synonyms TEXT,
          audioUrl TEXT,
          createdAt INTEGER DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()))::INTEGER
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS syllabuses (
          id SERIAL PRIMARY KEY,
          subject TEXT NOT NULL,
          examBody TEXT NOT NULL,
          topics TEXT,
          content TEXT NOT NULL,
          createdBy INTEGER NOT NULL,
          createdAt INTEGER DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()))::INTEGER,
          FOREIGN KEY (createdBy) REFERENCES users (id)
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS career_guides (
          id SERIAL PRIMARY KEY,
          profession TEXT UNIQUE NOT NULL,
          description TEXT NOT NULL,
          requiredSubjects TEXT,
          institutions TEXT,
          jobProspects TEXT,
          salary TEXT,
          skills TEXT,
          createdAt INTEGER DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()))::INTEGER
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS exam_locks (
          id SERIAL PRIMARY KEY,
          userId INTEGER NOT NULL,
          examId INTEGER NOT NULL,
          subject TEXT NOT NULL,
          lockedAt INTEGER NOT NULL,
          expiresAt INTEGER NOT NULL,
          ipAddress TEXT,
          userAgent TEXT,
          isActive INTEGER DEFAULT 1,
          createdAt INTEGER DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()))::INTEGER,
          FOREIGN KEY (userId) REFERENCES users (id)
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS question_shuffles (
          id SERIAL PRIMARY KEY,
          userId INTEGER NOT NULL,
          examId INTEGER NOT NULL,
          shuffledQuestions TEXT NOT NULL,
          createdAt INTEGER DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()))::INTEGER,
          FOREIGN KEY (userId) REFERENCES users (id)
        )
      `);

      console.log('Postgres connected and schema initialized');
    } catch (error) {
      console.error('Postgres initialization error:', error);
      // Fallback to SQLite for invalid URL or when Postgres is unavailable.
      // This keeps the service running instead of exiting when DATABASE_URL is malformed.
      const isInvalidUrl = error && error.code === 'ERR_INVALID_URL';
      if (isInvalidUrl || !isProduction || process.env.FORCE_SQLITE === 'true') {
        console.warn('Falling back to SQLite due to Postgres error.');
        await setupSqliteFallback();
        return;
      }
      process.exit(1);
    }
  };

  db.ready = initDb();
  initDb();
} else {
  const dir = path.dirname(databasePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const sqliteDb = new sqlite3.Database(databasePath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
      console.error('SQLite connection error:', err);
      process.exit(1);
    }
  });

  sqliteDb.run('PRAGMA foreign_keys = ON;');

  db = {
    query(sql, params = []) {
      return sqliteRun(sqliteDb, sql, params);
    },
    run(sql, params = [], cb) {
      const useReturning = /RETURNING\s+/i.test(sql);
      const p = useReturning
        ? sqliteAll(sqliteDb, sql, params).then((rows) => ({ rows }))
        : sqliteRun(sqliteDb, sql, params);
      if (typeof cb === 'function') {
        p.then((res) => cb(null, res)).catch((err) => cb(err));
      }
      return p;
    },
    get(sql, params = [], cb) {
      if (typeof params === 'function') {
        cb = params;
        params = [];
      }
      const p = sqliteGet(sqliteDb, sql, params);
      if (typeof cb === 'function') {
        p.then((row) => cb(null, row)).catch((err) => cb(err));
      }
      return p;
    },
    all(sql, params = [], cb) {
      if (typeof params === 'function') {
        cb = params;
        params = [];
      }
      const p = sqliteAll(sqliteDb, sql, params);
      if (typeof cb === 'function') {
        p.then((rows) => cb(null, rows)).catch((err) => cb(err));
      }
      return p;
    },
    prepare(sql) {
      return {
        run(...params) {
          let cb = null;
          if (typeof params[params.length - 1] === 'function') {
            cb = params.pop();
          }
          return db.run(sql, params, cb);
        },
        finalize(cb) {
          if (typeof cb === 'function') cb(null);
          return Promise.resolve();
        }
      };
    }
  };

  initDb = async () => {
    try {
      await sqliteRun(sqliteDb, `PRAGMA foreign_keys = ON;`);

      await sqliteRun(sqliteDb, `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT,
          role TEXT DEFAULT 'student',
          profile TEXT,
          mfaSecret TEXT,
          mfaEnabled INTEGER DEFAULT 0,
          loginAttempts INTEGER DEFAULT 0,
          lockedUntil INTEGER,
          ipWhitelist TEXT,
          threatLevel INTEGER DEFAULT 0,
          lastLogin INTEGER,
          googleId TEXT UNIQUE,
          googleAccessToken TEXT,
          googleRefreshToken TEXT,
          createdAt INTEGER DEFAULT (strftime('%s','now'))
        )
      `);

      await sqliteRun(sqliteDb, `
        CREATE TABLE IF NOT EXISTS subjects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          code TEXT UNIQUE NOT NULL,
          duration INTEGER NOT NULL,
          active INTEGER DEFAULT 1,
          createdAt INTEGER DEFAULT (strftime('%s','now'))
        )
      `);

      await sqliteRun(sqliteDb, `
        CREATE TABLE IF NOT EXISTS questions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          subject TEXT NOT NULL,
          questionText TEXT NOT NULL,
          choices TEXT NOT NULL,
          answer TEXT NOT NULL,
          createdAt INTEGER DEFAULT (strftime('%s','now'))
        )
      `);

      await sqliteRun(sqliteDb, `
        CREATE TABLE IF NOT EXISTS exam_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student INTEGER NOT NULL,
          subject TEXT NOT NULL,
          questions TEXT NOT NULL,
          answers TEXT,
          currentIndex INTEGER DEFAULT 0,
          startedAt INTEGER NOT NULL,
          expiresAt INTEGER,
          finished INTEGER DEFAULT 0,
          score INTEGER DEFAULT 0,
          warnings INTEGER DEFAULT 0,
          createdAt INTEGER DEFAULT (strftime('%s','now')),
          FOREIGN KEY (student) REFERENCES users (id)
        )
      `);

      await sqliteRun(sqliteDb, `
        CREATE TABLE IF NOT EXISTS results (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student INTEGER NOT NULL,
          subject TEXT NOT NULL,
          score INTEGER NOT NULL,
          totalQuestions INTEGER NOT NULL,
          answers TEXT,
          startedAt INTEGER NOT NULL,
          finishedAt INTEGER NOT NULL,
          createdAt INTEGER DEFAULT (strftime('%s','now')),
          FOREIGN KEY (student) REFERENCES users (id)
        )
      `);

      await sqliteRun(sqliteDb, `
        CREATE TABLE IF NOT EXISTS daily_exam_passwords (
          id TEXT PRIMARY KEY,
          examType TEXT NOT NULL DEFAULT 'UTME',
          password TEXT NOT NULL,
          passwordHash TEXT NOT NULL,
          createdAt INTEGER DEFAULT (strftime('%s','now')),
          expiresAt INTEGER NOT NULL,
          isActive INTEGER DEFAULT 1,
          generatedBy INTEGER,
          FOREIGN KEY (generatedBy) REFERENCES users (id)
        )
      `);

      await sqliteRun(sqliteDb, `
        CREATE TABLE IF NOT EXISTS password_distributions (
          id TEXT PRIMARY KEY,
          userId INTEGER NOT NULL,
          examType TEXT NOT NULL DEFAULT 'UTME',
          passwordId TEXT NOT NULL,
          sentAt INTEGER NOT NULL,
          emailAddress TEXT NOT NULL,
          wasViewed INTEGER DEFAULT 0,
          viewedAt INTEGER,
          verificationAttempts INTEGER DEFAULT 0,
          lastAttemptAt INTEGER,
          createdAt INTEGER DEFAULT (strftime('%s','now')),
          FOREIGN KEY (userId) REFERENCES users (id),
          FOREIGN KEY (passwordId) REFERENCES daily_exam_passwords (id)
        )
      `);

      await sqliteRun(sqliteDb, `
        CREATE TABLE IF NOT EXISTS password_verification_logs (
          id TEXT PRIMARY KEY,
          userId INTEGER NOT NULL,
          examType TEXT NOT NULL DEFAULT 'UTME',
          passwordId TEXT NOT NULL,
          isCorrect INTEGER NOT NULL,
          ipAddress TEXT,
          userAgent TEXT,
          attemptedAt INTEGER DEFAULT (strftime('%s','now')),
          FOREIGN KEY (userId) REFERENCES users (id),
          FOREIGN KEY (passwordId) REFERENCES daily_exam_passwords (id)
        )
      `);

      await sqliteRun(sqliteDb, `
        CREATE TABLE IF NOT EXISTS games (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          subject TEXT NOT NULL,
          difficulty TEXT DEFAULT 'medium',
          questions TEXT NOT NULL,
          createdBy INTEGER NOT NULL,
          createdAt INTEGER DEFAULT (strftime('%s','now')),
          FOREIGN KEY (createdBy) REFERENCES users (id)
        )
      `);

      await sqliteRun(sqliteDb, `
        CREATE TABLE IF NOT EXISTS dictionary (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          word TEXT UNIQUE NOT NULL,
          pronunciation TEXT,
          definition TEXT NOT NULL,
          partOfSpeech TEXT,
          example TEXT,
          synonyms TEXT,
          audioUrl TEXT,
          createdAt INTEGER DEFAULT (strftime('%s','now'))
        )
      `);

      await sqliteRun(sqliteDb, `
        CREATE TABLE IF NOT EXISTS syllabuses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          subject TEXT NOT NULL,
          examBody TEXT NOT NULL,
          topics TEXT,
          content TEXT NOT NULL,
          createdBy INTEGER NOT NULL,
          createdAt INTEGER DEFAULT (strftime('%s','now')),
          FOREIGN KEY (createdBy) REFERENCES users (id)
        )
      `);

      await sqliteRun(sqliteDb, `
        CREATE TABLE IF NOT EXISTS career_guides (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          profession TEXT UNIQUE NOT NULL,
          description TEXT NOT NULL,
          requiredSubjects TEXT,
          institutions TEXT,
          jobProspects TEXT,
          salary TEXT,
          skills TEXT,
          createdAt INTEGER DEFAULT (strftime('%s','now'))
        )
      `);

      await sqliteRun(sqliteDb, `
        CREATE TABLE IF NOT EXISTS exam_locks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          examId INTEGER NOT NULL,
          subject TEXT NOT NULL,
          lockedAt INTEGER NOT NULL,
          expiresAt INTEGER NOT NULL,
          ipAddress TEXT,
          userAgent TEXT,
          isActive INTEGER DEFAULT 1,
          createdAt INTEGER DEFAULT (strftime('%s','now')),
          FOREIGN KEY (userId) REFERENCES users (id)
        )
      `);

      await sqliteRun(sqliteDb, `
        CREATE TABLE IF NOT EXISTS question_shuffles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          examId INTEGER NOT NULL,
          shuffledQuestions TEXT NOT NULL,
          createdAt INTEGER DEFAULT (strftime('%s','now')),
          FOREIGN KEY (userId) REFERENCES users (id)
        )
      `);

      console.log(`SQLite connected and schema initialized at ${databasePath}`);
    } catch (error) {
      console.error('SQLite initialization error:', error);
      process.exit(1);
    }
  };

  db.ready = initDb();
}

module.exports = db;
