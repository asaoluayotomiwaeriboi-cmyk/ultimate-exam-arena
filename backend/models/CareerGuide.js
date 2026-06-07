const db = require('../config/db');

class CareerGuide {
  constructor(data) {
    this.id = data.id;
    this.profession = data.profession;
    this.description = data.description;
    this.requiredSubjects = data.requiredSubjects ? JSON.parse(data.requiredSubjects) : [];
    this.institutions = data.institutions ? JSON.parse(data.institutions) : [];
    this.jobProspects = data.jobProspects;
    this.salary = data.salary;
    this.skills = data.skills ? JSON.parse(data.skills) : [];
    this.createdAt = data.createdAt;
  }

  static async find(query = {}) {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM career_guides WHERE 1=1';
      const params = [];

      if (query.profession) {
        sql += ' AND profession LIKE ?';
        params.push(`%${query.profession}%`);
      }

      sql += ' ORDER BY profession ASC';

      if (query.limit) {
        sql += ' LIMIT ?';
        params.push(query.limit);
      }

      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(row => new CareerGuide(row)));
      });
    });
  }

  static async findOne(query) {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM career_guides WHERE ';
      const params = [];
      const conditions = [];

      if (query._id) {
        conditions.push('id = ?');
        params.push(query._id);
      }
      if (query.profession) {
        conditions.push('profession = ?');
        params.push(query.profession);
      }

      sql += conditions.join(' AND ') + ' LIMIT 1';

      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row ? new CareerGuide(row) : null);
      });
    });
  }

  static async create(data) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO career_guides (profession, description, requiredSubjects, institutions, jobProspects, salary, skills)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        data.profession,
        data.description,
        JSON.stringify(data.requiredSubjects || []),
        JSON.stringify(data.institutions || []),
        data.jobProspects,
        data.salary,
        JSON.stringify(data.skills || [])
      ];

      db.run(`${sql} RETURNING id`, params)
        .then((result) => {
          data.id = result.rows[0].id;
          resolve(new CareerGuide(data));
        })
        .catch(reject);
    });
  }

  static async createMany(guides) {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        INSERT INTO career_guides (profession, description, requiredSubjects, institutions, jobProspects, salary, skills)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const guide of guides) {
        stmt.run(
          guide.profession,
          guide.description,
          JSON.stringify(guide.requiredSubjects || []),
          JSON.stringify(guide.institutions || []),
          guide.jobProspects,
          guide.salary,
          JSON.stringify(guide.skills || [])
        );
      }

      stmt.finalize((err) => {
        if (err) reject(err);
        else resolve({ success: true });
      });
    });
  }
}

module.exports = CareerGuide;
