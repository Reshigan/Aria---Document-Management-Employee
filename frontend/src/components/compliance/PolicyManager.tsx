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
  Divider
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  Download,
  Upload,
  Refresh,
  Policy,
  ExpandMore,
  CheckCircle,
  Warning,
  Schedule,
  Assignment
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { complianceService, CompliancePolicy, ComplianceFramework } from '../../services/complianceService';

interface PolicyFormData {
  framework_id: number;
  title: string;
  description: string;
  policy_type: string;
  implementation_status: string;
  priority: string;
  owner: string;
  review_date: string;
  approval_date?: string;
  version: string;
  policy_document_url?: string;
}

export const PolicyManager: React.FC = () => {
  const [policies, setPolicies] = useState<CompliancePolicy[]>([]);
  const [frameworks, setFrameworks] = useState<ComplianceFramework[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<CompliancePolicy | null>(null);
  const [formDialog, setFormDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [formData, setFormData] = useState<PolicyFormData>({
    framework_id: 0,
    title: '',
    description: '',
    policy_type: 'security',
    implementation_status: 'draft',
    priority: 'medium',
    owner: '',
    review_date: '',
    version: '1.0'
  });
  const [isEditing, setIsEditing] = useState(false);

  const policyTypes = [
    'security', 'privacy', 'data_retention', 'access_control',
    'incident_response', 'business_continuity', 'compliance',
    'training', 'vendor_management', 'risk_management'
  ];

  const implementationStatuses = [
    'draft', 'under_review', 'approved', 'implemented',
    'needs_update', 'deprecated'
  ];

  const priorities = ['low', 'medium', 'high', 'critical'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [policiesData, frameworksData] = await Promise.all([
        complianceService.getPolicies(),
        complianceService.getFrameworks()
      ]);
      setPolicies(policiesData);
      setFrameworks(frameworksData);
    } catch (err) {
      setError('Failed to load policies');
      console.error('Error loading policies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (field: keyof PolicyFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      if (isEditing && selectedPolicy) {
        await complianceService.updatePolicy(selectedPolicy.id, formData);
      } else {
        await complianceService.createPolicy(formData);
      }
      setFormDialog(false);
      resetForm();
      loadData();
    } catch (err) {
      setError('Failed to save policy');
    }
  };

  const handleEdit = (policy: CompliancePolicy) => {
    setSelectedPolicy(policy);
    setFormData({
      framework_id: policy.framework_id,
      title: policy.title,
      description: policy.description,
      policy_type: policy.policy_type,
      implementation_status: policy.implementation_status,
      priority: policy.priority,
      owner: policy.owner,
      review_date: policy.review_date,
      approval_date: policy.approval_date,
      version: policy.version,
      policy_document_url: policy.policy_document_url
    });
    setIsEditing(true);
    setFormDialog(true);
  };

  const handleDelete = async () => {
    if (selectedPolicy) {
      try {
        await complianceService.deletePolicy(selectedPolicy.id);
        setDeleteDialog(false);
        setSelectedPolicy(null);
        loadData();
      } catch (err) {
        setError('Failed to delete policy');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      framework_id: 0,
      title: '',
      description: '',
      policy_type: 'security',
      implementation_status: 'draft',
      priority: 'medium',
      owner: '',
      review_date: '',
      version: '1.0'
    });
    setIsEditing(false);
    setSelectedPolicy(null);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'implemented': return 'success';
      case 'approved': return 'info';
      case 'under_review': return 'warning';
      case 'draft': return 'default';
      case 'needs_update': return 'warning';
      case 'deprecated': return 'error';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getFrameworkName = (frameworkId: number) => {
    const framework = frameworks.find(f => f.id === frameworkId);
    return framework ? framework.name : 'Unknown';
  };

  const isReviewDue = (reviewDate: string) => {
    return new Date(reviewDate) <= new Date();
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading policies...</Typography>
      </Box>
    );
  }

  const implementedPolicies = policies.filter(p => p.implementation_status === 'implemented').length;
  const reviewDuePolicies = policies.filter(p => isReviewDue(p.review_date)).length;
  const draftPolicies = policies.filter(p => p.implementation_status === 'draft').length;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Policy color="primary" />
            Policy Manager
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
                  <Assignment color="primary" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4">{policies.length}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Policies
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
                      {implementedPolicies}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Implemented
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
                      {reviewDuePolicies}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Review Due
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
                  <Edit color="info" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" color="info.main">
                      {draftPolicies}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Draft
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Policies Table */}
        <Card>
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Framework</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Owner</TableCell>
                    <TableCell>Review Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {policies.map((policy) => (
                    <TableRow key={policy.id} hover>
                      <TableCell>
                        <Typography variant="subtitle2">{policy.title}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          v{policy.version}
                        </Typography>
                      </TableCell>
                      <TableCell>{getFrameworkName(policy.framework_id)}</TableCell>
                      <TableCell>
                        <Chip
                          label={policy.policy_type.replace('_', ' ')}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={policy.implementation_status.replace('_', ' ')}
                          color={getStatusColor(policy.implementation_status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={policy.priority}
                          color={getPriorityColor(policy.priority)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{policy.owner}</TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          color={isReviewDue(policy.review_date) ? 'error' : 'text.primary'}
                        >
                          {new Date(policy.review_date).toLocaleDateString()}
                        </Typography>
                        {isReviewDue(policy.review_date) && (
                          <Chip label="Due" color="error" size="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedPolicy(policy);
                              setViewDialog(true);
                            }}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleEdit(policy)}>
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedPolicy(policy);
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

        {/* Add Policy FAB */}
        <Fab
          color="primary"
          aria-label="add policy"
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
          <DialogTitle>{isEditing ? 'Edit Policy' : 'Create New Policy'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
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
                  <InputLabel>Policy Type</InputLabel>
                  <Select
                    value={formData.policy_type}
                    onChange={(e) => handleFormChange('policy_type', e.target.value)}
                  >
                    {policyTypes.map(type => (
                      <MenuItem key={type} value={type}>
                        {type.replace('_', ' ')}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Implementation Status</InputLabel>
                  <Select
                    value={formData.implementation_status}
                    onChange={(e) => handleFormChange('implementation_status', e.target.value)}
                  >
                    {implementationStatuses.map(status => (
                      <MenuItem key={status} value={status}>
                        {status.replace('_', ' ')}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={formData.priority}
                    onChange={(e) => handleFormChange('priority', e.target.value)}
                  >
                    {priorities.map(priority => (
                      <MenuItem key={priority} value={priority}>
                        {priority}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Owner"
                  value={formData.owner}
                  onChange={(e) => handleFormChange('owner', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Review Date"
                  value={formData.review_date ? new Date(formData.review_date) : null}
                  onChange={(date) => handleFormChange('review_date', date?.toISOString())}
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Approval Date"
                  value={formData.approval_date ? new Date(formData.approval_date) : null}
                  onChange={(date) => handleFormChange('approval_date', date?.toISOString())}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Version"
                  value={formData.version}
                  onChange={(e) => handleFormChange('version', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Policy Document URL"
                  value={formData.policy_document_url || ''}
                  onChange={(e) => handleFormChange('policy_document_url', e.target.value)}
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
          <DialogTitle>Policy Details</DialogTitle>
          <DialogContent>
            {selectedPolicy && (
              <Box>
                <Typography variant="h6" gutterBottom>{selectedPolicy.title}</Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {selectedPolicy.description}
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography><strong>Framework:</strong> {getFrameworkName(selectedPolicy.framework_id)}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography><strong>Type:</strong> {selectedPolicy.policy_type.replace('_', ' ')}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography><strong>Status:</strong> {selectedPolicy.implementation_status.replace('_', ' ')}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography><strong>Priority:</strong> {selectedPolicy.priority}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography><strong>Owner:</strong> {selectedPolicy.owner}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography><strong>Version:</strong> {selectedPolicy.version}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography><strong>Review Date:</strong> {new Date(selectedPolicy.review_date).toLocaleDateString()}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography><strong>Approval Date:</strong> {selectedPolicy.approval_date ? new Date(selectedPolicy.approval_date).toLocaleDateString() : 'Not approved'}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography><strong>Created:</strong> {new Date(selectedPolicy.created_at).toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography><strong>Last Updated:</strong> {new Date(selectedPolicy.updated_at).toLocaleString()}</Typography>
                  </Grid>
                  {selectedPolicy.policy_document_url && (
                    <Grid item xs={12}>
                      <Typography><strong>Document:</strong> 
                        <Button 
                          size="small" 
                          href={selectedPolicy.policy_document_url} 
                          target="_blank"
                          startIcon={<Download />}
                        >
                          View Document
                        </Button>
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
          <DialogTitle>Delete Policy</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete the policy "{selectedPolicy?.title}"?
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

export default PolicyManager;