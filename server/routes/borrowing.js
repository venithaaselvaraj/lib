const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const Member = require('../models/Member');
const BorrowingTransaction = require('../models/BorrowingTransaction');
const moment = require('moment');
const { body, validationResult } = require('express-validator');

// Get all borrowing transactions with optional filters
router.get('/', async (req, res) => {
  try {
    const { status, member_id, book_id, page = 1, limit = 10, overdue } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (member_id) {
      query.member_id = member_id;
    }
    
    if (book_id) {
      query.book_id = book_id;
    }
    
    if (overdue === 'true') {
      query.status = 'borrowed';
      query.due_date = { $lt: new Date() };
    }
    
    const transactions = await BorrowingTransaction.find(query)
      .populate('book_id', 'title author isbn')
      .populate('member_id', 'name email')
      .sort({ borrow_date: -1 })
      .skip(skip)
      .limit(limitNum);
    
    // Add calculated fine for overdue books
    const processedTransactions = transactions.map(transaction => {
      const transactionObj = transaction.toObject();
      if (transaction.status === 'borrowed' && moment(transaction.due_date).isBefore(moment())) {
        const daysOverdue = moment().diff(moment(transaction.due_date), 'days');
        const finePerDay = 0.50;
        transactionObj.calculated_fine = daysOverdue * finePerDay;
      }
      // Add member name and email for easier access
      if (transaction.member_id) {
        transactionObj.member_name = transaction.member_id.name;
        transactionObj.member_email = transaction.member_id.email;
      }
      // Add book title and author for easier access
      if (transaction.book_id) {
        transactionObj.title = transaction.book_id.title;
        transactionObj.author = transaction.book_id.author;
        transactionObj.isbn = transaction.book_id.isbn;
      }
      return transactionObj;
    });
    
    const total = await BorrowingTransaction.countDocuments(query);
    
    res.json({
      transactions: processedTransactions,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Borrow a book
router.post('/borrow', [
  body('book_id').isMongoId().withMessage('Valid book ID is required'),
  body('member_id').isMongoId().withMessage('Valid member ID is required'),
  body('due_date').isISO8601().withMessage('Valid due date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { book_id, member_id, due_date, notes } = req.body;
    
    // Check if book exists and is available
    const book = await Book.findById(book_id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    if (book.available_copies <= 0) {
      return res.status(400).json({ error: 'Book is not available' });
    }
    
    // Check member's borrowing eligibility
    const member = await Member.findById(member_id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    if (member.membership_status !== 'active') {
      return res.status(400).json({ error: 'Member account is not active' });
    }
    
    // Check member's current borrowing limit
    const activeBorrowings = await BorrowingTransaction.countDocuments({
      member_id,
      status: 'borrowed'
    });
    
    if (activeBorrowings >= member.max_books) {
      return res.status(400).json({ 
        error: `Member has reached borrowing limit of ${member.max_books} books` 
      });
    }
    
    // Create borrowing transaction
    const borrowingTransaction = new BorrowingTransaction({
      book_id,
      member_id,
      due_date,
      notes
    });
    
    await borrowingTransaction.save();
    
    // Update book availability
    book.available_copies -= 1;
    await book.save();
    
    res.status(201).json({ 
      id: borrowingTransaction._id, 
      message: 'Book borrowed successfully',
      borrowing_id: borrowingTransaction._id
    });
  } catch (error) {
    console.error('Error borrowing book:', error);
    res.status(500).json({ error: error.message });
  }
});

// Return a book
router.post('/return/:id', [
  body('return_date').optional().isISO8601().withMessage('Valid return date is required'),
  body('fine_amount').optional().isDecimal().withMessage('Valid fine amount is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { return_date = new Date().toISOString(), fine_amount = 0, notes } = req.body;
    
    // Get borrowing transaction
    const transaction = await BorrowingTransaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Borrowing transaction not found' });
    }
    if (transaction.status !== 'borrowed') {
      return res.status(400).json({ error: 'Book has already been returned' });
    }
    
    // Calculate fine if not provided
    let calculatedFine = fine_amount;
    if (!fine_amount && moment(return_date).isAfter(moment(transaction.due_date))) {
      const daysOverdue = moment(return_date).diff(moment(transaction.due_date), 'days');
      calculatedFine = daysOverdue * 0.50; // $0.50 per day
    }
    
    // Update transaction
    transaction.return_date = return_date;
    transaction.status = 'returned';
    transaction.fine_amount = calculatedFine;
    if (notes) transaction.notes = notes;
    
    await transaction.save();
    
    // Update book availability
    const book = await Book.findById(transaction.book_id);
    if (book) {
      book.available_copies += 1;
      await book.save();
    }
    
    res.json({ 
      message: 'Book returned successfully',
      fine_amount: calculatedFine
    });
  } catch (error) {
    console.error('Error returning book:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get overdue books
router.get('/overdue', async (req, res) => {
  try {
    const overdueTransactions = await BorrowingTransaction.find({
      status: 'borrowed',
      due_date: { $lt: new Date() }
    })
    .populate('book_id', 'title author isbn')
    .populate('member_id', 'name email phone')
    .sort({ due_date: 1 });
    
    // Calculate fines and days overdue
    const booksWithFines = overdueTransactions.map(transaction => {
      const transactionObj = transaction.toObject();
      const daysOverdue = moment().diff(moment(transaction.due_date), 'days');
      const finePerDay = 0.50;
      
      return {
        ...transactionObj,
        title: transaction.book_id.title,
        author: transaction.book_id.author,
        isbn: transaction.book_id.isbn,
        member_name: transaction.member_id.name,
        member_email: transaction.member_id.email,
        member_phone: transaction.member_id.phone,
        days_overdue: daysOverdue,
        calculated_fine: daysOverdue * finePerDay
      };
    });
    
    res.json(booksWithFines);
  } catch (error) {
    console.error('Error fetching overdue books:', error);
    res.status(500).json({ error: error.message });
  }
});

// Renew a book
router.post('/renew/:id', [
  body('new_due_date').isISO8601().withMessage('Valid new due date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { new_due_date } = req.body;
    
    // Get borrowing transaction
    const transaction = await BorrowingTransaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Borrowing transaction not found' });
    }
    if (transaction.status !== 'borrowed') {
      return res.status(400).json({ error: 'Cannot renew returned book' });
    }
    
    // Update due date
    transaction.due_date = new_due_date;
    await transaction.save();
    
    res.json({ message: 'Book renewed successfully' });
  } catch (error) {
    console.error('Error renewing book:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;