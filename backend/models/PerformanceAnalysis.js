const db = require('../config/db');

class PerformanceAnalysis {
  constructor(data) {
    this.userId = data.userId;
    this.examsTaken = data.examsTaken;
    this.totalScore = data.totalScore;
    this.averageScore = data.averageScore;
    this.bestSubject = data.bestSubject;
    this.weakestSubject = data.weakestSubject;
    this.improvementRate = data.improvementRate;
    this.completionRate = data.completionRate;
    this.timeManagement = data.timeManagement;
    this.subjectPerformance = data.subjectPerformance;
  }

  static async generateAnalysis(userId) {
    return new Promise((resolve, reject) => {
      // Get all results for user
      const sql = `
        SELECT subject, score, totalQuestions, finishedAt - startedAt as timeSpent
        FROM results
        WHERE student = ?
        ORDER BY finishedAt DESC
      `;

      db.all(sql, [userId], (err, results) => {
        if (err) {
          reject(err);
          return;
        }

        const analysis = {
          userId,
          examsTaken: results.length,
          totalScore: results.reduce((sum, r) => sum + r.score, 0),
          averageScore: results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length) : 0,
          subjectPerformance: {},
          improvementRate: 0,
          completionRate: 0,
          timeManagement: 0
        };

        // Calculate subject performance
        results.forEach(result => {
          if (!analysis.subjectPerformance[result.subject]) {
            analysis.subjectPerformance[result.subject] = {
              attempts: 0,
              totalScore: 0,
              averageScore: 0,
              percentage: 0
            };
          }
          analysis.subjectPerformance[result.subject].attempts += 1;
          analysis.subjectPerformance[result.subject].totalScore += result.score;
          analysis.subjectPerformance[result.subject].averageScore = Math.round(
            analysis.subjectPerformance[result.subject].totalScore / analysis.subjectPerformance[result.subject].attempts
          );
          analysis.subjectPerformance[result.subject].percentage = Math.round(
            (analysis.subjectPerformance[result.subject].averageScore / result.totalQuestions) * 100
          );
        });

        // Find best and weakest subjects
        const subjects = Object.entries(analysis.subjectPerformance);
        if (subjects.length > 0) {
          analysis.bestSubject = subjects.reduce((best, current) => 
            current[1].averageScore > best[1].averageScore ? current : best
          )[0];
          analysis.weakestSubject = subjects.reduce((worst, current) => 
            current[1].averageScore < worst[1].averageScore ? current : worst
          )[0];
        }

        // Calculate improvement rate (comparing first half vs second half)
        if (results.length >= 2) {
          const firstHalf = results.slice(Math.ceil(results.length / 2)).reduce((sum, r) => sum + r.score, 0) / Math.ceil(results.length / 2);
          const secondHalf = results.slice(0, Math.ceil(results.length / 2)).reduce((sum, r) => sum + r.score, 0) / Math.ceil(results.length / 2);
          analysis.improvementRate = Math.round(((secondHalf - firstHalf) / firstHalf) * 100);
        }

        // Completion rate
        analysis.completionRate = 100;

        // Time management (average time per question)
        const totalTime = results.reduce((sum, r) => sum + (r.timeSpent || 0), 0);
        const totalQuestions = results.reduce((sum, r) => sum + r.totalQuestions, 0);
        analysis.timeManagement = totalQuestions > 0 ? Math.round(totalTime / totalQuestions) : 0;

        resolve(analysis);
      });
    });
  }

  static async getUserStats(userId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          COUNT(*) as examsTaken,
          AVG(score) as averageScore,
          MAX(score) as bestScore,
          MIN(score) as worstScore,
          SUM(totalQuestions) as totalQuestions
        FROM results
        WHERE student = ?
      `;

      db.get(sql, [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row || {});
      });
    });
  }
}

module.exports = PerformanceAnalysis;
