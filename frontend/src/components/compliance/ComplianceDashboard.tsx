import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
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
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import {
  Security,
  Assessment,
  Warning,
  CheckCircle,
  Error,
  Visibility,
  Edit,
  Add,
  Download,
  Refresh,
  Timeline,
  Policy,
  Gavel,
  Shield
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { complianceService } from '../../services/complianceService';

interface ComplianceFramework {
  id: number;
  name: string;
  description: string;
  version: string;
  status: string;
  compliance_score: number;
  last_assessment: string;
  next_assessment: string;
  requirements_count: number;
  implemented_count: number;
}

interface ComplianceViolation {
  id: number;
  title: string;
  description: string;
  severity: string;
  status: string;
  framework_name: string;
  detected_at: string;
  resolved_at?: string;
  assigned_to?: string;
}

interface ComplianceMetric {
  id: number;
  metric_name: string;
  metric_value: number;
  target_value: number;
  unit: string;
  status: string;
  last_updated: string;
}

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
      id={`compliance-tabpanel-${index}`}
      aria-labelledby={`compliance-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const ComplianceDashboard: React.FC = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [frameworks, setFrameworks] = useState<ComplianceFramework[]>([]);
  const [violations, setViolations] = useState<ComplianceViolation[]>([]);
  const [metrics, setMetrics] = useState<ComplianceMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assessmentDialog, setAssessmentDialog] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState<ComplianceFramework | null>(null);

  useEffect(() => {
    loadComplianceData();
  }, []);

  const loadComplianceData = async () => {
    try {
      setLoading(true);
      const [frameworksData, violationsData, metricsData] = await Promise.all([
        complianceService.getFrameworks(),
        complianceService.getViolations(),
        complianceService.getMetrics()
      ]);
      
      setFrameworks(frameworksData);
      setViolations(violationsData);
      setMetrics(metricsData);
    } catch (err) {
      setError('Failed to load compliance data');
      console.error('Error loading compliance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getComplianceScoreColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'success';
      case 'compliant': return 'success';
      case 'resolved': return 'success';
      case 'non_compliant': return 'error';
      case 'open': return 'error';
      case 'in_progress': return 'warning';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const startAssessment = async (framework: ComplianceFramework) => {
    try {
      await complianceService.startAssessment(framework.id);
      setAssessmentDialog(false);
      loadComplianceData();
    } catch (err) {
      setError('Failed to start assessment');
    }
  };

  const generateReport = async (frameworkId: number) => {
    try {
      const report = await complianceService.generateReport(frameworkId);
      // Handle report download
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-report-${frameworkId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to generate report');
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading compliance dashboard...</Typography>
      </Box>
    );
  }

  const overallScore = frameworks.length > 0 
    ? Math.round(frameworks.reduce((sum, f) => sum + f.compliance_score, 0) / frameworks.length)
    : 0;

  const activeViolations = violations.filter(v => v.status === 'open').length;
  const criticalViolations = violations.filter(v => v.severity === 'critical' && v.status === 'open').length;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Shield color="primary" />
          Compliance Dashboard
        </Typography>
        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={loadComplianceData}
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

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Security color="primary" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" color={getComplianceScoreColor(overallScore)}>
                    {overallScore}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Overall Compliance
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
                <Assessment color="info" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">{frameworks.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Frameworks
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
                <Warning color="warning" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {activeViolations}
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
                <Error color="error" sx={{ fontSize: 40 }} />
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
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Frameworks" icon={<Policy />} />
          <Tab 
            label={
              <Badge badgeContent={activeViolations} color="error">
                Violations
              </Badge>
            } 
            icon={<Gavel />} 
          />
          <Tab label="Metrics" icon={<Timeline />} />
        </Tabs>
      </Box>

      {/* Frameworks Tab */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {frameworks.map((framework) => (
            <Grid item xs={12} md={6} lg={4} key={framework.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6">{framework.name}</Typography>
                    <Chip 
                      label={framework.status} 
                      color={getStatusColor(framework.status)}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {framework.description}
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Compliance Score</Typography>
                      <Typography variant="body2" color={getComplianceScoreColor(framework.compliance_score)}>
                        {framework.compliance_score}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={framework.compliance_score}
                      color={getComplianceScoreColor(framework.compliance_score)}
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Requirements: {framework.implemented_count}/{framework.requirements_count}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Last Assessment: {new Date(framework.last_assessment).toLocaleDateString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Next Assessment: {new Date(framework.next_assessment).toLocaleDateString()}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      startIcon={<Assessment />}
                      onClick={() => {
                        setSelectedFramework(framework);
                        setAssessmentDialog(true);
                      }}
                    >
                      Assess
                    </Button>
                    <Button
                      size="small"
                      startIcon={<Download />}
                      onClick={() => generateReport(framework.id)}
                    >
                      Report
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* Violations Tab */}
      <TabPanel value={tabValue} index={1}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Framework</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Detected</TableCell>
                <TableCell>Assigned To</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {violations.map((violation) => (
                <TableRow key={violation.id}>
                  <TableCell>
                    <Typography variant="subtitle2">{violation.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {violation.description}
                    </Typography>
                  </TableCell>
                  <TableCell>{violation.framework_name}</TableCell>
                  <TableCell>
                    <Chip 
                      label={violation.severity} 
                      color={getSeverityColor(violation.severity)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={violation.status} 
                      color={getStatusColor(violation.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(violation.detected_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{violation.assigned_to || 'Unassigned'}</TableCell>
                  <TableCell>
                    <IconButton size="small">
                      <Visibility />
                    </IconButton>
                    <IconButton size="small">
                      <Edit />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Metrics Tab */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          {metrics.map((metric) => (
            <Grid item xs={12} sm={6} md={4} key={metric.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    {metric.metric_name}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Typography variant="h4" color={getStatusColor(metric.status)}>
                      {metric.metric_value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {metric.unit}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Target: {metric.target_value} {metric.unit}
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={Math.min((metric.metric_value / metric.target_value) * 100, 100)}
                      color={metric.metric_value >= metric.target_value ? 'success' : 'warning'}
                      sx={{ mt: 1 }}
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary">
                    Last Updated: {new Date(metric.last_updated).toLocaleDateString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* Assessment Dialog */}
      <Dialog open={assessmentDialog} onClose={() => setAssessmentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Start Compliance Assessment</DialogTitle>
        <DialogContent>
          {selectedFramework && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {selectedFramework.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                This will start a new compliance assessment for the {selectedFramework.name} framework.
                The assessment will evaluate all requirements and update the compliance score.
              </Typography>
              <Alert severity="info">
                Assessment may take several minutes to complete depending on the framework complexity.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssessmentDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={() => selectedFramework && startAssessment(selectedFramework)}
          >
            Start Assessment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ComplianceDashboard;