const express = require('express');
const router = express.Router();
const HealthRecord = require('../models/HealthRecord');
const Student = require('../models/Student');
const Notification = require('../models/Notification');
const Parent = require('../models/Parent');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// @route   GET /api/health
// @desc    Get health records
// @access  Private (admin, teacher)
router.get('/', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { student, recordType, startDate, endDate } = req.query;
    const query = {};

    if (student) query.student = student;
    if (recordType) query.recordType = recordType;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const records = await HealthRecord.find(query)
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .populate('recordedBy', 'firstName lastName role')
      .sort({ date: -1 });

    res.json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/health/student/:studentId
// @desc    Get health records for a specific student
// @access  Private (admin, teacher, student themselves, parent)
router.get('/student/:studentId', async (req, res) => {
  try {
    const records = await HealthRecord.find({ student: req.params.studentId })
      .populate('recordedBy', 'firstName lastName role')
      .sort({ date: -1 });

    res.json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/health
// @desc    Create health record
// @access  Private (admin, teacher)
router.post('/', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const recordData = {
      ...req.body,
      recordedBy: req.user._id
    };

    const record = await HealthRecord.create(recordData);

    // Notify parents if needed
    if (req.body.parentNotified || req.body.incident || record.visualCheck?.status === 'urgent') {
      const student = await Student.findById(record.student).populate('parents');

      if (student && student.parents) {
        const notifications = student.parents.map(parent => ({
          user: parent.user,
          type: 'health',
          title: 'Health Record Update',
          message: `New health record for ${student.user.firstName}: ${record.recordType}`,
          data: {
            healthRecordId: record._id,
            studentId: student._id
          },
          relatedStudent: student._id,
          priority: record.visualCheck?.status === 'urgent' ? 'urgent' : 'high',
          channels: {
            inApp: true,
            email: true,
            sms: record.visualCheck?.status === 'urgent'
          }
        }));

        await Notification.insertMany(notifications);

        record.parentNotified = true;
        record.parentNotifiedAt = new Date();
        await record.save();
      }
    }

    const populatedRecord = await HealthRecord.findById(record._id)
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .populate('recordedBy', 'firstName lastName role');

    res.status(201).json({
      success: true,
      data: populatedRecord
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/health/:id
// @desc    Update health record
// @access  Private (admin, teacher)
router.put('/:id', authorize('admin', 'teacher'), async (req, res) => {
  try {
    let record = await HealthRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Health record not found'
      });
    }

    record = await HealthRecord.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .populate('recordedBy', 'firstName lastName role');

    res.json({
      success: true,
      data: record
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/health/:id
// @desc    Delete health record
// @access  Private (admin)
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const record = await HealthRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Health record not found'
      });
    }

    await HealthRecord.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Health record deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
