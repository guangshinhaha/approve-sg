const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  academicYear: {
    type: String,
    required: true
  },
  semester: {
    type: String,
    enum: ['Fall', 'Spring', 'Summer'],
    required: true
  },
  grade: {
    type: String,
    required: true
  },
  section: {
    type: String,
    required: true
  },
  schedule: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      required: true
    },
    periods: [{
      periodNumber: {
        type: Number,
        required: true
      },
      startTime: {
        type: String,
        required: true
      },
      endTime: {
        type: String,
        required: true
      },
      course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
      },
      teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher'
      },
      room: String,
      subject: String,
      type: {
        type: String,
        enum: ['lecture', 'lab', 'activity', 'break', 'lunch', 'assembly'],
        default: 'lecture'
      }
    }]
  }],
  breaks: [{
    name: String,
    startTime: String,
    endTime: String,
    duration: Number
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  validFrom: Date,
  validUntil: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for efficient queries
timetableSchema.index({ academicYear: 1, grade: 1, section: 1 });
timetableSchema.index({ isActive: 1 });

module.exports = mongoose.model('Timetable', timetableSchema);
