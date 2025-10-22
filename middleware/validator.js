const { body, param, query, validationResult } = require('express-validator');
const { ErrorResponse } = require('./errorHandler');

// Validation result handler
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const extractedErrors = errors.array().map(err => ({ [err.param]: err.msg }));
    return res.status(400).json({
      success: false,
      errors: extractedErrors
    });
  }
  next();
};

// Common validation rules
const validators = {
  // User validation
  register: [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('role').isIn(['admin', 'teacher', 'student', 'parent']).withMessage('Invalid role'),
    validate
  ],

  login: [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
    validate
  ],

  // Student validation
  createStudent: [
    body('studentId').trim().notEmpty().withMessage('Student ID is required'),
    body('dateOfBirth').isISO8601().withMessage('Valid date of birth is required'),
    body('gender').isIn(['male', 'female', 'other']).withMessage('Invalid gender'),
    body('grade').isIn(['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']).withMessage('Invalid grade'),
    body('section').trim().notEmpty().withMessage('Section is required'),
    validate
  ],

  // Course validation
  createCourse: [
    body('courseCode').trim().notEmpty().withMessage('Course code is required'),
    body('name').trim().notEmpty().withMessage('Course name is required'),
    body('grade').isIn(['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']).withMessage('Invalid grade'),
    body('subject').trim().notEmpty().withMessage('Subject is required'),
    body('teacher').isMongoId().withMessage('Valid teacher ID is required'),
    body('academicYear').trim().notEmpty().withMessage('Academic year is required'),
    body('semester').isIn(['Fall', 'Spring', 'Summer']).withMessage('Invalid semester'),
    validate
  ],

  // Attendance validation
  markAttendance: [
    body('student').isMongoId().withMessage('Valid student ID is required'),
    body('course').isMongoId().withMessage('Valid course ID is required'),
    body('date').optional().isISO8601().withMessage('Valid date is required'),
    body('status').isIn(['present', 'absent', 'late', 'excused']).withMessage('Invalid status'),
    validate
  ],

  // Grade validation
  createGrade: [
    body('student').isMongoId().withMessage('Valid student ID is required'),
    body('course').isMongoId().withMessage('Valid course ID is required'),
    body('assessmentType').isIn(['homework', 'quiz', 'test', 'midterm', 'final', 'project', 'participation']).withMessage('Invalid assessment type'),
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('score').isNumeric().isFloat({ min: 0 }).withMessage('Score must be a positive number'),
    body('maxScore').isNumeric().isFloat({ min: 0 }).withMessage('Max score must be a positive number'),
    validate
  ],

  // Fee validation
  createFee: [
    body('student').isMongoId().withMessage('Valid student ID is required'),
    body('feeType').isIn(['tuition', 'admission', 'exam', 'transport', 'library', 'lab', 'sports', 'activity', 'hostel', 'misc', 'late_fee', 'fine']).withMessage('Invalid fee type'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('amount').isNumeric().isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    body('dueDate').isISO8601().withMessage('Valid due date is required'),
    validate
  ],

  // Payment validation
  recordPayment: [
    body('amount').isNumeric().isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    body('paymentMethod').isIn(['cash', 'check', 'card', 'bank_transfer', 'online', 'upi', 'wallet']).withMessage('Invalid payment method'),
    body('paymentDate').optional().isISO8601().withMessage('Valid payment date is required'),
    validate
  ],

  // Message validation
  sendMessage: [
    body('type').isIn(['private', 'broadcast', 'group']).withMessage('Invalid message type'),
    body('subject').trim().notEmpty().withMessage('Subject is required'),
    body('body').trim().notEmpty().withMessage('Message body is required'),
    body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Invalid priority'),
    validate
  ],

  // Event validation
  createEvent: [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('type').isIn(['holiday', 'exam', 'meeting', 'sports', 'cultural', 'academic', 'parent-teacher', 'workshop', 'assembly', 'trip', 'other']).withMessage('Invalid event type'),
    body('startDate').isISO8601().withMessage('Valid start date is required'),
    body('endDate').isISO8601().withMessage('Valid end date is required'),
    validate
  ],

  // Homework validation
  createHomework: [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('course').isMongoId().withMessage('Valid course ID is required'),
    body('dueDate').isISO8601().withMessage('Valid due date is required'),
    body('totalPoints').optional().isNumeric().isFloat({ min: 0 }).withMessage('Total points must be positive'),
    validate
  ],

  // MongoDB ID validation
  mongoId: [
    param('id').isMongoId().withMessage('Invalid ID format'),
    validate
  ],

  // Query validation
  dateRange: [
    query('startDate').optional().isISO8601().withMessage('Valid start date required'),
    query('endDate').optional().isISO8601().withMessage('Valid end date required'),
    validate
  ]
};

module.exports = validators;
