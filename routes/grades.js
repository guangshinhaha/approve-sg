const express = require('express');
const router = express.Router();
const Grade = require('../models/Grade');
const Teacher = require('../models/Teacher');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// @route   GET /api/grades
// @desc    Get grades
// @access  Private (admin, teacher)
router.get('/', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { student, course, assessmentType } = req.query;
    const query = {};

    if (student) query.student = student;
    if (course) query.course = course;
    if (assessmentType) query.assessmentType = assessmentType;

    const grades = await Grade.find(query)
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .populate('course', 'name courseCode')
      .populate({
        path: 'gradedBy',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: grades.length,
      data: grades
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/grades/student/:studentId
// @desc    Get grades for a specific student
// @access  Private (admin, teacher, student themselves, parent)
router.get('/student/:studentId', async (req, res) => {
  try {
    const { course } = req.query;
    const query = { student: req.params.studentId };

    if (course) query.course = course;

    const grades = await Grade.find(query)
      .populate('course', 'name courseCode')
      .populate({
        path: 'gradedBy',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .sort({ createdAt: -1 });

    // Calculate overall statistics
    const totalPoints = grades.reduce((sum, grade) => sum + grade.score, 0);
    const totalMaxPoints = grades.reduce((sum, grade) => sum + grade.maxScore, 0);
    const overallPercentage = totalMaxPoints > 0 ? ((totalPoints / totalMaxPoints) * 100).toFixed(2) : 0;

    // Group by course
    const courseGrades = {};
    grades.forEach(grade => {
      const courseId = grade.course._id.toString();
      if (!courseGrades[courseId]) {
        courseGrades[courseId] = {
          course: grade.course,
          grades: [],
          totalScore: 0,
          totalMaxScore: 0
        };
      }
      courseGrades[courseId].grades.push(grade);
      courseGrades[courseId].totalScore += grade.score;
      courseGrades[courseId].totalMaxScore += grade.maxScore;
    });

    // Calculate course averages
    Object.values(courseGrades).forEach(courseData => {
      courseData.percentage = courseData.totalMaxScore > 0
        ? ((courseData.totalScore / courseData.totalMaxScore) * 100).toFixed(2)
        : 0;
    });

    res.json({
      success: true,
      data: grades,
      statistics: {
        totalGrades: grades.length,
        overallPercentage: `${overallPercentage}%`,
        courseBreakdown: Object.values(courseGrades)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/grades/course/:courseId
// @desc    Get all grades for a specific course
// @access  Private (admin, teacher who teaches the course)
router.get('/course/:courseId', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const grades = await Grade.find({ course: req.params.courseId })
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .sort({ 'student.user.lastName': 1, createdAt: -1 });

    res.json({
      success: true,
      count: grades.length,
      data: grades
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/grades
// @desc    Create grade
// @access  Private (admin, teacher)
router.post('/', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { student, course, assessmentType, title, score, maxScore, weight, dueDate, submittedDate, comments } = req.body;

    // Get teacher ID
    let gradedBy;
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ user: req.user._id });
      gradedBy = teacher._id;
    } else {
      // If admin, get teacher from request
      gradedBy = req.body.gradedBy;
    }

    // Create grade
    const grade = await Grade.create({
      student,
      course,
      assessmentType,
      title,
      score,
      maxScore,
      weight,
      dueDate,
      submittedDate,
      comments,
      gradedBy
    });

    const populatedGrade = await Grade.findById(grade._id)
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .populate('course', 'name courseCode')
      .populate({
        path: 'gradedBy',
        populate: { path: 'user', select: 'firstName lastName' }
      });

    res.status(201).json({
      success: true,
      data: populatedGrade
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/grades/:id
// @desc    Update grade
// @access  Private (admin, teacher who graded it)
router.put('/:id', authorize('admin', 'teacher'), async (req, res) => {
  try {
    let grade = await Grade.findById(req.params.id);

    if (!grade) {
      return res.status(404).json({
        success: false,
        message: 'Grade not found'
      });
    }

    // Check if teacher is updating their own grade
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ user: req.user._id });
      if (grade.gradedBy.toString() !== teacher._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this grade'
        });
      }
    }

    grade = await Grade.findByIdAndUpdate(req.params.id, req.body, {
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
      data: grade
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/grades/:id
// @desc    Delete grade
// @access  Private (admin, teacher who graded it)
router.delete('/:id', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const grade = await Grade.findById(req.params.id);

    if (!grade) {
      return res.status(404).json({
        success: false,
        message: 'Grade not found'
      });
    }

    // Check if teacher is deleting their own grade
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ user: req.user._id });
      if (grade.gradedBy.toString() !== teacher._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this grade'
        });
      }
    }

    await Grade.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Grade deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
