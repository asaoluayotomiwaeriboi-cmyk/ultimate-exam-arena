const db = require('../config/db');

class Syllabus {
  constructor(data) {
    this.id = data.id;
    this.subject = data.subject;
    this.examBody = data.examBody; // 'JAMB', 'WAEC', 'NECO', etc
    this.topics = data.topics ? JSON.parse(data.topics) : [];
    this.content = data.content;
    this.createdBy = data.createdBy;
    this.createdAt = data.createdAt;
  }

  static async find(query = {}) {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM syllabuses WHERE 1=1';
      const params = [];

      if (query.subject) {
        sql += ' AND subject = ?';
        params.push(query.subject);
      }

      if (query.examBody) {
        sql += ' AND examBody = ?';
        params.push(query.examBody);
      }

      sql += ' ORDER BY subject ASC';

      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map((row) => new Syllabus(row)));
      });
    });
  }

  static async findOne(query) {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM syllabuses WHERE ';
      const params = [];
      const conditions = [];

      if (query._id) {
        conditions.push('id = ?');
        params.push(query._id);
      }
      if (query.subject) {
        conditions.push('subject = ?');
        params.push(query.subject);
      }
      if (query.examBody) {
        conditions.push('examBody = ?');
        params.push(query.examBody);
      }

      sql += conditions.join(' AND ') + ' LIMIT 1';

      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row ? new Syllabus(row) : null);
      });
    });
  }

  static async create(data) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO syllabuses (subject, examBody, topics, content, createdBy)
        VALUES (?, ?, ?, ?, ?)
      `;
      const params = [
        data.subject,
        data.examBody,
        JSON.stringify(data.topics || []),
        data.content,
        data.createdBy,
      ];

      db.run(`${sql} RETURNING id`, params)
        .then((result) => {
          data.id = result.rows[0].id;
          resolve(new Syllabus(data));
        })
        .catch(reject);
    });
  }

  static async update(id, data) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE syllabuses 
        SET subject = ?, examBody = ?, topics = ?, content = ?
        WHERE id = ?
      `;
      const params = [
        data.subject,
        data.examBody,
        JSON.stringify(data.topics || []),
        data.content,
        id,
      ];

      db.run(sql, params, (err) => {
        if (err) reject(err);
        else resolve({ ok: 1 });
      });
    });
  }
}

module.exports = Syllabus;
