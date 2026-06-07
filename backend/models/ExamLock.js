const db = require('../config/db');

class ExamLock {
  constructor(data) {
    this.id = data.id;
    this.userId = data.userId;
    this.examId = data.examId; // subject ID
    this.subject = data.subject;
    this.lockedAt = data.lockedAt;
    this.expiresAt = data.expiresAt;
    this.ipAddress = data.ipAddress;
    this.userAgent = data.userAgent;
    this.isActive = data.isActive || 1;
  }

  static async create(data) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO exam_locks (userId, examId, subject, lockedAt, expiresAt, ipAddress, userAgent, isActive)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        data.userId,
        data.examId,
        data.subject,
        data.lockedAt,
        data.expiresAt,
        data.ipAddress,
        data.userAgent,
        data.isActive || 1
      ];

      db.run(`${sql} RETURNING id`, params)
        .then((result) => {
          data.id = result.rows[0].id;
          resolve(new ExamLock(data));
        })
        .catch(reject);
    });
  }

  static async findActive(userId, examId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM exam_locks 
        WHERE userId = ? AND examId = ? AND isActive = 1 AND expiresAt > ?
        LIMIT 1
      `;
      const now = Math.floor(Date.now() / 1000);

      db.get(sql, [userId, examId, now], (err, row) => {
        if (err) reject(err);
        else resolve(row ? new ExamLock(row) : null);
      });
    });
  }

  static async findGlobal(examId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM exam_locks
        WHERE examId = ? AND isActive = 1 AND expiresAt > ? AND (userId IS NULL OR userId = 0)
        ORDER BY lockedAt DESC
        LIMIT 1
      `;
      const now = Math.floor(Date.now() / 1000);
      db.get(sql, [examId, now], (err, row) => {
        if (err) reject(err);
        else resolve(row ? new ExamLock(row) : null);
      });
    });
  }

  static async deactivate(userId, examId) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE exam_locks SET isActive = 0 WHERE userId = ? AND examId = ?';

      db.run(sql, [userId, examId], (err) => {
        if (err) reject(err);
        else resolve({ ok: 1 });
      });
    });
  }

  static async find(query = {}) {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM exam_locks WHERE 1=1';
      const params = [];

      if (query.userId) {
        sql += ' AND userId = ?';
        params.push(query.userId);
      }

      if (query.examId) {
        sql += ' AND examId = ?';
        params.push(query.examId);
      }

      if (query.isActive !== undefined) {
        sql += ' AND isActive = ?';
        params.push(query.isActive);
      }

      sql += ' ORDER BY lockedAt DESC';

      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(row => new ExamLock(row)));
      });
    });
  }
}

module.exports = ExamLock;
