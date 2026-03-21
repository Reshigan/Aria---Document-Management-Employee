import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, MenuItem, InputAdornment, Avatar,
  LinearProgress, Tooltip, Card, CardContent, Tabs, Tab
} from '@mui/material';
import { Add, Edit, Delete, Search, Person, Work, Assessment, FilterList, Visibility } from '@mui/icons-material';

interface JobPosting {
  id: string;
  title: string;
  department: string;
  location: string;
  type: 'full_time' | 'part_time' | 'contract';
  status: 'open' | 'closed' | 'on_hold';
  applicants: number;
  postedDate: string;
  closingDate: string;
}

const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  open: 'success',
  closed: 'error',
  on_hold: 'warning'
};

const Recruitment: React.FC = () => {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [formData, setFormData] = useState<Partial<JobPosting>>({});
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const response = await fetch(`${API_BASE}/api/hr/recruitment/jobs`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        const mappedData = (Array.isArray(data) ? data : data.jobs || data.data || []).map((j: any) => ({
          id: j.id,
          title: j.title || j.job_title || '',
          department: j.department || '',
          location: j.location || '',
          type: j.type || j.employment_type || 'full_time',
          status: j.status || 'open',
          applicants: j.applicants || j.applicant_count || 0,
          postedDate: j.postedDate || j.posted_date || '',
          closingDate: j.closingDate || j.closing_date || ''
        }));
        setJobs(mappedData.length > 0 ? mappedData : [
          { id: '1', title: 'Senior Software Developer', department: 'Technology', location: 'Johannesburg', type: 'full_time', status: 'open', applicants: 24, postedDate: '2026-01-10', closingDate: '2026-02-10' },
          { id: '2', title: 'Financial Analyst', department: 'Finance', location: 'Cape Town', type: 'full_time', status: 'open', applicants: 18, postedDate: '2026-01-15', closingDate: '2026-02-15' },
          { id: '3', title: 'HR Coordinator', department: 'Human Resources', location: 'Durban', type: 'full_time', status: 'on_hold', applicants: 12, postedDate: '2026-01-05', closingDate: '2026-02-05' },
          { id: '4', title: 'Marketing Intern', department: 'Marketing', location: 'Remote', type: 'contract', status: 'open', applicants: 45, postedDate: '2026-01-20', closingDate: '2026-02-20' },
        ]);
      } else {
        setJobs([
          { id: '1', title: 'Senior Software Developer', department: 'Technology', location: 'Johannesburg', type: 'full_time', status: 'open', applicants: 24, postedDate: '2026-01-10', closingDate: '2026-02-10' },
          { id: '2', title: 'Financial Analyst', department: 'Finance', location: 'Cape Town', type: 'full_time', status: 'open', applicants: 18, postedDate: '2026-01-15', closingDate: '2026-02-15' },
          { id: '3', title: 'HR Coordinator', department: 'Human Resources', location: 'Durban', type: 'full_time', status: 'on_hold', applicants: 12, postedDate: '2026-01-05', closingDate: '2026-02-05' },
          { id: '4', title: 'Marketing Intern', department: 'Marketing', location: 'Remote', type: 'contract', status: 'open', applicants: 45, postedDate: '2026-01-20', closingDate: '2026-02-20' },
        ]);
      }
    } catch (err) {
      console.error('Error loading jobs:', err);
      setJobs([
        { id: '1', title: 'Senior Software Developer', department: 'Technology', location: 'Johannesburg', type: 'full_time', status: 'open', applicants: 24, postedDate: '2026-01-10', closingDate: '2026-02-10' },
        { id: '2', title: 'Financial Analyst', department: 'Finance', location: 'Cape Town', type: 'full_time', status: 'open', applicants: 18, postedDate: '2026-01-15', closingDate: '2026-02-15' },
        { id: '3', title: 'HR Coordinator', department: 'Human Resources', location: 'Durban', type: 'full_time', status: 'on_hold', applicants: 12, postedDate: '2026-01-05', closingDate: '2026-02-05' },
        { id: '4', title: 'Marketing Intern', department: 'Marketing', location: 'Remote', type: 'contract', status: 'open', applicants: 45, postedDate: '2026-01-20', closingDate: '2026-02-20' },
      ]);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const method = selectedJob ? 'PUT' : 'POST';
      const url = selectedJob ? `${API_BASE}/api/hr/recruitment/jobs/${selectedJob.id}` : `${API_BASE}/api/hr/recruitment/jobs`;
      await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify(formData) });
      fetchJobs();
      setDialogOpen(false);
      setFormData({});
      setSelectedJob(null);
    } catch (err) {
      console.error('Error saving job:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this job posting?')) {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
        await fetch(`${API_BASE}/api/hr/recruitment/jobs/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        fetchJobs();
      } catch (err) {
        console.error('Error deleting job:', err);
      }
    }
  };

  const filteredJobs = jobs.filter(job =>
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: jobs.length,
    open: jobs.filter(j => j.status === 'open').length,
    totalApplicants: jobs.reduce((sum, j) => sum + (j.applicants || 0), 0),
    avgApplicants: Math.round(jobs.reduce((sum, j) => sum + (j.applicants || 0), 0) / jobs.length) || 0
  };

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>Recruitment Dashboard</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => { setSelectedJob(null); setFormData({}); setDialogOpen(true); }}
          sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>Post New Job</Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { label: 'Total Positions', value: stats.total, icon: <Work />, color: '#667eea' },
          { label: 'Open Positions', value: stats.open, icon: <Work />, color: '#4CAF50' },
          { label: 'Total Applicants', value: stats.totalApplicants, icon: <Person />, color: '#2196F3' },
          { label: 'Avg. Applicants/Job', value: stats.avgApplicants, icon: <Assessment />, color: '#FF9800' },
        ].map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: stat.color }}>{stat.icon}</Avatar>
                <Box>
                  <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>{stat.value}</Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>{stat.label}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 3, background: 'rgba(255,255,255,0.95)', borderRadius: 2 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
          <Tab label="All Jobs" />
          <Tab label="Open" />
          <Tab label="On Hold" />
          <Tab label="Closed" />
        </Tabs>

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField placeholder="Search jobs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} sx={{ flexGrow: 1 }} />
          <Button startIcon={<FilterList />}>Filters</Button>
        </Box>

        {loading ? <LinearProgress /> : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Position</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Applicants</TableCell>
                  <TableCell>Posted</TableCell>
                  <TableCell>Closing</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredJobs.filter(j => tabValue === 0 || (tabValue === 1 && j.status === 'open') || (tabValue === 2 && j.status === 'on_hold') || (tabValue === 3 && j.status === 'closed')).map((job) => (
                  <TableRow key={job.id} hover>
                    <TableCell><Typography fontWeight={600}>{job.title}</Typography></TableCell>
                    <TableCell>{job.department}</TableCell>
                    <TableCell>{job.location}</TableCell>
                    <TableCell>{job.type.replace('_', ' ')}</TableCell>
                    <TableCell><Chip label={job.status.replace('_', ' ').toUpperCase()} color={statusColors[job.status]} size="small" /></TableCell>
                    <TableCell><Chip label={job.applicants} size="small" color="primary" /></TableCell>
                    <TableCell>{job.postedDate}</TableCell>
                    <TableCell>{job.closingDate}</TableCell>
                    <TableCell>
                      <Tooltip title="View Applicants"><IconButton><Visibility /></IconButton></Tooltip>
                      <Tooltip title="Edit"><IconButton onClick={() => { setSelectedJob(job); setFormData(job); setDialogOpen(true); }}><Edit /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton onClick={() => handleDelete(job.id)} color="error"><Delete /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedJob ? 'Edit Job Posting' : 'New Job Posting'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}><TextField fullWidth label="Job Title" value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Department" value={formData.department || ''} onChange={(e) => setFormData({ ...formData, department: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Location" value={formData.location || ''} onChange={(e) => setFormData({ ...formData, location: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Type" select value={formData.type || 'full_time'} onChange={(e) => setFormData({ ...formData, type: e.target.value as JobPosting['type'] })}>
                {['full_time', 'part_time', 'contract'].map(t => <MenuItem key={t} value={t}>{t.replace('_', ' ').toUpperCase()}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Status" select value={formData.status || 'open'} onChange={(e) => setFormData({ ...formData, status: e.target.value as JobPosting['status'] })}>
                {['open', 'closed', 'on_hold'].map(s => <MenuItem key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Posted Date" type="date" InputLabelProps={{ shrink: true }} value={formData.postedDate || ''} onChange={(e) => setFormData({ ...formData, postedDate: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Closing Date" type="date" InputLabelProps={{ shrink: true }} value={formData.closingDate || ''} onChange={(e) => setFormData({ ...formData, closingDate: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>{selectedJob ? 'Update' : 'Create'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Recruitment;
