const mongoose = require('mongoose');

const portfolioEntrySchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
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
    enum: ['photo', 'video', 'document', 'audio', 'artwork', 'project', 'observation', 'achievement'],
    required: true
  },
  category: {
    type: String,
    enum: ['academic', 'social', 'physical', 'creative', 'behavior', 'extracurricular'],
    default: 'academic'
  },
  media: [{
    type: {
      type: String,
      enum: ['image', 'video', 'audio', 'document']
    },
    url: {
      type: String,
      required: true
    },
    filename: String,
    mimeType: String,
    size: Number,
    thumbnail: String,
    duration: Number  // For video/audio
  }],
  tags: [String],
  // Learning areas/skills demonstrated
  learningAreas: [{
    area: String,
    skill: String,
    level: {
      type: String,
      enum: ['emerging', 'developing', 'proficient', 'advanced']
    }
  }],
  // Related course or subject
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  subject: String,
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  // Reflection/observation by teacher
  teacherObservation: {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher'
    },
    observation: String,
    strengths: [String],
    nextSteps: [String]
  },
  // Student's own reflection
  studentReflection: {
    whatILearned: String,
    whatIEnjoyed: String,
    whatWasChallenging: String,
    nextGoals: [String]
  },
  visibility: {
    parents: {
      type: Boolean,
      default: true
    },
    student: {
      type: Boolean,
      default: true
    },
    teachers: {
      type: Boolean,
      default: true
    },
    public: {
      type: Boolean,
      default: false
    }
  },
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userRole: String,
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isHighlight: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published'
  }
}, {
  timestamps: true
});

// Index for efficient queries
portfolioEntrySchema.index({ student: 1, date: -1 });
portfolioEntrySchema.index({ student: 1, category: 1 });
portfolioEntrySchema.index({ date: -1 });
portfolioEntrySchema.index({ tags: 1 });

module.exports = mongoose.model('PortfolioEntry', portfolioEntrySchema);
