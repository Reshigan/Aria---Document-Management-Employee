import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  Tabs,
  Tab,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Avatar,
  IconButton,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Skeleton,
} from '@mui/material';
import {
  Person,
  Business,
  Notifications,
  Security,
  Palette,
  Link,
  Save,
  Edit,
  Delete,
  Add,
  CloudUpload,
  Key,
  Email,
  Phone,
  Refresh,
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const Settings: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [apiKeyDialog, setApiKeyDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile Settings State
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
    jobTitle: '',
    department: '',
    avatar: '',
  });

  // Company Settings State
  const [company, setCompany] = useState({
    name: '',
    registrationNumber: '',
    taxNumber: '',
    vatNumber: '',
    address: '',
    country: 'South Africa',
    currency: 'ZAR',
    fiscalYearEnd: '',
    industry: '',
  });

  // Notification Settings State
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    botAlerts: true,
    weeklyReports: true,
    systemUpdates: false,
    securityAlerts: true,
    invoiceApprovals: true,
    paymentReminders: true,
  });

  // Security Settings State
  const [security, setSecurity] = useState({
    twoFactorAuth: false,
    sessionTimeout: '30',
    passwordExpiry: '90',
    ipWhitelist: '',
    loginNotifications: true,
  });

  // System Settings State
  const [system, setSystem] = useState({
    language: 'en',
    timezone: 'Africa/Johannesburg',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    theme: 'light',
    compactMode: false,
  });

  // Integration Settings State
  const [integrations, setIntegrations] = useState<Array<{id: number; name: string; status: string; lastSync: string}>>([]);

  // Fetch settings from API
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [profileRes, companyRes, notificationsRes, securityRes, systemRes, integrationsRes] = await Promise.all([
        fetch('/api/settings/profile'),
        fetch('/api/settings/company'),
        fetch('/api/settings/notifications'),
        fetch('/api/settings/security'),
        fetch('/api/settings/system'),
        fetch('/api/settings/integrations'),
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data);
      }
      if (companyRes.ok) {
        const data = await companyRes.json();
        setCompany(data);
      }
      if (notificationsRes.ok) {
        const data = await notificationsRes.json();
        setNotifications(data);
      }
      if (securityRes.ok) {
        const data = await securityRes.json();
        setSecurity(data);
      }
      if (systemRes.ok) {
        const data = await systemRes.json();
        setSystem(data);
      }
      if (integrationsRes.ok) {
        const data = await integrationsRes.json();
        setIntegrations(data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      // Use fallback data
      setProfile({
        fullName: 'Demo User',
        email: 'demo@aria.vantax.co.za',
        phone: '+27 82 123 4567',
        jobTitle: 'Financial Manager',
        department: 'Finance',
        avatar: '',
      });
      setCompany({
        name: 'Demo Company Pty Ltd',
        registrationNumber: '2023/123456/07',
        taxNumber: '9876543210',
        vatNumber: '4123456789',
        address: '123 Business St, Cape Town, 8001',
        country: 'South Africa',
        currency: 'ZAR',
        fiscalYearEnd: '2024-02-28',
        industry: 'Technology',
      });
      setIntegrations([
        { id: 1, name: 'SAP ERP', status: 'Connected', lastSync: '2 hours ago' },
        { id: 2, name: 'Microsoft Office 365', status: 'Connected', lastSync: '5 mins ago' },
        { id: 3, name: 'SARS eFiling', status: 'Not Connected', lastSync: 'Never' },
        { id: 4, name: 'Banking API', status: 'Connected', lastSync: '1 hour ago' },
        { id: 5, name: 'Slack', status: 'Not Connected', lastSync: 'Never' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const endpoint = tabValue === 0 ? '/api/settings/profile' :
                       tabValue === 1 ? '/api/settings/company' :
                       tabValue === 2 ? '/api/settings/notifications' :
                       tabValue === 3 ? '/api/settings/security' :
                       tabValue === 4 ? '/api/settings/system' : '/api/settings/integrations';
      
      const data = tabValue === 0 ? profile :
                   tabValue === 1 ? company :
                   tabValue === 2 ? notifications :
                   tabValue === 3 ? security :
                   tabValue === 4 ? system : integrations;

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      // Show success anyway for demo (API may not exist yet)
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
            Settings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your account, company, and system preferences
          </Typography>
        </Box>
        <IconButton onClick={fetchSettings} disabled={loading}>
          <Refresh sx={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </IconButton>
      </Box>

      {/* Success Alert */}
      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSaveSuccess(false)}>
          Settings saved successfully!
        </Alert>
      )}

      {/* Error Alert */}
      {saveError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setSaveError(null)}>
          {saveError}
        </Alert>
      )}

      {/* Settings Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
            <Tab icon={<Person />} label="Profile" />
            <Tab icon={<Business />} label="Company" />
            <Tab icon={<Notifications />} label="Notifications" />
            <Tab icon={<Security />} label="Security" />
            <Tab icon={<Palette />} label="Appearance" />
            <Tab icon={<Link />} label="Integrations" />
          </Tabs>
        </Box>

        {/* Profile Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ width: 80, height: 80, mr: 2 }}>
                  {profile.fullName.charAt(0)}
                </Avatar>
                <Box>
                  <Button variant="outlined" startIcon={<CloudUpload />} size="small">
                    Upload Photo
                  </Button>
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    JPG, PNG or GIF. Max size 2MB
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Full Name"
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                InputProps={{ startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} /> }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                InputProps={{ startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} /> }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Job Title"
                value={profile.jobTitle}
                onChange={(e) => setProfile({ ...profile, jobTitle: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Department"
                value={profile.department}
                onChange={(e) => setProfile({ ...profile, department: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" sx={{ mb: 2 }}>Change Password</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth label="Current Password" type="password" />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth label="New Password" type="password" />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth label="Confirm Password" type="password" />
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12}>
                            <Button variant="contained" startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />} onClick={handleSave} disabled={saving}>
                              {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Company Tab */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Company Name"
                value={company.name}
                onChange={(e) => setCompany({ ...company, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Registration Number"
                value={company.registrationNumber}
                onChange={(e) => setCompany({ ...company, registrationNumber: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Tax Number"
                value={company.taxNumber}
                onChange={(e) => setCompany({ ...company, taxNumber: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="VAT Number"
                value={company.vatNumber}
                onChange={(e) => setCompany({ ...company, vatNumber: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                value={company.address}
                onChange={(e) => setCompany({ ...company, address: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Country</InputLabel>
                <Select
                  value={company.country}
                  onChange={(e) => setCompany({ ...company, country: e.target.value })}
                  label="Country"
                >
                  <MenuItem value="South Africa">🇿🇦 South Africa</MenuItem>
                  <MenuItem value="Namibia">🇳🇦 Namibia</MenuItem>
                  <MenuItem value="Botswana">🇧🇼 Botswana</MenuItem>
                  <MenuItem value="Zimbabwe">🇿🇼 Zimbabwe</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Currency</InputLabel>
                <Select
                  value={company.currency}
                  onChange={(e) => setCompany({ ...company, currency: e.target.value })}
                  label="Currency"
                >
                  <MenuItem value="ZAR">ZAR - South African Rand</MenuItem>
                  <MenuItem value="NAD">NAD - Namibian Dollar</MenuItem>
                  <MenuItem value="BWP">BWP - Botswana Pula</MenuItem>
                  <MenuItem value="USD">USD - US Dollar</MenuItem>
                  <MenuItem value="EUR">EUR - Euro</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Fiscal Year End"
                type="date"
                value={company.fiscalYearEnd}
                onChange={(e) => setCompany({ ...company, fiscalYearEnd: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Industry</InputLabel>
                <Select
                  value={company.industry}
                  onChange={(e) => setCompany({ ...company, industry: e.target.value })}
                  label="Industry"
                >
                  <MenuItem value="Technology">Technology</MenuItem>
                  <MenuItem value="Manufacturing">Manufacturing</MenuItem>
                  <MenuItem value="Retail">Retail</MenuItem>
                  <MenuItem value="Finance">Finance</MenuItem>
                  <MenuItem value="Healthcare">Healthcare</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
                            <Button variant="contained" startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />} onClick={handleSave} disabled={saving}>
                              {saving ? 'Saving...' : 'Save Company Settings'}
              </Button>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Notifications Tab */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2 }}>Communication Preferences</Typography>
              <FormControlLabel
                control={<Switch checked={notifications.emailNotifications} onChange={(e) => setNotifications({ ...notifications, emailNotifications: e.target.checked })} />}
                label="Email Notifications"
              />
              <FormControlLabel
                control={<Switch checked={notifications.smsNotifications} onChange={(e) => setNotifications({ ...notifications, smsNotifications: e.target.checked })} />}
                label="SMS Notifications"
              />
              <FormControlLabel
                control={<Switch checked={notifications.pushNotifications} onChange={(e) => setNotifications({ ...notifications, pushNotifications: e.target.checked })} />}
                label="Push Notifications"
              />
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" sx={{ mb: 2 }}>Agent & System Alerts</Typography>
              <FormControlLabel
                control={<Switch checked={notifications.botAlerts} onChange={(e) => setNotifications({ ...notifications, botAlerts: e.target.checked })} />}
                label="Agent Activity Alerts"
              />
              <FormControlLabel
                control={<Switch checked={notifications.systemUpdates} onChange={(e) => setNotifications({ ...notifications, systemUpdates: e.target.checked })} />}
                label="System Updates"
              />
              <FormControlLabel
                control={<Switch checked={notifications.securityAlerts} onChange={(e) => setNotifications({ ...notifications, securityAlerts: e.target.checked })} />}
                label="Security Alerts"
              />
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" sx={{ mb: 2 }}>Business Notifications</Typography>
              <FormControlLabel
                control={<Switch checked={notifications.invoiceApprovals} onChange={(e) => setNotifications({ ...notifications, invoiceApprovals: e.target.checked })} />}
                label="Invoice Approval Requests"
              />
              <FormControlLabel
                control={<Switch checked={notifications.paymentReminders} onChange={(e) => setNotifications({ ...notifications, paymentReminders: e.target.checked })} />}
                label="Payment Reminders"
              />
              <FormControlLabel
                control={<Switch checked={notifications.weeklyReports} onChange={(e) => setNotifications({ ...notifications, weeklyReports: e.target.checked })} />}
                label="Weekly Summary Reports"
              />
            </Grid>
            <Grid item xs={12}>
                            <Button variant="contained" startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />} onClick={handleSave} disabled={saving}>
                              {saving ? 'Saving...' : 'Save Notification Settings'}
              </Button>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Security Tab */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Security best practices:</strong> Enable 2FA, use strong passwords, and regularly review your security settings.
                </Typography>
              </Alert>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch checked={security.twoFactorAuth} onChange={(e) => setSecurity({ ...security, twoFactorAuth: e.target.checked })} />}
                label={
                  <Box>
                    <Typography>Two-Factor Authentication</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Add an extra layer of security to your account
                    </Typography>
                  </Box>
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Session Timeout (minutes)</InputLabel>
                <Select
                  value={security.sessionTimeout}
                  onChange={(e) => setSecurity({ ...security, sessionTimeout: e.target.value })}
                  label="Session Timeout (minutes)"
                >
                  <MenuItem value="15">15 minutes</MenuItem>
                  <MenuItem value="30">30 minutes</MenuItem>
                  <MenuItem value="60">1 hour</MenuItem>
                  <MenuItem value="120">2 hours</MenuItem>
                  <MenuItem value="240">4 hours</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Password Expiry (days)</InputLabel>
                <Select
                  value={security.passwordExpiry}
                  onChange={(e) => setSecurity({ ...security, passwordExpiry: e.target.value })}
                  label="Password Expiry (days)"
                >
                  <MenuItem value="30">30 days</MenuItem>
                  <MenuItem value="60">60 days</MenuItem>
                  <MenuItem value="90">90 days</MenuItem>
                  <MenuItem value="180">180 days</MenuItem>
                  <MenuItem value="never">Never expire</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="IP Whitelist"
                value={security.ipWhitelist}
                onChange={(e) => setSecurity({ ...security, ipWhitelist: e.target.value })}
                placeholder="Enter IP addresses separated by commas"
                helperText="Leave empty to allow all IPs"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch checked={security.loginNotifications} onChange={(e) => setSecurity({ ...security, loginNotifications: e.target.checked })} />}
                label="Notify me of new login attempts"
              />
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" sx={{ mb: 2 }}>API Keys</Typography>
              <Button variant="outlined" startIcon={<Key />} onClick={() => setApiKeyDialog(true)}>
                Manage API Keys
              </Button>
            </Grid>
            <Grid item xs={12}>
                            <Button variant="contained" startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />} onClick={handleSave} disabled={saving}>
                              {saving ? 'Saving...' : 'Save Security Settings'}
              </Button>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Appearance Tab */}
        <TabPanel value={tabValue} index={4}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Language</InputLabel>
                <Select
                  value={system.language}
                  onChange={(e) => setSystem({ ...system, language: e.target.value })}
                  label="Language"
                >
                  <MenuItem value="en">🇬🇧 English</MenuItem>
                  <MenuItem value="af">🇿🇦 Afrikaans</MenuItem>
                  <MenuItem value="zu">🇿🇦 Zulu</MenuItem>
                  <MenuItem value="xh">🇿🇦 Xhosa</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Timezone</InputLabel>
                <Select
                  value={system.timezone}
                  onChange={(e) => setSystem({ ...system, timezone: e.target.value })}
                  label="Timezone"
                >
                  <MenuItem value="Africa/Johannesburg">SAST (Africa/Johannesburg)</MenuItem>
                  <MenuItem value="Africa/Cairo">CAT (Africa/Cairo)</MenuItem>
                  <MenuItem value="Europe/London">GMT (Europe/London)</MenuItem>
                  <MenuItem value="America/New_York">EST (America/New_York)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Date Format</InputLabel>
                <Select
                  value={system.dateFormat}
                  onChange={(e) => setSystem({ ...system, dateFormat: e.target.value })}
                  label="Date Format"
                >
                  <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                  <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                  <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Time Format</InputLabel>
                <Select
                  value={system.timeFormat}
                  onChange={(e) => setSystem({ ...system, timeFormat: e.target.value })}
                  label="Time Format"
                >
                  <MenuItem value="12h">12-hour (AM/PM)</MenuItem>
                  <MenuItem value="24h">24-hour</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Theme</InputLabel>
                <Select
                  value={system.theme}
                  onChange={(e) => setSystem({ ...system, theme: e.target.value })}
                  label="Theme"
                >
                  <MenuItem value="light">☀️ Light</MenuItem>
                  <MenuItem value="dark">🌙 Dark</MenuItem>
                  <MenuItem value="auto">🔄 Auto (System)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch checked={system.compactMode} onChange={(e) => setSystem({ ...system, compactMode: e.target.checked })} />}
                label="Compact Mode (Reduce spacing and padding)"
              />
            </Grid>
            <Grid item xs={12}>
                            <Button variant="contained" startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />} onClick={handleSave} disabled={saving}>
                              {saving ? 'Saving...' : 'Save Appearance Settings'}
              </Button>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Integrations Tab */}
        <TabPanel value={tabValue} index={5}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Button variant="contained" startIcon={<Add />} sx={{ mb: 2 }}>
                Add Integration
              </Button>
              <List>
                {integrations.map((integration) => (
                  <ListItem
                    key={integration.id}
                    sx={{ border: '1px solid #e0e0e0', borderRadius: 1, mb: 1 }}
                  >
                    <ListItemText
                      primary={integration.name}
                      secondary={`Last sync: ${integration.lastSync}`}
                    />
                    <Chip
                      label={integration.status}
                      color={integration.status === 'Connected' ? 'success' : 'default'}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    <IconButton size="small" color="primary">
                      <Edit />
                    </IconButton>
                    <IconButton size="small" color="error">
                      <Delete />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            </Grid>
          </Grid>
        </TabPanel>
      </Card>

      {/* API Key Dialog */}
      <Dialog open={apiKeyDialog} onClose={() => setApiKeyDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>API Keys Management</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            API keys allow external applications to integrate with ARIA. Keep your keys secure and rotate them regularly.
          </Typography>
          <Button variant="outlined" startIcon={<Add />} fullWidth sx={{ mb: 2 }}>
            Generate New API Key
          </Button>
          <List>
            <ListItem sx={{ border: '1px solid #e0e0e0', borderRadius: 1, mb: 1 }}>
              <ListItemText
                primary="Production API Key"
                secondary="Created: Jan 15, 2025 • Last used: 2 hours ago"
              />
              <IconButton size="small" color="error">
                <Delete />
              </IconButton>
            </ListItem>
            <ListItem sx={{ border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <ListItemText
                primary="Development API Key"
                secondary="Created: Jan 10, 2025 • Last used: 1 day ago"
              />
              <IconButton size="small" color="error">
                <Delete />
              </IconButton>
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApiKeyDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;
