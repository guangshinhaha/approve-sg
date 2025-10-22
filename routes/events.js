const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Notification = require('../models/Notification');
const Student = require('../models/Student');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// @route   GET /api/events
// @desc    Get all events
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { type, startDate, endDate, status } = req.query;
    const query = { visibility: 'public' };

    if (type) query.type = type;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    const events = await Event.find(query)
      .populate('organizer', 'firstName lastName')
      .populate('audience.courses', 'name courseCode')
      .populate('attendees.user', 'firstName lastName')
      .sort({ startDate: 1 });

    res.json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/events/calendar
// @desc    Get events for calendar view
// @access  Private
router.get('/calendar', async (req, res) => {
  try {
    const { month, year } = req.query;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const events = await Event.find({
      startDate: {
        $gte: startDate,
        $lte: endDate
      },
      visibility: 'public'
    })
      .populate('organizer', 'firstName lastName')
      .sort({ startDate: 1 });

    // Group by date
    const eventsByDate = {};
    events.forEach(event => {
      const dateKey = event.startDate.toISOString().split('T')[0];
      if (!eventsByDate[dateKey]) {
        eventsByDate[dateKey] = [];
      }
      eventsByDate[dateKey].push(event);
    });

    res.json({
      success: true,
      data: {
        events,
        eventsByDate
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/events/:id
// @desc    Get single event
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'firstName lastName email')
      .populate('audience.courses', 'name courseCode')
      .populate('audience.specificUsers', 'firstName lastName email')
      .populate('attendees.user', 'firstName lastName email');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/events
// @desc    Create event
// @access  Private (admin, teacher)
router.post('/', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const event = await Event.create({
      ...req.body,
      organizer: req.user._id
    });

    // Send notifications to audience
    if (event.audience.all) {
      // Notify all active users
      const User = require('../models/User');
      const users = await User.find({ isActive: true });
      const notifications = users.map(user => ({
        user: user._id,
        type: 'event',
        title: 'New Event',
        message: `New event: ${event.title} on ${event.startDate.toDateString()}`,
        data: {
          eventId: event._id
        },
        priority: 'normal',
        channels: {
          inApp: true,
          email: event.type === 'exam' || event.type === 'parent-teacher'
        }
      }));
      await Notification.insertMany(notifications);
    } else {
      // Notify specific audience
      const recipients = [];

      if (event.audience.grades && event.audience.grades.length > 0) {
        const students = await Student.find({
          grade: { $in: event.audience.grades },
          status: 'active'
        }).populate('parents');

        students.forEach(s => {
          recipients.push(s.user);
          s.parents.forEach(p => recipients.push(p.user));
        });
      }

      if (event.audience.specificUsers && event.audience.specificUsers.length > 0) {
        recipients.push(...event.audience.specificUsers);
      }

      if (recipients.length > 0) {
        const uniqueRecipients = [...new Set(recipients.map(r => r.toString()))];
        const notifications = uniqueRecipients.map(userId => ({
          user: userId,
          type: 'event',
          title: 'New Event',
          message: `New event: ${event.title} on ${event.startDate.toDateString()}`,
          data: {
            eventId: event._id
          },
          priority: event.type === 'exam' ? 'high' : 'normal',
          channels: {
            inApp: true,
            email: true
          }
        }));
        await Notification.insertMany(notifications);
      }
    }

    const populatedEvent = await Event.findById(event._id)
      .populate('organizer', 'firstName lastName');

    res.status(201).json({
      success: true,
      data: populatedEvent
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/events/:id
// @desc    Update event
// @access  Private (admin, organizer)
router.put('/:id', async (req, res) => {
  try {
    let event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this event'
      });
    }

    event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('organizer', 'firstName lastName');

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/events/:id/rsvp
// @desc    RSVP to event
// @access  Private
router.post('/:id/rsvp', async (req, res) => {
  try {
    const { status } = req.body; // going, maybe, not_going

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (!event.requiresRSVP) {
      return res.status(400).json({
        success: false,
        message: 'This event does not require RSVP'
      });
    }

    // Find or create attendee entry
    const attendeeIndex = event.attendees.findIndex(
      a => a.user.toString() === req.user._id.toString()
    );

    if (attendeeIndex > -1) {
      event.attendees[attendeeIndex].status = status;
      event.attendees[attendeeIndex].responseDate = new Date();
    } else {
      event.attendees.push({
        user: req.user._id,
        status,
        responseDate: new Date()
      });
    }

    await event.save();

    res.json({
      success: true,
      data: event,
      message: 'RSVP recorded successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/events/:id
// @desc    Delete event
// @access  Private (admin, organizer)
router.delete('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this event'
      });
    }

    await Event.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
