const express = require('express');
const router = express.Router();
const Fee = require('../models/Fee');
const Payment = require('../models/Payment');
const Student = require('../models/Student');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// @route   GET /api/fees
// @desc    Get all fees
// @access  Private (admin)
router.get('/', authorize('admin'), async (req, res) => {
  try {
    const { student, status, feeType, academicYear } = req.query;
    const query = {};

    if (student) query.student = student;
    if (status) query.status = status;
    if (feeType) query.feeType = feeType;
    if (academicYear) query.academicYear = academicYear;

    const fees = await Fee.find(query)
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .populate('payments')
      .sort({ dueDate: 1 });

    res.json({
      success: true,
      count: fees.length,
      data: fees
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/fees/student/:studentId
// @desc    Get fees for a specific student
// @access  Private (admin, student themselves, parent)
router.get('/student/:studentId', async (req, res) => {
  try {
    const fees = await Fee.find({ student: req.params.studentId })
      .populate('payments')
      .sort({ dueDate: 1 });

    // Calculate totals
    const totals = {
      totalAmount: fees.reduce((sum, fee) => sum + fee.amount, 0),
      totalPaid: fees.reduce((sum, fee) => sum + fee.paidAmount, 0),
      totalBalance: fees.reduce((sum, fee) => sum + fee.balanceAmount, 0),
      pending: fees.filter(f => f.status === 'pending').length,
      overdue: fees.filter(f => f.status === 'overdue').length,
      paid: fees.filter(f => f.status === 'paid').length
    };

    res.json({
      success: true,
      count: fees.length,
      data: fees,
      totals
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/fees
// @desc    Create fee
// @access  Private (admin)
router.post('/', authorize('admin'), async (req, res) => {
  try {
    // Generate invoice number
    const year = new Date().getFullYear();
    const count = await Fee.countDocuments();
    const invoiceNumber = `INV${year}${String(count + 1).padStart(6, '0')}`;

    const fee = await Fee.create({
      ...req.body,
      invoiceNumber,
      invoiceDate: new Date()
    });

    // Notify student and parents
    const student = await Student.findById(fee.student).populate('parents user');
    if (student) {
      const recipients = [student.user._id, ...student.parents.map(p => p.user)];

      const notifications = recipients.map(userId => ({
        user: userId,
        type: 'fee',
        title: 'New Fee Added',
        message: `New ${fee.feeType} fee of $${fee.netAmount} has been added. Due date: ${fee.dueDate.toDateString()}`,
        data: {
          feeId: fee._id,
          amount: fee.netAmount,
          dueDate: fee.dueDate
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

    const populatedFee = await Fee.findById(fee._id)
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'firstName lastName' }
      });

    res.status(201).json({
      success: true,
      data: populatedFee
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/fees/:id
// @desc    Update fee
// @access  Private (admin)
router.put('/:id', authorize('admin'), async (req, res) => {
  try {
    let fee = await Fee.findById(req.params.id);

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Fee not found'
      });
    }

    fee = await Fee.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate({
      path: 'student',
      populate: { path: 'user', select: 'firstName lastName' }
    });

    res.json({
      success: true,
      data: fee
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/fees/:id/payment
// @desc    Record payment for fee
// @access  Private (admin)
router.post('/:id/payment', authorize('admin'), async (req, res) => {
  try {
    const fee = await Fee.findById(req.params.id);

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Fee not found'
      });
    }

    // Create payment
    const payment = await Payment.create({
      student: fee.student,
      fee: fee._id,
      amount: req.body.amount,
      paymentMethod: req.body.paymentMethod,
      paymentDate: req.body.paymentDate || new Date(),
      transactionId: req.body.transactionId,
      bankReference: req.body.bankReference,
      checkNumber: req.body.checkNumber,
      remarks: req.body.remarks,
      receivedBy: req.user._id
    });

    // Update fee
    fee.paidAmount += payment.amount;
    fee.payments.push(payment._id);
    await fee.save();

    // Notify student and parents
    const student = await Student.findById(fee.student).populate('parents user');
    if (student) {
      const recipients = [student.user._id, ...student.parents.map(p => p.user)];

      const notifications = recipients.map(userId => ({
        user: userId,
        type: 'fee',
        title: 'Payment Received',
        message: `Payment of $${payment.amount} received for ${fee.feeType}. Receipt: ${payment.receiptNumber}`,
        data: {
          paymentId: payment._id,
          feeId: fee._id,
          amount: payment.amount,
          receiptNumber: payment.receiptNumber
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

    res.status(201).json({
      success: true,
      data: {
        payment,
        fee
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/fees/:id
// @desc    Delete fee
// @access  Private (admin)
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const fee = await Fee.findById(req.params.id);

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Fee not found'
      });
    }

    // Can't delete if payments have been made
    if (fee.paidAmount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete fee with payments'
      });
    }

    await Fee.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Fee deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/fees/overdue
// @desc    Get overdue fees
// @access  Private (admin)
router.get('/overdue', authorize('admin'), async (req, res) => {
  try {
    const fees = await Fee.find({
      status: 'overdue',
      balanceAmount: { $gt: 0 }
    })
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'firstName lastName email phone' }
      })
      .sort({ dueDate: 1 });

    res.json({
      success: true,
      count: fees.length,
      data: fees
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
