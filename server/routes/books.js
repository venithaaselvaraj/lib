const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { body, validationResult } = require('express-validator');

// Get all books with optional search and pagination
router.get('/', (req, res) => {
  const { search, page = 1, limit = 10, genre } = req.query;
  const offset = (page - 1) * limit;
  
  let sql = 'SELECT * FROM books WHERE 1=1';
  let params = [];
  
  if (search) {
    sql += ' AND (title LIKE ? OR author LIKE ? OR isbn LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }
  
  if (genre) {
    sql += ' AND genre = ?';
    params.push(genre);
  }
  
  sql += ' ORDER BY title LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  
  db.all(sql, params, (err, books) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Get total count for pagination
    let countSql = 'SELECT COUNT(*) as total FROM books WHERE 1=1';
    let countParams = [];
    
    if (search) {
      countSql += ' AND (title LIKE ? OR author LIKE ? OR isbn LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (genre) {
      countSql += ' AND genre = ?';
      countParams.push(genre);
    }
    
    db.get(countSql, countParams, (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({
        books,
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

// Get book by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM books WHERE id = ?', [id], (err, book) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json(book);
  });
});

// Add new book
router.post('/', [
  body('title').notEmpty().withMessage('Title is required'),
  body('author').notEmpty().withMessage('Author is required'),
  body('isbn').optional().isLength({ min: 10, max: 17 }).withMessage('Invalid ISBN'),
  body('total_copies').isInt({ min: 1 }).withMessage('Total copies must be at least 1')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { title, author, isbn, genre, publication_year, total_copies, description } = req.body;
  const available_copies = total_copies || 1;
  
  const sql = `
    INSERT INTO books (title, author, isbn, genre, publication_year, total_copies, available_copies, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.run(sql, [title, author, isbn, genre, publication_year, total_copies || 1, available_copies, description], function(err) {
    if (err) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(400).json({ error: 'Book with this ISBN already exists' });
      }
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastID, message: 'Book added successfully' });
  });
});

// Update book
router.put('/:id', [
  body('title').notEmpty().withMessage('Title is required'),
  body('author').notEmpty().withMessage('Author is required'),
  body('total_copies').isInt({ min: 1 }).withMessage('Total copies must be at least 1')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { id } = req.params;
  const { title, author, isbn, genre, publication_year, total_copies, description } = req.body;
  
  // First check if book exists and get current borrowed count
  db.get(`
    SELECT b.*, 
           (b.total_copies - b.available_copies) as borrowed_count
    FROM books b 
    WHERE b.id = ?
  `, [id], (err, book) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    // Calculate new available copies
    const borrowed_count = book.borrowed_count || 0;
    const new_available = total_copies - borrowed_count;
    
    if (new_available < 0) {
      return res.status(400).json({ 
        error: `Cannot reduce total copies below ${borrowed_count} (currently borrowed copies)` 
      });
    }
    
    const sql = `
      UPDATE books 
      SET title = ?, author = ?, isbn = ?, genre = ?, publication_year = ?, 
          total_copies = ?, available_copies = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    db.run(sql, [title, author, isbn, genre, publication_year, total_copies, new_available, description, id], function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          return res.status(400).json({ error: 'Book with this ISBN already exists' });
        }
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Book not found' });
      }
      res.json({ message: 'Book updated successfully' });
    });
  });
});

// Delete book
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  // Check if book has active borrowings
  db.get('SELECT COUNT(*) as count FROM borrowing_transactions WHERE book_id = ? AND status = "borrowed"', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (result.count > 0) {
      return res.status(400).json({ error: 'Cannot delete book with active borrowings' });
    }
    
    db.run('DELETE FROM books WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Book not found' });
      }
      res.json({ message: 'Book deleted successfully' });
    });
  });
});

// Get unique genres
router.get('/metadata/genres', (req, res) => {
  db.all('SELECT DISTINCT genre FROM books WHERE genre IS NOT NULL ORDER BY genre', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const genres = rows.map(row => row.genre);
    res.json(genres);
  });
});

module.exports = router;