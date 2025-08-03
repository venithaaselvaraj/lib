const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    type: String,
    required: true,
    trim: true
  },
  isbn: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  genre: {
    type: String,
    trim: true
  },
  publication_year: {
    type: Number,
    min: 1000,
    max: new Date().getFullYear() + 10
  },
  total_copies: {
    type: Number,
    required: true,
    default: 1,
    min: 1
  },
  available_copies: {
    type: Number,
    required: true,
    default: 1,
    min: 0
  },
  description: {
    type: String,
    trim: true
  },
  cover_image: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for borrowed copies
bookSchema.virtual('borrowed_copies').get(function() {
  return this.total_copies - this.available_copies;
});

// Index for search functionality
bookSchema.index({ 
  title: 'text', 
  author: 'text', 
  isbn: 'text',
  genre: 'text' 
});

// Middleware to ensure available_copies doesn't exceed total_copies
bookSchema.pre('save', function(next) {
  if (this.available_copies > this.total_copies) {
    this.available_copies = this.total_copies;
  }
  next();
});

// Static method to search books
bookSchema.statics.searchBooks = function(searchTerm, filters = {}) {
  const query = { ...filters };
  
  if (searchTerm) {
    query.$or = [
      { title: { $regex: searchTerm, $options: 'i' } },
      { author: { $regex: searchTerm, $options: 'i' } },
      { isbn: { $regex: searchTerm, $options: 'i' } }
    ];
  }
  
  return this.find(query);
};

module.exports = mongoose.model('Book', bookSchema);