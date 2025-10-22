const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  academicYear: {
    type: String,
    required: true
  },
  feeType: {
    type: String,
    enum: ['tuition', 'admission', 'exam', 'transport', 'library', 'lab', 'sports', 'activity', 'hostel', 'misc', 'late_fee', 'fine'],
    required: true
  },
  category: {
    type: String,
    default: 'regular'
  },
  description: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    amount: {
      type: Number,
      default: 0,
      min: 0
    },
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    reason: String
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  netAmount: {
    type: Number,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'overdue', 'waived', 'cancelled'],
    default: 'pending'
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  balanceAmount: {
    type: Number
  },
  payments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  }],
  invoiceNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  invoiceDate: Date,
  remarks: String,
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringSchedule: {
    frequency: {
      type: String,
      enum: ['monthly', 'quarterly', 'semester', 'annual']
    },
    nextDueDate: Date
  }
}, {
  timestamps: true
});

// Calculate balance and net amount before saving
feeSchema.pre('save', function(next) {
  // Calculate discount
  let discountAmount = this.discount.amount || 0;
  if (this.discount.percentage > 0) {
    discountAmount = (this.amount * this.discount.percentage) / 100;
  }

  // Calculate net amount
  this.netAmount = this.amount - discountAmount + (this.taxAmount || 0);

  // Calculate balance
  this.balanceAmount = this.netAmount - (this.paidAmount || 0);

  // Update status based on payment
  if (this.balanceAmount <= 0) {
    this.status = 'paid';
  } else if (this.paidAmount > 0) {
    this.status = 'partial';
  } else if (new Date() > this.dueDate) {
    this.status = 'overdue';
  }

  next();
});

// Index for efficient queries
feeSchema.index({ student: 1, academicYear: 1 });
feeSchema.index({ status: 1, dueDate: 1 });
feeSchema.index({ invoiceNumber: 1 });

module.exports = mongoose.model('Fee', feeSchema);
