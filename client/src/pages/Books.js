import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Book as BookIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { booksAPI } from '../services/api';
import toast from 'react-hot-toast';

const Books = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalBooks, setTotalBooks] = useState(0);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [genres, setGenres] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    genre: '',
    publication_year: '',
    total_copies: 1,
    description: '',
  });

  useEffect(() => {
    fetchBooks();
    fetchGenres();
  }, [paginationModel, searchQuery, selectedGenre]);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const params = {
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
        search: searchQuery || undefined,
        genre: selectedGenre || undefined,
      };
      
      const response = await booksAPI.getAll(params);
      setBooks(response.data.books);
      setTotalBooks(response.data.pagination.total);
    } catch (error) {
      console.error('Error fetching books:', error);
      toast.error('Failed to fetch books');
    } finally {
      setLoading(false);
    }
  };

  const fetchGenres = async () => {
    try {
      const response = await booksAPI.getGenres();
      setGenres(response.data);
    } catch (error) {
      console.error('Error fetching genres:', error);
    }
  };

  const handleAddBook = () => {
    setEditingBook(null);
    setFormData({
      title: '',
      author: '',
      isbn: '',
      genre: '',
      publication_year: '',
      total_copies: 1,
      description: '',
    });
    setDialogOpen(true);
  };

  const handleEditBook = (book) => {
    setEditingBook(book);
    setFormData({
      title: book.title,
      author: book.author,
      isbn: book.isbn || '',
      genre: book.genre || '',
      publication_year: book.publication_year || '',
      total_copies: book.total_copies,
      description: book.description || '',
    });
    setDialogOpen(true);
  };

  const handleDeleteBook = async (id) => {
    if (window.confirm('Are you sure you want to delete this book?')) {
      try {
        await booksAPI.delete(id);
        toast.success('Book deleted successfully');
        fetchBooks();
      } catch (error) {
        console.error('Error deleting book:', error);
        toast.error(error.response?.data?.error || 'Failed to delete book');
      }
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingBook) {
        await booksAPI.update(editingBook.id, formData);
        toast.success('Book updated successfully');
      } else {
        await booksAPI.create(formData);
        toast.success('Book added successfully');
      }
      setDialogOpen(false);
      fetchBooks();
    } catch (error) {
      console.error('Error saving book:', error);
      toast.error(error.response?.data?.error || 'Failed to save book');
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const columns = [
    {
      field: 'title',
      headerName: 'Title',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight="bold">
            {params.value}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {params.row.author}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'isbn',
      headerName: 'ISBN',
      width: 150,
    },
    {
      field: 'genre',
      headerName: 'Genre',
      width: 120,
      renderCell: (params) => (
        params.value ? (
          <Chip label={params.value} size="small" color="primary" variant="outlined" />
        ) : null
      ),
    },
    {
      field: 'publication_year',
      headerName: 'Year',
      width: 80,
    },
    {
      field: 'total_copies',
      headerName: 'Total',
      width: 80,
      align: 'center',
    },
    {
      field: 'available_copies',
      headerName: 'Available',
      width: 100,
      align: 'center',
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value > 0 ? 'success' : 'error'}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Edit">
            <IconButton
              size="small"
              onClick={() => handleEditBook(params.row)}
              color="primary"
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              onClick={() => handleDeleteBook(params.row.id)}
              color="error"
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          <BookIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Books Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddBook}
        >
          Add Book
        </Button>
      </Box>

      {/* Search and Filter */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Search books, authors, or ISBN"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Filter by Genre</InputLabel>
                <Select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  label="Filter by Genre"
                >
                  <MenuItem value="">All Genres</MenuItem>
                  {genres.map((genre) => (
                    <MenuItem key={genre} value={genre}>
                      {genre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="body2" color="textSecondary">
                Total: {totalBooks} books
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Books Data Grid */}
      <Card>
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={books}
            columns={columns}
            loading={loading}
            paginationModel={paginationModel}
            paginationMode="server"
            rowCount={totalBooks}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[5, 10, 25]}
            disableRowSelectionOnClick
            sx={{
              border: 'none',
              '& .MuiDataGrid-cell:focus': {
                outline: 'none',
              },
            }}
          />
        </Box>
      </Card>

      {/* Add/Edit Book Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingBook ? 'Edit Book' : 'Add New Book'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Title *"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Author *"
                value={formData.author}
                onChange={(e) => handleInputChange('author', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="ISBN"
                value={formData.isbn}
                onChange={(e) => handleInputChange('isbn', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Genre"
                value={formData.genre}
                onChange={(e) => handleInputChange('genre', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Publication Year"
                value={formData.publication_year}
                onChange={(e) => handleInputChange('publication_year', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Total Copies *"
                value={formData.total_copies}
                onChange={(e) => handleInputChange('total_copies', parseInt(e.target.value) || 1)}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.title || !formData.author}
          >
            {editingBook ? 'Update' : 'Add'} Book
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Books;