const express = require('express');
const router = express.Router();
const Parent = require('../models/Parent');
const Student = require('../models/Student');
const User = require('../models/User');
const Grade = require('../models/Grade');
const Attendance = require('../models/Attendance');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// @route   GET /api/parents
// @desc    Get all parents
// @access  Private (admin)
router.get('/', authorize('admin'), async (req, res) => {
  try {
    const parents = await Parent.find()
      .populate('user', 'firstName lastName email phone')
      .populate({
        path: 'children',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .sort({ 'user.lastName': 1 });

    res.json({
      success: true,
      count: parents.length,
      data: parents
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/parents/dashboard
// @desc    Get parent dashboard (their children's info)
// @access  Private (parent)
router.get('/dashboard', authorize('parent'), async (req, res) => {
  try {
    const parent = await Parent.findOne({ user: req.user._id })
      .populate({
        path: 'children',
        populate: [
          { path: 'user', select: 'firstName lastName email' },
          { path: 'courses', select: 'name courseCode teacher schedule' }
        ]
      });

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: 'Parent profile not found'
      });
    }

    // Get grades and attendance for each child
    const childrenData = await Promise.all(
      parent.children.map(async (child) => {
        const grades = await Grade.find({ student: child._id })
          .populate('course', 'name courseCode')
          .sort({ createdAt: -1 })
          .limit(10);

        const attendance = await Attendance.find({ student: child._id })
          .populate('course', 'name courseCode')
          .sort({ date: -1 })
          .limit(10);

        // Calculate attendance rate
        const totalAttendance = await Attendance.countDocuments({ student: child._id });
        const presentCount = await Attendance.countDocuments({
          student: child._id,
          status: { $in: ['present', 'late'] }
        });
        const attendanceRate = totalAttendance > 0
          ? ((presentCount / totalAttendance) * 100).toFixed(2)
          : 0;

        return {
          student: child,
          recentGrades: grades,
          recentAttendance: attendance,
          attendanceRate: `${attendanceRate}%`
        };
      })
    );

    res.json({
      success: true,
      data: {
        parent,
        children: childrenData
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/parents
// @desc    Create new parent
// @access  Private (admin)
router.post('/', authorize('admin'), async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, relationship, occupation, employer, workPhone, address, children } = req.body;

    // Create user account for parent
    const user = await User.create({
      email,
      password,
      role: 'parent',
      firstName,
      lastName,
      phone
    });

    // Create parent profile
    const parent = await Parent.create({
      user: user._id,
      relationship,
      occupation,
      employer,
      workPhone,
      address,
      children
    });

    // Add parent to children's parent list
    if (children && children.length > 0) {
      await Student.updateMany(
        { _id: { $in: children } },
        { $push: { parents: parent._id } }
      );
    }

    const populatedParent = await Parent.findById(parent._id)
      .populate('user', 'firstName lastName email phone')
      .populate({
        path: 'children',
        populate: { path: 'user', select: 'firstName lastName' }
      });

    res.status(201).json({
      success: true,
      data: populatedParent
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/parents/:id
// @desc    Update parent
// @access  Private (admin, parent themselves)
router.put('/:id', async (req, res) => {
  try {
    let parent = await Parent.findById(req.params.id);

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: 'Parent not found'
      });
    }

    // Check authorization
    if (req.user.role === 'parent' && parent.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this parent'
      });
    }

    // Update user info if provided
    if (req.body.firstName || req.body.lastName || req.body.email || req.body.phone) {
      await User.findByIdAndUpdate(parent.user, {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phone: req.body.phone
      });
    }

    // Update parent info
    parent = await Parent.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
      .populate('user', 'firstName lastName email phone')
      .populate({
        path: 'children',
        populate: { path: 'user', select: 'firstName lastName' }
      });

    res.json({
      success: true,
      data: parent
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
