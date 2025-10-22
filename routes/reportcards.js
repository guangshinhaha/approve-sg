const express = require('express');
const router = express.Router();
const ReportCard = require('../models/ReportCard');
const Student = require('../models/Student');
const Grade = require('../models/Grade');
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// @route   GET /api/reportcards
// @desc    Get all report cards
// @access  Private (admin, teacher)
router.get('/', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { student, academicYear, term, isPublished } = req.query;
    const query = {};

    if (student) query.student = student;
    if (academicYear) query.academicYear = academicYear;
    if (term) query.term = term;
    if (isPublished !== undefined) query.isPublished = isPublished === 'true';

    const reportCards = await ReportCard.find(query)
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .populate({
        path: 'courses.course',
        select: 'name courseCode'
      })
      .populate('generatedBy', 'firstName lastName')
      .sort({ academicYear: -1, term: -1 });

    res.json({
      success: true,
      count: reportCards.length,
      data: reportCards
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/reportcards/student/:studentId
// @desc    Get report cards for a specific student
// @access  Private (admin, teacher, student themselves, parent)
router.get('/student/:studentId', async (req, res) => {
  try {
    const reportCards = await ReportCard.find({
      student: req.params.studentId,
      isPublished: true
    })
      .populate({
        path: 'courses.course',
        select: 'name courseCode'
      })
      .populate({
        path: 'teacherComments.teacher',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .sort({ academicYear: -1, term: -1 });

    res.json({
      success: true,
      count: reportCards.length,
      data: reportCards
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/reportcards/:id
// @desc    Get single report card
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const reportCard = await ReportCard.findById(req.params.id)
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'firstName lastName email' }
      })
      .populate({
        path: 'courses.course',
        select: 'name courseCode subject'
      })
      .populate({
        path: 'teacherComments.teacher',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .populate('generatedBy', 'firstName lastName');

    if (!reportCard) {
      return res.status(404).json({
        success: false,
        message: 'Report card not found'
      });
    }

    res.json({
      success: true,
      data: reportCard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/reportcards/generate
// @desc    Generate report card for student
// @access  Private (admin, teacher)
router.post('/generate', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { studentId, academicYear, term } = req.body;

    // Get student
    const student = await Student.findById(studentId).populate('courses');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if report card already exists
    const existing = await ReportCard.findOne({
      student: studentId,
      academicYear,
      term
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Report card already exists for this term'
      });
    }

    // Gather grades for each course
    const coursesData = await Promise.all(
      student.courses.map(async (course) => {
        const grades = await Grade.find({
          student: studentId,
          course: course._id
        });

        const courseGrades = grades.map(g => ({
          assessmentType: g.assessmentType,
          score: g.score,
          maxScore: g.maxScore,
          weight: g.weight
        }));

        // Calculate overall score
        const totalScore = grades.reduce((sum, g) => sum + g.score * g.weight, 0);
        const totalMaxScore = grades.reduce((sum, g) => sum + g.maxScore * g.weight, 0);
        const percentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;

        // Calculate letter grade
        let letterGrade = 'F';
        if (percentage >= 93) letterGrade = 'A';
        else if (percentage >= 90) letterGrade = 'A-';
        else if (percentage >= 87) letterGrade = 'B+';
        else if (percentage >= 83) letterGrade = 'B';
        else if (percentage >= 80) letterGrade = 'B-';
        else if (percentage >= 77) letterGrade = 'C+';
        else if (percentage >= 73) letterGrade = 'C';
        else if (percentage >= 70) letterGrade = 'C-';
        else if (percentage >= 67) letterGrade = 'D+';
        else if (percentage >= 63) letterGrade = 'D';
        else if (percentage >= 60) letterGrade = 'D-';

        return {
          course: course._id,
          grades: courseGrades,
          overallScore: totalScore,
          overallMaxScore: totalMaxScore,
          percentage: percentage.toFixed(2),
          letterGrade
        };
      })
    );

    // Gather attendance data
    const attendanceRecords = await Attendance.find({ student: studentId });
    const attendance = {
      totalDays: attendanceRecords.length,
      present: attendanceRecords.filter(a => a.status === 'present').length,
      absent: attendanceRecords.filter(a => a.status === 'absent').length,
      late: attendanceRecords.filter(a => a.status === 'late').length
    };

    // Create report card
    const reportCard = await ReportCard.create({
      student: studentId,
      academicYear,
      term,
      grade: student.grade,
      courses: coursesData,
      attendance,
      generatedBy: req.user._id,
      ...req.body
    });

    const populatedReportCard = await ReportCard.findById(reportCard._id)
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .populate({
        path: 'courses.course',
        select: 'name courseCode'
      });

    res.status(201).json({
      success: true,
      data: populatedReportCard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/reportcards/:id
// @desc    Update report card
// @access  Private (admin, teacher)
router.put('/:id', authorize('admin', 'teacher'), async (req, res) => {
  try {
    let reportCard = await ReportCard.findById(req.params.id);

    if (!reportCard) {
      return res.status(404).json({
        success: false,
        message: 'Report card not found'
      });
    }

    reportCard = await ReportCard.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .populate({
        path: 'courses.course',
        select: 'name courseCode'
      });

    res.json({
      success: true,
      data: reportCard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/reportcards/:id/publish
// @desc    Publish report card
// @access  Private (admin)
router.post('/:id/publish', authorize('admin'), async (req, res) => {
  try {
    const reportCard = await ReportCard.findById(req.params.id);

    if (!reportCard) {
      return res.status(404).json({
        success: false,
        message: 'Report card not found'
      });
    }

    reportCard.isPublished = true;
    reportCard.publishedDate = new Date();
    await reportCard.save();

    // Notify student and parents
    const student = await Student.findById(reportCard.student).populate('parents user');
    if (student) {
      const recipients = [student.user._id, ...student.parents.map(p => p.user)];

      const notifications = recipients.map(userId => ({
        user: userId,
        type: 'grade',
        title: 'Report Card Published',
        message: `Report card for ${reportCard.term} ${reportCard.academicYear} is now available`,
        data: {
          reportCardId: reportCard._id,
          term: reportCard.term,
          academicYear: reportCard.academicYear
        },
        relatedStudent: student._id,
        priority: 'high',
        channels: {
          inApp: true,
          email: true
        }
      }));

      await Notification.insertMany(notifications);
    }

    res.json({
      success: true,
      data: reportCard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/reportcards/:id
// @desc    Delete report card
// @access  Private (admin)
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const reportCard = await ReportCard.findById(req.params.id);

    if (!reportCard) {
      return res.status(404).json({
        success: false,
        message: 'Report card not found'
      });
    }

    // Can't delete published report cards
    if (reportCard.isPublished) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete published report card'
      });
    }

    await ReportCard.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Report card deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
