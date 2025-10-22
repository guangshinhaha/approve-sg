const express = require('express');
const router = express.Router();
const { Book, Borrowing } = require('../models/Library');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// ===== BOOK ROUTES =====

// @route   GET /api/library/books
// @desc    Get all books
// @access  Private (all authenticated users)
router.get('/books', async (req, res) => {
  try {
    const { category, status, search } = req.query;
    const query = {};

    if (category) query.category = category;
    if (status) query.status = status;

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    const books = await Book.find(query).sort({ title: 1 });

    res.json({
      success: true,
      count: books.length,
      data: books
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/library/books/:id
// @desc    Get single book
// @access  Private
router.get('/books/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // Get borrowing history
    const borrowingHistory = await Borrowing.find({ book: book._id })
      .populate('borrower', 'firstName lastName email')
      .sort({ borrowDate: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        book,
        borrowingHistory
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/library/books
// @desc    Add new book
// @access  Private (admin, teacher)
router.post('/books', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const book = await Book.create({
      ...req.body,
      availableCopies: req.body.totalCopies
    });

    res.status(201).json({
      success: true,
      data: book
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/library/books/:id
// @desc    Update book
// @access  Private (admin, teacher)
router.put('/books/:id', authorize('admin', 'teacher'), async (req, res) => {
  try {
    let book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    book = await Book.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.json({
      success: true,
      data: book
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/library/books/:id
// @desc    Delete book
// @access  Private (admin)
router.delete('/books/:id', authorize('admin'), async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // Check if book is currently borrowed
    const activeBorrowing = await Borrowing.findOne({
      book: book._id,
      status: 'borrowed'
    });

    if (activeBorrowing) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete book that is currently borrowed'
      });
    }

    await Book.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Book deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ===== BORROWING ROUTES =====

// @route   GET /api/library/borrowings
// @desc    Get all borrowings
// @access  Private (admin, teacher)
router.get('/borrowings', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { status, borrowerType } = req.query;
    const query = {};

    if (status) query.status = status;
    if (borrowerType) query.borrowerType = borrowerType;

    const borrowings = await Borrowing.find(query)
      .populate('book', 'title author isbn')
      .populate('borrower', 'firstName lastName email')
      .populate('issuedBy', 'firstName lastName')
      .populate('returnedTo', 'firstName lastName')
      .sort({ borrowDate: -1 });

    res.json({
      success: true,
      count: borrowings.length,
      data: borrowings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/library/borrowings/user/:userId
// @desc    Get borrowings for a user
// @access  Private
router.get('/borrowings/user/:userId', async (req, res) => {
  try {
    const borrowings = await Borrowing.find({ borrower: req.params.userId })
      .populate('book', 'title author isbn coverImage')
      .populate('issuedBy', 'firstName lastName')
      .sort({ borrowDate: -1 });

    const stats = {
      total: borrowings.length,
      borrowed: borrowings.filter(b => b.status === 'borrowed').length,
      returned: borrowings.filter(b => b.status === 'returned').length,
      overdue: borrowings.filter(b => b.status === 'overdue').length,
      totalFines: borrowings.reduce((sum, b) => sum + (b.fine.amount || 0), 0),
      unpaidFines: borrowings.filter(b => !b.fine.paid).reduce((sum, b) => sum + (b.fine.amount || 0), 0)
    };

    res.json({
      success: true,
      data: borrowings,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/library/borrow
// @desc    Borrow a book
// @access  Private (admin, teacher)
router.post('/borrow', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { bookId, borrowerId, borrowerType, dueDate } = req.body;

    // Check book availability
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    if (book.availableCopies <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No copies available for borrowing'
      });
    }

    // Check if user already has this book
    const existingBorrowing = await Borrowing.findOne({
      book: bookId,
      borrower: borrowerId,
      status: 'borrowed'
    });

    if (existingBorrowing) {
      return res.status(400).json({
        success: false,
        message: 'User already has this book borrowed'
      });
    }

    // Create borrowing record
    const borrowing = await Borrowing.create({
      book: bookId,
      borrower: borrowerId,
      borrowerType,
      dueDate: dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days default
      issuedBy: req.user._id
    });

    // Update book availability
    book.availableCopies -= 1;
    await book.save();

    // Notify borrower
    await Notification.create({
      user: borrowerId,
      type: 'general',
      title: 'Book Borrowed',
      message: `You have borrowed "${book.title}". Due date: ${borrowing.dueDate.toDateString()}`,
      data: {
        borrowingId: borrowing._id,
        bookId: book._id
      },
      priority: 'normal',
      channels: {
        inApp: true,
        email: true
      }
    });

    const populatedBorrowing = await Borrowing.findById(borrowing._id)
      .populate('book', 'title author isbn')
      .populate('borrower', 'firstName lastName email');

    res.status(201).json({
      success: true,
      data: populatedBorrowing
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/library/return/:borrowingId
// @desc    Return a book
// @access  Private (admin, teacher)
router.post('/return/:borrowingId', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const borrowing = await Borrowing.findById(req.params.borrowingId).populate('book');

    if (!borrowing) {
      return res.status(404).json({
        success: false,
        message: 'Borrowing record not found'
      });
    }

    if (borrowing.status === 'returned') {
      return res.status(400).json({
        success: false,
        message: 'Book already returned'
      });
    }

    // Calculate fine if overdue
    borrowing.calculateFine();
    borrowing.returnDate = new Date();
    borrowing.status = borrowing.fine.amount > 0 && !borrowing.fine.paid ? 'overdue' : 'returned';
    borrowing.returnedTo = req.user._id;
    borrowing.condition.atReturn = req.body.condition || 'good';

    await borrowing.save();

    // Update book availability
    const book = await Book.findById(borrowing.book._id);
    book.availableCopies += 1;
    await book.save();

    // Notify borrower
    await Notification.create({
      user: borrowing.borrower,
      type: 'general',
      title: 'Book Returned',
      message: borrowing.fine.amount > 0
        ? `"${book.title}" returned. Fine: $${borrowing.fine.amount}`
        : `"${book.title}" returned successfully`,
      data: {
        borrowingId: borrowing._id,
        fine: borrowing.fine.amount
      },
      priority: borrowing.fine.amount > 0 ? 'high' : 'normal',
      channels: {
        inApp: true,
        email: borrowing.fine.amount > 0
      }
    });

    res.json({
      success: true,
      data: borrowing
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/library/renew/:borrowingId
// @desc    Renew a borrowed book
// @access  Private
router.post('/renew/:borrowingId', async (req, res) => {
  try {
    const borrowing = await Borrowing.findById(req.params.borrowingId);

    if (!borrowing) {
      return res.status(404).json({
        success: false,
        message: 'Borrowing record not found'
      });
    }

    if (borrowing.status !== 'borrowed') {
      return res.status(400).json({
        success: false,
        message: 'Only borrowed books can be renewed'
      });
    }

    if (borrowing.renewalCount >= 2) {
      return res.status(400).json({
        success: false,
        message: 'Maximum renewal limit reached'
      });
    }

    // Extend due date by 7 days
    borrowing.dueDate = new Date(borrowing.dueDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    borrowing.renewalCount += 1;
    await borrowing.save();

    res.json({
      success: true,
      data: borrowing,
      message: 'Book renewed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/library/overdue
// @desc    Get overdue books
// @access  Private (admin, teacher)
router.get('/overdue', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const overdueBorrowings = await Borrowing.find({
      status: 'borrowed',
      dueDate: { $lt: new Date() }
    })
      .populate('book', 'title author isbn')
      .populate('borrower', 'firstName lastName email phone')
      .sort({ dueDate: 1 });

    // Calculate fines
    overdueBorrowings.forEach(b => b.calculateFine());

    res.json({
      success: true,
      count: overdueBorrowings.length,
      data: overdueBorrowings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
