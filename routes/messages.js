const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Student = require('../models/Student');
const Parent = require('../models/Parent');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// @route   GET /api/messages
// @desc    Get messages for current user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { type, category, unread } = req.query;
    const query = {
      $or: [
        { sender: req.user._id },
        { 'recipients.user': req.user._id },
        { recipientGroups: { $exists: true, $ne: [] } }
      ]
    };

    if (type) query.type = type;
    if (category) query.category = category;

    const messages = await Message.find(query)
      .populate('sender', 'firstName lastName email role')
      .populate('recipients.user', 'firstName lastName email')
      .populate('course', 'name courseCode')
      .sort({ createdAt: -1 })
      .limit(100);

    // Filter read/unread
    let filteredMessages = messages;
    if (unread === 'true') {
      filteredMessages = messages.filter(msg => {
        const recipient = msg.recipients.find(r => r.user._id.toString() === req.user._id.toString());
        return !recipient || !recipient.readAt;
      });
    }

    res.json({
      success: true,
      count: filteredMessages.length,
      data: filteredMessages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/messages/:id
// @desc    Get single message
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const message = await Message.findById(req.params.id)
      .populate('sender', 'firstName lastName email role')
      .populate('recipients.user', 'firstName lastName email')
      .populate('course', 'name courseCode');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Mark as read
    const recipientIndex = message.recipients.findIndex(
      r => r.user._id.toString() === req.user._id.toString()
    );

    if (recipientIndex !== -1 && !message.recipients[recipientIndex].readAt) {
      message.recipients[recipientIndex].readAt = new Date();
      await message.save();
    }

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/messages
// @desc    Send a message
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { type, recipients, recipientGroups, subject, body, priority, category, grade, section, course, scheduledFor } = req.body;

    // Build message
    const messageData = {
      type,
      sender: req.user._id,
      subject,
      body,
      priority: priority || 'normal',
      category: category || 'general',
      status: scheduledFor ? 'scheduled' : 'sent',
      scheduledFor,
      sentAt: scheduledFor ? null : new Date()
    };

    // Handle recipients based on type
    if (type === 'private' && recipients) {
      messageData.recipients = recipients.map(userId => ({ user: userId }));
    } else if (type === 'broadcast' || type === 'group') {
      messageData.recipientGroups = recipientGroups;
      messageData.grade = grade;
      messageData.section = section;
      messageData.course = course;

      // Get actual recipients based on groups
      const actualRecipients = await getRecipientsByGroups(recipientGroups, grade, section, course);
      messageData.recipients = actualRecipients.map(userId => ({ user: userId }));
    }

    const message = await Message.create(messageData);

    // Create notifications for recipients
    if (message.status === 'sent') {
      await createMessageNotifications(message);
    }

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'firstName lastName email role')
      .populate('recipients.user', 'firstName lastName email');

    res.status(201).json({
      success: true,
      data: populatedMessage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/messages/broadcast
// @desc    Send broadcast message (admin/teacher only)
// @access  Private (admin, teacher)
router.post('/broadcast', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { subject, body, recipientGroups, grade, section, course, priority, category } = req.body;

    // Get recipients based on groups
    const recipients = await getRecipientsByGroups(recipientGroups, grade, section, course);

    const message = await Message.create({
      type: 'broadcast',
      sender: req.user._id,
      recipients: recipients.map(userId => ({ user: userId })),
      recipientGroups,
      grade,
      section,
      course,
      subject,
      body,
      priority: priority || 'normal',
      category: category || 'general',
      status: 'sent',
      sentAt: new Date()
    });

    // Create notifications
    await createMessageNotifications(message);

    res.status(201).json({
      success: true,
      data: message,
      recipientCount: recipients.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PATCH /api/messages/:id/read
// @desc    Mark message as read
// @access  Private
router.patch('/:id/read', async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    const recipientIndex = message.recipients.findIndex(
      r => r.user.toString() === req.user._id.toString()
    );

    if (recipientIndex !== -1) {
      message.recipients[recipientIndex].readAt = new Date();
      await message.save();
    }

    res.json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/messages/:id
// @desc    Delete message (sender only)
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Only sender or admin can delete
    if (message.sender.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this message'
      });
    }

    await Message.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Helper function to get recipients by groups
async function getRecipientsByGroups(groups, grade, section, course) {
  const recipients = new Set();

  if (!groups || groups.length === 0) return [];

  for (const group of groups) {
    switch (group) {
      case 'all_parents':
        const parents = await Parent.find().select('user');
        parents.forEach(p => recipients.add(p.user.toString()));
        break;

      case 'all_teachers':
        const teachers = await User.find({ role: 'teacher', isActive: true }).select('_id');
        teachers.forEach(t => recipients.add(t._id.toString()));
        break;

      case 'all_students':
        const students = await Student.find({ status: 'active' }).select('user');
        students.forEach(s => recipients.add(s.user.toString()));
        break;

      case 'grade':
        if (grade) {
          const gradeStudents = await Student.find({ grade, status: 'active' }).populate('user parents');
          gradeStudents.forEach(s => {
            recipients.add(s.user._id.toString());
            s.parents.forEach(p => recipients.add(p.user.toString()));
          });
        }
        break;

      case 'section':
        if (grade && section) {
          const sectionStudents = await Student.find({ grade, section, status: 'active' }).populate('user parents');
          sectionStudents.forEach(s => {
            recipients.add(s.user._id.toString());
            s.parents.forEach(p => recipients.add(p.user.toString()));
          });
        }
        break;

      case 'course':
        if (course) {
          const Course = require('../models/Course');
          const courseDoc = await Course.findById(course).populate('students');
          if (courseDoc) {
            for (const student of courseDoc.students) {
              const studentDoc = await Student.findById(student._id).populate('user parents');
              recipients.add(studentDoc.user._id.toString());
              studentDoc.parents.forEach(p => recipients.add(p.user.toString()));
            }
          }
        }
        break;
    }
  }

  return Array.from(recipients);
}

// Helper function to create notifications
async function createMessageNotifications(message) {
  const notifications = message.recipients.map(recipient => ({
    user: recipient.user,
    type: 'message',
    title: message.subject,
    message: `New message from ${message.sender.firstName} ${message.sender.lastName}`,
    data: {
      messageId: message._id,
      sender: message.sender
    },
    priority: message.priority,
    channels: {
      inApp: true,
      email: message.priority === 'high' || message.priority === 'urgent',
      sms: message.priority === 'urgent'
    }
  }));

  await Notification.insertMany(notifications);
}

module.exports = router;
