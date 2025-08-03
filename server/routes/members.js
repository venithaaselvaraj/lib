const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { body, validationResult } = require('express-validator');

// Get all members with optional search and pagination
router.get('/', (req, res) => {
  const { search, page = 1, limit = 10, status } = req.query;
  const offset = (page - 1) * limit;
  
  let sql = `
    SELECT m.*, 
           COUNT(bt.id) as active_borrowings
    FROM members m
    LEFT JOIN borrowing_transactions bt ON m.id = bt.member_id AND bt.status = 'borrowed'
    WHERE 1=1
  `;
  let params = [];
  
  if (search) {
    sql += ' AND (m.name LIKE ? OR m.email LIKE ? OR m.phone LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }
  
  if (status) {
    sql += ' AND m.membership_status = ?';
    params.push(status);
  }
  
  sql += ' GROUP BY m.id ORDER BY m.name LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  
  db.all(sql, params, (err, members) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Get total count for pagination
    let countSql = 'SELECT COUNT(*) as total FROM members WHERE 1=1';
    let countParams = [];
    
    if (search) {
      countSql += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (status) {
      countSql += ' AND membership_status = ?';
      countParams.push(status);
    }
    
    db.get(countSql, countParams, (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({
        members,
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

// Get member by ID with borrowing history
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  db.get(`
    SELECT m.*, 
           COUNT(bt.id) as active_borrowings
    FROM members m
    LEFT JOIN borrowing_transactions bt ON m.id = bt.member_id AND bt.status = 'borrowed'
    WHERE m.id = ?
    GROUP BY m.id
  `, [id], (err, member) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    // Get borrowing history
    db.all(`
      SELECT bt.*, b.title, b.author, b.isbn
      FROM borrowing_transactions bt
      JOIN books b ON bt.book_id = b.id
      WHERE bt.member_id = ?
      ORDER BY bt.borrow_date DESC
      LIMIT 10
    `, [id], (err, borrowings) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({
        ...member,
        recentBorrowings: borrowings
      });
    });
  });
});

// Add new member
router.post('/', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number required')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { name, email, phone, address, max_books } = req.body;
  
  const sql = `
    INSERT INTO members (name, email, phone, address, max_books)
    VALUES (?, ?, ?, ?, ?)
  `;
  
  db.run(sql, [name, email, phone, address, max_books || 5], function(err) {
    if (err) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(400).json({ error: 'Member with this email already exists' });
      }
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastID, message: 'Member added successfully' });
  });
});

// Update member
router.put('/:id', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number required')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { id } = req.params;
  const { name, email, phone, address, membership_status, max_books } = req.body;
  
  const sql = `
    UPDATE members 
    SET name = ?, email = ?, phone = ?, address = ?, membership_status = ?, max_books = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  
  db.run(sql, [name, email, phone, address, membership_status, max_books, id], function(err) {
    if (err) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(400).json({ error: 'Member with this email already exists' });
      }
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json({ message: 'Member updated successfully' });
  });
});

// Delete member
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  // Check if member has active borrowings
  db.get('SELECT COUNT(*) as count FROM borrowing_transactions WHERE member_id = ? AND status = "borrowed"', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (result.count > 0) {
      return res.status(400).json({ error: 'Cannot delete member with active borrowings' });
    }
    
    db.run('DELETE FROM members WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Member not found' });
      }
      res.json({ message: 'Member deleted successfully' });
    });
  });
});

module.exports = router;