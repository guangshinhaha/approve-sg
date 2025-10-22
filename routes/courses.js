const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// @route   GET /api/courses
// @desc    Get all courses
// @access  Private (all authenticated users)
router.get('/', async (req, res) => {
  try {
    const { grade, subject, teacher, academicYear, semester, status } = req.query;
    const query = {};

    if (grade) query.grade = grade;
    if (subject) query.subject = subject;
    if (teacher) query.teacher = teacher;
    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = semester;
    if (status) query.status = status;

    const courses = await Course.find(query)
      .populate('teacher', 'teacherId user')
      .populate({
        path: 'teacher',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .populate('students', 'studentId user')
      .sort({ grade: 1, name: 1 });

    res.json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/courses/:id
// @desc    Get single course
// @access  Private (all authenticated users)
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate({
        path: 'teacher',
        populate: { path: 'user', select: 'firstName lastName email' }
      })
      .populate({
        path: 'students',
        populate: { path: 'user', select: 'firstName lastName email' }
      });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.json({
      success: true,
      data: course
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/courses
// @desc    Create new course
// @access  Private (admin)
router.post('/', authorize('admin'), async (req, res) => {
  try {
    const course = await Course.create(req.body);

    // Add course to teacher's courses
    await Teacher.findByIdAndUpdate(course.teacher, {
      $push: { courses: course._id }
    });

    const populatedCourse = await Course.findById(course._id)
      .populate({
        path: 'teacher',
        populate: { path: 'user', select: 'firstName lastName' }
      });

    res.status(201).json({
      success: true,
      data: populatedCourse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/courses/:id
// @desc    Update course
// @access  Private (admin, teacher who owns the course)
router.put('/:id', async (req, res) => {
  try {
    let course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check authorization - only admin or course teacher can update
    if (req.user.role !== 'admin') {
      const teacher = await Teacher.findOne({ user: req.user._id });
      if (!teacher || course.teacher.toString() !== teacher._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this course'
        });
      }
    }

    course = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate({
      path: 'teacher',
      populate: { path: 'user', select: 'firstName lastName' }
    });

    res.json({
      success: true,
      data: course
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/courses/:id/enroll
// @desc    Enroll student in course
// @access  Private (admin)
router.post('/:id/enroll', authorize('admin'), async (req, res) => {
  try {
    const { studentId } = req.body;

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if course is full
    if (course.students.length >= course.maxStudents) {
      return res.status(400).json({
        success: false,
        message: 'Course is full'
      });
    }

    // Check if student already enrolled
    if (course.students.includes(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Student already enrolled in this course'
      });
    }

    // Enroll student
    course.students.push(studentId);
    await course.save();

    // Add course to student's courses
    await Student.findByIdAndUpdate(studentId, {
      $push: { courses: course._id }
    });

    res.json({
      success: true,
      message: 'Student enrolled successfully',
      data: course
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/courses/:id
// @desc    Delete course
// @access  Private (admin)
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    await Course.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
