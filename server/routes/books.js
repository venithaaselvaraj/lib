const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const BorrowingTransaction = require('../models/BorrowingTransaction');
const { body, validationResult } = require('express-validator');

// Get all books with optional search and pagination
router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 10, genre } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    let query = {};
    
    // Add search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { isbn: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Add genre filter
    if (genre) {
      query.genre = genre;
    }
    
    const books = await Book.find(query)
      .sort({ title: 1 })
      .skip(skip)
      .limit(limitNum);
    
    const total = await Book.countDocuments(query);
    
    res.json({
      books,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get book by ID
router.get('/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    res.json(book);
  } catch (error) {
    console.error('Error fetching book:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add new book
router.post('/', [
  body('title').notEmpty().withMessage('Title is required'),
  body('author').notEmpty().withMessage('Author is required'),
  body('isbn').optional().isLength({ min: 10, max: 17 }).withMessage('Invalid ISBN'),
  body('total_copies').isInt({ min: 1 }).withMessage('Total copies must be at least 1')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { title, author, isbn, genre, publication_year, total_copies, description } = req.body;
    
    const book = new Book({
      title,
      author,
      isbn,
      genre,
      publication_year,
      total_copies: total_copies || 1,
      available_copies: total_copies || 1,
      description
    });
    
    await book.save();
    
    res.status(201).json({ 
      id: book._id, 
      message: 'Book added successfully',
      book 
    });
  } catch (error) {
    console.error('Error adding book:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Book with this ISBN already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update book
router.put('/:id', [
  body('title').notEmpty().withMessage('Title is required'),
  body('author').notEmpty().withMessage('Author is required'),
  body('total_copies').isInt({ min: 1 }).withMessage('Total copies must be at least 1')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { title, author, isbn, genre, publication_year, total_copies, description } = req.body;
    
    // Get current book to check borrowed copies
    const currentBook = await Book.findById(req.params.id);
    if (!currentBook) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    const borrowedCopies = currentBook.total_copies - currentBook.available_copies;
    const newAvailableCopies = total_copies - borrowedCopies;
    
    if (newAvailableCopies < 0) {
      return res.status(400).json({ 
        error: `Cannot reduce total copies below ${borrowedCopies} (currently borrowed copies)` 
      });
    }
    
    const updatedBook = await Book.findByIdAndUpdate(
      req.params.id,
      {
        title,
        author,
        isbn,
        genre,
        publication_year,
        total_copies,
        available_copies: newAvailableCopies,
        description
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedBook) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    res.json({ message: 'Book updated successfully', book: updatedBook });
  } catch (error) {
    console.error('Error updating book:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Book with this ISBN already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete book
router.delete('/:id', async (req, res) => {
  try {
    // Check if book has active borrowings
    const activeBorrowings = await BorrowingTransaction.countDocuments({
      book_id: req.params.id,
      status: 'borrowed'
    });
    
    if (activeBorrowings > 0) {
      return res.status(400).json({ error: 'Cannot delete book with active borrowings' });
    }
    
    const deletedBook = await Book.findByIdAndDelete(req.params.id);
    
    if (!deletedBook) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get unique genres
router.get('/metadata/genres', async (req, res) => {
  try {
    const genres = await Book.distinct('genre');
    const filteredGenres = genres.filter(genre => genre && genre.trim() !== '');
    
    res.json(filteredGenres.sort());
  } catch (error) {
    console.error('Error fetching genres:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;