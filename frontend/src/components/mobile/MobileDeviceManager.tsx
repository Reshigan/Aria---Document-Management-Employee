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
  Switch,
  FormControlLabel,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Smartphone as SmartphoneIcon,
  Tablet as TabletIcon,
  Computer as ComputerIcon,
  Android as AndroidIcon,
  Apple as AppleIcon,
  Sync as SyncIcon,
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Storage as StorageIcon,
  SignalWifi4Bar as OnlineIcon,
  SignalWifiOff as OfflineIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { mobileService, MobileDevice, StorageUsage, SyncStatistics } from '../../services/mobileService';

interface DeviceRegistrationData {
  device_name: string;
  device_type: string;
  platform_version: string;
  app_version: string;
  sync_enabled: boolean;
  offline_storage_limit: number;
}

const MobileDeviceManager: React.FC = () => {
  const { user } = useAuth();
  const [devices, setDevices] = useState<MobileDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<MobileDevice | null>(null);
  const [deviceStats, setDeviceStats] = useState<Record<number, { storage: StorageUsage; sync: SyncStatistics }>>({});
  const [registrationData, setRegistrationData] = useState<DeviceRegistrationData>({
    device_name: '',
    device_type: 'ios',
    platform_version: '',
    app_version: '1.0.0',
    sync_enabled: true,
    offline_storage_limit: 2147483648 // 2GB
  });

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      const response = await mobileService.getUserDevices();
      if (response.success) {
        setDevices(response.devices);
        // Load stats for each device
        loadDeviceStats(response.devices);
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

  const loadDeviceStats = async (deviceList: MobileDevice[]) => {
    const stats: Record<number, { storage: StorageUsage; sync: SyncStatistics }> = {};
    
    for (const device of deviceList) {
      try {
        const [storageResponse, syncResponse] = await Promise.all([
          mobileService.getDeviceStorageUsage(device.id),
          mobileService.getSyncStatistics(device.id)
        ]);
        
        if (storageResponse.success && syncResponse.success) {
          stats[device.id] = {
            storage: storageResponse.storage_usage,
            sync: syncResponse.sync_statistics
          };
        }
      } catch (err) {
        console.error(`Error loading stats for device ${device.id}:`, err);
      }
    }
    
    setDeviceStats(stats);
  };

  const handleRegisterDevice = async () => {
    try {
      const deviceId = `device_${Date.now()}_${registrationData.device_type}`;
      const response = await mobileService.registerDevice({
        device_id: deviceId,
        ...registrationData
      });
      
      if (response.success) {
        setRegisterDialogOpen(false);
        setRegistrationData({
          device_name: '',
          device_type: 'ios',
          platform_version: '',
          app_version: '1.0.0',
          sync_enabled: true,
          offline_storage_limit: 2147483648
        });
        loadDevices();
      } else {
        setError('Failed to register device');
      }
    } catch (err) {
      setError('Error registering device');
      console.error('Error registering device:', err);
    }
  };

  const handleUpdateDevice = async (deviceId: number, updates: Partial<MobileDevice>) => {
    try {
      const response = await mobileService.updateDevice(deviceId, updates);
      if (response.success) {
        loadDevices();
      } else {
        setError('Failed to update device');
      }
    } catch (err) {
      setError('Error updating device');
      console.error('Error updating device:', err);
    }
  };

  const handleDeactivateDevice = async (deviceId: number) => {
    if (window.confirm('Are you sure you want to deactivate this device?')) {
      try {
        const response = await mobileService.deactivateDevice(deviceId);
        if (response.success) {
          loadDevices();
        } else {
          setError('Failed to deactivate device');
        }
      } catch (err) {
        setError('Error deactivating device');
        console.error('Error deactivating device:', err);
      }
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'ios':
        return <AppleIcon />;
      case 'android':
        return <AndroidIcon />;
      case 'tablet':
        return <TabletIcon />;
      case 'desktop':
        return <ComputerIcon />;
      default:
        return <SmartphoneIcon />;
    }
  };

  const formatLastSeen = (lastSeen: string) => {
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`;
    return `${Math.floor(diffMinutes / 1440)} days ago`;
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
          Mobile Device Management
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadDevices}
            sx={{ mr: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setRegisterDialogOpen(true)}
          >
            Register Device
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {devices.map((device) => {
          const stats = deviceStats[device.id];
          const isOnline = mobileService.isDeviceOnline(device.last_seen || '');
          
          return (
            <Grid item xs={12} md={6} lg={4} key={device.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box display="flex" alignItems="center">
                      {getDeviceIcon(device.device_type)}
                      <Box ml={1}>
                        <Typography variant="h6" component="h3">
                          {device.device_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {mobileService.formatDeviceType(device.device_type)}
                        </Typography>
                      </Box>
                    </Box>
                    <Box display="flex" alignItems="center">
                      <Chip
                        icon={isOnline ? <OnlineIcon /> : <OfflineIcon />}
                        label={mobileService.getDeviceStatusText(device)}
                        color={mobileService.getDeviceStatusColor(device) as any}
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedDevice(device);
                          setSettingsDialogOpen(true);
                        }}
                      >
                        <SettingsIcon />
                      </IconButton>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Platform: {device.platform_version || 'Unknown'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      App Version: {device.app_version || 'Unknown'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Last Seen: {device.last_seen ? formatLastSeen(device.last_seen) : 'Never'}
                    </Typography>
                  </Box>

                  {stats && (
                    <Box mb={2}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Storage Usage
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={stats.storage.usage_percentage}
                        sx={{ mb: 1 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {mobileService.formatFileSize(stats.storage.total_size)} / {mobileService.formatFileSize(stats.storage.storage_limit)} 
                        ({stats.storage.usage_percentage.toFixed(1)}%)
                      </Typography>

                      <Box mt={2}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Sync Success Rate: {stats.sync.success_rate.toFixed(1)}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {stats.sync.successful_sessions}/{stats.sync.total_sessions} sessions
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <FormControlLabel
                      control={
                        <Switch
                          checked={device.sync_enabled}
                          onChange={(e) => handleUpdateDevice(device.id, { sync_enabled: e.target.checked })}
                          size="small"
                        />
                      }
                      label="Sync Enabled"
                    />
                    <Tooltip title="Deactivate Device">
                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => handleDeactivateDevice(device.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {devices.length === 0 && !loading && (
        <Box textAlign="center" py={8}>
          <SmartphoneIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Mobile Devices Registered
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Register your first mobile device to start syncing documents
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setRegisterDialogOpen(true)}
          >
            Register Device
          </Button>
        </Box>
      )}

      {/* Device Registration Dialog */}
      <Dialog open={registerDialogOpen} onClose={() => setRegisterDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Register New Device</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Device Name"
              value={registrationData.device_name}
              onChange={(e) => setRegistrationData({ ...registrationData, device_name: e.target.value })}
              margin="normal"
              required
            />
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Device Type</InputLabel>
              <Select
                value={registrationData.device_type}
                onChange={(e) => setRegistrationData({ ...registrationData, device_type: e.target.value })}
                label="Device Type"
              >
                <MenuItem value="ios">iOS</MenuItem>
                <MenuItem value="android">Android</MenuItem>
                <MenuItem value="tablet">Tablet</MenuItem>
                <MenuItem value="desktop">Desktop</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Platform Version"
              value={registrationData.platform_version}
              onChange={(e) => setRegistrationData({ ...registrationData, platform_version: e.target.value })}
              margin="normal"
              placeholder="e.g., iOS 16.5, Android 13"
            />

            <TextField
              fullWidth
              label="App Version"
              value={registrationData.app_version}
              onChange={(e) => setRegistrationData({ ...registrationData, app_version: e.target.value })}
              margin="normal"
            />

            <TextField
              fullWidth
              label="Offline Storage Limit (GB)"
              type="number"
              value={registrationData.offline_storage_limit / (1024 * 1024 * 1024)}
              onChange={(e) => setRegistrationData({ 
                ...registrationData, 
                offline_storage_limit: parseInt(e.target.value) * 1024 * 1024 * 1024 
              })}
              margin="normal"
              inputProps={{ min: 1, max: 10 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={registrationData.sync_enabled}
                  onChange={(e) => setRegistrationData({ ...registrationData, sync_enabled: e.target.checked })}
                />
              }
              label="Enable Sync"
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegisterDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleRegisterDevice} 
            variant="contained"
            disabled={!registrationData.device_name}
          >
            Register
          </Button>
        </DialogActions>
      </Dialog>

      {/* Device Settings Dialog */}
      <Dialog open={settingsDialogOpen} onClose={() => setSettingsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Device Settings - {selectedDevice?.device_name}
        </DialogTitle>
        <DialogContent>
          {selectedDevice && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Device Name"
                    value={selectedDevice.device_name}
                    onChange={(e) => setSelectedDevice({ ...selectedDevice, device_name: e.target.value })}
                    margin="normal"
                  />
                  
                  <TextField
                    fullWidth
                    label="Offline Storage Limit (GB)"
                    type="number"
                    value={selectedDevice.offline_storage_limit / (1024 * 1024 * 1024)}
                    onChange={(e) => setSelectedDevice({ 
                      ...selectedDevice, 
                      offline_storage_limit: parseInt(e.target.value) * 1024 * 1024 * 1024 
                    })}
                    margin="normal"
                    inputProps={{ min: 1, max: 10 }}
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={selectedDevice.sync_enabled}
                        onChange={(e) => setSelectedDevice({ ...selectedDevice, sync_enabled: e.target.checked })}
                      />
                    }
                    label="Enable Sync"
                    sx={{ mt: 2 }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Device Information
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Device ID: {selectedDevice.device_id}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Type: {mobileService.formatDeviceType(selectedDevice.device_type)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Platform: {selectedDevice.platform_version || 'Unknown'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    App Version: {selectedDevice.app_version || 'Unknown'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Registered: {selectedDevice.registration_date ? new Date(selectedDevice.registration_date).toLocaleDateString() : 'Unknown'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Last Updated: {selectedDevice.updated_at ? new Date(selectedDevice.updated_at).toLocaleDateString() : 'Unknown'}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={() => {
              if (selectedDevice) {
                handleUpdateDevice(selectedDevice.id, {
                  device_name: selectedDevice.device_name,
                  sync_enabled: selectedDevice.sync_enabled,
                  offline_storage_limit: selectedDevice.offline_storage_limit
                });
                setSettingsDialogOpen(false);
              }
            }}
            variant="contained"
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MobileDeviceManager;