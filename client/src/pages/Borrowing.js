import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Chip,
  Autocomplete,
  TextField,
  Tab,
  Tabs,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Assignment as AssignmentIcon,
  AssignmentReturn as ReturnIcon,
  SwapHoriz as SwapHorizIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { borrowingAPI, booksAPI, membersAPI } from '../services/api';
import toast from 'react-hot-toast';

const TabPanel = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const Borrowing = () => {
  const [tabValue, setTabValue] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
  const [borrowDialogOpen, setBorrowDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  
  // Form data for borrowing
  const [borrowFormData, setBorrowFormData] = useState({
    book_id: null,
    member_id: null,
    due_date: dayjs().add(14, 'day'),
    notes: '',
  });

  // Form data for returning
  const [returnFormData, setReturnFormData] = useState({
    return_date: dayjs(),
    fine_amount: 0,
    notes: '',
  });

  // Autocomplete options
  const [availableBooks, setAvailableBooks] = useState([]);
  const [activeMembers, setActiveMembers] = useState([]);

  useEffect(() => {
    fetchTransactions();
    fetchAvailableBooks();
    fetchActiveMembers();
  }, [paginationModel, tabValue]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = {
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
        status: tabValue === 0 ? 'borrowed' : tabValue === 1 ? 'returned' : undefined,
      };
      
      const response = await borrowingAPI.getAll(params);
      setTransactions(response.data.transactions);
      setTotalTransactions(response.data.pagination.total);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to fetch borrowing transactions');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableBooks = async () => {
    try {
      const response = await booksAPI.getAll({ limit: 100 });
      const available = response.data.books.filter(book => book.available_copies > 0);
      setAvailableBooks(available);
    } catch (error) {
      console.error('Error fetching available books:', error);
    }
  };

  const fetchActiveMembers = async () => {
    try {
      const response = await membersAPI.getAll({ limit: 100, status: 'active' });
      setActiveMembers(response.data.members);
    } catch (error) {
      console.error('Error fetching active members:', error);
    }
  };

  const handleBorrowBook = async () => {
    try {
      const data = {
        book_id: borrowFormData.book_id,
        member_id: borrowFormData.member_id,
        due_date: borrowFormData.due_date.toISOString(),
        notes: borrowFormData.notes,
      };
      
      await borrowingAPI.borrow(data);
      toast.success('Book borrowed successfully');
      setBorrowDialogOpen(false);
      setBorrowFormData({
        book_id: null,
        member_id: null,
        due_date: dayjs().add(14, 'day'),
        notes: '',
      });
      fetchTransactions();
      fetchAvailableBooks();
    } catch (error) {
      console.error('Error borrowing book:', error);
      toast.error(error.response?.data?.error || 'Failed to borrow book');
    }
  };

  const handleReturnBook = async () => {
    try {
      const data = {
        return_date: returnFormData.return_date.toISOString(),
        fine_amount: returnFormData.fine_amount,
        notes: returnFormData.notes,
      };
      
      await borrowingAPI.return(selectedTransaction.id, data);
      toast.success('Book returned successfully');
      setReturnDialogOpen(false);
      setReturnFormData({
        return_date: dayjs(),
        fine_amount: 0,
        notes: '',
      });
      fetchTransactions();
      fetchAvailableBooks();
    } catch (error) {
      console.error('Error returning book:', error);
      toast.error(error.response?.data?.error || 'Failed to return book');
    }
  };

  const handleOpenReturnDialog = (transaction) => {
    setSelectedTransaction(transaction);
    
    // Calculate fine if overdue
    const dueDate = dayjs(transaction.due_date);
    const now = dayjs();
    let calculatedFine = 0;
    
    if (now.isAfter(dueDate)) {
      const daysOverdue = now.diff(dueDate, 'day');
      calculatedFine = daysOverdue * 0.50; // $0.50 per day
    }
    
    setReturnFormData({
      return_date: dayjs(),
      fine_amount: calculatedFine,
      notes: '',
    });
    setReturnDialogOpen(true);
  };

  const columns = [
    {
      field: 'title',
      headerName: 'Book',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight="bold">
            {params.row.title}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            by {params.row.author}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'member_name',
      headerName: 'Member',
      width: 150,
    },
    {
      field: 'borrow_date',
      headerName: 'Borrowed',
      width: 120,
      renderCell: (params) => new Date(params.value).toLocaleDateString(),
    },
    {
      field: 'due_date',
      headerName: 'Due Date',
      width: 120,
      renderCell: (params) => {
        const dueDate = new Date(params.value);
        const isOverdue = params.row.status === 'borrowed' && dueDate < new Date();
        return (
          <Typography
            variant="body2"
            color={isOverdue ? 'error' : 'textPrimary'}
            fontWeight={isOverdue ? 'bold' : 'normal'}
          >
            {dueDate.toLocaleDateString()}
          </Typography>
        );
      },
    },
    {
      field: 'return_date',
      headerName: 'Returned',
      width: 120,
      renderCell: (params) => 
        params.value ? new Date(params.value).toLocaleDateString() : '-',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value === 'borrowed' ? 'primary' : 'success'}
        />
      ),
    },
    {
      field: 'fine_amount',
      headerName: 'Fine',
      width: 80,
      renderCell: (params) => 
        params.value > 0 ? `$${params.value.toFixed(2)}` : '-',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        params.row.status === 'borrowed' ? (
          <Tooltip title="Return Book">
            <IconButton
              size="small"
              onClick={() => handleOpenReturnDialog(params.row)}
              color="primary"
            >
              <ReturnIcon />
            </IconButton>
          </Tooltip>
        ) : null
      ),
    },
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            <SwapHorizIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Borrowing Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setBorrowDialogOpen(true)}
          >
            Borrow Book
          </Button>
        </Box>

        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
              <Tab label="Active Borrowings" icon={<AssignmentIcon />} />
              <Tab label="Returned Books" icon={<ReturnIcon />} />
              <Tab label="All Transactions" icon={<SwapHorizIcon />} />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <Box sx={{ height: 500, width: '100%' }}>
              <DataGrid
                rows={transactions}
                columns={columns}
                loading={loading}
                paginationModel={paginationModel}
                paginationMode="server"
                rowCount={totalTransactions}
                onPaginationModelChange={setPaginationModel}
                pageSizeOptions={[5, 10, 25]}
                disableRowSelectionOnClick
                sx={{ border: 'none' }}
              />
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Box sx={{ height: 500, width: '100%' }}>
              <DataGrid
                rows={transactions}
                columns={columns}
                loading={loading}
                paginationModel={paginationModel}
                paginationMode="server"
                rowCount={totalTransactions}
                onPaginationModelChange={setPaginationModel}
                pageSizeOptions={[5, 10, 25]}
                disableRowSelectionOnClick
                sx={{ border: 'none' }}
              />
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Box sx={{ height: 500, width: '100%' }}>
              <DataGrid
                rows={transactions}
                columns={columns}
                loading={loading}
                paginationModel={paginationModel}
                paginationMode="server"
                rowCount={totalTransactions}
                onPaginationModelChange={setPaginationModel}
                pageSizeOptions={[5, 10, 25]}
                disableRowSelectionOnClick
                sx={{ border: 'none' }}
              />
            </Box>
          </TabPanel>
        </Card>

        {/* Borrow Book Dialog */}
        <Dialog
          open={borrowDialogOpen}
          onClose={() => setBorrowDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Borrow Book</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Autocomplete
                  options={availableBooks}
                  getOptionLabel={(option) => `${option.title} by ${option.author} (${option.available_copies} available)`}
                  value={availableBooks.find(book => book.id === borrowFormData.book_id) || null}
                  onChange={(event, newValue) => {
                    setBorrowFormData(prev => ({ ...prev, book_id: newValue?.id || null }));
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="Select Book *" fullWidth />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Autocomplete
                  options={activeMembers}
                  getOptionLabel={(option) => `${option.name} (${option.email})`}
                  value={activeMembers.find(member => member.id === borrowFormData.member_id) || null}
                  onChange={(event, newValue) => {
                    setBorrowFormData(prev => ({ ...prev, member_id: newValue?.id || null }));
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="Select Member *" fullWidth />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Due Date"
                  value={borrowFormData.due_date}
                  onChange={(newValue) => {
                    setBorrowFormData(prev => ({ ...prev, due_date: newValue }));
                  }}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                  minDate={dayjs()}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notes"
                  value={borrowFormData.notes}
                  onChange={(e) => setBorrowFormData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBorrowDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleBorrowBook}
              variant="contained"
              disabled={!borrowFormData.book_id || !borrowFormData.member_id}
            >
              Borrow Book
            </Button>
          </DialogActions>
        </Dialog>

        {/* Return Book Dialog */}
        <Dialog
          open={returnDialogOpen}
          onClose={() => setReturnDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Return Book</DialogTitle>
          <DialogContent>
            {selectedTransaction && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6">{selectedTransaction.title}</Typography>
                <Typography variant="body2" color="textSecondary">
                  Borrowed by: {selectedTransaction.member_name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Due: {new Date(selectedTransaction.due_date).toLocaleDateString()}
                </Typography>
              </Box>
            )}
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Return Date"
                  value={returnFormData.return_date}
                  onChange={(newValue) => {
                    setReturnFormData(prev => ({ ...prev, return_date: newValue }));
                  }}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                  maxDate={dayjs()}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Fine Amount ($)"
                  value={returnFormData.fine_amount}
                  onChange={(e) => setReturnFormData(prev => ({ ...prev, fine_amount: parseFloat(e.target.value) || 0 }))}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Return Notes"
                  value={returnFormData.notes}
                  onChange={(e) => setReturnFormData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReturnDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleReturnBook}
              variant="contained"
              color="primary"
            >
              Return Book
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default Borrowing;