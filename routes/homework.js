const express = require('express');
const router = express.Router();
const { Homework, HomeworkSubmission } = require('../models/Homework');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// ===== HOMEWORK ROUTES =====

// @route   GET /api/homework
// @desc    Get all homework assignments
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { course, status, type } = req.query;
    const query = {};

    if (course) query.course = course;
    if (status) query.status = status;
    if (type) query.type = type;

    // Filter by role
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ user: req.user._id });
      query.teacher = teacher._id;
    }

    const homework = await Homework.find(query)
      .populate('course', 'name courseCode')
      .populate({
        path: 'teacher',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .sort({ dueDate: -1 });

    res.json({
      success: true,
      count: homework.length,
      data: homework
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/homework/student/:studentId
// @desc    Get homework for a specific student
// @access  Private
router.get('/student/:studentId', async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId).populate('courses');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const homework = await Homework.find({
      course: { $in: student.courses.map(c => c._id) },
      status: { $in: ['published', 'closed'] }
    })
      .populate('course', 'name courseCode')
      .populate({
        path: 'teacher',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .sort({ dueDate: -1 });

    // Get submissions for each homework
    const homeworkWithSubmissions = await Promise.all(
      homework.map(async (hw) => {
        const submission = await HomeworkSubmission.findOne({
          homework: hw._id,
          student: req.params.studentId
        });
        return {
          ...hw.toObject(),
          submission
        };
      })
    );

    const stats = {
      total: homework.length,
      submitted: homeworkWithSubmissions.filter(h => h.submission).length,
      pending: homeworkWithSubmissions.filter(h => !h.submission && new Date() <= h.dueDate).length,
      overdue: homeworkWithSubmissions.filter(h => !h.submission && new Date() > h.dueDate).length,
      graded: homeworkWithSubmissions.filter(h => h.submission && h.submission.status === 'graded').length
    };

    res.json({
      success: true,
      data: homeworkWithSubmissions,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/homework/:id
// @desc    Get single homework
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const homework = await Homework.findById(req.params.id)
      .populate('course', 'name courseCode')
      .populate({
        path: 'teacher',
        populate: { path: 'user', select: 'firstName lastName email' }
      })
      .populate({
        path: 'submissions',
        populate: {
          path: 'student',
          populate: { path: 'user', select: 'firstName lastName' }
        }
      });

    if (!homework) {
      return res.status(404).json({
        success: false,
        message: 'Homework not found'
      });
    }

    res.json({
      success: true,
      data: homework
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/homework
// @desc    Create homework assignment
// @access  Private (admin, teacher)
router.post('/', authorize('admin', 'teacher'), async (req, res) => {
  try {
    let teacherId;
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ user: req.user._id });
      teacherId = teacher._id;
    } else {
      teacherId = req.body.teacher;
    }

    const homework = await Homework.create({
      ...req.body,
      teacher: teacherId
    });

    // Notify students in the course
    const course = await Course.findById(homework.course).populate('students');
    if (course && course.students) {
      const notifications = course.students.map(student => ({
        user: student.user,
        type: 'assignment',
        title: 'New Homework Assignment',
        message: `New assignment in ${course.name}: ${homework.title}. Due: ${homework.dueDate.toDateString()}`,
        data: {
          homeworkId: homework._id,
          courseId: course._id
        },
        relatedStudent: student._id,
        relatedCourse: course._id,
        priority: 'normal',
        channels: {
          inApp: true,
          email: true
        }
      }));

      await Notification.insertMany(notifications);
    }

    const populatedHomework = await Homework.findById(homework._id)
      .populate('course', 'name courseCode')
      .populate({
        path: 'teacher',
        populate: { path: 'user', select: 'firstName lastName' }
      });

    res.status(201).json({
      success: true,
      data: populatedHomework
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/homework/:id
// @desc    Update homework
// @access  Private (admin, teacher who created it)
router.put('/:id', authorize('admin', 'teacher'), async (req, res) => {
  try {
    let homework = await Homework.findById(req.params.id);

    if (!homework) {
      return res.status(404).json({
        success: false,
        message: 'Homework not found'
      });
    }

    // Check authorization
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ user: req.user._id });
      if (homework.teacher.toString() !== teacher._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this homework'
        });
      }
    }

    homework = await Homework.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
      .populate('course', 'name courseCode')
      .populate({
        path: 'teacher',
        populate: { path: 'user', select: 'firstName lastName' }
      });

    res.json({
      success: true,
      data: homework
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/homework/:id
// @desc    Delete homework
// @access  Private (admin, teacher who created it)
router.delete('/:id', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const homework = await Homework.findById(req.params.id);

    if (!homework) {
      return res.status(404).json({
        success: false,
        message: 'Homework not found'
      });
    }

    // Check authorization
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ user: req.user._id });
      if (homework.teacher.toString() !== teacher._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this homework'
        });
      }
    }

    // Delete associated submissions
    await HomeworkSubmission.deleteMany({ homework: homework._id });

    await Homework.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Homework deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ===== SUBMISSION ROUTES =====

// @route   POST /api/homework/:id/submit
// @desc    Submit homework
// @access  Private (student)
router.post('/:id/submit', async (req, res) => {
  try {
    const homework = await Homework.findById(req.params.id);

    if (!homework) {
      return res.status(404).json({
        success: false,
        message: 'Homework not found'
      });
    }

    // Get student
    const student = await Student.findOne({ user: req.user._id });

    // Check if already submitted
    let submission = await HomeworkSubmission.findOne({
      homework: homework._id,
      student: student._id
    });

    if (submission && submission.status !== 'returned') {
      return res.status(400).json({
        success: false,
        message: 'Homework already submitted'
      });
    }

    if (submission && submission.status === 'returned') {
      // Resubmission
      submission.content = req.body.content;
      submission.attachments = req.body.attachments || [];
      submission.links = req.body.links || [];
      submission.submittedDate = new Date();
      submission.status = 'resubmitted';
      submission.attempts += 1;
      await submission.save();
    } else {
      // New submission
      submission = await HomeworkSubmission.create({
        homework: homework._id,
        student: student._id,
        content: req.body.content,
        attachments: req.body.attachments || [],
        links: req.body.links || []
      });

      // Add to homework submissions
      homework.submissions.push(submission._id);
      await homework.save();
    }

    // Notify teacher
    const teacher = await Teacher.findById(homework.teacher).populate('user');
    if (teacher) {
      await Notification.create({
        user: teacher.user._id,
        type: 'assignment',
        title: 'New Homework Submission',
        message: `${req.user.firstName} ${req.user.lastName} submitted: ${homework.title}`,
        data: {
          homeworkId: homework._id,
          submissionId: submission._id,
          studentId: student._id
        },
        priority: 'normal',
        channels: {
          inApp: true
        }
      });
    }

    const populatedSubmission = await HomeworkSubmission.findById(submission._id)
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'firstName lastName' }
      });

    res.status(201).json({
      success: true,
      data: populatedSubmission,
      message: 'Homework submitted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/homework/submissions/:id/grade
// @desc    Grade submission
// @access  Private (admin, teacher)
router.post('/submissions/:id/grade', authorize('admin', 'teacher'), async (req, res) => {
  try {
    let submission = await HomeworkSubmission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    const teacher = await Teacher.findOne({ user: req.user._id });

    submission.grade = {
      score: req.body.score,
      maxScore: req.body.maxScore || 100,
      feedback: req.body.feedback,
      gradedBy: teacher._id,
      gradedDate: new Date()
    };

    // Calculate percentage and letter grade
    submission.grade.percentage = (submission.grade.score / submission.grade.maxScore) * 100;

    const percentage = submission.grade.percentage;
    if (percentage >= 93) submission.grade.letterGrade = 'A';
    else if (percentage >= 90) submission.grade.letterGrade = 'A-';
    else if (percentage >= 87) submission.grade.letterGrade = 'B+';
    else if (percentage >= 83) submission.grade.letterGrade = 'B';
    else if (percentage >= 80) submission.grade.letterGrade = 'B-';
    else if (percentage >= 77) submission.grade.letterGrade = 'C+';
    else if (percentage >= 73) submission.grade.letterGrade = 'C';
    else if (percentage >= 70) submission.grade.letterGrade = 'C-';
    else if (percentage >= 67) submission.grade.letterGrade = 'D+';
    else if (percentage >= 63) submission.grade.letterGrade = 'D';
    else if (percentage >= 60) submission.grade.letterGrade = 'D-';
    else submission.grade.letterGrade = 'F';

    submission.status = 'graded';
    await submission.save();

    // Notify student and parents
    const student = await Student.findById(submission.student).populate('parents user');
    if (student) {
      const recipients = [student.user._id, ...student.parents.map(p => p.user)];

      const homework = await Homework.findById(submission.homework).populate('course');
      const notifications = recipients.map(userId => ({
        user: userId,
        type: 'grade',
        title: 'Homework Graded',
        message: `${homework.title} graded: ${submission.grade.letterGrade} (${submission.grade.score}/${submission.grade.maxScore})`,
        data: {
          submissionId: submission._id,
          homeworkId: homework._id,
          grade: submission.grade.letterGrade
        },
        relatedStudent: student._id,
        priority: 'normal',
        channels: {
          inApp: true,
          email: true
        }
      }));

      await Notification.insertMany(notifications);
    }

    res.json({
      success: true,
      data: submission
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/homework/submissions
// @desc    Get all submissions (for teacher)
// @access  Private (admin, teacher)
router.get('/submissions', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { homework, status, student } = req.query;
    const query = {};

    if (homework) query.homework = homework;
    if (status) query.status = status;
    if (student) query.student = student;

    const submissions = await HomeworkSubmission.find(query)
      .populate('homework', 'title dueDate totalPoints')
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'firstName lastName email' }
      })
      .populate({
        path: 'grade.gradedBy',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .sort({ submittedDate: -1 });

    res.json({
      success: true,
      count: submissions.length,
      data: submissions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
