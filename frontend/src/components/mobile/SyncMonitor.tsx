import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Badge
} from '@mui/material';
import {
  Sync as SyncIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  CloudSync as CloudSyncIcon,
  MobileOff as MobileOffIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Merge as MergeIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { 
  mobileService, 
  MobileDevice, 
  SyncSession, 
  SyncItem, 
  SyncConflict 
} from '../../services/mobileService';

const SyncMonitor: React.FC = () => {
  const { user } = useAuth();
  const [devices, setDevices] = useState<MobileDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<MobileDevice | null>(null);
  const [syncSessions, setSyncSessions] = useState<SyncSession[]>([]);
  const [syncItems, setSyncItems] = useState<Record<number, SyncItem[]>>({});
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startSyncDialogOpen, setStartSyncDialogOpen] = useState(false);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<SyncConflict | null>(null);
  const [syncType, setSyncType] = useState('incremental');

  useEffect(() => {
    loadDevices();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      loadSyncData();
    }
  }, [selectedDevice]);

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

  const loadSyncData = async () => {
    if (!selectedDevice) return;

    try {
      const [sessionsResponse, conflictsResponse] = await Promise.all([
        mobileService.getSyncSessions(selectedDevice.id),
        mobileService.getUnresolvedConflicts(selectedDevice.id)
      ]);

      if (sessionsResponse.success) {
        setSyncSessions(sessionsResponse.sessions);
        
        // Load sync items for each session
        const itemsData: Record<number, SyncItem[]> = {};
        for (const session of sessionsResponse.sessions) {
          try {
            const itemsResponse = await mobileService.getSyncItems(session.id);
            if (itemsResponse.success) {
              itemsData[session.id] = itemsResponse.items;
            }
          } catch (err) {
            console.error(`Error loading items for session ${session.id}:`, err);
          }
        }
        setSyncItems(itemsData);
      }

      if (conflictsResponse.success) {
        setConflicts(conflictsResponse.conflicts);
      }
    } catch (err) {
      setError('Error loading sync data');
      console.error('Error loading sync data:', err);
    }
  };

  const handleStartSync = async () => {
    if (!selectedDevice) return;

    try {
      const response = await mobileService.startSyncSession(selectedDevice.id, syncType);
      if (response.success) {
        setStartSyncDialogOpen(false);
        loadSyncData();
      } else {
        setError('Failed to start sync session');
      }
    } catch (err) {
      setError('Error starting sync session');
      console.error('Error starting sync session:', err);
    }
  };

  const handleResolveConflict = async (resolution: string) => {
    if (!selectedConflict) return;

    try {
      const resolutionData = {
        resolution_strategy: resolution,
        resolved_version: resolution === 'server_wins' ? selectedConflict.server_version : selectedConflict.client_version
      };

      const response = await mobileService.resolveConflict(selectedConflict.id, resolutionData);
      if (response.success) {
        setConflictDialogOpen(false);
        setSelectedConflict(null);
        loadSyncData();
      } else {
        setError('Failed to resolve conflict');
      }
    } catch (err) {
      setError('Error resolving conflict');
      console.error('Error resolving conflict:', err);
    }
  };

  const getSyncStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'in_progress':
        return <CircularProgress size={20} />;
      case 'pending':
        return <ScheduleIcon color="warning" />;
      default:
        return <WarningIcon color="warning" />;
    }
  };

  const getItemStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircleIcon color="success" fontSize="small" />;
      case 'failed':
        return <ErrorIcon color="error" fontSize="small" />;
      case 'pending':
        return <ScheduleIcon color="warning" fontSize="small" />;
      default:
        return <WarningIcon color="warning" fontSize="small" />;
    }
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    
    if (diffMinutes < 1) return `${diffSeconds}s`;
    if (diffMinutes < 60) return `${diffMinutes}m ${diffSeconds % 60}s`;
    return `${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m`;
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
          Sync Monitor
        </Typography>
        <Box>
          <FormControl sx={{ mr: 2, minWidth: 200 }}>
            <InputLabel>Select Device</InputLabel>
            <Select
              value={selectedDevice?.id || ''}
              onChange={(e) => {
                const device = devices.find(d => d.id === e.target.value);
                setSelectedDevice(device || null);
              }}
              label="Select Device"
            >
              {devices.map((device) => (
                <MenuItem key={device.id} value={device.id}>
                  {device.device_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadSyncData}
            sx={{ mr: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<SyncIcon />}
            onClick={() => setStartSyncDialogOpen(true)}
            disabled={!selectedDevice}
          >
            Start Sync
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
          {/* Device Status Card */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Device Status
                </Typography>
                <Box display="flex" alignItems="center" mb={2}>
                  <Chip
                    icon={mobileService.isDeviceOnline(selectedDevice.last_seen || '') ? <CloudSyncIcon /> : <MobileOffIcon />}
                    label={mobileService.getDeviceStatusText(selectedDevice)}
                    color={mobileService.getDeviceStatusColor(selectedDevice) as any}
                    sx={{ mr: 1 }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {selectedDevice.device_name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {mobileService.formatDeviceType(selectedDevice.device_type)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Last Seen: {selectedDevice.last_seen ? new Date(selectedDevice.last_seen).toLocaleString() : 'Never'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Sync Statistics Card */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Sync Statistics
                </Typography>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Total Sessions:</Typography>
                  <Typography variant="body2" fontWeight="bold">{syncSessions.length}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Successful:</Typography>
                  <Typography variant="body2" color="success.main" fontWeight="bold">
                    {syncSessions.filter(s => s.status === 'completed').length}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Failed:</Typography>
                  <Typography variant="body2" color="error.main" fontWeight="bold">
                    {syncSessions.filter(s => s.status === 'failed').length}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">In Progress:</Typography>
                  <Typography variant="body2" color="info.main" fontWeight="bold">
                    {syncSessions.filter(s => s.status === 'in_progress').length}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Conflicts Card */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Sync Conflicts
                  </Typography>
                  <Badge badgeContent={conflicts.length} color="error">
                    <MergeIcon />
                  </Badge>
                </Box>
                {conflicts.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No unresolved conflicts
                  </Typography>
                ) : (
                  <Box>
                    <Typography variant="body2" color="error.main" gutterBottom>
                      {conflicts.length} unresolved conflict{conflicts.length !== 1 ? 's' : ''}
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setConflictDialogOpen(true)}
                    >
                      View Conflicts
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Sync Sessions */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Sync Sessions
                </Typography>
                {syncSessions.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No sync sessions found
                  </Typography>
                ) : (
                  <Box>
                    {syncSessions.slice(0, 10).map((session) => (
                      <Accordion key={session.id}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box display="flex" alignItems="center" width="100%">
                            <Box mr={2}>
                              {getSyncStatusIcon(session.status)}
                            </Box>
                            <Box flexGrow={1}>
                              <Typography variant="subtitle2">
                                {mobileService.formatSyncStatus(session.status)} - {session.sync_type}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(session.started_at).toLocaleString()}
                              </Typography>
                            </Box>
                            <Box textAlign="right">
                              <Typography variant="body2">
                                {session.synced_items}/{session.total_items} items
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Duration: {formatDuration(session.started_at, session.completed_at)}
                              </Typography>
                            </Box>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2" gutterBottom>
                                Session Details
                              </Typography>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                Session ID: {session.session_id}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                Type: {session.sync_type}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                Started: {new Date(session.started_at).toLocaleString()}
                              </Typography>
                              {session.completed_at && (
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  Completed: {new Date(session.completed_at).toLocaleString()}
                                </Typography>
                              )}
                              {session.data_transferred && (
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  Data Transferred: {mobileService.formatFileSize(session.data_transferred)}
                                </Typography>
                              )}
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2" gutterBottom>
                                Progress
                              </Typography>
                              <LinearProgress
                                variant="determinate"
                                value={mobileService.calculateSyncProgress(session.synced_items, session.total_items)}
                                sx={{ mb: 1 }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {session.synced_items} of {session.total_items} items synced
                                {session.failed_items > 0 && ` (${session.failed_items} failed)`}
                              </Typography>
                            </Grid>
                            {syncItems[session.id] && (
                              <Grid item xs={12}>
                                <Typography variant="subtitle2" gutterBottom>
                                  Sync Items
                                </Typography>
                                <TableContainer component={Paper} variant="outlined">
                                  <Table size="small">
                                    <TableHead>
                                      <TableRow>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Item ID</TableCell>
                                        <TableCell>Action</TableCell>
                                        <TableCell>Size</TableCell>
                                        <TableCell>Retries</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {syncItems[session.id].slice(0, 5).map((item) => (
                                        <TableRow key={item.id}>
                                          <TableCell>
                                            <Box display="flex" alignItems="center">
                                              {getItemStatusIcon(item.status)}
                                              <Typography variant="caption" sx={{ ml: 1 }}>
                                                {item.status}
                                              </Typography>
                                            </Box>
                                          </TableCell>
                                          <TableCell>{item.item_type}</TableCell>
                                          <TableCell>{item.item_id}</TableCell>
                                          <TableCell>{item.action}</TableCell>
                                          <TableCell>
                                            {item.size_bytes ? mobileService.formatFileSize(item.size_bytes) : '-'}
                                          </TableCell>
                                          <TableCell>{item.retry_count}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </TableContainer>
                                {syncItems[session.id].length > 5 && (
                                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                    Showing 5 of {syncItems[session.id].length} items
                                  </Typography>
                                )}
                              </Grid>
                            )}
                          </Grid>
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Start Sync Dialog */}
      <Dialog open={startSyncDialogOpen} onClose={() => setStartSyncDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Start Sync Session</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Sync Type</InputLabel>
              <Select
                value={syncType}
                onChange={(e) => setSyncType(e.target.value)}
                label="Sync Type"
              >
                <MenuItem value="incremental">Incremental Sync</MenuItem>
                <MenuItem value="full">Full Sync</MenuItem>
                <MenuItem value="selective">Selective Sync</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              {syncType === 'incremental' && 'Sync only changes since last sync'}
              {syncType === 'full' && 'Sync all documents and data'}
              {syncType === 'selective' && 'Sync only selected items'}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStartSyncDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleStartSync} variant="contained">
            Start Sync
          </Button>
        </DialogActions>
      </Dialog>

      {/* Conflicts Dialog */}
      <Dialog open={conflictDialogOpen} onClose={() => setConflictDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Sync Conflicts</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {conflicts.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No unresolved conflicts
              </Typography>
            ) : (
              <List>
                {conflicts.map((conflict) => (
                  <React.Fragment key={conflict.id}>
                    <ListItem>
                      <ListItemIcon>
                        <MergeIcon color="warning" />
                      </ListItemIcon>
                      <ListItemText
                        primary={`${conflict.item_type} - ${conflict.item_id}`}
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Conflict Type: {conflict.conflict_type}
                            </Typography>
                            <br />
                            <Typography variant="caption" color="text.secondary">
                              Created: {new Date(conflict.created_at).toLocaleString()}
                            </Typography>
                          </Box>
                        }
                      />
                      <Box>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setSelectedConflict(conflict);
                          }}
                          sx={{ mr: 1 }}
                        >
                          View Details
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          onClick={() => handleResolveConflict('server_wins')}
                          sx={{ mr: 1 }}
                        >
                          Use Server
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="info"
                          onClick={() => handleResolveConflict('client_wins')}
                        >
                          Use Client
                        </Button>
                      </Box>
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConflictDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SyncMonitor;