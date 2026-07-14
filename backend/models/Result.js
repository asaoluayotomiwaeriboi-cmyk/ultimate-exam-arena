const db = require('../config/db');

class Result {
  constructor(data) {
    this.id = data.id;
    this.student = data.student;
    this.subject = data.subject;
    this.score = data.score;
    this.totalQuestions = data.totalQuestions;
    // Robustly handle answers which may be stored as JSON string or as an already-parsed object.
    if (!data.answers) {
      this.answers = [];
    } else if (typeof data.answers === 'object') {
      this.answers = data.answers;
    } else if (typeof data.answers === 'string') {
      try {
        this.answers = JSON.parse(data.answers);
      } catch (err) {
        // Try sanitizing single quotes -> double quotes as a last resort
        try {
          this.answers = JSON.parse(data.answers.replace(/'/g, '"'));
        } catch (err2) {
          // Fallback to empty array to avoid crashing; preserve raw string in debugAnswers
          this.debugAnswers = data.answers;
          this.answers = [];
        }
      }
    } else {
      this.answers = [];
    }
    this.startedAt = data.startedAt;
    this.finishedAt = data.finishedAt;
    this.createdAt = data.createdAt;
  }

  static async find(query = {}) {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM results WHERE 1=1';
      const params = [];

      if (query.student) {
        sql += ' AND student = ?';
        params.push(query.student);
      }

      sql += ' ORDER BY finishedAt DESC';

      if (query.limit) {
        sql += ' LIMIT ?';
        params.push(query.limit);
      }

      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map((row) => new Result(row)));
      });
    });
  }

  static async create(data) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO results (student, subject, score, totalQuestions, answers, startedAt, finishedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        data.student,
        data.subject,
        data.score,
        data.totalQuestions,
        JSON.stringify(data.answers || {}),
        data.startedAt,
        data.finishedAt,
      ];

      db.run(`${sql} RETURNING id`, params)
        .then((result) => {
          data.id = result.rows[0].id;
          resolve(new Result(data));
        })
        .catch(reject);
    });
  }

  static async countDocuments(query = {}) {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT COUNT(*) as count FROM results WHERE 1=1';
      const params = [];

      if (query.student) {
        sql += ' AND student = ?';
        params.push(query.student);
      }

      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });
  }

  static async getTopSubjects(limit = 6) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT subject, ROUND(AVG(score), 2) as averageScore, COUNT(*) as attempts
        FROM results
        GROUP BY subject
        ORDER BY attempts DESC
        LIMIT ?
      `;
      db.all(sql, [limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  static async findWithStudent() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT r.*, u.name AS studentName, u.email AS studentEmail
        FROM results r
        LEFT JOIN users u ON r.student = u.id
        ORDER BY r.finishedAt DESC
      `;
      db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map((row) => new Result(row)));
      });
    });
  }
}

module.exports = Result;
