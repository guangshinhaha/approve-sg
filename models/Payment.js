const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  fee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fee',
    required: true
  },
  receiptNumber: {
    type: String,
    required: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'check', 'card', 'bank_transfer', 'online', 'upi', 'wallet'],
    required: true
  },
  paymentDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  transactionId: {
    type: String,
    sparse: true
  },
  bankReference: String,
  checkNumber: String,
  checkDate: Date,
  bankName: String,
  // For card payments
  cardLast4: String,
  cardType: String,
  // Payment gateway details
  gatewayName: String,
  gatewayTransactionId: String,
  gatewayResponse: mongoose.Schema.Types.Mixed,
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'refunded', 'cancelled'],
    default: 'success'
  },
  remarks: String,
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  refund: {
    amount: Number,
    reason: String,
    date: Date,
    refundedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  receiptPrintedAt: Date,
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: Date
}, {
  timestamps: true
});

// Generate receipt number before saving
paymentSchema.pre('save', async function(next) {
  if (!this.receiptNumber) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments();
    this.receiptNumber = `RCT${year}${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Index for efficient queries
paymentSchema.index({ student: 1, paymentDate: -1 });
paymentSchema.index({ fee: 1 });
paymentSchema.index({ receiptNumber: 1 });
paymentSchema.index({ transactionId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
