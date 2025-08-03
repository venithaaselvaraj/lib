import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  AssignmentReturn as ReturnIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { borrowingAPI } from '../services/api';
import toast from 'react-hot-toast';

const Overdue = () => {
  const [overdueBooks, setOverdueBooks] = useState([]);
  const [overdueSummary, setOverdueSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [returnNotes, setReturnNotes] = useState('');

  useEffect(() => {
    fetchOverdueData();
  }, []);

  const fetchOverdueData = async () => {
    try {
      setLoading(true);
      const [overdueRes, summaryRes] = await Promise.all([
        borrowingAPI.getOverdue(),
        import('../services/api').then(api => api.dashboardAPI.getOverdueSummary()),
      ]);
      
      setOverdueBooks(overdueRes.data);
      setOverdueSummary(summaryRes.data);
    } catch (error) {
      console.error('Error fetching overdue data:', error);
      toast.error('Failed to fetch overdue books data');
    } finally {
      setLoading(false);
    }
  };

  const handleReturnBook = async () => {
    try {
      const data = {
        return_date: new Date().toISOString(),
        fine_amount: selectedTransaction.calculated_fine,
        notes: returnNotes,
      };
      
      await borrowingAPI.return(selectedTransaction.id, data);
      toast.success('Overdue book returned successfully');
      setReturnDialogOpen(false);
      setReturnNotes('');
      fetchOverdueData();
    } catch (error) {
      console.error('Error returning book:', error);
      toast.error(error.response?.data?.error || 'Failed to return book');
    }
  };

  const handleOpenReturnDialog = (transaction) => {
    setSelectedTransaction(transaction);
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
      renderCell: (params) => (
        <Box>
          <Typography variant="body2">{params.row.member_name}</Typography>
          <Typography variant="caption" color="textSecondary">
            {params.row.member_email}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'due_date',
      headerName: 'Due Date',
      width: 120,
      renderCell: (params) => (
        <Typography variant="body2" color="error" fontWeight="bold">
          {new Date(params.value).toLocaleDateString()}
        </Typography>
      ),
    },
    {
      field: 'days_overdue',
      headerName: 'Days Overdue',
      width: 120,
      align: 'center',
      renderCell: (params) => (
        <Chip
          label={`${params.value} days`}
          size="small"
          color="error"
          variant="filled"
        />
      ),
    },
    {
      field: 'calculated_fine',
      headerName: 'Fine Amount',
      width: 120,
      align: 'center',
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="bold" color="error">
          ${params.value.toFixed(2)}
        </Typography>
      ),
    },
    {
      field: 'member_phone',
      headerName: 'Contact',
      width: 120,
      renderCell: (params) => (
        <Box>
          {params.row.member_email && (
            <Tooltip title={`Email: ${params.row.member_email}`}>
              <IconButton size="small" color="primary">
                <EmailIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {params.row.member_phone && (
            <Tooltip title={`Phone: ${params.row.member_phone}`}>
              <IconButton size="small" color="primary">
                <PhoneIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <Tooltip title="Return Book">
          <IconButton
            size="small"
            onClick={() => handleOpenReturnDialog(params.row)}
            color="primary"
          >
            <ReturnIcon />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        <WarningIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'error.main' }} />
        Overdue Books
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    Overdue Books
                  </Typography>
                  <Typography variant="h4" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                    {overdueSummary?.total_overdue || 0}
                  </Typography>
                </Box>
                <WarningIcon sx={{ color: 'error.main', fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    Total Fines
                  </Typography>
                  <Typography variant="h4" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                    ${(overdueSummary?.total_fines || 0).toFixed(2)}
                  </Typography>
                </Box>
                <MoneyIcon sx={{ color: 'error.main', fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    Average Days
                  </Typography>
                  <Typography variant="h4" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                    {overdueBooks.length > 0 
                      ? Math.round(overdueBooks.reduce((sum, book) => sum + book.days_overdue, 0) / overdueBooks.length)
                      : 0
                    }
                  </Typography>
                </Box>
                <ScheduleIcon sx={{ color: 'error.main', fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alert */}
      {overdueBooks.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          There are {overdueBooks.length} overdue books generating ${(overdueSummary?.total_fines || 0).toFixed(2)} in fines. 
          Contact members for immediate return.
        </Alert>
      )}

      {/* Overdue Books List */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Overdue Books Details
          </Typography>
          <Box sx={{ height: 500, width: '100%' }}>
            <DataGrid
              rows={overdueBooks}
              columns={columns}
              loading={loading}
              pageSize={10}
              rowsPerPageOptions={[5, 10, 25]}
              disableRowSelectionOnClick
              sx={{
                border: 'none',
                '& .MuiDataGrid-cell:focus': {
                  outline: 'none',
                },
                '& .MuiDataGrid-row': {
                  '&:hover': {
                    backgroundColor: '#ffebee',
                  },
                },
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Most Overdue Books */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Most Overdue Books
              </Typography>
              <List>
                {overdueBooks
                  .sort((a, b) => b.days_overdue - a.days_overdue)
                  .slice(0, 5)
                  .map((book, index) => (
                    <ListItem key={book.id} sx={{ px: 0 }}>
                      <ListItemIcon>
                        <Chip 
                          label={index + 1} 
                          size="small" 
                          color="error"
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={book.title}
                        secondary={`${book.member_name} • ${book.days_overdue} days overdue • $${book.calculated_fine.toFixed(2)}`}
                      />
                    </ListItem>
                  ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Highest Fines
              </Typography>
              <List>
                {overdueBooks
                  .sort((a, b) => b.calculated_fine - a.calculated_fine)
                  .slice(0, 5)
                  .map((book, index) => (
                    <ListItem key={`fine-${book.id}`} sx={{ px: 0 }}>
                      <ListItemIcon>
                        <Chip 
                          label={`$${book.calculated_fine.toFixed(2)}`} 
                          size="small" 
                          color="error"
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={book.title}
                        secondary={`${book.member_name} • ${book.days_overdue} days overdue`}
                      />
                    </ListItem>
                  ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Return Overdue Book Dialog */}
      <Dialog
        open={returnDialogOpen}
        onClose={() => setReturnDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Return Overdue Book</DialogTitle>
        <DialogContent>
          {selectedTransaction && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6">{selectedTransaction.title}</Typography>
              <Typography variant="body2" color="textSecondary">
                Member: {selectedTransaction.member_name}
              </Typography>
              <Typography variant="body2" color="error">
                {selectedTransaction.days_overdue} days overdue
              </Typography>
              <Typography variant="body1" fontWeight="bold" color="error">
                Fine: ${selectedTransaction.calculated_fine.toFixed(2)}
              </Typography>
            </Box>
          )}
          <Alert severity="info" sx={{ mb: 2 }}>
            Returning this book will charge a fine of ${selectedTransaction?.calculated_fine.toFixed(2)} 
            for {selectedTransaction?.days_overdue} days overdue.
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Return Notes"
            value={returnNotes}
            onChange={(e) => setReturnNotes(e.target.value)}
            placeholder="Add any notes about the return or fine collection..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReturnDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleReturnBook}
            variant="contained"
            color="primary"
          >
            Return Book & Charge Fine
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Overdue;