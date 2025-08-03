import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
} from '@mui/material';
import {
  Book as BookIcon,
  People as PeopleIcon,
  SwapHoriz as SwapHorizIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { dashboardAPI } from '../services/api';
import toast from 'react-hot-toast';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const StatCard = ({ title, value, icon, color, subtitle }) => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography color="textSecondary" gutterBottom variant="h6">
            {title}
          </Typography>
          <Typography variant="h4" sx={{ color, fontWeight: 'bold' }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography color="textSecondary" variant="body2">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box sx={{ color, fontSize: 40 }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [popularBooks, setPopularBooks] = useState([]);
  const [genreDistribution, setGenreDistribution] = useState([]);
  const [overdueSummary, setOverdueSummary] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [
        statsRes,
        trendsRes,
        popularRes,
        genreRes,
        overdueRes,
      ] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getTrends(),
        dashboardAPI.getPopularBooks(5),
        dashboardAPI.getGenreDistribution(),
        dashboardAPI.getOverdueSummary(),
      ]);

      setStats(statsRes.data);
      setTrends(trendsRes.data);
      setPopularBooks(popularRes.data);
      setGenreDistribution(genreRes.data.slice(0, 6)); // Top 6 genres
      setOverdueSummary(overdueRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Books"
            value={stats?.books?.total || 0}
            subtitle={`${stats?.books?.total_copies || 0} copies`}
            icon={<BookIcon />}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Members"
            value={stats?.members?.active || 0}
            subtitle={`${stats?.members?.total || 0} total`}
            icon={<PeopleIcon />}
            color="#2e7d32"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Borrowings"
            value={stats?.borrowing?.active_borrowings || 0}
            subtitle={`${stats?.borrowing?.total_transactions || 0} total`}
            icon={<SwapHorizIcon />}
            color="#ed6c02"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Overdue Books"
            value={stats?.borrowing?.overdue_books || 0}
            subtitle={`$${(overdueSummary?.total_fines || 0).toFixed(2)} in fines`}
            icon={<WarningIcon />}
            color="#d32f2f"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Borrowing Trends */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Borrowing Trends (Last 6 Months)
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="borrowings" 
                      stroke="#1976d2" 
                      strokeWidth={2}
                      name="Borrowings"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="returns" 
                      stroke="#2e7d32" 
                      strokeWidth={2}
                      name="Returns"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Popular Books */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📚 Popular Books
              </Typography>
              <List>
                {popularBooks.map((book, index) => (
                  <ListItem key={book.id} sx={{ px: 0 }}>
                    <ListItemIcon>
                      <Chip 
                        label={index + 1} 
                        size="small" 
                        color={index < 3 ? 'primary' : 'default'}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={book.title}
                      secondary={`${book.author} • ${book.borrow_count} borrows`}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Genre Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📊 Genre Distribution
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genreDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ genre, book_count }) => `${genre}: ${book_count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="book_count"
                    >
                      {genreDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <ScheduleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Recent Activity
              </Typography>
              <List>
                {stats?.recentActivity?.slice(0, 5).map((activity, index) => (
                  <ListItem key={`${activity.id}-${index}`} sx={{ px: 0 }}>
                    <ListItemIcon>
                      {activity.activity_type === 'borrow' ? (
                        <SwapHorizIcon color="primary" />
                      ) : (
                        <BookIcon color="success" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={`${activity.member_name} ${activity.activity_type === 'borrow' ? 'borrowed' : 'returned'} "${activity.title}"`}
                      secondary={new Date(activity.activity_type === 'borrow' ? activity.borrow_date : activity.return_date).toLocaleDateString()}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;