const { Anthropic } = require('@anthropic-ai/sdk');
const db = require('../config/db');

class Sage {
  constructor() {
    this.name = 'Sage';
    this.role = 'AI_Tutor';
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    this.systemPrompt = `You are Sage, a Smart Exam Guide and AI tutor for Ultimate Exam Arena. You help Nigerian students prepare for JAMB UTME exams. You are friendly, encouraging, and give clear simple explanations. You specialize in all JAMB subjects. Always relate answers to the JAMB syllabus. Keep responses concise and practical.`;
  }

  async askQuestion(question, userId = null) {
    try {
      // Check rate limits for free users
      if (userId && !(await this.hasUnlimitedMessages(userId))) {
        const messageCount = await this.getUserMessageCount(userId);
        if (messageCount >= 5) {
          return {
            success: false,
            message: 'Daily limit reached. Upgrade to Premium for unlimited messages.',
            limitReached: true
          };
        }
      }

      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: this.systemPrompt,
        messages: [
          {
            role: 'user',
            content: question
          }
        ]
      });

      const response = message.content[0].text;

      // Track usage
      if (userId) {
        await this.trackMessageUsage(userId);
      }

      return {
        success: true,
        response: response,
        tokensUsed: message.usage.output_tokens
      };
    } catch (error) {
      console.error('Sage error:', error);
      return {
        success: false,
        message: 'Error processing your question. Please try again.'
      };
    }
  }

  async getExamTips(subject, userId = null) {
    const question = `Give me 5 specific JAMB exam tips for ${subject}. Make them practical and actionable.`;
    return this.askQuestion(question, userId);
  }

  async analyzePerformance(performanceData, userId = null) {
    const question = `Analyze this exam performance and give improvement suggestions:\n${JSON.stringify(performanceData)}`;
    return this.askQuestion(question, userId);
  }

  async getUserMessageCount(userId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await db.get(
        'SELECT COUNT(*) as count FROM sage_messages WHERE userId = ? AND DATE(createdAt) = ?',
        [userId, today]
      );
      return result?.count || 0;
    } catch (error) {
      console.error('Error getting message count:', error);
      return 0;
    }
  }

  async hasUnlimitedMessages(userId) {
    try {
      const user = await db.get(
        'SELECT role FROM users WHERE id = ?',
        [userId]
      );
      return user?.role === 'premium' || user?.role === 'admin';
    } catch (error) {
      return false;
    }
  }

  async trackMessageUsage(userId) {
    try {
      await db.run(
        'INSERT INTO sage_messages (userId, createdAt) VALUES (?, datetime("now"))',
        [userId]
      );
    } catch (error) {
      console.error('Error tracking message:', error);
    }
  }
}

module.exports = Sage;
