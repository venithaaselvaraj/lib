const mongoose = require('mongoose');
const moment = require('moment');

const borrowingTransactionSchema = new mongoose.Schema({
  book_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true
  },
  member_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  },
  borrow_date: {
    type: Date,
    default: Date.now
  },
  due_date: {
    type: Date,
    required: true
  },
  return_date: {
    type: Date
  },
  status: {
    type: String,
    enum: ['borrowed', 'returned', 'overdue'],
    default: 'borrowed'
  },
  fine_amount: {
    type: Number,
    default: 0,
    min: 0
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for days overdue
borrowingTransactionSchema.virtual('days_overdue').get(function() {
  if (this.status === 'borrowed' && moment().isAfter(moment(this.due_date))) {
    return moment().diff(moment(this.due_date), 'days');
  }
  return 0;
});

// Virtual for calculated fine
borrowingTransactionSchema.virtual('calculated_fine').get(function() {
  const daysOverdue = this.days_overdue;
  return daysOverdue > 0 ? daysOverdue * 0.50 : 0; // $0.50 per day
});

// Virtual to check if overdue
borrowingTransactionSchema.virtual('is_overdue').get(function() {
  return this.status === 'borrowed' && moment().isAfter(moment(this.due_date));
});

// Index for efficient queries
borrowingTransactionSchema.index({ book_id: 1, member_id: 1 });
borrowingTransactionSchema.index({ status: 1 });
borrowingTransactionSchema.index({ due_date: 1 });
borrowingTransactionSchema.index({ borrow_date: -1 });

// Static method to get overdue transactions
borrowingTransactionSchema.statics.getOverdue = function() {
  return this.find({
    status: 'borrowed',
    due_date: { $lt: new Date() }
  })
  .populate('book_id', 'title author isbn')
  .populate('member_id', 'name email phone')
  .sort({ due_date: 1 });
};

// Static method to get borrowing statistics
borrowingTransactionSchema.statics.getStats = function() {
  return this.aggregate([
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
};

// Instance method to calculate fine
borrowingTransactionSchema.methods.calculateFine = function(returnDate = new Date()) {
  if (moment(returnDate).isAfter(moment(this.due_date))) {
    const daysOverdue = moment(returnDate).diff(moment(this.due_date), 'days');
    return daysOverdue * 0.50; // $0.50 per day
  }
  return 0;
};

// Pre-save middleware to update status
borrowingTransactionSchema.pre('save', function(next) {
  if (this.status === 'borrowed' && moment().isAfter(moment(this.due_date))) {
    this.status = 'overdue';
  }
  next();
});

module.exports = mongoose.model('BorrowingTransaction', borrowingTransactionSchema);