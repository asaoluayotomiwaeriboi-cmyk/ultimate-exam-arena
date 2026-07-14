const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

let transporter;

// Initialize email transporter based on service
function initializeTransporter() {
  const emailService = process.env.EMAIL_SERVICE || 'gmail';

  if (emailService === 'gmail') {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, // Use app-specific password for Gmail
      },
    });
  } else if (emailService === 'outlook') {
    transporter = nodemailer.createTransport({
      host: 'smtp-mail.outlook.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  } else if (emailService === 'sendgrid') {
    transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY,
      },
    });
  } else {
    // Default to Gmail
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }
}

// Initialize on load
initializeTransporter();

/**
 * Send daily password email
 */
async function sendPasswordEmail(recipientEmail, recipientName, password, expiryTime) {
  try {
    if (!transporter) {
      throw new Error('Email transporter not initialized');
    }

    const htmlContent = generatePasswordEmailHTML(recipientName, password, expiryTime);

    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME || 'ULTIMATE CBT'} <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: 'Your UTME Competitive Exam Daily Access Password',
      html: htmlContent,
      text: `Your UTME Competitive Exam Password: ${password}\n\nExpires at: ${expiryTime}\n\nDo not share this password with anyone.`,
    };

    const result = await transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: result.messageId,
      response: result.response,
    };
  } catch (error) {
    console.error('Email send error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Generate HTML email template for password
 */
function generatePasswordEmailHTML(name, password, expiryTime) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #ffffff;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content {
          padding: 40px 30px;
        }
        .greeting {
          font-size: 16px;
          margin-bottom: 20px;
          color: #333;
        }
        .password-box {
          background-color: #f8f9fa;
          border-left: 4px solid #667eea;
          padding: 20px;
          margin: 30px 0;
          border-radius: 4px;
        }
        .password-label {
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }
        .password-value {
          font-size: 32px;
          font-weight: bold;
          color: #667eea;
          letter-spacing: 4px;
          font-family: 'Courier New', monospace;
          text-align: center;
        }
        .expiry-info {
          background-color: #fff3cd;
          border: 1px solid #ffc107;
          border-radius: 4px;
          padding: 15px;
          margin: 20px 0;
          font-size: 14px;
          color: #856404;
        }
        .expiry-info strong {
          color: #333;
        }
        .instructions {
          background-color: #e7f3ff;
          border: 1px solid #b3d9ff;
          border-radius: 4px;
          padding: 15px;
          margin: 20px 0;
          font-size: 14px;
          color: #004085;
        }
        .instructions h3 {
          margin-top: 0;
          margin-bottom: 10px;
          color: #003d7a;
        }
        .instructions li {
          margin-bottom: 8px;
        }
        .warning {
          background-color: #ffe7e7;
          border: 1px solid #ffcccc;
          border-radius: 4px;
          padding: 15px;
          margin: 20px 0;
          font-size: 13px;
          color: #721c24;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #666;
          border-top: 1px solid #ddd;
        }
        .button {
          display: inline-block;
          padding: 12px 30px;
          background-color: #667eea;
          color: #ffffff;
          text-decoration: none;
          border-radius: 4px;
          margin: 20px 0;
          font-weight: 600;
        }
        .button:hover {
          background-color: #5568d3;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 UTME Competitive Exam Access</h1>
        </div>
        
        <div class="content">
          <div class="greeting">
            <p>Hello <strong>${name}</strong>,</p>
            <p>Your daily access password for the UTME Competitive Exam has been generated. Use the password below to access today's exam.</p>
          </div>

          <div class="password-box">
            <div class="password-label">Your Daily Password</div>
            <div class="password-value">${password}</div>
          </div>

          <div class="expiry-info">
            <strong>⏰ Expires at:</strong> ${expiryTime} (24 hours from generation)
          </div>

          <div class="instructions">
            <h3>How to Use:</h3>
            <ol>
              <li>Login to the ULTIMATE CBT platform</li>
              <li>Navigate to UTME Competitive Exam</li>
              <li>Enter the password above when prompted</li>
              <li>Complete your exam within the time limit</li>
            </ol>
          </div>

          <div class="warning">
            <strong>⚠️ Important:</strong> Do not share this password with anyone. This password is unique to you and is only valid for 24 hours. After expiry, you will receive a new password via email.
          </div>

          <center>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/exam/utme" class="button">Access Exam</a>
          </center>

          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            If you did not request this password or have any concerns about your account, please contact our support team immediately.
          </p>
        </div>

        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ULTIMATE CBT. All rights reserved.</p>
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send bulk password emails
 */
async function sendBulkPasswordEmails(recipients, password, expiryTime) {
  try {
    const results = [];

    for (const recipient of recipients) {
      const result = await sendPasswordEmail(recipient.email, recipient.name, password, expiryTime);
      results.push({
        email: recipient.email,
        ...result,
      });

      // Small delay between emails to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return results;
  } catch (error) {
    console.error('Bulk email error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Test email configuration
 */
async function testEmailConfiguration() {
  try {
    if (!transporter) {
      return {
        success: false,
        error: 'Email transporter not initialized',
      };
    }

    const result = await transporter.verify();
    return {
      success: result,
      message: result ? 'Email configuration is valid' : 'Email configuration failed verification',
    };
  } catch (error) {
    console.error('Email config test error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  sendPasswordEmail,
  sendBulkPasswordEmails,
  testEmailConfiguration,
  getTransporter: () => transporter,
};
