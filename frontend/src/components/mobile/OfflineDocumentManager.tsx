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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  Badge,
  Tabs,
  Tab
} from '@mui/material';
import {
  CloudDownload as CloudDownloadIcon,
  CloudOff as CloudOffIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Storage as StorageIcon,
  Description as DocumentIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  AudioFile as AudioIcon,
  Archive as ArchiveIcon,
  PictureAsPdf as PdfIcon,
  TableChart as SpreadsheetIcon,
  Slideshow as PresentationIcon,
  Code as CodeIcon,
  InsertDriveFile as FileIcon,
  Priority as PriorityIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Pause as PauseIcon,
  PlayArrow as PlayIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { 
  mobileService, 
  MobileDevice, 
  OfflineDocument,
  StorageUsage
} from '../../services/mobileService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`offline-tabpanel-${index}`}
      aria-labelledby={`offline-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const OfflineDocumentManager: React.FC = () => {
  const { user } = useAuth();
  const [devices, setDevices] = useState<MobileDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<MobileDevice | null>(null);
  const [offlineDocuments, setOfflineDocuments] = useState<OfflineDocument[]>([]);
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queueDialogOpen, setQueueDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [documentId, setDocumentId] = useState('');
  const [priority, setPriority] = useState(0);

  const statusFilters = ['all', 'pending', 'downloading', 'completed', 'failed'];

  useEffect(() => {
    loadDevices();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      loadOfflineDocuments();
      loadStorageUsage();
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

  const loadOfflineDocuments = async () => {
    if (!selectedDevice) return;

    try {
      const response = await mobileService.getOfflineDocuments(selectedDevice.id);
      if (response.success) {
        setOfflineDocuments(response.documents);
      } else {
        setError('Failed to load offline documents');
      }
    } catch (err) {
      setError('Error loading offline documents');
      console.error('Error loading offline documents:', err);
    }
  };

  const loadStorageUsage = async () => {
    if (!selectedDevice) return;

    try {
      const response = await mobileService.getDeviceStorageUsage(selectedDevice.id);
      if (response.success) {
        setStorageUsage(response.storage_usage);
      } else {
        console.error('Failed to load storage usage');
      }
    } catch (err) {
      console.error('Error loading storage usage:', err);
    }
  };

  const handleQueueDocument = async () => {
    if (!selectedDevice || !documentId) return;

    try {
      const response = await mobileService.queueDocumentForOffline(
        selectedDevice.id,
        parseInt(documentId),
        priority
      );
      
      if (response.success) {
        setQueueDialogOpen(false);
        setDocumentId('');
        setPriority(0);
        loadOfflineDocuments();
        loadStorageUsage();
      } else {
        setError('Failed to queue document for offline');
      }
    } catch (err) {
      setError('Error queuing document');
      console.error('Error queuing document:', err);
    }
  };

  const handleUpdateDocumentStatus = async (offlineDocId: number, status: string) => {
    try {
      const response = await mobileService.updateOfflineDocumentStatus(offlineDocId, status);
      if (response.success) {
        loadOfflineDocuments();
        loadStorageUsage();
      } else {
        setError('Failed to update document status');
      }
    } catch (err) {
      setError('Error updating document status');
      console.error('Error updating document status:', err);
    }
  };

  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return <PdfIcon />;
      case 'doc':
      case 'docx':
        return <DocumentIcon />;
      case 'xls':
      case 'xlsx':
        return <SpreadsheetIcon />;
      case 'ppt':
      case 'pptx':
        return <PresentationIcon />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <ImageIcon />;
      case 'mp4':
      case 'avi':
      case 'mov':
        return <VideoIcon />;
      case 'mp3':
      case 'wav':
      case 'flac':
        return <AudioIcon />;
      case 'zip':
      case 'rar':
      case '7z':
        return <ArchiveIcon />;
      case 'js':
      case 'ts':
      case 'py':
      case 'java':
      case 'cpp':
        return <CodeIcon />;
      default:
        return <FileIcon />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'downloading':
        return <CircularProgress size={20} />;
      case 'pending':
        return <ScheduleIcon color="warning" />;
      default:
        return <PauseIcon color="disabled" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'downloading':
        return 'info';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 3) return 'error';
    if (priority >= 2) return 'warning';
    if (priority >= 1) return 'info';
    return 'default';
  };

  const getFilteredDocuments = (status: string) => {
    if (status === 'all') return offlineDocuments;
    return offlineDocuments.filter(doc => doc.download_status === status);
  };

  const calculateProgress = (downloaded: number, total: number) => {
    if (!total) return 0;
    return Math.round((downloaded / total) * 100);
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
          Offline Document Manager
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
            onClick={() => {
              loadOfflineDocuments();
              loadStorageUsage();
            }}
            sx={{ mr: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<CloudDownloadIcon />}
            onClick={() => setQueueDialogOpen(true)}
            disabled={!selectedDevice}
          >
            Queue Document
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
          {/* Storage Usage Card */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Storage Usage
                </Typography>
                {storageUsage ? (
                  <Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Used:</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {mobileService.formatFileSize(storageUsage.total_size)}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Limit:</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {mobileService.formatFileSize(storageUsage.storage_limit)}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={storageUsage.usage_percentage}
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {storageUsage.usage_percentage.toFixed(1)}% used ({storageUsage.document_count} documents)
                    </Typography>
                  </Box>
                ) : (
                  <CircularProgress size={24} />
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Download Statistics Card */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Download Statistics
                </Typography>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Total:</Typography>
                  <Typography variant="body2" fontWeight="bold">{offlineDocuments.length}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Completed:</Typography>
                  <Typography variant="body2" color="success.main" fontWeight="bold">
                    {offlineDocuments.filter(d => d.download_status === 'completed').length}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Pending:</Typography>
                  <Typography variant="body2" color="warning.main" fontWeight="bold">
                    {offlineDocuments.filter(d => d.download_status === 'pending').length}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Downloading:</Typography>
                  <Typography variant="body2" color="info.main" fontWeight="bold">
                    {offlineDocuments.filter(d => d.download_status === 'downloading').length}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Failed:</Typography>
                  <Typography variant="body2" color="error.main" fontWeight="bold">
                    {offlineDocuments.filter(d => d.download_status === 'failed').length}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Documents List */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Offline Documents
                </Typography>
                
                <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)}>
                  {statusFilters.map((status, index) => (
                    <Tab
                      key={status}
                      label={
                        <Badge
                          badgeContent={getFilteredDocuments(status).length}
                          color="primary"
                          invisible={status === 'all'}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>
                      }
                    />
                  ))}
                </Tabs>

                {statusFilters.map((status, index) => (
                  <TabPanel key={status} value={selectedTab} index={index}>
                    {getFilteredDocuments(status).length === 0 ? (
                      <Box textAlign="center" py={4}>
                        <CloudOffIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          No {status === 'all' ? '' : status} documents
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {status === 'all' 
                            ? 'Queue documents for offline access'
                            : `No documents with ${status} status`
                          }
                        </Typography>
                      </Box>
                    ) : (
                      <TableContainer component={Paper} variant="outlined">
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Document</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Priority</TableCell>
                              <TableCell>Size</TableCell>
                              <TableCell>Progress</TableCell>
                              <TableCell>Created</TableCell>
                              <TableCell>Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {getFilteredDocuments(status).map((doc) => (
                              <TableRow key={doc.id}>
                                <TableCell>
                                  <Box display="flex" alignItems="center">
                                    {getFileIcon(`document_${doc.document_id}.pdf`)}
                                    <Box ml={1}>
                                      <Typography variant="body2" fontWeight="medium">
                                        Document #{doc.document_id}
                                      </Typography>
                                      {doc.local_path && (
                                        <Typography variant="caption" color="text.secondary">
                                          {doc.local_path}
                                        </Typography>
                                      )}
                                    </Box>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Box display="flex" alignItems="center">
                                    {getStatusIcon(doc.download_status)}
                                    <Chip
                                      label={doc.download_status}
                                      color={getStatusColor(doc.download_status) as any}
                                      size="small"
                                      sx={{ ml: 1 }}
                                    />
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    icon={<PriorityIcon />}
                                    label={doc.download_priority}
                                    color={getPriorityColor(doc.download_priority) as any}
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell>
                                  {doc.file_size ? mobileService.formatFileSize(doc.file_size) : '-'}
                                </TableCell>
                                <TableCell>
                                  {doc.download_status === 'downloading' && doc.file_size ? (
                                    <Box>
                                      <LinearProgress
                                        variant="determinate"
                                        value={calculateProgress(doc.downloaded_size, doc.file_size)}
                                        sx={{ mb: 0.5 }}
                                      />
                                      <Typography variant="caption" color="text.secondary">
                                        {calculateProgress(doc.downloaded_size, doc.file_size)}%
                                      </Typography>
                                    </Box>
                                  ) : doc.download_status === 'completed' ? (
                                    <Typography variant="body2" color="success.main">
                                      Complete
                                    </Typography>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">
                                      -
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Typography variant="caption" color="text.secondary">
                                    {new Date(doc.created_at).toLocaleDateString()}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Box display="flex" gap={1}>
                                    {doc.download_status === 'pending' && (
                                      <Tooltip title="Start Download">
                                        <IconButton
                                          size="small"
                                          color="primary"
                                          onClick={() => handleUpdateDocumentStatus(doc.id, 'downloading')}
                                        >
                                          <PlayIcon />
                                        </IconButton>
                                      </Tooltip>
                                    )}
                                    {doc.download_status === 'downloading' && (
                                      <Tooltip title="Pause Download">
                                        <IconButton
                                          size="small"
                                          color="warning"
                                          onClick={() => handleUpdateDocumentStatus(doc.id, 'pending')}
                                        >
                                          <PauseIcon />
                                        </IconButton>
                                      </Tooltip>
                                    )}
                                    {doc.download_status === 'failed' && (
                                      <Tooltip title="Retry Download">
                                        <IconButton
                                          size="small"
                                          color="info"
                                          onClick={() => handleUpdateDocumentStatus(doc.id, 'pending')}
                                        >
                                          <RefreshIcon />
                                        </IconButton>
                                      </Tooltip>
                                    )}
                                    <Tooltip title="Remove from Queue">
                                      <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => {
                                          if (window.confirm('Remove this document from offline queue?')) {
                                            // In a real implementation, you'd have a remove endpoint
                                            console.log('Remove document', doc.id);
                                          }
                                        }}
                                      >
                                        <DeleteIcon />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </TabPanel>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Queue Document Dialog */}
      <Dialog open={queueDialogOpen} onClose={() => setQueueDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Queue Document for Offline</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Document ID"
              type="number"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              margin="normal"
              required
              helperText="Enter the ID of the document to download for offline access"
            />
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Priority</InputLabel>
              <Select
                value={priority}
                onChange={(e) => setPriority(e.target.value as number)}
                label="Priority"
              >
                <MenuItem value={0}>Low (0)</MenuItem>
                <MenuItem value={1}>Normal (1)</MenuItem>
                <MenuItem value={2}>High (2)</MenuItem>
                <MenuItem value={3}>Critical (3)</MenuItem>
              </Select>
            </FormControl>

            <Alert severity="info" sx={{ mt: 2 }}>
              Higher priority documents will be downloaded first. Critical priority documents 
              will be downloaded immediately regardless of network conditions.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQueueDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleQueueDocument} 
            variant="contained"
            disabled={!documentId}
          >
            Queue Document
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OfflineDocumentManager;