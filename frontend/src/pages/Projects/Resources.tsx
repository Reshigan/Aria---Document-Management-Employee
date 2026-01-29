import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, MenuItem, InputAdornment, Avatar,
  LinearProgress, Tooltip, Card, CardContent
} from '@mui/material';
import { Add, Edit, Delete, Search, Person, Work, Schedule, FilterList } from '@mui/icons-material';

interface Resource {
  id: string;
  name: string;
  role: string;
  department: string;
  skills: string[];
  availability: number;
  allocatedProjects: string[];
  hourlyRate: number;
  status: 'available' | 'partially_allocated' | 'fully_allocated' | 'on_leave';
}

const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  available: 'success',
  partially_allocated: 'warning',
  fully_allocated: 'error',
  on_leave: 'default'
};

const Resources: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [formData, setFormData] = useState<Partial<Resource>>({});

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/projects/resources');
      if (response.ok) {
        const data = await response.json();
        setResources(data);
      } else {
        setResources([
          { id: '1', name: 'Sarah Johnson', role: 'Project Manager', department: 'PMO', skills: ['Agile', 'Scrum', 'Leadership'], availability: 100, allocatedProjects: ['ERP Implementation'], hourlyRate: 850, status: 'fully_allocated' },
          { id: '2', name: 'Michael Chen', role: 'Senior Developer', department: 'Technology', skills: ['React', 'Node.js', 'TypeScript'], availability: 60, allocatedProjects: ['ERP Implementation', 'Mobile App'], hourlyRate: 750, status: 'partially_allocated' },
          { id: '3', name: 'Emily Davis', role: 'Business Analyst', department: 'Operations', skills: ['Requirements', 'Documentation', 'SQL'], availability: 100, allocatedProjects: [], hourlyRate: 650, status: 'available' },
          { id: '4', name: 'James Wilson', role: 'QA Engineer', department: 'Technology', skills: ['Testing', 'Automation', 'Selenium'], availability: 80, allocatedProjects: ['Website Redesign'], hourlyRate: 550, status: 'partially_allocated' },
          { id: '5', name: 'Lisa Brown', role: 'UX Designer', department: 'Design', skills: ['Figma', 'UI/UX', 'Prototyping'], availability: 0, allocatedProjects: [], hourlyRate: 700, status: 'on_leave' },
        ]);
      }
    } catch {
      setResources([]);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      const method = selectedResource ? 'PUT' : 'POST';
      const url = selectedResource ? `/api/projects/resources/${selectedResource.id}` : '/api/projects/resources';
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      fetchResources();
      setDialogOpen(false);
      setFormData({});
      setSelectedResource(null);
    } catch {
      console.error('Error saving resource');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to remove this resource?')) {
      try {
        await fetch(`/api/projects/resources/${id}`, { method: 'DELETE' });
        fetchResources();
      } catch {
        console.error('Error deleting resource');
      }
    }
  };

  const filteredResources = resources.filter(resource =>
    resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resource.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resource.skills.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const stats = {
    total: resources.length,
    available: resources.filter(r => r.status === 'available').length,
    allocated: resources.filter(r => r.status === 'fully_allocated' || r.status === 'partially_allocated').length,
    avgRate: Math.round(resources.reduce((sum, r) => sum + r.hourlyRate, 0) / resources.length) || 0
  };

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>Resource Management</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => { setSelectedResource(null); setFormData({}); setDialogOpen(true); }}
          sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>Add Resource</Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { label: 'Total Resources', value: stats.total, icon: <Person />, color: '#667eea' },
          { label: 'Available', value: stats.available, icon: <Work />, color: '#4CAF50' },
          { label: 'Allocated', value: stats.allocated, icon: <Schedule />, color: '#FF9800' },
          { label: 'Avg. Hourly Rate', value: `R ${stats.avgRate}`, icon: <Work />, color: '#E91E63' },
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
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField placeholder="Search resources..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} sx={{ flexGrow: 1 }} />
          <Button startIcon={<FilterList />}>Filters</Button>
        </Box>

        {loading ? <LinearProgress /> : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Resource</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Skills</TableCell>
                  <TableCell>Availability</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Hourly Rate</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredResources.map((resource) => (
                  <TableRow key={resource.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: '#667eea' }}>{resource.name.split(' ').map(n => n[0]).join('')}</Avatar>
                        <Typography fontWeight={600}>{resource.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{resource.role}</TableCell>
                    <TableCell>{resource.department}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {resource.skills.slice(0, 3).map(skill => <Chip key={skill} label={skill} size="small" />)}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress variant="determinate" value={resource.availability} sx={{ width: 60, height: 8, borderRadius: 4 }} />
                        <Typography variant="body2">{resource.availability}%</Typography>
                      </Box>
                    </TableCell>
                    <TableCell><Chip label={resource.status.replace('_', ' ').toUpperCase()} color={statusColors[resource.status]} size="small" /></TableCell>
                    <TableCell>R {resource.hourlyRate}/hr</TableCell>
                    <TableCell>
                      <Tooltip title="Edit"><IconButton onClick={() => { setSelectedResource(resource); setFormData(resource); setDialogOpen(true); }}><Edit /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton onClick={() => handleDelete(resource.id)} color="error"><Delete /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedResource ? 'Edit Resource' : 'Add Resource'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Name" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Role" value={formData.role || ''} onChange={(e) => setFormData({ ...formData, role: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Department" value={formData.department || ''} onChange={(e) => setFormData({ ...formData, department: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Hourly Rate (R)" type="number" value={formData.hourlyRate || ''} onChange={(e) => setFormData({ ...formData, hourlyRate: Number(e.target.value) })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Availability (%)" type="number" value={formData.availability || ''} onChange={(e) => setFormData({ ...formData, availability: Number(e.target.value) })} /></Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Status" select value={formData.status || 'available'} onChange={(e) => setFormData({ ...formData, status: e.target.value as Resource['status'] })}>
                {['available', 'partially_allocated', 'fully_allocated', 'on_leave'].map(s => <MenuItem key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}><TextField fullWidth label="Skills (comma-separated)" value={formData.skills?.join(', ') || ''} onChange={(e) => setFormData({ ...formData, skills: e.target.value.split(',').map(s => s.trim()) })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>{selectedResource ? 'Update' : 'Create'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Resources;
