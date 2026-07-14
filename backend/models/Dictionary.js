const db = require('../config/db');

class Dictionary {
  constructor(data) {
    this.id = data.id;
    this.word = data.word;
    this.pronunciation = data.pronunciation;
    this.definition = data.definition;
    this.partOfSpeech = data.partOfSpeech;
    this.example = data.example;
    this.synonyms = data.synonyms ? JSON.parse(data.synonyms) : [];
    this.audioUrl = data.audioUrl;
    this.createdAt = data.createdAt;
  }

  static async find(query = {}) {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM dictionary WHERE 1=1';
      const params = [];

      if (query.word) {
        sql += ' AND word LIKE ?';
        params.push(`%${query.word}%`);
      }

      if (query.partOfSpeech) {
        sql += ' AND partOfSpeech = ?';
        params.push(query.partOfSpeech);
      }

      sql += ' ORDER BY word ASC';

      if (query.limit) {
        sql += ' LIMIT ?';
        params.push(query.limit);
      }

      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map((row) => new Dictionary(row)));
      });
    });
  }

  static async findOne(query) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM dictionary WHERE word = ? LIMIT 1';
      db.get(sql, [query.word], (err, row) => {
        if (err) reject(err);
        else resolve(row ? new Dictionary(row) : null);
      });
    });
  }

  static async create(data) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO dictionary (word, pronunciation, definition, partOfSpeech, example, synonyms, audioUrl)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        data.word,
        data.pronunciation,
        data.definition,
        data.partOfSpeech,
        data.example,
        JSON.stringify(data.synonyms || []),
        data.audioUrl,
      ];

      db.run(`${sql} RETURNING id`, params)
        .then((result) => {
          data.id = result.rows[0].id;
          resolve(new Dictionary(data));
        })
        .catch(reject);
    });
  }

  static async createMany(words) {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        INSERT INTO dictionary (word, pronunciation, definition, partOfSpeech, example, synonyms, audioUrl)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const word of words) {
        stmt.run(
          word.word,
          word.pronunciation,
          word.definition,
          word.partOfSpeech,
          word.example,
          JSON.stringify(word.synonyms || []),
          word.audioUrl
        );
      }

      stmt.finalize((err) => {
        if (err) reject(err);
        else resolve({ success: true });
      });
    });
  }

  static async countDocuments() {
    return new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM dictionary', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });
  }
}

module.exports = Dictionary;
