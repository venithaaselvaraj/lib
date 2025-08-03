const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database/library.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  } else {
    console.log('📊 Connected to SQLite database');
  }
});

// Initialize database tables
const initDatabase = () => {
  console.log('🔧 Initializing database tables...');
  
  // Books table
  db.run(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      isbn TEXT UNIQUE,
      genre TEXT,
      publication_year INTEGER,
      total_copies INTEGER DEFAULT 1,
      available_copies INTEGER DEFAULT 1,
      description TEXT,
      cover_image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating books table:', err);
    } else {
      console.log('✅ Books table created/verified');
    }
  });

  // Members table
  db.run(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      address TEXT,
      membership_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      membership_status TEXT DEFAULT 'active',
      max_books INTEGER DEFAULT 5,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating members table:', err);
    } else {
      console.log('✅ Members table created/verified');
    }
  });

  // Borrowing transactions table
  db.run(`
    CREATE TABLE IF NOT EXISTS borrowing_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      borrow_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      due_date DATETIME NOT NULL,
      return_date DATETIME,
      status TEXT DEFAULT 'borrowed',
      fine_amount DECIMAL(10,2) DEFAULT 0,
      notes TEXT,
      FOREIGN KEY (book_id) REFERENCES books (id),
      FOREIGN KEY (member_id) REFERENCES members (id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating borrowing_transactions table:', err);
    } else {
      console.log('✅ Borrowing transactions table created/verified');
      
      // Insert sample data after all tables are created
      setTimeout(() => {
        insertSampleData();
      }, 1000);
    }
  });
};

const insertSampleData = () => {
  console.log('📝 Inserting sample data...');
  
  // Sample books
  const sampleBooks = [
    {
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      isbn: '9780743273565',
      genre: 'Classic Literature',
      publication_year: 1925,
      total_copies: 3,
      available_copies: 2,
      description: 'A classic American novel set in the Jazz Age'
    },
    {
      title: 'To Kill a Mockingbird',
      author: 'Harper Lee',
      isbn: '9780061120084',
      genre: 'Fiction',
      publication_year: 1960,
      total_copies: 2,
      available_copies: 1,
      description: 'A gripping tale of racial injustice and childhood'
    },
    {
      title: '1984',
      author: 'George Orwell',
      isbn: '9780451524935',
      genre: 'Dystopian Fiction',
      publication_year: 1949,
      total_copies: 4,
      available_copies: 4,
      description: 'A dystopian social science fiction novel'
    },
    {
      title: 'Pride and Prejudice',
      author: 'Jane Austen',
      isbn: '9780141439518',
      genre: 'Romance',
      publication_year: 1813,
      total_copies: 2,
      available_copies: 2,
      description: 'A romantic novel of manners'
    },
    {
      title: 'The Catcher in the Rye',
      author: 'J.D. Salinger',
      isbn: '9780316769174',
      genre: 'Coming of Age',
      publication_year: 1951,
      total_copies: 3,
      available_copies: 3,
      description: 'A controversial novel about teenage rebellion'
    }
  ];

  // Sample members
  const sampleMembers = [
    {
      name: 'Alice Johnson',
      email: 'alice.johnson@email.com',
      phone: '555-0101',
      address: '123 Main St, Anytown, USA'
    },
    {
      name: 'Bob Smith',
      email: 'bob.smith@email.com',
      phone: '555-0102',
      address: '456 Oak Ave, Anytown, USA'
    },
    {
      name: 'Carol Williams',
      email: 'carol.williams@email.com',
      phone: '555-0103',
      address: '789 Pine Rd, Anytown, USA'
    }
  ];

  // Check if data already exists
  db.get('SELECT COUNT(*) as count FROM books', (err, row) => {
    if (err) {
      console.error('Error checking books:', err);
      return;
    }
    
    if (row.count === 0) {
      console.log('📚 Inserting sample books...');
      sampleBooks.forEach((book, index) => {
        db.run(`
          INSERT INTO books (title, author, isbn, genre, publication_year, total_copies, available_copies, description)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [book.title, book.author, book.isbn, book.genre, book.publication_year, book.total_copies, book.available_copies, book.description], (err) => {
          if (err) {
            console.error(`Error inserting book ${book.title}:`, err);
          } else if (index === sampleBooks.length - 1) {
            console.log('✅ Sample books inserted successfully');
          }
        });
      });
    } else {
      console.log('📚 Books already exist, skipping sample book insertion');
    }
  });

  db.get('SELECT COUNT(*) as count FROM members', (err, row) => {
    if (err) {
      console.error('Error checking members:', err);
      return;
    }
    
    if (row.count === 0) {
      console.log('👥 Inserting sample members...');
      sampleMembers.forEach((member, index) => {
        db.run(`
          INSERT INTO members (name, email, phone, address)
          VALUES (?, ?, ?, ?)
        `, [member.name, member.email, member.phone, member.address], (err) => {
          if (err) {
            console.error(`Error inserting member ${member.name}:`, err);
          } else if (index === sampleMembers.length - 1) {
            console.log('✅ Sample members inserted successfully');
            console.log('🎉 Database initialization completed!');
            console.log('📖 You can now start the server with: npm start');
            
            // Close database connection
            db.close((err) => {
              if (err) {
                console.error('Error closing database:', err);
              } else {
                console.log('📊 Database connection closed');
              }
              process.exit(0);
            });
          }
        });
      });
    } else {
      console.log('👥 Members already exist, skipping sample member insertion');
      console.log('🎉 Database initialization completed!');
      
      // Close database connection
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('📊 Database connection closed');
        }
        process.exit(0);
      });
    }
  });
};

// Initialize database
initDatabase();