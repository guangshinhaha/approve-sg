const express = require('express');
const router = express.Router();
const PortfolioEntry = require('../models/Portfolio');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// @route   GET /api/portfolio
// @desc    Get portfolio entries
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { student, category, type, status, tags } = req.query;
    const query = {};

    if (student) query.student = student;
    if (category) query.category = category;
    if (type) query.type = type;
    if (status) query.status = status;
    if (tags) query.tags = { $in: tags.split(',') };

    // Apply visibility filters based on role
    if (req.user.role === 'student') {
      const student = await Student.findOne({ user: req.user._id });
      query.student = student._id;
      query['visibility.student'] = true;
    } else if (req.user.role === 'parent') {
      const Parent = require('../models/Parent');
      const parent = await Parent.findOne({ user: req.user._id }).populate('children');
      query.student = { $in: parent.children.map(c => c._id) };
      query['visibility.parents'] = true;
    }

    const entries = await PortfolioEntry.find(query)
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .populate('course', 'name courseCode')
      .populate({
        path: 'teacherObservation.teacher',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .populate('createdBy', 'firstName lastName role')
      .populate('comments.user', 'firstName lastName')
      .sort({ date: -1 });

    res.json({
      success: true,
      count: entries.length,
      data: entries
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/portfolio/student/:studentId
// @desc    Get portfolio for a specific student
// @access  Private
router.get('/student/:studentId', async (req, res) => {
  try {
    const { category, isHighlight } = req.query;
    const query = {
      student: req.params.studentId,
      status: 'published'
    };

    if (category) query.category = category;
    if (isHighlight !== undefined) query.isHighlight = isHighlight === 'true';

    // Check visibility based on role
    if (req.user.role === 'student') {
      query['visibility.student'] = true;
    } else if (req.user.role === 'parent') {
      query['visibility.parents'] = true;
    } else if (req.user.role === 'teacher') {
      query['visibility.teachers'] = true;
    }

    const entries = await PortfolioEntry.find(query)
      .populate('course', 'name courseCode')
      .populate({
        path: 'teacherObservation.teacher',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .populate('createdBy', 'firstName lastName role')
      .populate('comments.user', 'firstName lastName')
      .sort({ date: -1 });

    // Group by category
    const byCategory = {};
    entries.forEach(entry => {
      if (!byCategory[entry.category]) {
        byCategory[entry.category] = [];
      }
      byCategory[entry.category].push(entry);
    });

    res.json({
      success: true,
      count: entries.length,
      data: entries,
      byCategory,
      highlights: entries.filter(e => e.isHighlight)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/portfolio/:id
// @desc    Get single portfolio entry
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const entry = await PortfolioEntry.findById(req.params.id)
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .populate('course', 'name courseCode')
      .populate({
        path: 'teacherObservation.teacher',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .populate('createdBy', 'firstName lastName role')
      .populate('comments.user', 'firstName lastName')
      .populate('likes.user', 'firstName lastName');

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio entry not found'
      });
    }

    res.json({
      success: true,
      data: entry
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/portfolio
// @desc    Create portfolio entry
// @access  Private (admin, teacher)
router.post('/', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const entry = await PortfolioEntry.create({
      ...req.body,
      createdBy: req.user._id
    });

    // Notify parents if visible to them
    if (entry.visibility.parents) {
      const student = await Student.findById(entry.student).populate('parents user');
      if (student && student.parents) {
        const notifications = student.parents.map(parent => ({
          user: parent.user,
          type: 'general',
          title: 'New Portfolio Entry',
          message: `New portfolio entry for ${student.user.firstName}: ${entry.title}`,
          data: {
            portfolioEntryId: entry._id,
            studentId: student._id
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
    }

    const populatedEntry = await PortfolioEntry.findById(entry._id)
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .populate('course', 'name courseCode')
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      data: populatedEntry
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/portfolio/:id
// @desc    Update portfolio entry
// @access  Private (admin, teacher who created it)
router.put('/:id', authorize('admin', 'teacher'), async (req, res) => {
  try {
    let entry = await PortfolioEntry.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio entry not found'
      });
    }

    // Check authorization
    if (req.user.role === 'teacher' && entry.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this entry'
      });
    }

    entry = await PortfolioEntry.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .populate('course', 'name courseCode')
      .populate('createdBy', 'firstName lastName');

    res.json({
      success: true,
      data: entry
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/portfolio/:id/comment
// @desc    Add comment to portfolio entry
// @access  Private
router.post('/:id/comment', async (req, res) => {
  try {
    const entry = await PortfolioEntry.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio entry not found'
      });
    }

    entry.comments.push({
      user: req.user._id,
      userRole: req.user.role,
      comment: req.body.comment
    });

    await entry.save();

    const populatedEntry = await PortfolioEntry.findById(entry._id)
      .populate('comments.user', 'firstName lastName');

    res.json({
      success: true,
      data: populatedEntry
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/portfolio/:id/like
// @desc    Like/unlike portfolio entry
// @access  Private
router.post('/:id/like', async (req, res) => {
  try {
    const entry = await PortfolioEntry.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio entry not found'
      });
    }

    // Check if already liked
    const likeIndex = entry.likes.findIndex(
      like => like.user.toString() === req.user._id.toString()
    );

    if (likeIndex > -1) {
      // Unlike
      entry.likes.splice(likeIndex, 1);
    } else {
      // Like
      entry.likes.push({
        user: req.user._id
      });
    }

    await entry.save();

    res.json({
      success: true,
      data: entry,
      liked: likeIndex === -1
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PATCH /api/portfolio/:id/highlight
// @desc    Toggle highlight status
// @access  Private (admin, teacher)
router.patch('/:id/highlight', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const entry = await PortfolioEntry.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio entry not found'
      });
    }

    entry.isHighlight = !entry.isHighlight;
    await entry.save();

    res.json({
      success: true,
      data: entry,
      message: entry.isHighlight ? 'Entry highlighted' : 'Highlight removed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/portfolio/:id
// @desc    Delete portfolio entry
// @access  Private (admin, teacher who created it)
router.delete('/:id', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const entry = await PortfolioEntry.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio entry not found'
      });
    }

    // Check authorization
    if (req.user.role === 'teacher' && entry.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this entry'
      });
    }

    await PortfolioEntry.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Portfolio entry deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
