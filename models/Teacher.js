const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teacherId: {
    type: String,
    required: true,
    unique: true
  },
  department: {
    type: String,
    required: true
  },
  subjects: [{
    type: String,
    required: true
  }],
  qualifications: [{
    degree: String,
    institution: String,
    year: Number
  }],
  hireDate: {
    type: Date,
    required: true
  },
  salary: {
    type: Number
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  courses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  status: {
    type: String,
    enum: ['active', 'on-leave', 'terminated'],
    default: 'active'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Teacher', teacherSchema);
