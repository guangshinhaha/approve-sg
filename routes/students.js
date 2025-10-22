const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// @route   GET /api/students
// @desc    Get all students
// @access  Private (admin, teacher)
router.get('/', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { grade, section, status } = req.query;
    const query = {};

    if (grade) query.grade = grade;
    if (section) query.section = section;
    if (status) query.status = status;

    const students = await Student.find(query)
      .populate('user', 'firstName lastName email phone')
      .populate('parents')
      .populate('courses', 'name courseCode')
      .sort({ 'user.lastName': 1 });

    res.json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/students/:id
// @desc    Get single student
// @access  Private (admin, teacher, student themselves, parent)
router.get('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('user', 'firstName lastName email phone')
      .populate('parents')
      .populate('courses');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check authorization
    if (req.user.role === 'student' && student.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this student'
      });
    }

    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/students
// @desc    Create new student
// @access  Private (admin)
router.post('/', authorize('admin'), async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, studentId, dateOfBirth, gender, grade, section, address, medicalInfo } = req.body;

    // Create user account for student
    const user = await User.create({
      email,
      password,
      role: 'student',
      firstName,
      lastName,
      phone
    });

    // Create student profile
    const student = await Student.create({
      user: user._id,
      studentId,
      dateOfBirth,
      gender,
      grade,
      section,
      address,
      medicalInfo
    });

    const populatedStudent = await Student.findById(student._id).populate('user', 'firstName lastName email phone');

    res.status(201).json({
      success: true,
      data: populatedStudent
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/students/:id
// @desc    Update student
// @access  Private (admin)
router.put('/:id', authorize('admin'), async (req, res) => {
  try {
    let student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Update user info if provided
    if (req.body.firstName || req.body.lastName || req.body.email || req.body.phone) {
      await User.findByIdAndUpdate(student.user, {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phone: req.body.phone
      });
    }

    // Update student info
    student = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('user', 'firstName lastName email phone');

    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/students/:id
// @desc    Delete student
// @access  Private (admin)
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Soft delete - deactivate user account
    await User.findByIdAndUpdate(student.user, { isActive: false });
    await Student.findByIdAndUpdate(req.params.id, { status: 'inactive' });

    res.json({
      success: true,
      message: 'Student deactivated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
