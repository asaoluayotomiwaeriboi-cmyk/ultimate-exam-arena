const db = require('../config/db');

class Leaderboard {
  constructor(data) {
    this.id = data.id;
    this.userId = data.userId;
    this.userName = data.userName;
    this.totalScore = data.totalScore;
    this.examsTaken = data.examsTaken;
    this.averageScore = data.averageScore;
    this.rank = data.rank;
    this.lastUpdated = data.lastUpdated;
  }

  static async find(query = {}) {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT u.id, u.name as userName, 
               SUM(r.score) as totalScore,
               COUNT(DISTINCT r.id) as examsTaken,
               ROUND(AVG(r.score), 2) as averageScore
        FROM users u
        LEFT JOIN results r ON u.id = r.student
        WHERE u.role = 'student'
        GROUP BY u.id
        ORDER BY totalScore DESC, averageScore DESC
      `;

      const params = [];

      if (query.limit) {
        sql += ' LIMIT ?';
        params.push(query.limit);
      } else {
        sql += ' LIMIT 100';
      }

      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else {
          const results = rows.map((row, index) => ({
            userId: row.id,
            userName: row.name,
            totalScore: row.totalScore || 0,
            examsTaken: row.examsTaken || 0,
            averageScore: row.averageScore || 0,
            rank: index + 1,
          }));
          resolve(results);
        }
      });
    });
  }

  static async getRank(userId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT COUNT(*) as rank FROM (
          SELECT u.id, SUM(r.score) as totalScore
          FROM users u
          LEFT JOIN results r ON u.id = r.student
          WHERE u.role = 'student'
          GROUP BY u.id
          ORDER BY totalScore DESC
        ) WHERE id < (
          SELECT SUM(r.score) FROM users u
          LEFT JOIN results r ON u.id = r.student
          WHERE u.id = ?
          GROUP BY u.id
        )
      `;

      db.get(sql, [userId], (err, row) => {
        if (err) reject(err);
        else resolve((row?.rank || 0) + 1);
      });
    });
  }

  static async getTopPerformers(limit = 10) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT u.id, u.name as userName, 
               SUM(r.score) as totalScore,
               COUNT(DISTINCT r.id) as examsTaken,
               ROUND(AVG(r.score), 2) as averageScore
        FROM users u
        LEFT JOIN results r ON u.id = r.student
        WHERE u.role = 'student'
        GROUP BY u.id
        HAVING examsTaken > 0
        ORDER BY totalScore DESC, averageScore DESC
        LIMIT ?
      `;

      db.all(sql, [limit], (err, rows) => {
        if (err) reject(err);
        else {
          const results = rows.map((row, index) => ({
            userId: row.id,
            userName: row.name,
            totalScore: row.totalScore || 0,
            examsTaken: row.examsTaken || 0,
            averageScore: row.averageScore || 0,
            rank: index + 1,
          }));
          resolve(results);
        }
      });
    });
  }
}

module.exports = Leaderboard;
