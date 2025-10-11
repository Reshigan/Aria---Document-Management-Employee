import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
  DeviceHub as DeviceHubIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon,
  Sync as SyncIcon,
  MobileScreenShare as MobileIcon,
  CloudSync as CloudSyncIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { 
  mobileService, 
  MobileDevice, 
  MobileAnalyticsEvent,
  SyncStatistics,
  StorageUsage
} from '../../services/mobileService';

interface AnalyticsData {
  events: MobileAnalyticsEvent[];
  syncStats: Record<number, SyncStatistics>;
  storageStats: Record<number, StorageUsage>;
}

const MobileAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [devices, setDevices] = useState<MobileDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<MobileDevice | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    events: [],
    syncStats: {},
    storageStats: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState(30);
  const [eventType, setEventType] = useState('all');

  const eventTypes = [
    'all',
    'app_launch',
    'document_view',
    'sync_initiated',
    'download_started',
    'upload_completed',
    'error_occurred'
  ];

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff0000'];

  useEffect(() => {
    loadDevices();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      loadAnalyticsData();
    }
  }, [selectedDevice, timeRange, eventType]);

  const loadDevices = async () => {
    try {
      setLoading(true);
      const response = await mobileService.getUserDevices();
      if (response.success) {
        setDevices(response.devices);
        if (response.devices.length > 0 && !selectedDevice) {
          setSelectedDevice(response.devices[0]);
        }
      } else {
        setError('Failed to load devices');
      }
    } catch (err) {
      setError('Error loading devices');
      console.error('Error loading devices:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalyticsData = async () => {
    if (!selectedDevice) return;

    try {
      setLoading(true);
      
      const [eventsResponse, syncStatsResponse, storageResponse] = await Promise.all([
        mobileService.getMobileAnalytics(
          selectedDevice.id,
          eventType === 'all' ? undefined : eventType,
          timeRange
        ),
        mobileService.getSyncStatistics(selectedDevice.id, timeRange),
        mobileService.getDeviceStorageUsage(selectedDevice.id)
      ]);

      const newAnalyticsData: AnalyticsData = {
        events: eventsResponse.success ? eventsResponse.events : [],
        syncStats: {},
        storageStats: {}
      };

      if (syncStatsResponse.success) {
        newAnalyticsData.syncStats[selectedDevice.id] = syncStatsResponse.sync_statistics;
      }

      if (storageResponse.success) {
        newAnalyticsData.storageStats[selectedDevice.id] = storageResponse.storage_usage;
      }

      setAnalyticsData(newAnalyticsData);
    } catch (err) {
      setError('Error loading analytics data');
      console.error('Error loading analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  const processEventsByDay = () => {
    const eventsByDay: Record<string, number> = {};
    
    analyticsData.events.forEach(event => {
      const date = new Date(event.timestamp).toLocaleDateString();
      eventsByDay[date] = (eventsByDay[date] || 0) + 1;
    });

    return Object.entries(eventsByDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const processEventsByType = () => {
    const eventsByType: Record<string, number> = {};
    
    analyticsData.events.forEach(event => {
      eventsByType[event.event_type] = (eventsByType[event.event_type] || 0) + 1;
    });

    return Object.entries(eventsByType).map(([type, count]) => ({
      name: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: count
    }));
  };

  const processEventsByHour = () => {
    const eventsByHour: Record<number, number> = {};
    
    for (let i = 0; i < 24; i++) {
      eventsByHour[i] = 0;
    }
    
    analyticsData.events.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      eventsByHour[hour]++;
    });

    return Object.entries(eventsByHour).map(([hour, count]) => ({
      hour: `${hour}:00`,
      count
    }));
  };

  const getTopEvents = () => {
    const eventCounts: Record<string, number> = {};
    
    analyticsData.events.forEach(event => {
      eventCounts[event.event_type] = (eventCounts[event.event_type] || 0) + 1;
    });

    return Object.entries(eventCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Mobile Analytics
        </Typography>
        <Box display="flex" gap={2}>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Device</InputLabel>
            <Select
              value={selectedDevice?.id || ''}
              onChange={(e) => {
                const device = devices.find(d => d.id === e.target.value);
                setSelectedDevice(device || null);
              }}
              label="Device"
            >
              {devices.map((device) => (
                <MenuItem key={device.id} value={device.id}>
                  {device.device_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as number)}
              label="Time Range"
            >
              <MenuItem value={7}>7 Days</MenuItem>
              <MenuItem value={30}>30 Days</MenuItem>
              <MenuItem value={90}>90 Days</MenuItem>
              <MenuItem value={365}>1 Year</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Event Type</InputLabel>
            <Select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              label="Event Type"
            >
              {eventTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type === 'all' ? 'All Events' : type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadAnalyticsData}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {selectedDevice && (
        <Grid container spacing={3}>
          {/* Key Metrics Cards */}
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <AssessmentIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Total Events</Typography>
                </Box>
                <Typography variant="h4" color="primary">
                  {analyticsData.events.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Last {timeRange} days
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <SyncIcon color="success" sx={{ mr: 1 }} />
                  <Typography variant="h6">Sync Success</Typography>
                </Box>
                <Typography variant="h4" color="success.main">
                  {analyticsData.syncStats[selectedDevice.id]?.success_rate.toFixed(1) || 0}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {analyticsData.syncStats[selectedDevice.id]?.successful_sessions || 0} / {analyticsData.syncStats[selectedDevice.id]?.total_sessions || 0} sessions
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <StorageIcon color="warning" sx={{ mr: 1 }} />
                  <Typography variant="h6">Storage Used</Typography>
                </Box>
                <Typography variant="h4" color="warning.main">
                  {analyticsData.storageStats[selectedDevice.id]?.usage_percentage.toFixed(1) || 0}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {analyticsData.storageStats[selectedDevice.id] ? 
                    mobileService.formatFileSize(analyticsData.storageStats[selectedDevice.id].total_size) : '0 B'
                  } used
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <CloudSyncIcon color="info" sx={{ mr: 1 }} />
                  <Typography variant="h6">Data Transferred</Typography>
                </Box>
                <Typography variant="h4" color="info.main">
                  {analyticsData.syncStats[selectedDevice.id] ? 
                    mobileService.formatFileSize(analyticsData.syncStats[selectedDevice.id].total_data_transferred) : '0 B'
                  }
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total synced data
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Events Over Time Chart */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Events Over Time
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={processEventsByDay()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Area type="monotone" dataKey="count" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Event Types Distribution */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Event Types
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={processEventsByType()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {processEventsByType().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Hourly Activity Pattern */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Activity Pattern (24 Hours)
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={processEventsByHour()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Events */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top Events
                </Typography>
                {getTopEvents().map((event, index) => (
                  <Box key={event.type} display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2">
                      {event.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Typography>
                    <Chip
                      label={event.count}
                      color="primary"
                      size="small"
                    />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Events Table */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Events
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Timestamp</TableCell>
                        <TableCell>Event Type</TableCell>
                        <TableCell>Session ID</TableCell>
                        <TableCell>Event Data</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analyticsData.events.slice(0, 10).map((event) => (
                        <TableRow key={event.id}>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(event.timestamp).toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={event.event_type.replace('_', ' ')}
                              color="primary"
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {event.session_id || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {event.event_data ? JSON.stringify(event.event_data).substring(0, 100) + '...' : '-'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {analyticsData.events.length > 10 && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Showing 10 of {analyticsData.events.length} events
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {devices.length === 0 && !loading && (
        <Box textAlign="center" py={8}>
          <MobileIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Mobile Devices Found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Register mobile devices to view analytics data
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default MobileAnalytics;