const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  } else if (process.env.SMTP_HOST) {
    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  } else {
    // Development - use ethereal email
    return nodemailer.createTransporter({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'ethereal.user@ethereal.email',
        pass: 'ethereal.password'
      }
    });
  }
};

// Send email
const sendEmail = async ({
  to,
  subject,
  text,
  html,
  attachments = []
}) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'School Management <noreply@school.com>',
      to,
      subject,
      text,
      html,
      attachments
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('Email sent: ' + info.messageId);
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Email error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Email templates
const emailTemplates = {
  // Welcome email
  welcome: (name) => ({
    subject: 'Welcome to School Management System',
    html: `
      <h1>Welcome ${name}!</h1>
      <p>Your account has been created successfully.</p>
      <p>You can now login to the system and access your dashboard.</p>
    `
  }),

  // Password reset
  passwordReset: (name, resetLink) => ({
    subject: 'Password Reset Request',
    html: `
      <h1>Password Reset</h1>
      <p>Hello ${name},</p>
      <p>You requested to reset your password. Click the link below:</p>
      <a href="${resetLink}">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `
  }),

  // New message notification
  newMessage: (recipientName, senderName, subject, messagePreview) => ({
    subject: `New message from ${senderName}`,
    html: `
      <h2>New Message</h2>
      <p>Hello ${recipientName},</p>
      <p>You have received a new message from <strong>${senderName}</strong></p>
      <h3>${subject}</h3>
      <p>${messagePreview}</p>
      <p><a href="${process.env.APP_URL}/messages">View Message</a></p>
    `
  }),

  // Fee payment reminder
  feeReminder: (studentName, feeType, amount, dueDate) => ({
    subject: 'Fee Payment Reminder',
    html: `
      <h2>Payment Reminder</h2>
      <p>Dear Parent/Guardian,</p>
      <p>This is a reminder that the following fee is due:</p>
      <ul>
        <li>Student: ${studentName}</li>
        <li>Fee Type: ${feeType}</li>
        <li>Amount: $${amount}</li>
        <li>Due Date: ${dueDate}</li>
      </ul>
      <p>Please make the payment at your earliest convenience.</p>
    `
  }),

  // Report card published
  reportCardPublished: (studentName, term, academicYear) => ({
    subject: 'Report Card Published',
    html: `
      <h2>Report Card Available</h2>
      <p>Dear Parent/Guardian,</p>
      <p>The report card for ${studentName} is now available.</p>
      <ul>
        <li>Term: ${term}</li>
        <li>Academic Year: ${academicYear}</li>
      </ul>
      <p><a href="${process.env.APP_URL}/reportcards">View Report Card</a></p>
    `
  }),

  // Attendance alert
  attendanceAlert: (studentName, date, status) => ({
    subject: 'Attendance Alert',
    html: `
      <h2>Attendance Notification</h2>
      <p>Dear Parent/Guardian,</p>
      <p>${studentName} was marked <strong>${status}</strong> on ${date}.</p>
      <p>If you have any concerns, please contact the school.</p>
    `
  }),

  // Event reminder
  eventReminder: (eventTitle, eventDate, eventTime, location) => ({
    subject: `Reminder: ${eventTitle}`,
    html: `
      <h2>Event Reminder</h2>
      <p>This is a reminder for the upcoming event:</p>
      <h3>${eventTitle}</h3>
      <ul>
        <li>Date: ${eventDate}</li>
        <li>Time: ${eventTime}</li>
        <li>Location: ${location}</li>
      </ul>
      <p>We look forward to seeing you there!</p>
    `
  })
};

// Send template email
const sendTemplateEmail = async (to, templateName, data) => {
  const template = emailTemplates[templateName];

  if (!template) {
    throw new Error('Template not found');
  }

  const { subject, html } = typeof template === 'function' ? template(...data) : template;

  return await sendEmail({
    to,
    subject,
    html
  });
};

module.exports = {
  sendEmail,
  sendTemplateEmail,
  emailTemplates
};
