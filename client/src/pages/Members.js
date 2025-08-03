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
  People as PeopleIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { membersAPI } from '../services/api';
import toast from 'react-hot-toast';

const Members = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalMembers, setTotalMembers] = useState(0);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    membership_status: 'active',
    max_books: 5,
  });

  useEffect(() => {
    fetchMembers();
  }, [paginationModel, searchQuery, statusFilter]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const params = {
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
        search: searchQuery || undefined,
        status: statusFilter || undefined,
      };
      
      const response = await membersAPI.getAll(params);
      setMembers(response.data.members);
      setTotalMembers(response.data.pagination.total);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to fetch members');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = () => {
    setEditingMember(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      membership_status: 'active',
      max_books: 5,
    });
    setDialogOpen(true);
  };

  const handleEditMember = (member) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      email: member.email,
      phone: member.phone || '',
      address: member.address || '',
      membership_status: member.membership_status,
      max_books: member.max_books,
    });
    setDialogOpen(true);
  };

  const handleDeleteMember = async (id) => {
    if (window.confirm('Are you sure you want to delete this member?')) {
      try {
        await membersAPI.delete(id);
        toast.success('Member deleted successfully');
        fetchMembers();
      } catch (error) {
        console.error('Error deleting member:', error);
        toast.error(error.response?.data?.error || 'Failed to delete member');
      }
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingMember) {
        await membersAPI.update(editingMember.id, formData);
        toast.success('Member updated successfully');
      } else {
        await membersAPI.create(formData);
        toast.success('Member added successfully');
      }
      setDialogOpen(false);
      fetchMembers();
    } catch (error) {
      console.error('Error saving member:', error);
      toast.error(error.response?.data?.error || 'Failed to save member');
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const columns = [
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight="bold">
            {params.value}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {params.row.email}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'phone',
      headerName: 'Phone',
      width: 150,
    },
    {
      field: 'membership_status',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value === 'active' ? 'success' : 'error'}
        />
      ),
    },
    {
      field: 'active_borrowings',
      headerName: 'Active Books',
      width: 120,
      align: 'center',
      renderCell: (params) => (
        <Chip
          label={`${params.value}/${params.row.max_books}`}
          size="small"
          color={params.value === 0 ? 'default' : 'primary'}
        />
      ),
    },
    {
      field: 'membership_date',
      headerName: 'Member Since',
      width: 120,
      renderCell: (params) => (
        new Date(params.value).toLocaleDateString()
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
              onClick={() => handleEditMember(params.row)}
              color="primary"
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              onClick={() => handleDeleteMember(params.row.id)}
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
          <PeopleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Members Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddMember}
        >
          Add Member
        </Button>
      </Box>

      {/* Search and Filter */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Search members by name, email, or phone"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Filter by Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Filter by Status"
                >
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="body2" color="textSecondary">
                Total: {totalMembers} members
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Members Data Grid */}
      <Card>
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={members}
            columns={columns}
            loading={loading}
            paginationModel={paginationModel}
            paginationMode="server"
            rowCount={totalMembers}
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

      {/* Add/Edit Member Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingMember ? 'Edit Member' : 'Add New Member'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Full Name *"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="email"
                label="Email *"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Membership Status</InputLabel>
                <Select
                  value={formData.membership_status}
                  onChange={(e) => handleInputChange('membership_status', e.target.value)}
                  label="Membership Status"
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Max Books Allowed"
                value={formData.max_books}
                onChange={(e) => handleInputChange('max_books', parseInt(e.target.value) || 5)}
                inputProps={{ min: 1, max: 20 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.name || !formData.email}
          >
            {editingMember ? 'Update' : 'Add'} Member
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Members;