// SMS Service using Twilio

let twilioClient = null;

// Initialize Twilio
const initializeTwilio = () => {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      const twilio = require('twilio');
      twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      return true;
    } catch (error) {
      console.error('Failed to initialize Twilio:', error.message);
      return false;
    }
  }
  return false;
};

// Send SMS
const sendSMS = async (to, message) => {
  if (!twilioClient) {
    const initialized = initializeTwilio();
    if (!initialized) {
      console.log('SMS service not configured. Message not sent.');
      return {
        success: false,
        error: 'SMS service not configured'
      };
    }
  }

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });

    console.log('SMS sent: ' + result.sid);
    return {
      success: true,
      messageId: result.sid
    };
  } catch (error) {
    console.error('SMS error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Send bulk SMS
const sendBulkSMS = async (recipients, message) => {
  const results = [];

  for (const recipient of recipients) {
    const result = await sendSMS(recipient, message);
    results.push({
      recipient,
      ...result
    });
  }

  return {
    total: recipients.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  };
};

// SMS templates
const smsTemplates = {
  // Attendance alert
  attendanceAlert: (studentName, status) =>
    `Attendance Alert: ${studentName} was marked ${status} today. - School Management`,

  // Fee reminder
  feeReminder: (studentName, amount, dueDate) =>
    `Fee Reminder: $${amount} due on ${dueDate} for ${studentName}. Please make payment soon. - School`,

  // Emergency alert
  emergencyAlert: (message) =>
    `URGENT: ${message} Please contact the school immediately. - School Management`,

  // Event reminder
  eventReminder: (eventName, date, time) =>
    `Reminder: ${eventName} on ${date} at ${time}. - School Management`,

  // Grade alert
  gradeAlert: (studentName, courseName, grade) =>
    `Grade Alert: ${studentName} received ${grade} in ${courseName}. - School`,

  // Transport alert
  transportAlert: (message) =>
    `Transport Alert: ${message} - School Management`,

  // Health alert
  healthAlert: (studentName, message) =>
    `Health Alert: ${studentName} - ${message}. Please call the school. - School Management`
};

// Send template SMS
const sendTemplateSMS = async (to, templateName, data) => {
  const template = smsTemplates[templateName];

  if (!template) {
    throw new Error('SMS template not found');
  }

  const message = typeof template === 'function' ? template(...data) : template;

  return await sendSMS(to, message);
};

module.exports = {
  sendSMS,
  sendBulkSMS,
  sendTemplateSMS,
  smsTemplates
};
