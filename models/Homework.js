const mongoose = require('mongoose');

const homeworkSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  assignedDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  dueTime: String,
  totalPoints: {
    type: Number,
    default: 100
  },
  type: {
    type: String,
    enum: ['homework', 'assignment', 'project', 'reading', 'practice', 'research', 'presentation'],
    default: 'homework'
  },
  attachments: [{
    filename: String,
    url: String,
    mimeType: String,
    size: Number
  }],
  instructions: String,
  resources: [{
    title: String,
    url: String,
    type: String
  }],
  allowLateSubmission: {
    type: Boolean,
    default: true
  },
  latePenalty: {
    enabled: {
      type: Boolean,
      default: false
    },
    percentage: {
      type: Number,
      default: 10
    }
  },
  submissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HomeworkSubmission'
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'closed', 'graded'],
    default: 'published'
  }
}, {
  timestamps: true
});

const homeworkSubmissionSchema = new mongoose.Schema({
  homework: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Homework',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  submittedDate: {
    type: Date,
    default: Date.now
  },
  isLate: {
    type: Boolean,
    default: false
  },
  content: String,
  attachments: [{
    filename: String,
    url: String,
    mimeType: String,
    size: Number
  }],
  links: [String],
  grade: {
    score: Number,
    maxScore: Number,
    percentage: Number,
    letterGrade: String,
    feedback: String,
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher'
    },
    gradedDate: Date
  },
  status: {
    type: String,
    enum: ['submitted', 'graded', 'returned', 'resubmitted'],
    default: 'submitted'
  },
  attempts: {
    type: Number,
    default: 1
  },
  teacherComments: [{
    comment: String,
    date: Date,
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher'
    }
  }]
}, {
  timestamps: true
});

// Calculate if submission is late
homeworkSubmissionSchema.pre('save', async function(next) {
  if (this.isNew) {
    const homework = await mongoose.model('Homework').findById(this.homework);
    if (homework && this.submittedDate > homework.dueDate) {
      this.isLate = true;
    }
  }
  next();
});

// Index for efficient queries
homeworkSchema.index({ course: 1, dueDate: -1 });
homeworkSchema.index({ teacher: 1, status: 1 });
homeworkSubmissionSchema.index({ homework: 1, student: 1 }, { unique: true });
homeworkSubmissionSchema.index({ student: 1, status: 1 });

const Homework = mongoose.model('Homework', homeworkSchema);
const HomeworkSubmission = mongoose.model('HomeworkSubmission', homeworkSubmissionSchema);

module.exports = { Homework, HomeworkSubmission };
