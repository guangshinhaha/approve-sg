const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['holiday', 'exam', 'meeting', 'sports', 'cultural', 'academic', 'parent-teacher', 'workshop', 'assembly', 'trip', 'other'],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  startTime: String,
  endTime: String,
  isAllDay: {
    type: Boolean,
    default: false
  },
  location: String,
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Target audience
  audience: {
    all: {
      type: Boolean,
      default: false
    },
    grades: [String],
    sections: [String],
    courses: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    }],
    specificUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  attendees: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['going', 'maybe', 'not_going', 'pending'],
      default: 'pending'
    },
    responseDate: Date
  }],
  recurrence: {
    isRecurring: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly']
    },
    interval: Number,
    endDate: Date
  },
  reminder: {
    enabled: {
      type: Boolean,
      default: false
    },
    time: {
      type: Number, // minutes before event
      default: 30
    }
  },
  attachments: [{
    filename: String,
    url: String,
    mimeType: String
  }],
  color: {
    type: String,
    default: '#3b82f6'
  },
  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  visibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  requiresRSVP: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
eventSchema.index({ startDate: 1, endDate: 1 });
eventSchema.index({ type: 1, status: 1 });
eventSchema.index({ 'audience.grades': 1 });

module.exports = mongoose.model('Event', eventSchema);
