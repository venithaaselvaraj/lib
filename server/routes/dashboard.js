const express = require('express');
const router = express.Router();
const db = require('../database/db');
const moment = require('moment');

// Get dashboard statistics
router.get('/stats', (req, res) => {
  const stats = {};
  
  // Get total books
  db.get('SELECT COUNT(*) as total, SUM(total_copies) as total_copies, SUM(available_copies) as available_copies FROM books', (err, bookStats) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    stats.books = bookStats;
    
    // Get total members
    db.get('SELECT COUNT(*) as total, COUNT(CASE WHEN membership_status = "active" THEN 1 END) as active FROM members', (err, memberStats) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      stats.members = memberStats;
      
      // Get borrowing statistics
      db.get(`
        SELECT 
          COUNT(*) as total_transactions,
          COUNT(CASE WHEN status = 'borrowed' THEN 1 END) as active_borrowings,
          COUNT(CASE WHEN status = 'returned' THEN 1 END) as returned_books,
          COUNT(CASE WHEN status = 'borrowed' AND due_date < datetime('now') THEN 1 END) as overdue_books
        FROM borrowing_transactions
      `, (err, borrowingStats) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        stats.borrowing = borrowingStats;
        
        // Get recent activity
        db.all(`
          SELECT bt.*, b.title, m.name as member_name, 'borrow' as activity_type
          FROM borrowing_transactions bt
          JOIN books b ON bt.book_id = b.id
          JOIN members m ON bt.member_id = m.id
          WHERE bt.borrow_date >= datetime('now', '-7 days')
          UNION ALL
          SELECT bt.*, b.title, m.name as member_name, 'return' as activity_type
          FROM borrowing_transactions bt
          JOIN books b ON bt.book_id = b.id
          JOIN members m ON bt.member_id = m.id
          WHERE bt.return_date >= datetime('now', '-7 days')
          ORDER BY borrow_date DESC, return_date DESC
          LIMIT 10
        `, (err, recentActivity) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          stats.recentActivity = recentActivity;
          
          res.json(stats);
        });
      });
    });
  });
});

// Get borrowing trends (monthly data for the last 6 months)
router.get('/trends', (req, res) => {
  const sixMonthsAgo = moment().subtract(6, 'months').format('YYYY-MM-DD');
  
  db.all(`
    SELECT 
      strftime('%Y-%m', borrow_date) as month,
      COUNT(*) as borrowings,
      COUNT(CASE WHEN return_date IS NOT NULL THEN 1 END) as returns
    FROM borrowing_transactions
    WHERE borrow_date >= ?
    GROUP BY strftime('%Y-%m', borrow_date)
    ORDER BY month
  `, [sixMonthsAgo], (err, trends) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.json(trends);
  });
});

// Get popular books (most borrowed)
router.get('/popular-books', (req, res) => {
  const { limit = 10 } = req.query;
  
  db.all(`
    SELECT 
      b.id, b.title, b.author, b.genre,
      COUNT(bt.id) as borrow_count
    FROM books b
    LEFT JOIN borrowing_transactions bt ON b.id = bt.book_id
    GROUP BY b.id
    ORDER BY borrow_count DESC, b.title
    LIMIT ?
  `, [parseInt(limit)], (err, popularBooks) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.json(popularBooks);
  });
});

// Get genre distribution
router.get('/genre-distribution', (req, res) => {
  db.all(`
    SELECT 
      COALESCE(genre, 'Unknown') as genre,
      COUNT(*) as book_count,
      SUM(total_copies) as total_copies
    FROM books
    GROUP BY genre
    ORDER BY book_count DESC
  `, (err, genreDistribution) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.json(genreDistribution);
  });
});

// Get member activity
router.get('/member-activity', (req, res) => {
  db.all(`
    SELECT 
      m.id, m.name, m.email,
      COUNT(bt.id) as total_borrowings,
      COUNT(CASE WHEN bt.status = 'borrowed' THEN 1 END) as active_borrowings,
      MAX(bt.borrow_date) as last_borrow_date
    FROM members m
    LEFT JOIN borrowing_transactions bt ON m.id = bt.member_id
    WHERE m.membership_status = 'active'
    GROUP BY m.id
    ORDER BY total_borrowings DESC
    LIMIT 20
  `, (err, memberActivity) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.json(memberActivity);
  });
});

// Get overdue summary
router.get('/overdue-summary', (req, res) => {
  db.all(`
    SELECT 
      bt.id, bt.due_date, bt.borrow_date,
      b.title, b.author,
      m.name as member_name, m.email as member_email, m.phone as member_phone
    FROM borrowing_transactions bt
    JOIN books b ON bt.book_id = b.id
    JOIN members m ON bt.member_id = m.id
    WHERE bt.status = 'borrowed' AND bt.due_date < datetime('now')
    ORDER BY bt.due_date ASC
  `, (err, overdueBooks) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Calculate fines and days overdue
    const overdueWithDetails = overdueBooks.map(book => {
      const daysOverdue = moment().diff(moment(book.due_date), 'days');
      const finePerDay = 0.50;
      return {
        ...book,
        days_overdue: daysOverdue,
        calculated_fine: daysOverdue * finePerDay
      };
    });
    
    const totalFines = overdueWithDetails.reduce((sum, book) => sum + book.calculated_fine, 0);
    
    res.json({
      overdue_books: overdueWithDetails,
      total_overdue: overdueBooks.length,
      total_fines: totalFines
    });
  });
});

module.exports = router;