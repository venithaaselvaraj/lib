require('dotenv').config();
const mongoose = require('mongoose');
const Book = require('../models/Book');
const Member = require('../models/Member');
const BorrowingTransaction = require('../models/BorrowingTransaction');
const moment = require('moment');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/library_management';
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('📊 Connected to MongoDB database');
    return true;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

const clearDatabase = async () => {
  try {
    await BorrowingTransaction.deleteMany({});
    await Book.deleteMany({});
    await Member.deleteMany({});
    console.log('🧹 Cleared existing data');
  } catch (error) {
    console.error('Error clearing database:', error);
  }
};

const seedBooks = async () => {
  try {
    const books = [
      {
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        isbn: '9780743273565',
        genre: 'Classic Literature',
        publication_year: 1925,
        total_copies: 3,
        available_copies: 2,
        description: 'A classic American novel set in the Jazz Age, exploring themes of wealth, love, and the American Dream.'
      },
      {
        title: 'To Kill a Mockingbird',
        author: 'Harper Lee',
        isbn: '9780061120084',
        genre: 'Fiction',
        publication_year: 1960,
        total_copies: 2,
        available_copies: 1,
        description: 'A gripping tale of racial injustice and childhood innocence in the American South.'
      },
      {
        title: '1984',
        author: 'George Orwell',
        isbn: '9780451524935',
        genre: 'Dystopian Fiction',
        publication_year: 1949,
        total_copies: 4,
        available_copies: 4,
        description: 'A dystopian social science fiction novel about totalitarianism and surveillance.'
      },
      {
        title: 'Pride and Prejudice',
        author: 'Jane Austen',
        isbn: '9780141439518',
        genre: 'Romance',
        publication_year: 1813,
        total_copies: 2,
        available_copies: 2,
        description: 'A romantic novel of manners set in Georgian England.'
      },
      {
        title: 'The Catcher in the Rye',
        author: 'J.D. Salinger',
        isbn: '9780316769174',
        genre: 'Coming of Age',
        publication_year: 1951,
        total_copies: 3,
        available_copies: 3,
        description: 'A controversial novel about teenage rebellion and alienation.'
      },
      {
        title: 'The Lord of the Rings',
        author: 'J.R.R. Tolkien',
        isbn: '9780544003415',
        genre: 'Fantasy',
        publication_year: 1954,
        total_copies: 2,
        available_copies: 1,
        description: 'An epic high fantasy novel about the quest to destroy the One Ring.'
      },
      {
        title: 'Harry Potter and the Philosopher\'s Stone',
        author: 'J.K. Rowling',
        isbn: '9780747532699',
        genre: 'Fantasy',
        publication_year: 1997,
        total_copies: 5,
        available_copies: 3,
        description: 'The first novel in the Harry Potter series about a young wizard.'
      },
      {
        title: 'The Da Vinci Code',
        author: 'Dan Brown',
        isbn: '9780307474278',
        genre: 'Mystery',
        publication_year: 2003,
        total_copies: 3,
        available_copies: 2,
        description: 'A mystery thriller involving art, religious history, and secret societies.'
      },
      {
        title: 'The Alchemist',
        author: 'Paulo Coelho',
        isbn: '9780062315007',
        genre: 'Philosophy',
        publication_year: 1988,
        total_copies: 2,
        available_copies: 2,
        description: 'A philosophical novel about following your dreams and finding your destiny.'
      },
      {
        title: 'Dune',
        author: 'Frank Herbert',
        isbn: '9780441172719',
        genre: 'Science Fiction',
        publication_year: 1965,
        total_copies: 2,
        available_copies: 1,
        description: 'A science fiction epic set in a distant future amid political intrigue.'
      }
    ];

    const createdBooks = await Book.insertMany(books);
    console.log(`📚 Inserted ${createdBooks.length} books into MongoDB`);
    return createdBooks;
  } catch (error) {
    console.error('Error seeding books:', error);
    return [];
  }
};

const seedMembers = async () => {
  try {
    const members = [
      {
        name: 'Alice Johnson',
        email: 'alice.johnson@email.com',
        phone: '555-0101',
        address: '123 Main St, Anytown, USA',
        membership_status: 'active',
        max_books: 5
      },
      {
        name: 'Bob Smith',
        email: 'bob.smith@email.com',
        phone: '555-0102',
        address: '456 Oak Ave, Anytown, USA',
        membership_status: 'active',
        max_books: 3
      },
      {
        name: 'Carol Williams',
        email: 'carol.williams@email.com',
        phone: '555-0103',
        address: '789 Pine Rd, Anytown, USA',
        membership_status: 'active',
        max_books: 5
      },
      {
        name: 'David Brown',
        email: 'david.brown@email.com',
        phone: '555-0104',
        address: '321 Elm St, Anytown, USA',
        membership_status: 'active',
        max_books: 4
      },
      {
        name: 'Emily Davis',
        email: 'emily.davis@email.com',
        phone: '555-0105',
        address: '654 Maple Dr, Anytown, USA',
        membership_status: 'inactive',
        max_books: 5
      }
    ];

    const createdMembers = await Member.insertMany(members);
    console.log(`👥 Inserted ${createdMembers.length} members into MongoDB`);
    return createdMembers;
  } catch (error) {
    console.error('Error seeding members:', error);
    return [];
  }
};

