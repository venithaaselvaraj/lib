# Community Library Management System

A comprehensive web-based library management system built with React.js frontend and Node.js/Express backend with SQLite database. This system helps libraries manage their books, members, and borrowing operations efficiently.

## 🚀 Features

### 📚 Book Management
- Add, edit, and delete books
- Search books by title, author, or ISBN
- Filter books by genre
- Track total and available copies
- Manage book descriptions and publication details

### 👥 Member Management
- Register and manage library members
- Track member contact information
- Set borrowing limits per member
- Monitor member activity and borrowing history
- Active/inactive membership status

### 📖 Borrowing System
- Check out books to members
- Return books with automatic fine calculation
- Renew book loans
- Track due dates and overdue items
- Real-time availability updates

### 📊 Dashboard & Analytics
- Real-time library statistics
- Borrowing trends and charts
- Popular books tracking
- Genre distribution visualization
- Recent activity monitoring

### ⚠️ Overdue Management
- Track overdue books and fines
- Automatic fine calculation ($0.50/day)
- Member contact information for follow-up
- Return overdue books with fine collection

## 🛠️ Technology Stack

### Frontend
- **React 18** - Modern UI framework
- **Material-UI (MUI)** - Beautiful and accessible components
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls
- **Recharts** - Data visualization
- **Day.js** - Date manipulation
- **React Hot Toast** - Notifications

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **SQLite3** - Lightweight database
- **CORS** - Cross-origin resource sharing
- **Express Validator** - Input validation
- **Moment.js** - Date handling

## 📦 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn package manager

### 1. Clone the Repository
```bash
git clone <repository-url>
cd community-library-management
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3. Initialize Database
```bash
# From the server directory
cd server
npm run init-db
```

### 4. Start the Application

#### Development Mode (both server and client)
```bash
# From the root directory
npm run dev
```

#### Production Mode
```bash
# Build the client
npm run build

# Start the server
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 📁 Project Structure

```
community-library-management/
├── client/                     # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/         # Reusable components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API services
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── server/                     # Express backend
│   ├── database/              # Database setup and models
│   ├── routes/                # API routes
│   ├── scripts/               # Database scripts
│   ├── index.js               # Server entry point
│   └── package.json
├── package.json               # Root package.json
└── README.md
```

## 🗄️ Database Schema

### Books Table
- `id` - Primary key
- `title` - Book title
- `author` - Book author
- `isbn` - ISBN number
- `genre` - Book genre
- `publication_year` - Year published
- `total_copies` - Total copies available
- `available_copies` - Currently available copies
- `description` - Book description
- `created_at` - Record creation timestamp

### Members Table
- `id` - Primary key
- `name` - Member full name
- `email` - Email address (unique)
- `phone` - Phone number
- `address` - Physical address
- `membership_date` - Date joined
- `membership_status` - active/inactive
- `max_books` - Maximum books allowed
- `created_at` - Record creation timestamp

### Borrowing Transactions Table
- `id` - Primary key
- `book_id` - Foreign key to books
- `member_id` - Foreign key to members
- `borrow_date` - Date borrowed
- `due_date` - Due date
- `return_date` - Date returned (if returned)
- `status` - borrowed/returned
- `fine_amount` - Fine charged
- `notes` - Additional notes

## 🔧 API Endpoints

### Books API
- `GET /api/books` - Get all books with pagination and search
- `GET /api/books/:id` - Get specific book
- `POST /api/books` - Add new book
- `PUT /api/books/:id` - Update book
- `DELETE /api/books/:id` - Delete book
- `GET /api/books/metadata/genres` - Get unique genres

### Members API
- `GET /api/members` - Get all members with pagination and search
- `GET /api/members/:id` - Get specific member with borrowing history
- `POST /api/members` - Add new member
- `PUT /api/members/:id` - Update member
- `DELETE /api/members/:id` - Delete member

### Borrowing API
- `GET /api/borrowing` - Get borrowing transactions
- `POST /api/borrowing/borrow` - Borrow a book
- `POST /api/borrowing/return/:id` - Return a book
- `POST /api/borrowing/renew/:id` - Renew a book
- `GET /api/borrowing/overdue` - Get overdue books

### Dashboard API
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/trends` - Get borrowing trends
- `GET /api/dashboard/popular-books` - Get popular books
- `GET /api/dashboard/genre-distribution` - Get genre distribution
- `GET /api/dashboard/overdue-summary` - Get overdue summary

## 🎯 Usage Guide

### Adding Books
1. Navigate to Books section
2. Click "Add Book" button
3. Fill in book details (title and author are required)
4. Set total copies and other optional information
5. Save the book

### Managing Members
1. Go to Members section
2. Click "Add Member" to register new members
3. Edit member information as needed
4. Set borrowing limits and membership status

### Borrowing Books
1. Navigate to Borrowing section
2. Click "Borrow Book"
3. Select available book and active member
4. Set due date (default 14 days)
5. Confirm the borrowing

### Returning Books
1. In Borrowing section, find active borrowings
2. Click return icon for the book
3. Set return date and any fine amount
4. Add notes if needed
5. Complete the return

### Monitoring Overdue Books
1. Visit Overdue section
2. View all overdue books and calculated fines
3. Contact members using provided contact information
4. Process returns with automatic fine calculation

## 🚀 Deployment

### Environment Variables
Create `.env` files for different environments:

```bash
# Server .env
PORT=5000
NODE_ENV=production

# Client .env
REACT_APP_API_URL=http://your-api-domain.com/api
```

### Docker Deployment (Optional)
```dockerfile
# Dockerfile example for server
FROM node:16
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔮 Future Enhancements

- [ ] Email notifications for overdue books
- [ ] Book reservation system
- [ ] Barcode scanning support
- [ ] Advanced reporting features
- [ ] Mobile app development
- [ ] Multi-library support
- [ ] Integration with external book databases

---

Built with ❤️ for community libraries everywhere!