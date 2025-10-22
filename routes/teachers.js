const express = require('express');
const router = express.Router();
const Teacher = require('../models/Teacher');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// @route   GET /api/teachers
// @desc    Get all teachers
// @access  Private (admin, teacher)
router.get('/', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { department, status } = req.query;
    const query = {};

    if (department) query.department = department;
    if (status) query.status = status;

    const teachers = await Teacher.find(query)
      .populate('user', 'firstName lastName email phone')
      .populate('courses', 'name courseCode')
      .sort({ 'user.lastName': 1 });

    res.json({
      success: true,
      count: teachers.length,
      data: teachers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/teachers/:id
// @desc    Get single teacher
// @access  Private (admin, teacher themselves)
router.get('/:id', async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id)
      .populate('user', 'firstName lastName email phone')
      .populate('courses');

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Check authorization
    if (req.user.role === 'teacher' && teacher.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this teacher'
      });
    }

    res.json({
      success: true,
      data: teacher
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/teachers
// @desc    Create new teacher
// @access  Private (admin)
router.post('/', authorize('admin'), async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, teacherId, department, subjects, qualifications, hireDate, salary, address } = req.body;

    // Create user account for teacher
    const user = await User.create({
      email,
      password,
      role: 'teacher',
      firstName,
      lastName,
      phone
    });

    // Create teacher profile
    const teacher = await Teacher.create({
      user: user._id,
      teacherId,
      department,
      subjects,
      qualifications,
      hireDate,
      salary,
      address
    });

    const populatedTeacher = await Teacher.findById(teacher._id).populate('user', 'firstName lastName email phone');

    res.status(201).json({
      success: true,
      data: populatedTeacher
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/teachers/:id
// @desc    Update teacher
// @access  Private (admin)
router.put('/:id', authorize('admin'), async (req, res) => {
  try {
    let teacher = await Teacher.findById(req.params.id);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Update user info if provided
    if (req.body.firstName || req.body.lastName || req.body.email || req.body.phone) {
      await User.findByIdAndUpdate(teacher.user, {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phone: req.body.phone
      });
    }

    // Update teacher info
    teacher = await Teacher.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('user', 'firstName lastName email phone');

    res.json({
      success: true,
      data: teacher
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/teachers/:id
// @desc    Delete teacher
// @access  Private (admin)
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Soft delete - deactivate user account
    await User.findByIdAndUpdate(teacher.user, { isActive: false });
    await Teacher.findByIdAndUpdate(req.params.id, { status: 'terminated' });

    res.json({
      success: true,
      message: 'Teacher deactivated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
