/**
 * Budget Management Agent - Report Page
 * Generated: 2025-10-26 14:16:23
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';

export default function BudgetManagementReport() {
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
      // Load statistics
      const statsResponse = await fetch(`${API_BASE}/api/agents/budget_management/statistics`, { headers });
      const statsData = await statsResponse.json();
      setStats(statsData);
      
      // Load activities
      const activitiesResponse = await fetch(`${API_BASE}/api/agents/budget_management/activities`, { headers });
      const activitiesData = await activitiesResponse.json();
      setActivities(activitiesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LinearProgress />;
  }

  const successRate = stats ? (stats.success_count / stats.execution_count * 100) : 0;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Budget Management Agent - Report
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Executions
              </Typography>
              <Typography variant="h4">
                {stats?.execution_count || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Successful
              </Typography>
              <Typography variant="h4" color="success.main">
                {stats?.success_count || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Failed
              </Typography>
              <Typography variant="h4" color="error.main">
                {stats?.failure_count || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Success Rate
              </Typography>
              <Typography variant="h4">
                {successRate.toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Activities
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Processed</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activities.map((activity, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {new Date(activity.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {activity.success ? (
                        <Chip
                          icon={<SuccessIcon />}
                          label="Success"
                          color="success"
                          size="small"
                        />
                      ) : (
                        <Chip
                          icon={<ErrorIcon />}
                          label="Failed"
                          color="error"
                          size="small"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {activity.result?.processed || 0}
                    </TableCell>
                    <TableCell>
                      {activity.duration ? `${activity.duration.toFixed(2)}s` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {activity.result?.successful || 0} successful, {' '}
                      {activity.result?.failed || 0} failed
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
