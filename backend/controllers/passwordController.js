const { randomUUID } = require('crypto');
const db = require('../config/db');

// Password service functions (inline to avoid directory issues)
const passwordServiceInline = {
  generateDailyPassword: async (examType = 'UTME') => {
    try {
      const passwordLength = Math.floor(Math.random() * 5) + 8;
      const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let password = '';

      for (let i = 0; i < passwordLength; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
      }

      const bcryptjs = require('bcryptjs');
      const passwordHash = bcryptjs.hashSync(password, 10);

      const expiresAt = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
      const passwordId = randomUUID();
      const createdAt = Math.floor(Date.now() / 1000);

      return new Promise((resolve, reject) => {
        db.run(
          `
          UPDATE daily_exam_passwords 
          SET isActive = 0 
          WHERE examType = ? AND isActive = 1
        `,
          [examType],
          function (err) {
            if (err) return reject(err);

            db.run(
              `
            INSERT INTO daily_exam_passwords 
            (id, examType, password, passwordHash, createdAt, expiresAt, isActive)
            VALUES (?, ?, ?, ?, ?, ?, 1)
          `,
              [passwordId, examType, password, passwordHash, createdAt, expiresAt],
              function (err) {
                if (err) return reject(err);

                resolve({
                  success: true,
                  passwordId,
                  password,
                  examType,
                  createdAt,
                  expiresAt,
                  expiresAtDate: new Date(expiresAt * 1000).toISOString(),
                });
              }
            );
          }
        );
      });
    } catch (error) {
      console.error('Error generating daily password:', error);
      throw error;
    }
  },

  getCurrentPassword: async (examType = 'UTME') => {
    try {
      return new Promise((resolve, reject) => {
        const now = Math.floor(Date.now() / 1000);

        db.get(
          `
          SELECT * FROM daily_exam_passwords 
          WHERE examType = ? AND isActive = 1 AND expiresAt > ?
          ORDER BY createdAt DESC LIMIT 1
        `,
          [examType, now],
          (err, row) => {
            if (err) return reject(err);

            if (row) {
              resolve({
                success: true,
                passwordId: row.id,
                examType: row.examType,
                createdAt: row.createdAt,
                expiresAt: row.expiresAt,
                expiresAtDate: new Date(row.expiresAt * 1000).toISOString(),
                isActive: row.isActive === 1,
              });
            } else {
              resolve({
                success: false,
                message: 'No active password found',
              });
            }
          }
        );
      });
    } catch (error) {
      console.error('Error getting current password:', error);
      throw error;
    }
  },

  sendPasswordToStudents: async (passwordId, examType = 'UTME') => {
    try {
      const { sendPasswordEmail } = require('../../config/email');

      return new Promise((resolve, reject) => {
        db.get(
          `
          SELECT * FROM daily_exam_passwords 
          WHERE id = ? AND examType = ?
        `,
          [passwordId, examType],
          (err, passwordRow) => {
            if (err) return reject(err);

            if (!passwordRow) {
              return resolve({
                success: false,
                message: 'Password not found',
              });
            }

            db.all(
              `SELECT id, email, name FROM users WHERE role = 'student'`,
              [],
              async (err, students) => {
                if (err) return reject(err);

                if (!students || students.length === 0) {
                  return resolve({
                    success: false,
                    message: 'No students found',
                  });
                }

                const expiryDate = new Date(passwordRow.expiresAt * 1000);
                const expiryTimeString = expiryDate.toLocaleString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  timeZoneName: 'short',
                });

                const now = Math.floor(Date.now() / 1000);
                let successCount = 0;

                for (const student of students) {
                  try {
                    await sendPasswordEmail(
                      student.email,
                      student.name || 'Student',
                      passwordRow.password,
                      expiryTimeString
                    );
                    successCount++;

                    const distId = randomUUID();
                    await db.run(
                      `INSERT INTO password_distributions
                   (id, userId, examType, passwordId, sentAt, emailAddress, wasViewed)
                   VALUES (?, ?, ?, ?, ?, ?, 0)
                   ON CONFLICT (id) DO NOTHING`,
                      [distId, student.id, examType, passwordId, now, student.email]
                    );

                    await new Promise((resolve) => setTimeout(resolve, 100));
                  } catch (emailErr) {
                    console.error(`Failed to send email to ${student.email}:`, emailErr);
                  }
                }

                resolve({
                  success: true,
                  message: `Password sent to ${successCount} students`,
                  totalStudents: students.length,
                  successCount,
                });
              }
            );
          }
        );
      });
    } catch (error) {
      console.error('Error sending password to students:', error);
      throw error;
    }
  },

  getPasswordHistory: async (examType = 'UTME', limit = 30) => {
    try {
      return new Promise((resolve, reject) => {
        db.all(
          `
          SELECT id, examType, createdAt, expiresAt, isActive, generatedBy
          FROM daily_exam_passwords 
          WHERE examType = ?
          ORDER BY createdAt DESC
          LIMIT ?
        `,
          [examType, limit],
          (err, rows) => {
            if (err) return reject(err);

            const history = (rows || []).map((row) => ({
              passwordId: row.id,
              examType: row.examType,
              createdAt: row.createdAt,
              createdAtDate: new Date(row.createdAt * 1000).toISOString(),
              expiresAt: row.expiresAt,
              expiresAtDate: new Date(row.expiresAt * 1000).toISOString(),
              isActive: row.isActive === 1,
              generatedBy: row.generatedBy,
            }));

            resolve({
              success: true,
              history,
              count: history.length,
            });
          }
        );
      });
    } catch (error) {
      console.error('Error getting password history:', error);
      throw error;
    }
  },

  getDistributionStatus: async (passwordId) => {
    try {
      return new Promise((resolve, reject) => {
        db.all(
          `
          SELECT userId, emailAddress, sentAt, wasViewed, viewedAt, verificationAttempts, lastAttemptAt
          FROM password_distributions
          WHERE passwordId = ?
          ORDER BY sentAt DESC
        `,
          [passwordId],
          (err, rows) => {
            if (err) return reject(err);

            const distributions = (rows || []).map((row) => ({
              userId: row.userId,
              email: row.emailAddress,
              sentAt: row.sentAt,
              sentAtDate: new Date(row.sentAt * 1000).toISOString(),
              viewed: row.wasViewed === 1,
              viewedAt: row.viewedAt ? new Date(row.viewedAt * 1000).toISOString() : null,
              verificationAttempts: row.verificationAttempts,
              lastAttemptAt: row.lastAttemptAt
                ? new Date(row.lastAttemptAt * 1000).toISOString()
                : null,
            }));

            const stats = {
              total: distributions.length,
              sent: distributions.length,
              viewed: distributions.filter((d) => d.viewed).length,
              verified: distributions.filter((d) => d.verificationAttempts > 0).length,
            };

            resolve({
              success: true,
              distributions,
              stats,
            });
          }
        );
      });
    } catch (error) {
      console.error('Error getting distribution status:', error);
      throw error;
    }
  },
};

