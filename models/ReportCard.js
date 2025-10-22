const mongoose = require('mongoose');

const reportCardSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  academicYear: {
    type: String,
    required: true
  },
  term: {
    type: String,
    enum: ['Q1', 'Q2', 'Q3', 'Q4', 'Midterm', 'Final', 'Annual'],
    required: true
  },
  grade: {
    type: String,
    required: true
  },
  courses: [{
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    grades: [{
      assessmentType: String,
      score: Number,
      maxScore: Number,
      weight: Number
    }],
    overallScore: Number,
    overallMaxScore: Number,
    percentage: Number,
    letterGrade: String,
    remarks: String
  }],
  attendance: {
    totalDays: {
      type: Number,
      default: 0
    },
    present: {
      type: Number,
      default: 0
    },
    absent: {
      type: Number,
      default: 0
    },
    late: {
      type: Number,
      default: 0
    },
    attendanceRate: Number
  },
  overallPerformance: {
    gpa: Number,
    percentage: Number,
    rank: Number,
    totalStudents: Number
  },
  behaviorAndConduct: {
    rating: {
      type: String,
      enum: ['excellent', 'good', 'satisfactory', 'needs_improvement']
    },
    comments: String
  },
  teacherComments: [{
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher'
    },
    subject: String,
    comment: String
  }],
  principalComments: String,
  strengths: [String],
  areasForImprovement: [String],
  extracurricular: [{
    activity: String,
    performance: String,
    achievement: String
  }],
  nextSteps: [String],
  publishedDate: Date,
  isPublished: {
    type: Boolean,
    default: false
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  template: String,
  pdfUrl: String
}, {
  timestamps: true
});

// Calculate overall performance before saving
reportCardSchema.pre('save', function(next) {
  if (this.courses && this.courses.length > 0) {
    let totalPercentage = 0;
    let totalCredits = 0;

    this.courses.forEach(course => {
      if (course.percentage) {
        totalPercentage += course.percentage;
        totalCredits += 1;
      }
    });

    if (totalCredits > 0) {
      this.overallPerformance.percentage = (totalPercentage / totalCredits).toFixed(2);
      // GPA calculation (4.0 scale)
      this.overallPerformance.gpa = ((totalPercentage / totalCredits) / 25).toFixed(2);
    }
  }

  // Calculate attendance rate
  if (this.attendance && this.attendance.totalDays > 0) {
    this.attendance.attendanceRate = ((this.attendance.present / this.attendance.totalDays) * 100).toFixed(2);
  }

  next();
});

// Index for efficient queries
reportCardSchema.index({ student: 1, academicYear: 1, term: 1 });
reportCardSchema.index({ isPublished: 1 });

module.exports = mongoose.model('ReportCard', reportCardSchema);
