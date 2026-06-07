const db = require('../config/db');
const Question = require('./Question');

const toSeconds = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') {
    return value > 1e12 ? Math.floor(value / 1000) : Math.floor(value);
  }
  if (value instanceof Date) {
    return Math.floor(value.getTime() / 1000);
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : Math.floor(parsed / 1000);
};

class ExamSession {
  constructor(data) {
    this.id = data.id;
    this.student = data.student;
    this.subject = data.subject;
    this.questions = Array.isArray(data.questions) ? data.questions : JSON.parse(data.questions || '[]');
    this.answers = Array.isArray(data.answers) ? data.answers : JSON.parse(data.answers || '[]');
    this.currentIndex = data.currentIndex || 0;
    this.startedAt = data.startedAt;
    this.expiresAt = data.expiresAt;
    this.finished = data.finished === 1 || data.finished === true;
    this.score = data.score || 0;
    this.warnings = data.warnings || 0;
    this.studentName = data.studentName || null;
    this.studentEmail = data.studentEmail || null;
    this.createdAt = data.createdAt;
  }

  static async create(data) {
    return new Promise((resolve, reject) => {
      const startedAt = data.startedAt ? toSeconds(data.startedAt) : Math.floor(Date.now() / 1000);
      const expiresAt = data.expiresAt ? toSeconds(data.expiresAt) : null;
      const sql = `
        INSERT INTO exam_sessions (
          student, subject, questions, answers, currentIndex,
          startedAt, expiresAt, finished, score, warnings
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        data.student,
        data.subject,
        JSON.stringify(data.questions || []),
        JSON.stringify(data.answers || []),
        data.currentIndex || 0,
        startedAt,
        expiresAt,
        data.finished ? 1 : 0,
        data.score || 0,
        data.warnings || 0
      ];

      db.run(`${sql} RETURNING id`, params)
        .then((result) => resolve(new ExamSession({
          id: result.rows[0].id,
          ...data,
          questions: data.questions || [],
          answers: data.answers || [],
          currentIndex: data.currentIndex || 0,
          startedAt,
          expiresAt,
          finished: data.finished ? 1 : 0,
          score: data.score || 0,
          warnings: data.warnings || 0
        })))
        .catch(reject);
    });
  }

  static async findById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM exam_sessions WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row ? new ExamSession(row) : null);
      });
    });
  }

  static async find(query = {}) {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM exam_sessions WHERE 1=1';
      const params = [];

      if (query.student) {
        sql += ' AND student = ?';
        params.push(query.student);
      }
      if (query.finished !== undefined) {
        sql += ' AND finished = ?';
        params.push(query.finished ? 1 : 0);
      }
      if (query.subject) {
        sql += ' AND subject = ?';
        params.push(query.subject);
      }

      sql += ' ORDER BY startedAt DESC';

      if (query.limit) {
        sql += ' LIMIT ?';
        params.push(query.limit);
      }

      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(row => new ExamSession(row)));
      });
    });
  }

  async save() {
    return new Promise((resolve, reject) => {
      const startedAt = this.startedAt ? toSeconds(this.startedAt) : null;
      const expiresAt = this.expiresAt ? toSeconds(this.expiresAt) : null;
      const sql = `
        UPDATE exam_sessions SET
          student = ?,
          subject = ?,
          questions = ?,
          answers = ?,
          currentIndex = ?,
          startedAt = ?,
          expiresAt = ?,
          finished = ?,
          score = ?,
          warnings = ?
        WHERE id = ?
      `;
      const params = [
        this.student,
        this.subject,
        JSON.stringify(this.questions || []),
        JSON.stringify(this.answers || []),
        this.currentIndex,
        startedAt,
        expiresAt,
        this.finished ? 1 : 0,
        this.score,
        this.warnings,
        this.id
      ];

      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }

  async populate(field) {
    if (field === 'questions') {
      this.questions = await Question.findByIds(this.questions || []);
    }
    return this;
  }

  static async findActiveSessions() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT e.*, u.name AS studentName, u.email AS studentEmail
        FROM exam_sessions e
        LEFT JOIN users u ON e.student = u.id
        WHERE e.finished = 0
        ORDER BY e.startedAt DESC
      `;
      db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(row => new ExamSession(row)));
      });
    });
  }
}

module.exports = ExamSession;