// Controller functions
exports.generateDailyPassword = async (req, res, next) => {
  try {
    const result = await passwordServiceInline.generateDailyPassword('UTME');

    if (result.success) {
      res.json({
        success: true,
        message: 'Daily password generated successfully',
        passwordId: result.passwordId,
        password: result.password,
        expiresAt: result.expiresAtDate,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Failed to generate password',
      });
    }
  } catch (error) {
    next(error);
  }
};

exports.sendDailyPassword = async (req, res, next) => {
  try {
    const { passwordId } = req.body;

    if (!passwordId) {
      return res.status(400).json({
        success: false,
        message: 'Password ID is required',
      });
    }

    const result = await passwordServiceInline.sendPasswordToStudents(passwordId, 'UTME');

    res.json({
      success: result.success,
      message: result.message,
      totalStudents: result.totalStudents,
      successCount: result.successCount,
    });
  } catch (error) {
    next(error);
  }
};

exports.getCurrentPassword = async (req, res, next) => {
  try {
    const result = await passwordServiceInline.getCurrentPassword('UTME');

    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getPasswordHistory = async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 30;
    const result = await passwordServiceInline.getPasswordHistory('UTME', limit);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getDistributionStatus = async (req, res, next) => {
  try {
    const { passwordId } = req.params;

    if (!passwordId) {
      return res.status(400).json({
        success: false,
        message: 'Password ID is required',
      });
    }

    const result = await passwordServiceInline.getDistributionStatus(passwordId);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.testEmailConfiguration = async (req, res, next) => {
  try {
    const { testEmailConfiguration } = require('../../config/email');
    const result = await testEmailConfiguration();

    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports.passwordService = passwordServiceInline;
