const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const Member = require('../models/Member');
const BorrowingTransaction = require('../models/BorrowingTransaction');
const moment = require('moment');

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = {};
    
    // Get book statistics
    const bookStats = await Book.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          total_copies: { $sum: '$total_copies' },
          available_copies: { $sum: '$available_copies' }
        }
      }
    ]);
    stats.books = bookStats[0] || { total: 0, total_copies: 0, available_copies: 0 };
    
    // Get member statistics
    const memberStats = await Member.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ['$membership_status', 'active'] }, 1, 0] }
          }
        }
      }
    ]);
    stats.members = memberStats[0] || { total: 0, active: 0 };
    
    // Get borrowing statistics
    const borrowingStats = await BorrowingTransaction.aggregate([
      {
        $group: {
          _id: null,
          total_transactions: { $sum: 1 },
          active_borrowings: {
            $sum: { $cond: [{ $eq: ['$status', 'borrowed'] }, 1, 0] }
          },
          returned_books: {
            $sum: { $cond: [{ $eq: ['$status', 'returned'] }, 1, 0] }
          },
          overdue_books: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'borrowed'] },
                    { $lt: ['$due_date', new Date()] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);
    stats.borrowing = borrowingStats[0] || { 
      total_transactions: 0, 
      active_borrowings: 0, 
      returned_books: 0, 
      overdue_books: 0 
    };
    
    // Get recent activity
    const recentActivity = await BorrowingTransaction.find({
      $or: [
        { borrow_date: { $gte: moment().subtract(7, 'days').toDate() } },
        { return_date: { $gte: moment().subtract(7, 'days').toDate() } }
      ]
    })
    .populate('book_id', 'title')
    .populate('member_id', 'name')
    .sort({ borrow_date: -1, return_date: -1 })
    .limit(10);
    
    // Format recent activity
    const formattedActivity = recentActivity.map(activity => ({
      ...activity.toObject(),
      title: activity.book_id?.title,
      member_name: activity.member_id?.name,
      activity_type: activity.return_date ? 'return' : 'borrow'
    }));
    
    stats.recentActivity = formattedActivity;
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get borrowing trends (monthly data for the last 6 months)
router.get('/trends', async (req, res) => {
  try {
    const sixMonthsAgo = moment().subtract(6, 'months').toDate();
    
    const trends = await BorrowingTransaction.aggregate([
      {
        $match: {
          borrow_date: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$borrow_date' },
            month: { $month: '$borrow_date' }
          },
          borrowings: { $sum: 1 },
          returns: {
            $sum: { $cond: [{ $ne: ['$return_date', null] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          month: {
            $dateToString: {
              format: '%Y-%m',
              date: {
                $dateFromParts: {
                  year: '$_id.year',
                  month: '$_id.month'
                }
              }
            }
          },
          borrowings: 1,
          returns: 1
        }
      },
      {
        $sort: { month: 1 }
      }
    ]);
    
    res.json(trends);
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get popular books (most borrowed)
router.get('/popular-books', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const popularBooks = await BorrowingTransaction.aggregate([
      {
        $group: {
          _id: '$book_id',
          borrow_count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'books',
          localField: '_id',
          foreignField: '_id',
          as: 'book'
        }
      },
      {
        $unwind: '$book'
      },
      {
        $project: {
          id: '$book._id',
          title: '$book.title',
          author: '$book.author',
          genre: '$book.genre',
          borrow_count: 1
        }
      },
      {
        $sort: { borrow_count: -1, title: 1 }
      },
      {
        $limit: parseInt(limit)
      }
    ]);
    
    res.json(popularBooks);
  } catch (error) {
    console.error('Error fetching popular books:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get genre distribution
router.get('/genre-distribution', async (req, res) => {
  try {
    const genreDistribution = await Book.aggregate([
      {
        $group: {
          _id: { $ifNull: ['$genre', 'Unknown'] },
          book_count: { $sum: 1 },
          total_copies: { $sum: '$total_copies' }
        }
      },
      {
        $project: {
          genre: '$_id',
          book_count: 1,
          total_copies: 1
        }
      },
      {
        $sort: { book_count: -1 }
      }
    ]);
    
    res.json(genreDistribution);
  } catch (error) {
    console.error('Error fetching genre distribution:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get member activity
router.get('/member-activity', async (req, res) => {
  try {
    const memberActivity = await BorrowingTransaction.aggregate([
      {
        $group: {
          _id: '$member_id',
          total_borrowings: { $sum: 1 },
          active_borrowings: {
            $sum: { $cond: [{ $eq: ['$status', 'borrowed'] }, 1, 0] }
          },
          last_borrow_date: { $max: '$borrow_date' }
        }
      },
      {
        $lookup: {
          from: 'members',
          localField: '_id',
          foreignField: '_id',
          as: 'member'
        }
      },
      {
        $unwind: '$member'
      },
      {
        $match: {
          'member.membership_status': 'active'
        }
      },
      {
        $project: {
          id: '$member._id',
          name: '$member.name',
          email: '$member.email',
          total_borrowings: 1,
          active_borrowings: 1,
          last_borrow_date: 1
        }
      },
      {
        $sort: { total_borrowings: -1 }
      },
      {
        $limit: 20
      }
    ]);
    
    res.json(memberActivity);
  } catch (error) {
    console.error('Error fetching member activity:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get overdue summary
router.get('/overdue-summary', async (req, res) => {
  try {
    const overdueBooks = await BorrowingTransaction.find({
      status: 'borrowed',
      due_date: { $lt: new Date() }
    })
    .populate('book_id', 'title author')
    .populate('member_id', 'name email phone')
    .sort({ due_date: 1 });
    
    // Calculate fines and days overdue
    const overdueWithDetails = overdueBooks.map(book => {
      const daysOverdue = moment().diff(moment(book.due_date), 'days');
      const finePerDay = 0.50;
      return {
        ...book.toObject(),
        title: book.book_id?.title,
        author: book.book_id?.author,
        member_name: book.member_id?.name,
        member_email: book.member_id?.email,
        member_phone: book.member_id?.phone,
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
  } catch (error) {
    console.error('Error fetching overdue summary:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;