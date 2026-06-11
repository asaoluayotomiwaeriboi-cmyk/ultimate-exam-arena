const db = require('../config/db');
const bcrypt = require('bcryptjs');

class User {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.phone = data.phone;
    this.dateOfBirth = data.dateOfBirth;
    this.address = data.address;
    this.city = data.city;
    this.state = data.state;
    this.lga = data.lga;
    this.school = data.school;
    this.jambNumber = data.jambNumber;
    this.targetUniversity = data.targetUniversity;
    this.targetCourse = data.targetCourse;
    this.password = data.password;
    this.role = data.role || 'student';
    this.profile = data.profile ? JSON.parse(data.profile) : {};
    this.mfaSecret = data.mfaSecret;
    this.mfaEnabled = data.mfaEnabled === 1;
    this.loginAttempts = data.loginAttempts || 0;
    this.lockedUntil = data.lockedUntil;
    this.ipWhitelist = data.ipWhitelist ? data.ipWhitelist.split(',') : [];
    this.threatLevel = data.threatLevel || 0;
    this.lastLogin = data.lastLogin;
    this.googleId = data.googleId;
    this.googleAccessToken = data.googleAccessToken;
    this.googleRefreshToken = data.googleRefreshToken;
    this.createdAt = data.createdAt;
  }

  static async findOne(query) {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM users WHERE ';
      const params = [];
      const conditions = [];

      if (query.email) {
        conditions.push('email = ?');
        params.push(query.email);
      }
      if (query._id) {
        conditions.push('id = ?');
        params.push(query._id);
      }
      if (query.googleId) {
        conditions.push('googleId = ?');
        params.push(query.googleId);
      }

      sql += conditions.join(' AND ') + ' LIMIT 1';

      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row ? new User(row) : null);
      });
    });
  }

  static async findById(id) {
    return this.findOne({ _id: id });
  }

  static async find(query = {}) {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM users WHERE 1=1';
      const params = [];

      if (query.role) {
        sql += ' AND role = ?';
        params.push(query.role);
      }
      if (query.email) {
        sql += ' AND email = ?';
        params.push(query.email);
      }
      if (query._id) {
        sql += ' AND id = ?';
        params.push(query._id);
      }
      if (query.limit) {
        sql += ' LIMIT ?';
        params.push(query.limit);
      }

      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(row => new User(row)));
      });
    });
  }

  static async countDocuments(query = {}) {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT COUNT(*) as count FROM users WHERE 1=1';
      const params = [];

      if (query.role) {
        sql += ' AND role = ?';
        params.push(query.role);
      }

      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });
  }

  static async create(data) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO users (name, email, phone, dateOfBirth, address, city, state, lga, school, jambNumber, targetUniversity, targetCourse, password, role, profile, mfaSecret, mfaEnabled, loginAttempts, lockedUntil, ipWhitelist, threatLevel, lastLogin, googleId, googleAccessToken, googleRefreshToken)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
      `;
      const params = [
        data.name,
        data.email,
        data.phone || null,
        data.dateOfBirth || null,
        data.address || null,
        data.city || null,
        data.state || null,
        data.lga || null,
        data.school || null,
        data.jambNumber || null,
        data.targetUniversity || null,
        data.targetCourse || null,
        data.password,
        data.role || 'student',
        JSON.stringify(data.profile || {}),
        data.mfaSecret || null,
        data.mfaEnabled ? 1 : 0,
        data.loginAttempts || 0,
        data.lockedUntil || null,
        data.ipWhitelist ? data.ipWhitelist.join(',') : null,
        data.threatLevel || 0,
        data.lastLogin || null,
        data.googleId || null,
        data.googleAccessToken || null,
        data.googleRefreshToken || null
      ];

      db.run(sql, params)
        .then((result) => {
          data.id = result.rows[0].id;
          resolve(new User(data));
        })
        .catch(reject);
    });
  }

  async save() {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE users SET
          name = ?, email = ?, phone = ?, dateOfBirth = ?, address = ?, city = ?, state = ?, lga = ?, school = ?, jambNumber = ?, targetUniversity = ?, targetCourse = ?, password = ?, role = ?, profile = ?,
          mfaSecret = ?, mfaEnabled = ?, loginAttempts = ?, lockedUntil = ?,
          ipWhitelist = ?, threatLevel = ?, lastLogin = ?, googleId = ?, googleAccessToken = ?, googleRefreshToken = ?
        WHERE id = ?
      `;
      const params = [
        this.name,
        this.email,
        this.phone,
        this.dateOfBirth,
        this.address,
        this.city,
        this.state,
        this.lga,
        this.school,
        this.jambNumber,
        this.targetUniversity,
        this.targetCourse,
        this.password,
        this.role,
        JSON.stringify(this.profile),
        this.mfaSecret,
        this.mfaEnabled ? 1 : 0,
        this.loginAttempts,
        this.lockedUntil,
        this.ipWhitelist.join(','),
        this.threatLevel,
        this.lastLogin,
        this.googleId,
        this.googleAccessToken,
        this.googleRefreshToken,
        this.id
      ];

      db.run(sql, params, (err) => {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }

  toObject() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      phone: this.phone,
      dateOfBirth: this.dateOfBirth,
      address: this.address,
      city: this.city,
      state: this.state,
      lga: this.lga,
      school: this.school,
      jambNumber: this.jambNumber,
      targetUniversity: this.targetUniversity,
      targetCourse: this.targetCourse,
      role: this.role,
      profile: this.profile,
      mfaSecret: this.mfaSecret,
      mfaEnabled: this.mfaEnabled,
      loginAttempts: this.loginAttempts,
      lockedUntil: this.lockedUntil,
      ipWhitelist: this.ipWhitelist,
      threatLevel: this.threatLevel,
      lastLogin: this.lastLogin,
      googleId: this.googleId,
      createdAt: this.createdAt
    };
  }
}

module.exports = User;