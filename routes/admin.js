const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Course = require('../models/Course');
const Attendance = require('../models/Attendance');
const Grade = require('../models/Grade');
const Parent = require('../models/Parent');
const { protect, authorize } = require('../middleware/auth');

// All routes are admin only
router.use(protect);
router.use(authorize('admin'));

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Private (admin)
router.get('/dashboard', async (req, res) => {
  try {
    // Get counts
    const totalStudents = await Student.countDocuments({ status: 'active' });
    const totalTeachers = await Teacher.countDocuments({ status: 'active' });
    const totalCourses = await Course.countDocuments({ status: 'active' });
    const totalParents = await Parent.countDocuments();

    // Get recent enrollments (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentEnrollments = await Student.countDocuments({
      enrollmentDate: { $gte: thirtyDaysAgo }
    });

    // Get attendance statistics (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentAttendance = await Attendance.find({
      date: { $gte: sevenDaysAgo }
    });

    const attendanceStats = {
      total: recentAttendance.length,
      present: recentAttendance.filter(a => a.status === 'present').length,
      absent: recentAttendance.filter(a => a.status === 'absent').length,
      late: recentAttendance.filter(a => a.status === 'late').length,
      excused: recentAttendance.filter(a => a.status === 'excused').length
    };

    // Students by grade
    const studentsByGrade = await Student.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$grade', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Courses by subject
    const coursesBySubject = await Course.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$subject', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Recent grades (last 10)
    const recentGrades = await Grade.find()
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .populate('course', 'name courseCode')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        overview: {
          totalStudents,
          totalTeachers,
          totalCourses,
          totalParents,
          recentEnrollments
        },
        attendanceStats,
        studentsByGrade,
        coursesBySubject,
        recentGrades
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/admin/reports/attendance
// @desc    Get attendance report
// @access  Private (admin)
router.get('/reports/attendance', async (req, res) => {
  try {
    const { startDate, endDate, grade, section } = req.query;

    // Build query
    const query = {};
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
      .populate('course', 'name courseCode');

    // Filter by grade and section if provided
    let filteredAttendance = attendance;
    if (grade || section) {
      filteredAttendance = attendance.filter(a => {
        if (grade && a.student.grade !== grade) return false;
        if (section && a.student.section !== section) return false;
        return true;
      });
    }

    // Calculate statistics
    const stats = {
      total: filteredAttendance.length,
      present: filteredAttendance.filter(a => a.status === 'present').length,
      absent: filteredAttendance.filter(a => a.status === 'absent').length,
      late: filteredAttendance.filter(a => a.status === 'late').length,
      excused: filteredAttendance.filter(a => a.status === 'excused').length
    };

    stats.attendanceRate = stats.total > 0
      ? (((stats.present + stats.late) / stats.total) * 100).toFixed(2) + '%'
      : '0%';

    res.json({
      success: true,
      data: filteredAttendance,
      statistics: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/admin/reports/grades
// @desc    Get grades report
// @access  Private (admin)
router.get('/reports/grades', async (req, res) => {
  try {
    const { course, grade, assessmentType } = req.query;

    // Build query
    const query = {};
    if (course) query.course = course;
    if (assessmentType) query.assessmentType = assessmentType;

    const grades = await Grade.find(query)
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .populate('course', 'name courseCode');

    // Filter by grade level if provided
    let filteredGrades = grades;
    if (grade) {
      filteredGrades = grades.filter(g => g.student.grade === grade);
    }

    // Calculate statistics
    const totalPoints = filteredGrades.reduce((sum, g) => sum + g.score, 0);
    const totalMaxPoints = filteredGrades.reduce((sum, g) => sum + g.maxScore, 0);
    const averagePercentage = totalMaxPoints > 0
      ? ((totalPoints / totalMaxPoints) * 100).toFixed(2)
      : 0;

    // Grade distribution
    const gradeDistribution = {};
    filteredGrades.forEach(g => {
      gradeDistribution[g.letterGrade] = (gradeDistribution[g.letterGrade] || 0) + 1;
    });

    res.json({
      success: true,
      data: filteredGrades,
      statistics: {
        totalGrades: filteredGrades.length,
        averagePercentage: `${averagePercentage}%`,
        gradeDistribution
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
