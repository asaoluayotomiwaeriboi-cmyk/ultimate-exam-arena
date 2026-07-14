const db = require('../config/db');

class Subject {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.code = data.code;
    this.duration = data.duration;
    this.active = data.active === undefined ? true : data.active === 1;
    this.createdAt = data.createdAt;
  }

  static async find(query = {}) {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM subjects WHERE 1=1';
      const params = [];

      if (query.code) {
        sql += ' AND code = ?';
        params.push(query.code);
      }
      if (query.name) {
        sql += ' AND name = ?';
        params.push(query.name);
      }
      if (query._id) {
        sql += ' AND id = ?';
        params.push(query._id);
      }
      if (query.active !== undefined) {
        if (query.active) {
          sql += ' AND (active = ? OR active = 1 OR active = true)';
          params.push(1);
        } else {
          sql += ' AND (active = ? OR active = 0 OR active = false)';
          params.push(0);
        }
      }

      sql += ' ORDER BY name';

      if (query.limit) {
        sql += ' LIMIT ?';
        params.push(query.limit);
      }

      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map((row) => new Subject(row)));
      });
    });
  }

  static async findOne(query) {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM subjects WHERE 1=1';
      const params = [];

      if (query.code) {
        sql += ' AND code = ?';
        params.push(query.code);
      }
      if (query.name) {
        sql += ' AND name = ?';
        params.push(query.name);
      }
      if (query._id) {
        sql += ' AND id = ?';
        params.push(query._id);
      }
      if (query.active !== undefined) {
        sql += ' AND active = ?';
        params.push(query.active ? 1 : 0);
      }

      sql += ' LIMIT 1';

      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row ? new Subject(row) : null);
      });
    });
  }

  static async findById(id) {
    return this.findOne({ _id: id });
  }

  static async create(data) {
    return new Promise((resolve, reject) => {
      const sql =
        'INSERT INTO subjects (name, code, duration, active) VALUES (?, ?, ?, ?) RETURNING id';
      const params = [data.name, data.code, data.duration, data.active === false ? 0 : 1];

      db.run(sql, params)
        .then((result) =>
          resolve(
            new Subject({ id: result.rows[0].id, ...data, active: data.active === false ? 0 : 1 })
          )
        )
        .catch(reject);
    });
  }

  static async updateById(id, data) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE subjects SET
          name = ?,
          code = ?,
          duration = ?,
          active = ?
        WHERE id = ?
      `;
      const params = [data.name, data.code, data.duration, data.active === false ? 0 : 1, id];

      db.run(sql, params, async function (err) {
        if (err) reject(err);
        else resolve(await Subject.findById(id));
      });
    });
  }

  static async insertMany(subjects) {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(
        'INSERT INTO subjects (name, code, duration, active) VALUES (?, ?, ?, ?)'
      );

      for (const subject of subjects) {
        stmt.run(subject.name, subject.code, subject.duration, subject.active === false ? 0 : 1);
      }

      stmt.finalize((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  static async deleteMany() {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM subjects', [], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = Subject;
