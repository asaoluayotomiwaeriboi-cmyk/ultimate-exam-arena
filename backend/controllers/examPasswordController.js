const { randomUUID } = require('crypto');
const bcryptjs = require('bcryptjs');
const db = require('../config/db');

/**
 * Verify password and grant access to competitive exam
 */
exports.verifyCompetitivePassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    const userId = req.user.id;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    // Rate limiting: Check recent attempts
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const oneMinuteAgo = Math.floor(Date.now() / 1000) - 60;

    return new Promise((resolve) => {
      db.get(`
        SELECT COUNT(*) as attempts FROM password_verification_logs
        WHERE userId = ? AND attemptedAt > ? AND isCorrect = 0
      `, [userId, oneMinuteAgo], (err, result) => {
        if (err) {
          console.error('Rate limit check error:', err);
          return resolve(null);
        }

        if (result && result.attempts >= 5) {
          return resolve({
            success: false,
            correct: false,
            message: 'Too many failed attempts. Please try again later.',
            rateLimited: true
          });
        }

        resolve(null);
      });
    }).then(async (rateLimitResponse) => {
      if (rateLimitResponse) {
        return res.status(429).json(rateLimitResponse);
      }

      // Get current active password
      const now = Math.floor(Date.now() / 1000);
      
      return new Promise((resolve) => {
        db.get(`
          SELECT * FROM daily_exam_passwords 
          WHERE examType = 'UTME' AND isActive = 1 AND expiresAt > ?
          ORDER BY createdAt DESC LIMIT 1
        `, [now], (err, passwordRow) => {
          if (err) {
            console.error('Password fetch error:', err);
            return resolve({
              success: false,
              correct: false,
              message: 'System error occurred'
            });
          }

          if (!passwordRow) {
            return resolve({
              success: true,
              correct: false,
              message: 'No active password found. Please contact admin.'
            });
          }

          // Verify password
          const isCorrect = bcryptjs.compareSync(password, passwordRow.passwordHash);

          // Log the verification attempt
          const logId = randomUUID();
          const userAgent = req.get('user-agent') || 'unknown';

          db.run(`
            INSERT INTO password_verification_logs 
            (id, userId, examType, passwordId, isCorrect, ipAddress, userAgent, attemptedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [logId, userId, 'UTME', passwordRow.id, isCorrect ? 1 : 0, ipAddress, userAgent, now], (logErr) => {
            if (logErr) {
              console.error('Error logging verification:', logErr);
            }
          });

          // Update verification attempts in distributions
          db.run(`
            UPDATE password_distributions
            SET verificationAttempts = verificationAttempts + 1,
                lastAttemptAt = ?
            WHERE userId = ? AND passwordId = ?
          `, [now, userId, passwordRow.id]);

          if (isCorrect) {
            resolve({
              success: true,
              correct: true,
              message: 'Password verified successfully. Access granted.',
              passwordId: passwordRow.id,
              expiresAt: new Date(passwordRow.expiresAt * 1000).toISOString()
            });
          } else {
            resolve({
              success: true,
              correct: false,
              message: 'Incorrect password. Please try again.'
            });
          }
        });
      });
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current password status (for UI display)
 */
exports.getPasswordStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = Math.floor(Date.now() / 1000);

    return new Promise((resolve) => {
      db.get(`
        SELECT dcp.* FROM daily_exam_passwords dcp
        WHERE dcp.examType = 'UTME' AND dcp.isActive = 1 AND dcp.expiresAt > ?
        ORDER BY dcp.createdAt DESC LIMIT 1
      `, [now], (err, passwordRow) => {
        if (err) {
          console.error('Error fetching password status:', err);
          return resolve(res.status(500).json({
            success: false,
            message: 'Error fetching password status'
          }));
        }

        if (!passwordRow) {
          return resolve(res.json({
            success: true,
            hasActivePassword: false,
            message: 'No active password at this time'
          }));
        }

        // Check if user has received this password
        db.get(`
          SELECT * FROM password_distributions
          WHERE userId = ? AND passwordId = ?
        `, [userId, passwordRow.id], (err, distRow) => {
          if (err) {
            console.error('Error fetching distribution status:', err);
          }

          const expiryDate = new Date(passwordRow.expiresAt * 1000);
          const timeRemaining = passwordRow.expiresAt - now;
          const hoursRemaining = Math.floor(timeRemaining / 3600);
          const minutesRemaining = Math.floor((timeRemaining % 3600) / 60);

          resolve(res.json({
            success: true,
            hasActivePassword: true,
            passwordId: passwordRow.id,
            expiresAt: expiryDate.toISOString(),
            timeRemaining: {
              total: timeRemaining,
              hours: hoursRemaining,
              minutes: minutesRemaining,
              formatted: `${hoursRemaining}h ${minutesRemaining}m`
            },
            userReceived: !!distRow,
            userVerified: distRow ? distRow.verificationAttempts > 0 : false
          }));
        });
      });
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's password history (for reference)
 */
exports.getUserPasswordHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;

    return new Promise((resolve) => {
      db.all(`
        SELECT pd.*, dcp.expiresAt, dcp.isActive
        FROM password_distributions pd
        JOIN daily_exam_passwords dcp ON pd.passwordId = dcp.id
        WHERE pd.userId = ?
        ORDER BY pd.sentAt DESC
        LIMIT 10
      `, [userId], (err, rows) => {
        if (err) {
          console.error('Error fetching user password history:', err);
          return resolve(res.status(500).json({
            success: false,
            message: 'Error fetching password history'
          }));
        }

        const history = (rows || []).map(row => ({
          passwordId: row.passwordId,
          sentAt: new Date(row.sentAt * 1000).toISOString(),
          expiresAt: new Date(row.expiresAt * 1000).toISOString(),
          isActive: row.isActive === 1,
          emailAddress: row.emailAddress,
          verificationAttempts: row.verificationAttempts
        }));

        resolve(res.json({
          success: true,
          history,
          count: history.length
        }));
      });
    });
  } catch (error) {
    next(error);
  }
};
