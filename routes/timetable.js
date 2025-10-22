const express = require('express');
const router = express.Router();
const Timetable = require('../models/Timetable');
const Course = require('../models/Course');
const Teacher = require('../models/Teacher');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// @route   GET /api/timetable
// @desc    Get timetables
// @access  Private (all authenticated users)
router.get('/', async (req, res) => {
  try {
    const { academicYear, semester, grade, section, isActive } = req.query;
    const query = {};

    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = semester;
    if (grade) query.grade = grade;
    if (section) query.section = section;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const timetables = await Timetable.find(query)
      .populate({
        path: 'schedule.periods.course',
        select: 'name courseCode subject'
      })
      .populate({
        path: 'schedule.periods.teacher',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .populate('createdBy', 'firstName lastName')
      .sort({ academicYear: -1, grade: 1, section: 1 });

    res.json({
      success: true,
      count: timetables.length,
      data: timetables
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/timetable/:id
// @desc    Get single timetable
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const timetable = await Timetable.findById(req.params.id)
      .populate({
        path: 'schedule.periods.course',
        select: 'name courseCode subject'
      })
      .populate({
        path: 'schedule.periods.teacher',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .populate('createdBy', 'firstName lastName');

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }

    res.json({
      success: true,
      data: timetable
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/timetable
// @desc    Create timetable
// @access  Private (admin)
router.post('/', authorize('admin'), async (req, res) => {
  try {
    // Check for existing active timetable
    const existing = await Timetable.findOne({
      academicYear: req.body.academicYear,
      semester: req.body.semester,
      grade: req.body.grade,
      section: req.body.section,
      isActive: true
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An active timetable already exists for this grade and section'
      });
    }

    const timetable = await Timetable.create({
      ...req.body,
      createdBy: req.user._id
    });

    const populatedTimetable = await Timetable.findById(timetable._id)
      .populate({
        path: 'schedule.periods.course',
        select: 'name courseCode subject'
      })
      .populate({
        path: 'schedule.periods.teacher',
        populate: { path: 'user', select: 'firstName lastName' }
      });

    res.status(201).json({
      success: true,
      data: populatedTimetable
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/timetable/:id
// @desc    Update timetable
// @access  Private (admin)
router.put('/:id', authorize('admin'), async (req, res) => {
  try {
    let timetable = await Timetable.findById(req.params.id);

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }

    timetable = await Timetable.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
      .populate({
        path: 'schedule.periods.course',
        select: 'name courseCode subject'
      })
      .populate({
        path: 'schedule.periods.teacher',
        populate: { path: 'user', select: 'firstName lastName' }
      });

    res.json({
      success: true,
      data: timetable
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/timetable/:id
// @desc    Delete timetable
// @access  Private (admin)
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const timetable = await Timetable.findById(req.params.id);

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }

    await Timetable.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Timetable deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/timetable/generate
// @desc    Auto-generate timetable (basic version)
// @access  Private (admin)
router.post('/generate', authorize('admin'), async (req, res) => {
  try {
    const { academicYear, semester, grade, section } = req.body;

    // Get all courses for this grade and section
    const courses = await Course.find({
      grade,
      section,
      academicYear,
      semester,
      status: 'active'
    }).populate('teacher');

    if (courses.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No courses found for this grade and section'
      });
    }

    // Basic schedule structure
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const periods = [
      { periodNumber: 1, startTime: '08:00', endTime: '09:00' },
      { periodNumber: 2, startTime: '09:00', endTime: '10:00' },
      { periodNumber: 3, startTime: '10:00', endTime: '11:00' },
      { periodNumber: 4, startTime: '11:30', endTime: '12:30' },
      { periodNumber: 5, startTime: '12:30', endTime: '13:30' },
      { periodNumber: 6, startTime: '13:30', endTime: '14:30' }
    ];

    // Simple algorithm: distribute courses across periods
    const schedule = days.map(day => {
      const dayPeriods = periods.map((period, index) => {
        if (period.periodNumber === 4 && day === 'Monday') {
          // Break on Monday period 4
          return {
            ...period,
            type: 'break',
            subject: 'Lunch Break'
          };
        }

        const course = courses[index % courses.length];
        return {
          ...period,
          course: course._id,
          teacher: course.teacher._id,
          room: `Room ${100 + index}`,
          subject: course.subject,
          type: 'lecture'
        };
      });

      return {
        day,
        periods: dayPeriods
      };
    });

    const timetable = await Timetable.create({
      academicYear,
      semester,
      grade,
      section,
      schedule,
      breaks: [
        { name: 'Mid-morning Break', startTime: '10:00', endTime: '10:15', duration: 15 },
        { name: 'Lunch Break', startTime: '11:00', endTime: '11:30', duration: 30 }
      ],
      createdBy: req.user._id
    });

    const populatedTimetable = await Timetable.findById(timetable._id)
      .populate({
        path: 'schedule.periods.course',
        select: 'name courseCode subject'
      })
      .populate({
        path: 'schedule.periods.teacher',
        populate: { path: 'user', select: 'firstName lastName' }
      });

    res.status(201).json({
      success: true,
      data: populatedTimetable,
      message: 'Timetable generated successfully. Please review and adjust as needed.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