const seedBorrowingTransactions = async (books, members) => {
  try {
    const transactions = [
      {
        book_id: books[0]._id, // The Great Gatsby
        member_id: members[0]._id, // Alice Johnson
        borrow_date: moment().subtract(10, 'days').toDate(),
        due_date: moment().add(4, 'days').toDate(),
        status: 'borrowed',
        notes: 'First borrowing of this classic'
      },
      {
        book_id: books[1]._id, // To Kill a Mockingbird
        member_id: members[1]._id, // Bob Smith
        borrow_date: moment().subtract(20, 'days').toDate(),
        due_date: moment().subtract(6, 'days').toDate(),
        status: 'borrowed',
        notes: 'Overdue - needs follow up'
      },
      {
        book_id: books[5]._id, // Lord of the Rings
        member_id: members[2]._id, // Carol Williams
        borrow_date: moment().subtract(25, 'days').toDate(),
        due_date: moment().subtract(11, 'days').toDate(),
        return_date: moment().subtract(5, 'days').toDate(),
        status: 'returned',
        fine_amount: 3.00,
        notes: 'Returned late, fine collected'
      },
      {
        book_id: books[6]._id, // Harry Potter
        member_id: members[0]._id, // Alice Johnson
        borrow_date: moment().subtract(15, 'days').toDate(),
        due_date: moment().subtract(1, 'days').toDate(),
        return_date: moment().subtract(2, 'days').toDate(),
        status: 'returned',
        fine_amount: 0,
        notes: 'Returned on time'
      },
      {
        book_id: books[6]._id, // Harry Potter (another copy)
        member_id: members[3]._id, // David Brown
        borrow_date: moment().subtract(5, 'days').toDate(),
        due_date: moment().add(9, 'days').toDate(),
        status: 'borrowed',
        notes: 'Popular book - high demand'
      },
      {
        book_id: books[9]._id, // Dune
        member_id: members[2]._id, // Carol Williams
        borrow_date: moment().subtract(18, 'days').toDate(),
        due_date: moment().subtract(4, 'days').toDate(),
        status: 'borrowed',
        notes: 'Sci-fi enthusiast member'
      },
      {
        book_id: books[7]._id, // Da Vinci Code
        member_id: members[1]._id, // Bob Smith
        borrow_date: moment().subtract(30, 'days').toDate(),
        due_date: moment().subtract(16, 'days').toDate(),
        return_date: moment().subtract(10, 'days').toDate(),
        status: 'returned',
        fine_amount: 3.50,
        notes: 'Late return, fine paid'
      }
    ];

    const createdTransactions = await BorrowingTransaction.insertMany(transactions);
    console.log(`📖 Inserted ${createdTransactions.length} borrowing transactions into MongoDB`);
    return createdTransactions;
  } catch (error) {
    console.error('Error seeding borrowing transactions:', error);
    return [];
  }
};

const updateBookAvailability = async (books) => {
  try {
    // Update availability based on active borrowings
    const activeBorrowings = await BorrowingTransaction.find({ status: 'borrowed' });
    
    for (const book of books) {
      const borrowedCount = activeBorrowings.filter(b => b.book_id.toString() === book._id.toString()).length;
      const newAvailable = book.total_copies - borrowedCount;
      
      await Book.findByIdAndUpdate(book._id, { 
        available_copies: Math.max(0, newAvailable) 
      });
    }
    
    console.log('📊 Updated book availability based on active borrowings');
  } catch (error) {
    console.error('Error updating book availability:', error);
  }
};

const initializeDatabase = async () => {
  console.log('🚀 Starting MongoDB database initialization...');
  
  // Connect to database
  await connectDB();
  
  // Clear existing data
  await clearDatabase();
  
  // Seed data
  const books = await seedBooks();
  const members = await seedMembers();
  const transactions = await seedBorrowingTransactions(books, members);
  
  // Update book availability
  await updateBookAvailability(books);
  
  console.log('\n✅ Database initialization completed successfully!');
  console.log('\n📊 You can now view the data in MongoDB Compass:');
  console.log('   - Database: library_management');
  console.log('   - Collections: books, members, borrowingtransactions');
  console.log('\n🚀 Start the server with: npm start');
  console.log('🌐 API will be available at: http://localhost:5000/api');
  
  // Print summary
  const bookCount = await Book.countDocuments();
  const memberCount = await Member.countDocuments();
  const transactionCount = await BorrowingTransaction.countDocuments();
  const activeCount = await BorrowingTransaction.countDocuments({ status: 'borrowed' });
  const overdueCount = await BorrowingTransaction.countDocuments({ 
    status: 'borrowed', 
    due_date: { $lt: new Date() } 
  });
  
  console.log('\n📈 Database Summary:');
  console.log(`   📚 Books: ${bookCount}`);
  console.log(`   👥 Members: ${memberCount}`);
  console.log(`   📖 Total Transactions: ${transactionCount}`);
  console.log(`   🔄 Active Borrowings: ${activeCount}`);
  console.log(`   ⚠️  Overdue Books: ${overdueCount}`);
  
  // Close database connection
  await mongoose.connection.close();
  console.log('\n📊 Database connection closed');
  process.exit(0);
};

// Run initialization
initializeDatabase().catch(error => {
  console.error('❌ Database initialization failed:', error);
  process.exit(1);
});