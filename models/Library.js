const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  isbn: {
    type: String,
    unique: true,
    sparse: true
  },
  title: {
    type: String,
    required: true
  },
  author: {
    type: String,
    required: true
  },
  publisher: String,
  publicationYear: Number,
  category: {
    type: String,
    enum: ['fiction', 'non-fiction', 'science', 'mathematics', 'history', 'literature', 'reference', 'biography', 'other'],
    required: true
  },
  subCategory: String,
  language: {
    type: String,
    default: 'English'
  },
  edition: String,
  pages: Number,
  description: String,
  coverImage: String,
  totalCopies: {
    type: Number,
    required: true,
    min: 1
  },
  availableCopies: {
    type: Number,
    required: true,
    min: 0
  },
  price: Number,
  location: {
    shelf: String,
    section: String,
    floor: String
  },
  status: {
    type: String,
    enum: ['available', 'unavailable', 'damaged', 'lost'],
    default: 'available'
  }
}, {
  timestamps: true
});

const borrowingSchema = new mongoose.Schema({
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true
  },
  borrower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  borrowerType: {
    type: String,
    enum: ['student', 'teacher'],
    required: true
  },
  borrowDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  returnDate: Date,
  status: {
    type: String,
    enum: ['borrowed', 'returned', 'overdue', 'lost'],
    default: 'borrowed'
  },
  renewalCount: {
    type: Number,
    default: 0
  },
  fine: {
    amount: {
      type: Number,
      default: 0
    },
    paid: {
      type: Boolean,
      default: false
    },
    paidDate: Date
  },
  condition: {
    atBorrow: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor'],
      default: 'good'
    },
    atReturn: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor']
    }
  },
  notes: String,
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  returnedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Calculate fine for overdue books
borrowingSchema.methods.calculateFine = function() {
  if (this.status === 'overdue' || (this.dueDate < new Date() && this.status === 'borrowed')) {
    const today = this.returnDate || new Date();
    const daysOverdue = Math.ceil((today - this.dueDate) / (1000 * 60 * 60 * 24));
    if (daysOverdue > 0) {
      this.fine.amount = daysOverdue * 1; // $1 per day
      this.status = 'overdue';
    }
  }
  return this.fine.amount;
};

// Index for efficient queries
bookSchema.index({ title: 'text', author: 'text', isbn: 'text' });
bookSchema.index({ category: 1, status: 1 });
borrowingSchema.index({ borrower: 1, status: 1 });
borrowingSchema.index({ book: 1, status: 1 });

const Book = mongoose.model('Book', bookSchema);
const Borrowing = mongoose.model('Borrowing', borrowingSchema);

module.exports = { Book, Borrowing };
