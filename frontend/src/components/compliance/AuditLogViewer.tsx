import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  LinearProgress,
  Pagination,
  Tooltip
} from '@mui/material';
import {
  ExpandMore,
  Visibility,
  FilterList,
  Download,
  Refresh,
  Search,
  Security,
  Warning,
  Info,
  Error as ErrorIcon,
  CheckCircle
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { complianceService, AuditLog } from '../../services/complianceService';

interface AuditLogFilters {
  event_type?: string;
  user_id?: number;
  start_date?: string;
  end_date?: string;
  risk_level?: string;
  compliance_relevant?: boolean;
  search?: string;
}

export const AuditLogViewer: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [filterDialog, setFilterDialog] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [filters, setFilters] = useState<AuditLogFilters>({});

  const eventTypes = [
    'user_login', 'user_logout', 'document_access', 'document_upload',
    'document_download', 'document_delete', 'document_share',
    'permission_change', 'system_config', 'data_export',
    'backup_created', 'backup_restored', 'security_incident',
    'compliance_violation'
  ];

  const riskLevels = ['low', 'medium', 'high', 'critical'];

  useEffect(() => {
    loadAuditLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [auditLogs, filters]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const logs = await complianceService.getAuditLogs();
      setAuditLogs(logs);
    } catch (err) {
      setError('Failed to load audit logs');
      console.error('Error loading audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...auditLogs];

    if (filters.event_type) {
      filtered = filtered.filter(log => log.event_type === filters.event_type);
    }

    if (filters.user_id) {
      filtered = filtered.filter(log => log.user_id === filters.user_id);
    }

    if (filters.risk_level) {
      filtered = filtered.filter(log => log.risk_level === filters.risk_level);
    }

    if (filters.compliance_relevant !== undefined) {
      filtered = filtered.filter(log => log.compliance_relevant === filters.compliance_relevant);
    }

    if (filters.start_date) {
      filtered = filtered.filter(log => 
        new Date(log.timestamp) >= new Date(filters.start_date!)
      );
    }

    if (filters.end_date) {
      filtered = filtered.filter(log => 
        new Date(log.timestamp) <= new Date(filters.end_date!)
      );
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(log =>
        log.event_description.toLowerCase().includes(searchLower) ||
        log.username?.toLowerCase().includes(searchLower) ||
        log.resource_name?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by timestamp descending
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setFilteredLogs(filtered);
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getRiskLevelIcon = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'critical': return <ErrorIcon />;
      case 'high': return <Warning />;
      case 'medium': return <Info />;
      case 'low': return <CheckCircle />;
      default: return <Security />;
    }
  };

  const getEventTypeColor = (eventType: string) => {
    if (eventType.includes('login') || eventType.includes('logout')) return 'info';
    if (eventType.includes('delete') || eventType.includes('violation')) return 'error';
    if (eventType.includes('upload') || eventType.includes('create')) return 'success';
    if (eventType.includes('config') || eventType.includes('permission')) return 'warning';
    return 'default';
  };

  const handleFilterChange = (field: keyof AuditLogFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const exportLogs = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const paginatedLogs = filteredLogs.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredLogs.length / pageSize);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading audit logs...</Typography>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Security color="primary" />
            Audit Log Viewer
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => setFilterDialog(true)}
            >
              Filters
            </Button>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={exportLogs}
            >
              Export
            </Button>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={loadAuditLogs}
              disabled={loading}
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

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="primary">
                  {filteredLogs.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Events
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="error">
                  {filteredLogs.filter(log => log.risk_level === 'critical').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Critical Events
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="success.main">
                  {filteredLogs.filter(log => log.compliance_relevant).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Compliance Relevant
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="info.main">
                  {new Set(filteredLogs.map(log => log.username).filter(Boolean)).size}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Unique Users
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Search Bar */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search audit logs..."
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
        </Box>

        {/* Audit Logs Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>Event Type</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Risk Level</TableCell>
                <TableCell>Compliance</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedLogs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(log.timestamp).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={log.event_type.replace('_', ' ')}
                      color={getEventTypeColor(log.event_type)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {log.username || 'System'}
                    </Typography>
                    {log.ip_address && (
                      <Typography variant="caption" color="text.secondary">
                        {log.ip_address}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {log.event_description}
                    </Typography>
                    {log.resource_name && (
                      <Typography variant="caption" color="text.secondary">
                        Resource: {log.resource_name}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getRiskLevelIcon(log.risk_level)}
                      label={log.risk_level}
                      color={getRiskLevelColor(log.risk_level)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {log.compliance_relevant ? (
                      <Chip label="Yes" color="success" size="small" />
                    ) : (
                      <Chip label="No" color="default" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedLog(log);
                          setDetailDialog(true);
                        }}
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, newPage) => setPage(newPage)}
            color="primary"
          />
        </Box>

        {/* Filter Dialog */}
        <Dialog open={filterDialog} onClose={() => setFilterDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Filter Audit Logs</DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Event Type</InputLabel>
                  <Select
                    value={filters.event_type || ''}
                    onChange={(e) => handleFilterChange('event_type', e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    {eventTypes.map(type => (
                      <MenuItem key={type} value={type}>
                        {type.replace('_', ' ')}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Risk Level</InputLabel>
                  <Select
                    value={filters.risk_level || ''}
                    onChange={(e) => handleFilterChange('risk_level', e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    {riskLevels.map(level => (
                      <MenuItem key={level} value={level}>
                        {level}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Start Date"
                  value={filters.start_date ? new Date(filters.start_date) : null}
                  onChange={(date) => handleFilterChange('start_date', date?.toISOString())}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="End Date"
                  value={filters.end_date ? new Date(filters.end_date) : null}
                  onChange={(date) => handleFilterChange('end_date', date?.toISOString())}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Compliance Relevant</InputLabel>
                  <Select
                    value={filters.compliance_relevant === undefined ? '' : filters.compliance_relevant.toString()}
                    onChange={(e) => handleFilterChange('compliance_relevant', 
                      e.target.value === '' ? undefined : e.target.value === 'true'
                    )}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="true">Yes</MenuItem>
                    <MenuItem value="false">No</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={clearFilters}>Clear All</Button>
            <Button onClick={() => setFilterDialog(false)}>Cancel</Button>
            <Button variant="contained" onClick={() => setFilterDialog(false)}>
              Apply Filters
            </Button>
          </DialogActions>
        </Dialog>

        {/* Detail Dialog */}
        <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="lg" fullWidth>
          <DialogTitle>Audit Log Details</DialogTitle>
          <DialogContent>
            {selectedLog && (
              <Box>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>Basic Information</Typography>
                    <Typography><strong>Event Type:</strong> {selectedLog.event_type}</Typography>
                    <Typography><strong>Category:</strong> {selectedLog.event_category}</Typography>
                    <Typography><strong>Description:</strong> {selectedLog.event_description}</Typography>
                    <Typography><strong>Timestamp:</strong> {new Date(selectedLog.timestamp).toLocaleString()}</Typography>
                    <Typography><strong>Risk Level:</strong> {selectedLog.risk_level}</Typography>
                    <Typography><strong>Compliance Relevant:</strong> {selectedLog.compliance_relevant ? 'Yes' : 'No'}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>User Information</Typography>
                    <Typography><strong>User:</strong> {selectedLog.username || 'N/A'}</Typography>
                    <Typography><strong>User ID:</strong> {selectedLog.user_id || 'N/A'}</Typography>
                    <Typography><strong>Session ID:</strong> {selectedLog.session_id || 'N/A'}</Typography>
                    <Typography><strong>IP Address:</strong> {selectedLog.ip_address || 'N/A'}</Typography>
                    <Typography><strong>Location:</strong> {selectedLog.city && selectedLog.region && selectedLog.country 
                      ? `${selectedLog.city}, ${selectedLog.region}, ${selectedLog.country}` 
                      : 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>Request Information</Typography>
                    <Typography><strong>Method:</strong> {selectedLog.request_method || 'N/A'}</Typography>
                    <Typography><strong>URL:</strong> {selectedLog.request_url || 'N/A'}</Typography>
                    <Typography><strong>Response Status:</strong> {selectedLog.response_status || 'N/A'}</Typography>
                    <Typography><strong>Response Time:</strong> {selectedLog.response_time_ms ? `${selectedLog.response_time_ms}ms` : 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>Resource Information</Typography>
                    <Typography><strong>Resource Type:</strong> {selectedLog.resource_type || 'N/A'}</Typography>
                    <Typography><strong>Resource ID:</strong> {selectedLog.resource_id || 'N/A'}</Typography>
                    <Typography><strong>Resource Name:</strong> {selectedLog.resource_name || 'N/A'}</Typography>
                  </Grid>
                </Grid>

                {(selectedLog.old_values || selectedLog.new_values) && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>Data Changes</Typography>
                    {selectedLog.old_values && (
                      <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                          <Typography>Old Values</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
                            {JSON.stringify(JSON.parse(selectedLog.old_values), null, 2)}
                          </pre>
                        </AccordionDetails>
                      </Accordion>
                    )}
                    {selectedLog.new_values && (
                      <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                          <Typography>New Values</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
                            {JSON.stringify(JSON.parse(selectedLog.new_values), null, 2)}
                          </pre>
                        </AccordionDetails>
                      </Accordion>
                    )}
                  </Box>
                )}

                {(selectedLog.request_headers || selectedLog.request_body) && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>Request Details</Typography>
                    {selectedLog.request_headers && (
                      <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                          <Typography>Request Headers</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
                            {JSON.stringify(JSON.parse(selectedLog.request_headers), null, 2)}
                          </pre>
                        </AccordionDetails>
                      </Accordion>
                    )}
                    {selectedLog.request_body && (
                      <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                          <Typography>Request Body</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
                            {JSON.stringify(JSON.parse(selectedLog.request_body), null, 2)}
                          </pre>
                        </AccordionDetails>
                      </Accordion>
                    )}
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default AuditLogViewer;