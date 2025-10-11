import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  LinearProgress,
  Fab,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  Assignment,
  CheckCircle,
  Refresh,
  Gavel,
  ExpandMore,
  Warning,
  Error as ErrorIcon,
  Info,
  Timeline,
  Person,
  Schedule,
  Flag
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { complianceService, ComplianceViolation, ComplianceFramework } from '../../services/complianceService';

interface ViolationFormData {
  title: string;
  description: string;
  severity: string;
  status: string;
  framework_id: number;
  policy_id?: number;
  assigned_to?: string;
  remediation_plan?: string;
  evidence?: string;
}

export const ViolationTracker: React.FC = () => {
  const [violations, setViolations] = useState<ComplianceViolation[]>([]);
  const [frameworks, setFrameworks] = useState<ComplianceFramework[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedViolation, setSelectedViolation] = useState<ComplianceViolation | null>(null);
  const [formDialog, setFormDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [resolveDialog, setResolveDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [formData, setFormData] = useState<ViolationFormData>({
    title: '',
    description: '',
    severity: 'medium',
    status: 'open',
    framework_id: 0
  });
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  const severities = ['low', 'medium', 'high', 'critical'];
  const statuses = ['open', 'in_progress', 'resolved', 'closed'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [violationsData, frameworksData] = await Promise.all([
        complianceService.getViolations(),
        complianceService.getFrameworks()
      ]);
      setViolations(violationsData);
      setFrameworks(frameworksData);
    } catch (err) {
      setError('Failed to load violations');
      console.error('Error loading violations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (field: keyof ViolationFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      if (isEditing && selectedViolation) {
        await complianceService.updateViolation(selectedViolation.id, formData);
      } else {
        await complianceService.createViolation(formData);
      }
      setFormDialog(false);
      resetForm();
      loadData();
    } catch (err) {
      setError('Failed to save violation');
    }
  };

  const handleEdit = (violation: ComplianceViolation) => {
    setSelectedViolation(violation);
    setFormData({
      title: violation.title,
      description: violation.description,
      severity: violation.severity,
      status: violation.status,
      framework_id: violation.framework_id,
      policy_id: violation.policy_id,
      assigned_to: violation.assigned_to,
      remediation_plan: violation.remediation_plan,
      evidence: violation.evidence
    });
    setIsEditing(true);
    setFormDialog(true);
  };

  const handleResolve = async () => {
    if (selectedViolation) {
      try {
        await complianceService.resolveViolation(selectedViolation.id, resolutionNotes);
        setResolveDialog(false);
        setResolutionNotes('');
        setSelectedViolation(null);
        loadData();
      } catch (err) {
        setError('Failed to resolve violation');
      }
    }
  };

  const handleDelete = async () => {
    if (selectedViolation) {
      try {
        await complianceService.deleteViolation(selectedViolation.id);
        setDeleteDialog(false);
        setSelectedViolation(null);
        loadData();
      } catch (err) {
        setError('Failed to delete violation');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      severity: 'medium',
      status: 'open',
      framework_id: 0
    });
    setIsEditing(false);
    setSelectedViolation(null);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return <ErrorIcon />;
      case 'high': return <Warning />;
      case 'medium': return <Info />;
      case 'low': return <Flag />;
      default: return <Info />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'resolved': return 'success';
      case 'closed': return 'success';
      case 'in_progress': return 'warning';
      case 'open': return 'error';
      default: return 'default';
    }
  };

  const getFrameworkName = (frameworkId: number) => {
    const framework = frameworks.find(f => f.id === frameworkId);
    return framework ? framework.name : 'Unknown';
  };

  const getDaysOpen = (detectedAt: string) => {
    const detected = new Date(detectedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - detected.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const filteredViolations = violations.filter(violation => {
    if (filterStatus !== 'all' && violation.status !== filterStatus) return false;
    if (filterSeverity !== 'all' && violation.severity !== filterSeverity) return false;
    return true;
  });

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading violations...</Typography>
      </Box>
    );
  }

  const openViolations = violations.filter(v => v.status === 'open').length;
  const criticalViolations = violations.filter(v => v.severity === 'critical' && v.status !== 'resolved').length;
  const inProgressViolations = violations.filter(v => v.status === 'in_progress').length;
  const resolvedViolations = violations.filter(v => v.status === 'resolved').length;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Gavel color="primary" />
            Violation Tracker
          </Typography>
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={loadData}
            disabled={loading}
          >
            Refresh
          </Button>
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <ErrorIcon color="error" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" color="error.main">
                      {openViolations}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Open Violations
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Warning color="error" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" color="error.main">
                      {criticalViolations}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Critical Issues
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Schedule color="warning" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" color="warning.main">
                      {inProgressViolations}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      In Progress
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CheckCircle color="success" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" color="success.main">
                      {resolvedViolations}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Resolved
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Status Filter</InputLabel>
                  <Select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <MenuItem value="all">All Statuses</MenuItem>
                    {statuses.map(status => (
                      <MenuItem key={status} value={status}>
                        {status.replace('_', ' ')}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Severity Filter</InputLabel>
                  <Select
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                  >
                    <MenuItem value="all">All Severities</MenuItem>
                    {severities.map(severity => (
                      <MenuItem key={severity} value={severity}>
                        {severity}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body2" color="text.secondary">
                  Showing {filteredViolations.length} of {violations.length} violations
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Violations Table */}
        <Card>
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Framework</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Assigned To</TableCell>
                    <TableCell>Days Open</TableCell>
                    <TableCell>Detected</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredViolations.map((violation) => (
                    <TableRow key={violation.id} hover>
                      <TableCell>
                        <Typography variant="subtitle2">{violation.title}</Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {violation.description.substring(0, 100)}...
                        </Typography>
                      </TableCell>
                      <TableCell>{violation.framework_name}</TableCell>
                      <TableCell>
                        <Chip
                          icon={getSeverityIcon(violation.severity)}
                          label={violation.severity}
                          color={getSeverityColor(violation.severity)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={violation.status.replace('_', ' ')}
                          color={getStatusColor(violation.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {violation.assigned_to ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 24, height: 24 }}>
                              {violation.assigned_to.charAt(0).toUpperCase()}
                            </Avatar>
                            <Typography variant="body2">{violation.assigned_to}</Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Unassigned
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          color={getDaysOpen(violation.detected_at) > 30 ? 'error' : 'text.primary'}
                        >
                          {getDaysOpen(violation.detected_at)} days
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(violation.detected_at).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedViolation(violation);
                              setViewDialog(true);
                            }}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleEdit(violation)}>
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        {violation.status !== 'resolved' && (
                          <Tooltip title="Resolve">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedViolation(violation);
                                setResolveDialog(true);
                              }}
                            >
                              <CheckCircle />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedViolation(violation);
                              setDeleteDialog(true);
                            }}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Add Violation FAB */}
        <Fab
          color="primary"
          aria-label="add violation"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => {
            resetForm();
            setFormDialog(true);
          }}
        >
          <Add />
        </Fab>

        {/* Form Dialog */}
        <Dialog open={formDialog} onClose={() => setFormDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>{isEditing ? 'Edit Violation' : 'Report New Violation'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Title"
                  value={formData.title}
                  onChange={(e) => handleFormChange('title', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  multiline
                  rows={3}
                  label="Description"
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Framework</InputLabel>
                  <Select
                    value={formData.framework_id}
                    onChange={(e) => handleFormChange('framework_id', e.target.value)}
                  >
                    {frameworks.map(framework => (
                      <MenuItem key={framework.id} value={framework.id}>
                        {framework.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Severity</InputLabel>
                  <Select
                    value={formData.severity}
                    onChange={(e) => handleFormChange('severity', e.target.value)}
                  >
                    {severities.map(severity => (
                      <MenuItem key={severity} value={severity}>
                        {severity}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => handleFormChange('status', e.target.value)}
                  >
                    {statuses.map(status => (
                      <MenuItem key={status} value={status}>
                        {status.replace('_', ' ')}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Assigned To"
                  value={formData.assigned_to || ''}
                  onChange={(e) => handleFormChange('assigned_to', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Remediation Plan"
                  value={formData.remediation_plan || ''}
                  onChange={(e) => handleFormChange('remediation_plan', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Evidence"
                  value={formData.evidence || ''}
                  onChange={(e) => handleFormChange('evidence', e.target.value)}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFormDialog(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSubmit}>
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Violation Details</DialogTitle>
          <DialogContent>
            {selectedViolation && (
              <Box>
                <Typography variant="h6" gutterBottom>{selectedViolation.title}</Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {selectedViolation.description}
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography><strong>Framework:</strong> {selectedViolation.framework_name}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography><strong>Severity:</strong> {selectedViolation.severity}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography><strong>Status:</strong> {selectedViolation.status.replace('_', ' ')}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography><strong>Assigned To:</strong> {selectedViolation.assigned_to || 'Unassigned'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography><strong>Detected:</strong> {new Date(selectedViolation.detected_at).toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography><strong>Resolved:</strong> {selectedViolation.resolved_at ? new Date(selectedViolation.resolved_at).toLocaleString() : 'Not resolved'}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography><strong>Days Open:</strong> {getDaysOpen(selectedViolation.detected_at)} days</Typography>
                  </Grid>
                </Grid>

                {selectedViolation.remediation_plan && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>Remediation Plan</Typography>
                    <Typography variant="body2" paragraph>
                      {selectedViolation.remediation_plan}
                    </Typography>
                  </Box>
                )}

                {selectedViolation.evidence && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>Evidence</Typography>
                    <Typography variant="body2" paragraph>
                      {selectedViolation.evidence}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Resolve Dialog */}
        <Dialog open={resolveDialog} onClose={() => setResolveDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Resolve Violation</DialogTitle>
          <DialogContent>
            <Typography variant="body1" gutterBottom>
              Mark violation "{selectedViolation?.title}" as resolved?
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Resolution Notes"
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              sx={{ mt: 2 }}
              placeholder="Describe how this violation was resolved..."
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setResolveDialog(false)}>Cancel</Button>
            <Button color="success" variant="contained" onClick={handleResolve}>
              Resolve
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
          <DialogTitle>Delete Violation</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete the violation "{selectedViolation?.title}"?
              This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
            <Button color="error" variant="contained" onClick={handleDelete}>
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default ViolationTracker;