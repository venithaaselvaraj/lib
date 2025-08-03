const express = require('express');
const router = express.Router();
const Member = require('../models/Member');
const BorrowingTransaction = require('../models/BorrowingTransaction');
const { body, validationResult } = require('express-validator');

// Get all members with optional search and pagination
router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 10, status } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    let query = {};
    
    // Add search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Add status filter
    if (status) {
      query.membership_status = status;
    }
    
    const members = await Member.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limitNum)
      .populate('active_borrowings');
    
    // Get active borrowings count for each member
    const membersWithBorrowings = await Promise.all(
      members.map(async (member) => {
        const activeBorrowings = await BorrowingTransaction.countDocuments({
          member_id: member._id,
          status: 'borrowed'
        });
        
        return {
          ...member.toObject(),
          active_borrowings: activeBorrowings
        };
      })
    );
    
    const total = await Member.countDocuments(query);
    
    res.json({
      members: membersWithBorrowings,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get member by ID with borrowing history
router.get('/:id', async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    // Get active borrowings count
    const activeBorrowings = await BorrowingTransaction.countDocuments({
      member_id: req.params.id,
      status: 'borrowed'
    });
    
    // Get recent borrowing history
    const recentBorrowings = await BorrowingTransaction.find({
      member_id: req.params.id
    })
    .populate('book_id', 'title author isbn')
    .sort({ borrow_date: -1 })
    .limit(10);
    
    res.json({
      ...member.toObject(),
      active_borrowings: activeBorrowings,
      recentBorrowings
    });
  } catch (error) {
    console.error('Error fetching member:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add new member
router.post('/', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { name, email, phone, address, max_books } = req.body;
    
    const member = new Member({
      name,
      email,
      phone,
      address,
      max_books: max_books || 5
    });
    
    await member.save();
    
    res.status(201).json({ 
      id: member._id, 
      message: 'Member added successfully',
      member 
    });
  } catch (error) {
    console.error('Error adding member:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Member with this email already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update member
router.put('/:id', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { name, email, phone, address, membership_status, max_books } = req.body;
    
    const updatedMember = await Member.findByIdAndUpdate(
      req.params.id,
      {
        name,
        email,
        phone,
        address,
        membership_status,
        max_books
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedMember) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    res.json({ message: 'Member updated successfully', member: updatedMember });
  } catch (error) {
    console.error('Error updating member:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Member with this email already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete member
router.delete('/:id', async (req, res) => {
  try {
    // Check if member has active borrowings
    const activeBorrowings = await BorrowingTransaction.countDocuments({
      member_id: req.params.id,
      status: 'borrowed'
    });
    
    if (activeBorrowings > 0) {
      return res.status(400).json({ error: 'Cannot delete member with active borrowings' });
    }
    
    const deletedMember = await Member.findByIdAndDelete(req.params.id);
    
    if (!deletedMember) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    res.json({ message: 'Member deleted successfully' });
  } catch (error) {
    console.error('Error deleting member:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;