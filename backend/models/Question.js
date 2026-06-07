const db = require('../config/db');

class Question {
  constructor(data) {
    this.id = data.id;
    this.subject = data.subject;
    this.questionText = data.questionText;
    this.choices = Array.isArray(data.choices) ? data.choices : JSON.parse(data.choices || '[]');
    this.answer = data.answer;
    this.createdAt = data.createdAt;
  }

  static async find(query = {}) {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM questions WHERE 1=1';
      const params = [];

      if (query.subject) {
        sql += ' AND subject = ?';
        params.push(query.subject);
      }
      if (query._id || query.id) {
        sql += ' AND id = ?';
        params.push(query._id || query.id);
      }

      if (query.sort) {
        if (query.sort.startsWith('-')) {
          const field = query.sort.substring(1);
          sql += ` ORDER BY ${field} DESC`;
        } else {
          sql += ` ORDER BY ${query.sort} ASC`;
        }
      } else if (query.random === false) {
        sql += ' ORDER BY id ASC';
      } else {
        sql += ' ORDER BY RANDOM()';
      }

      if (query.limit) {
        sql += ' LIMIT ?';
        params.push(query.limit);
      }

      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(row => new Question(row)));
      });
    });
  }

  static async findById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM questions WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row ? new Question(row) : null);
      });
    });
  }

  static async findByIds(ids = []) {
    if (!ids.length) return [];
    return new Promise((resolve, reject) => {
      const placeholders = ids.map(() => '?').join(',');
      db.all(`SELECT * FROM questions WHERE id IN (${placeholders})`, ids, (err, rows) => {
        if (err) reject(err);
        else {
          const rowMap = new Map(rows.map(row => [row.id, new Question(row)]));
          resolve(ids.filter(id => rowMap.has(id)).map(id => rowMap.get(id)));
        }
      });
    });
  }

  static async create(data) {
    return new Promise((resolve, reject) => {
      const sql = 'INSERT INTO questions (subject, questionText, choices, answer) VALUES (?, ?, ?, ?) RETURNING id';
      const params = [
        data.subject,
        data.questionText,
        JSON.stringify(data.choices || []),
        data.answer
      ];

      db.run(sql, params)
        .then((result) => resolve(new Question({ id: result.rows[0].id, ...data, choices: data.choices })))
        .catch(reject);
    });
  }

  static async findByIdAndUpdate(id, data) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE questions SET
          subject = ?,
          questionText = ?,
          choices = ?,
          answer = ?
        WHERE id = ?
      `;
      const params = [
        data.subject,
        data.questionText,
        JSON.stringify(data.choices || []),
        data.answer,
        id
      ];

      db.run(sql, params, async function(err) {
        if (err) reject(err);
        else resolve(await Question.findById(id));
      });
    });
  }

  static async findByIdAndDelete(id) {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM questions WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve({ deleted: this.changes });
      });
    });
  }

  static async countDocuments(query = {}) {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT COUNT(*) as count FROM questions WHERE 1=1';
      const params = [];

      if (query.subject) {
        sql += ' AND subject = ?';
        params.push(query.subject);
      }

      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });
  }

  static async insertMany(questions) {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare('INSERT INTO questions (subject, questionText, choices, answer) VALUES (?, ?, ?, ?)');

      for (const question of questions) {
        stmt.run(question.subject, question.questionText, JSON.stringify(question.choices), question.answer);
      }

      stmt.finalize((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  static async deleteMany() {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM questions', [], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = Question;
