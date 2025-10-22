const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  assessmentType: {
    type: String,
    enum: ['homework', 'quiz', 'test', 'midterm', 'final', 'project', 'participation'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    required: true,
    min: 0
  },
  maxScore: {
    type: Number,
    required: true,
    min: 0
  },
  percentage: {
    type: Number
  },
  letterGrade: {
    type: String,
    enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F']
  },
  weight: {
    type: Number,
    default: 1,
    min: 0
  },
  dueDate: {
    type: Date
  },
  submittedDate: {
    type: Date
  },
  comments: {
    type: String
  },
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  }
}, {
  timestamps: true
});

// Calculate percentage before saving
gradeSchema.pre('save', function(next) {
  if (this.score && this.maxScore) {
    this.percentage = (this.score / this.maxScore) * 100;

    // Calculate letter grade
    if (this.percentage >= 97) this.letterGrade = 'A+';
    else if (this.percentage >= 93) this.letterGrade = 'A';
    else if (this.percentage >= 90) this.letterGrade = 'A-';
    else if (this.percentage >= 87) this.letterGrade = 'B+';
    else if (this.percentage >= 83) this.letterGrade = 'B';
    else if (this.percentage >= 80) this.letterGrade = 'B-';
    else if (this.percentage >= 77) this.letterGrade = 'C+';
    else if (this.percentage >= 73) this.letterGrade = 'C';
    else if (this.percentage >= 70) this.letterGrade = 'C-';
    else if (this.percentage >= 67) this.letterGrade = 'D+';
    else if (this.percentage >= 63) this.letterGrade = 'D';
    else if (this.percentage >= 60) this.letterGrade = 'D-';
    else this.letterGrade = 'F';
  }
  next();
});

module.exports = mongoose.model('Grade', gradeSchema);
