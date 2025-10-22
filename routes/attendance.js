const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Teacher = require('../models/Teacher');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// @route   GET /api/attendance
// @desc    Get attendance records
// @access  Private (admin, teacher)
router.get('/', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { student, course, startDate, endDate, status } = req.query;
    const query = {};

    if (student) query.student = student;
    if (course) query.course = course;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const attendance = await Attendance.find(query)
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .populate('course', 'name courseCode')
      .populate({
        path: 'markedBy',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .sort({ date: -1 });

    res.json({
      success: true,
      count: attendance.length,
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/attendance/student/:studentId
// @desc    Get attendance for a specific student
// @access  Private (admin, teacher, student themselves, parent)
router.get('/student/:studentId', async (req, res) => {
  try {
    const attendance = await Attendance.find({ student: req.params.studentId })
      .populate('course', 'name courseCode')
      .populate({
        path: 'markedBy',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .sort({ date: -1 });

    // Calculate statistics
    const total = attendance.length;
    const present = attendance.filter(a => a.status === 'present').length;
    const absent = attendance.filter(a => a.status === 'absent').length;
    const late = attendance.filter(a => a.status === 'late').length;
    const excused = attendance.filter(a => a.status === 'excused').length;
    const attendanceRate = total > 0 ? ((present + late) / total * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: attendance,
      statistics: {
        total,
        present,
        absent,
        late,
        excused,
        attendanceRate: `${attendanceRate}%`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/attendance
// @desc    Mark attendance
// @access  Private (admin, teacher)
router.post('/', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { student, course, date, status, remarks } = req.body;

    // Get teacher ID
    let markedBy;
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ user: req.user._id });
      markedBy = teacher._id;
    }

    // Create attendance record
    const attendance = await Attendance.create({
      student,
      course,
      date: date || new Date(),
      status,
      remarks,
      markedBy
    });

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .populate('course', 'name courseCode');

    res.status(201).json({
      success: true,
      data: populatedAttendance
    });
  } catch (error) {
    // Handle duplicate key error (student already marked for this course on this date)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for this student in this course today'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/attendance/:id
// @desc    Update attendance
// @access  Private (admin, teacher)
router.put('/:id', authorize('admin', 'teacher'), async (req, res) => {
  try {
    let attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    attendance = await Attendance.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .populate('course', 'name courseCode');

    res.json({
      success: true,
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/attendance/:id
// @desc    Delete attendance record
// @access  Private (admin)
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    await Attendance.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Attendance record deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
