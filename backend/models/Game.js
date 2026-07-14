const db = require('../config/db');

class Game {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.type = data.type; // 'millionaire', etc
    this.subject = data.subject;
    this.difficulty = data.difficulty; // 'easy', 'medium', 'hard'
    this.questions = data.questions ? JSON.parse(data.questions) : [];
    this.createdBy = data.createdBy;
    this.createdAt = data.createdAt;
  }

  static async find(query = {}) {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM games WHERE 1=1';
      const params = [];

      if (query.subject) {
        sql += ' AND subject = ?';
        params.push(query.subject);
      }

      if (query.type) {
        sql += ' AND type = ?';
        params.push(query.type);
      }

      sql += ' ORDER BY createdAt DESC';

      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map((row) => new Game(row)));
      });
    });
  }

  static async findOne(query) {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM games WHERE ';
      const params = [];
      const conditions = [];

      if (query._id) {
        conditions.push('id = ?');
        params.push(query._id);
      }
      if (query.id) {
        conditions.push('id = ?');
        params.push(query.id);
      }

      sql += conditions.join(' AND ') + ' LIMIT 1';

      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row ? new Game(row) : null);
      });
    });
  }

  static async create(data) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO games (name, type, subject, difficulty, questions, createdBy)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const params = [
        data.name,
        data.type,
        data.subject,
        data.difficulty,
        JSON.stringify(data.questions || []),
        data.createdBy,
      ];

      db.run(`${sql} RETURNING id`, params)
        .then((result) => {
          data.id = result.rows[0].id;
          resolve(new Game(data));
        })
        .catch(reject);
    });
  }

  static async deleteOne(query) {
    return new Promise((resolve, reject) => {
      let sql = 'DELETE FROM games WHERE ';
      const params = [];
      const conditions = [];

      if (query._id) {
        conditions.push('id = ?');
        params.push(query._id);
      }

      sql += conditions.join(' AND ');

      db.run(sql, params, (err) => {
        if (err) reject(err);
        else resolve({ ok: 1 });
      });
    });
  }
}

module.exports = Game;
