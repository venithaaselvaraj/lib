const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  membership_date: {
    type: Date,
    default: Date.now
  },
  membership_status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  max_books: {
    type: Number,
    default: 5,
    min: 1,
    max: 20
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for search functionality
memberSchema.index({ 
  name: 'text', 
  email: 'text', 
  phone: 'text' 
});

// Virtual for active borrowings count
memberSchema.virtual('active_borrowings', {
  ref: 'BorrowingTransaction',
  localField: '_id',
  foreignField: 'member_id',
  count: true,
  match: { status: 'borrowed' }
});

// Static method to search members
memberSchema.statics.searchMembers = function(searchTerm, filters = {}) {
  const query = { ...filters };
  
  if (searchTerm) {
    query.$or = [
      { name: { $regex: searchTerm, $options: 'i' } },
      { email: { $regex: searchTerm, $options: 'i' } },
      { phone: { $regex: searchTerm, $options: 'i' } }
    ];
  }
  
  return this.find(query);
};

// Instance method to check if member can borrow more books
memberSchema.methods.canBorrowMore = async function() {
  const BorrowingTransaction = mongoose.model('BorrowingTransaction');
  const activeBorrowings = await BorrowingTransaction.countDocuments({
    member_id: this._id,
    status: 'borrowed'
  });
  
  return activeBorrowings < this.max_books && this.membership_status === 'active';
};

module.exports = mongoose.model('Member', memberSchema);