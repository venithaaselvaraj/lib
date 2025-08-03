const express = require('express');
const router = express.Router();
const db = require('../database/db');
const moment = require('moment');
const { body, validationResult } = require('express-validator');

// Get all borrowing transactions with optional filters
router.get('/', (req, res) => {
  const { status, member_id, book_id, page = 1, limit = 10, overdue } = req.query;
  const offset = (page - 1) * limit;
  
  let sql = `
    SELECT bt.*, 
           b.title, b.author, b.isbn,
           m.name as member_name, m.email as member_email
    FROM borrowing_transactions bt
    JOIN books b ON bt.book_id = b.id
    JOIN members m ON bt.member_id = m.id
    WHERE 1=1
  `;
  let params = [];
  
  if (status) {
    sql += ' AND bt.status = ?';
    params.push(status);
  }
  
  if (member_id) {
    sql += ' AND bt.member_id = ?';
    params.push(member_id);
  }
  
  if (book_id) {
    sql += ' AND bt.book_id = ?';
    params.push(book_id);
  }
  
  if (overdue === 'true') {
    sql += ' AND bt.status = "borrowed" AND bt.due_date < datetime("now")';
  }
  
  sql += ' ORDER BY bt.borrow_date DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  
  db.all(sql, params, (err, transactions) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Calculate fines for overdue books
    const processedTransactions = transactions.map(transaction => {
      if (transaction.status === 'borrowed' && moment(transaction.due_date).isBefore(moment())) {
        const daysOverdue = moment().diff(moment(transaction.due_date), 'days');
        const finePerDay = 0.50; // $0.50 per day
        transaction.calculated_fine = daysOverdue * finePerDay;
      }
      return transaction;
    });
    
    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM borrowing_transactions bt WHERE 1=1';
    let countParams = [];
    
    if (status) {
      countSql += ' AND bt.status = ?';
      countParams.push(status);
    }
    if (member_id) {
      countSql += ' AND bt.member_id = ?';
      countParams.push(member_id);
    }
    if (book_id) {
      countSql += ' AND bt.book_id = ?';
      countParams.push(book_id);
    }
    if (overdue === 'true') {
      countSql += ' AND bt.status = "borrowed" AND bt.due_date < datetime("now")';
    }
    
    db.get(countSql, countParams, (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({
        transactions: processedTransactions,
        pagination: {
          total: result.total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(result.total / limit)
        }
      });
    });
  });
});

// Borrow a book
router.post('/borrow', [
  body('book_id').isInt().withMessage('Valid book ID is required'),
  body('member_id').isInt().withMessage('Valid member ID is required'),
  body('due_date').isISO8601().withMessage('Valid due date is required')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { book_id, member_id, due_date, notes } = req.body;
  
  // Check if book is available
  db.get('SELECT * FROM books WHERE id = ?', [book_id], (err, book) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    if (book.available_copies <= 0) {
      return res.status(400).json({ error: 'Book is not available' });
    }
    
    // Check member's borrowing limit
    db.get(`
      SELECT m.*, COUNT(bt.id) as active_borrowings 
      FROM members m
      LEFT JOIN borrowing_transactions bt ON m.id = bt.member_id AND bt.status = 'borrowed'
      WHERE m.id = ?
      GROUP BY m.id
    `, [member_id], (err, member) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }
      if (member.membership_status !== 'active') {
        return res.status(400).json({ error: 'Member account is not active' });
      }
      if (member.active_borrowings >= member.max_books) {
        return res.status(400).json({ error: `Member has reached borrowing limit of ${member.max_books} books` });
      }
      
      // Create borrowing transaction
      db.run(`
        INSERT INTO borrowing_transactions (book_id, member_id, due_date, notes)
        VALUES (?, ?, ?, ?)
      `, [book_id, member_id, due_date, notes], function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        // Update book availability
        db.run('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?', [book_id], (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          res.status(201).json({ 
            id: this.lastID, 
            message: 'Book borrowed successfully',
            borrowing_id: this.lastID
          });
        });
      });
    });
  });
});

// Return a book
router.post('/return/:id', [
  body('return_date').optional().isISO8601().withMessage('Valid return date is required'),
  body('fine_amount').optional().isDecimal().withMessage('Valid fine amount is required')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { id } = req.params;
  const { return_date = new Date().toISOString(), fine_amount = 0, notes } = req.body;
  
  // Get borrowing transaction
  db.get('SELECT * FROM borrowing_transactions WHERE id = ?', [id], (err, transaction) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
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
    
    // Update borrowing transaction
    db.run(`
      UPDATE borrowing_transactions 
      SET return_date = ?, status = 'returned', fine_amount = ?, notes = ?
      WHERE id = ?
    `, [return_date, calculatedFine, notes, id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Update book availability
      db.run('UPDATE books SET available_copies = available_copies + 1 WHERE id = ?', [transaction.book_id], (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        res.json({ 
          message: 'Book returned successfully',
          fine_amount: calculatedFine
        });
      });
    });
  });
});

// Get overdue books
router.get('/overdue', (req, res) => {
  const sql = `
    SELECT bt.*, 
           b.title, b.author, b.isbn,
           m.name as member_name, m.email as member_email, m.phone as member_phone
    FROM borrowing_transactions bt
    JOIN books b ON bt.book_id = b.id
    JOIN members m ON bt.member_id = m.id
    WHERE bt.status = 'borrowed' AND bt.due_date < datetime('now')
    ORDER BY bt.due_date ASC
  `;
  
  db.all(sql, (err, overdueBooks) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Calculate fines
    const booksWithFines = overdueBooks.map(book => {
      const daysOverdue = moment().diff(moment(book.due_date), 'days');
      const finePerDay = 0.50;
      return {
        ...book,
        days_overdue: daysOverdue,
        calculated_fine: daysOverdue * finePerDay
      };
    });
    
    res.json(booksWithFines);
  });
});

// Renew a book
router.post('/renew/:id', [
  body('new_due_date').isISO8601().withMessage('Valid new due date is required')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { id } = req.params;
  const { new_due_date } = req.body;
  
  // Get borrowing transaction
  db.get('SELECT * FROM borrowing_transactions WHERE id = ?', [id], (err, transaction) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!transaction) {
      return res.status(404).json({ error: 'Borrowing transaction not found' });
    }
    if (transaction.status !== 'borrowed') {
      return res.status(400).json({ error: 'Cannot renew returned book' });
    }
    
    // Update due date
    db.run('UPDATE borrowing_transactions SET due_date = ? WHERE id = ?', [new_due_date, id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({ message: 'Book renewed successfully' });
    });
  });
});

module.exports = router;