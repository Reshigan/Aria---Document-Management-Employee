import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, MenuItem, InputAdornment, Avatar,
  LinearProgress, Tooltip, Card, CardContent
} from '@mui/material';
import { Add, Edit, Delete, Search, Timer, CheckCircle, Warning, FilterList } from '@mui/icons-material';

interface SLAPolicy {
  id: string;
  name: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  responseTime: number;
  resolutionTime: number;
  escalationTime: number;
  status: 'active' | 'inactive';
  appliesTo: string[];
}

const SLA: React.FC = () => {
  const [policies, setPolicies] = useState<SLAPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<SLAPolicy | null>(null);
  const [formData, setFormData] = useState<Partial<SLAPolicy>>({});

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const response = await fetch(`${API_BASE}/api/support/sla`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        const mappedData = (Array.isArray(data) ? data : data.policies || data.data || []).map((p: any) => ({
          id: p.id,
          name: p.name || p.policy_name || '',
          description: p.description || '',
          priority: p.priority || 'medium',
          responseTime: p.responseTime || p.response_time || 60,
          resolutionTime: p.resolutionTime || p.resolution_time || 480,
          escalationTime: p.escalationTime || p.escalation_time || 120,
          status: p.status || 'active',
          appliesTo: p.appliesTo || p.applies_to || ['All']
        }));
        setPolicies(mappedData.length > 0 ? mappedData : [
          { id: '1', name: 'Critical Priority SLA', description: 'For system-down and critical issues', priority: 'critical', responseTime: 15, resolutionTime: 240, escalationTime: 60, status: 'active', appliesTo: ['Enterprise', 'Premium'] },
          { id: '2', name: 'High Priority SLA', description: 'For major functionality issues', priority: 'high', responseTime: 60, resolutionTime: 480, escalationTime: 120, status: 'active', appliesTo: ['Enterprise', 'Premium', 'Standard'] },
          { id: '3', name: 'Medium Priority SLA', description: 'For moderate issues with workarounds', priority: 'medium', responseTime: 240, resolutionTime: 1440, escalationTime: 480, status: 'active', appliesTo: ['All'] },
          { id: '4', name: 'Low Priority SLA', description: 'For minor issues and feature requests', priority: 'low', responseTime: 480, resolutionTime: 2880, escalationTime: 1440, status: 'active', appliesTo: ['All'] },
        ]);
      } else {
        setPolicies([
          { id: '1', name: 'Critical Priority SLA', description: 'For system-down and critical issues', priority: 'critical', responseTime: 15, resolutionTime: 240, escalationTime: 60, status: 'active', appliesTo: ['Enterprise', 'Premium'] },
          { id: '2', name: 'High Priority SLA', description: 'For major functionality issues', priority: 'high', responseTime: 60, resolutionTime: 480, escalationTime: 120, status: 'active', appliesTo: ['Enterprise', 'Premium', 'Standard'] },
          { id: '3', name: 'Medium Priority SLA', description: 'For moderate issues with workarounds', priority: 'medium', responseTime: 240, resolutionTime: 1440, escalationTime: 480, status: 'active', appliesTo: ['All'] },
          { id: '4', name: 'Low Priority SLA', description: 'For minor issues and feature requests', priority: 'low', responseTime: 480, resolutionTime: 2880, escalationTime: 1440, status: 'active', appliesTo: ['All'] },
        ]);
      }
    } catch (err) {
      console.error('Error loading SLA policies:', err);
      setPolicies([
        { id: '1', name: 'Critical Priority SLA', description: 'For system-down and critical issues', priority: 'critical', responseTime: 15, resolutionTime: 240, escalationTime: 60, status: 'active', appliesTo: ['Enterprise', 'Premium'] },
        { id: '2', name: 'High Priority SLA', description: 'For major functionality issues', priority: 'high', responseTime: 60, resolutionTime: 480, escalationTime: 120, status: 'active', appliesTo: ['Enterprise', 'Premium', 'Standard'] },
        { id: '3', name: 'Medium Priority SLA', description: 'For moderate issues with workarounds', priority: 'medium', responseTime: 240, resolutionTime: 1440, escalationTime: 480, status: 'active', appliesTo: ['All'] },
        { id: '4', name: 'Low Priority SLA', description: 'For minor issues and feature requests', priority: 'low', responseTime: 480, resolutionTime: 2880, escalationTime: 1440, status: 'active', appliesTo: ['All'] },
      ]);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const method = selectedPolicy ? 'PUT' : 'POST';
      const url = selectedPolicy ? `${API_BASE}/api/support/sla/${selectedPolicy.id}` : `${API_BASE}/api/support/sla`;
      await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify(formData) });
      fetchPolicies();
      setDialogOpen(false);
      setFormData({});
      setSelectedPolicy(null);
    } catch (err) {
      console.error('Error saving SLA policy:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this SLA policy?')) {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
        await fetch(`${API_BASE}/api/support/sla/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        fetchPolicies();
      } catch (err) {
        console.error('Error deleting SLA policy:', err);
      }
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    if (minutes < 1440) return `${Math.round(minutes / 60)} hrs`;
    return `${Math.round(minutes / 1440)} days`;
  };

  const filteredPolicies = policies.filter(policy =>
    policy.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: policies.length,
    active: policies.filter(p => p.status === 'active').length,
    critical: policies.filter(p => p.priority === 'critical').length
  };

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>SLA Management</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => { setSelectedPolicy(null); setFormData({}); setDialogOpen(true); }}
          sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>New SLA Policy</Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { label: 'Total Policies', value: stats.total, icon: <Timer />, color: '#667eea' },
          { label: 'Active', value: stats.active, icon: <CheckCircle />, color: '#4CAF50' },
          { label: 'Critical SLAs', value: stats.critical, icon: <Warning />, color: '#f44336' },
        ].map((stat, index) => (
          <Grid item xs={12} sm={4} key={index}>
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
          <TextField placeholder="Search policies..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} sx={{ flexGrow: 1 }} />
          <Button startIcon={<FilterList />}>Filters</Button>
        </Box>

        {loading ? <LinearProgress /> : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Policy Name</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Response Time</TableCell>
                  <TableCell>Resolution Time</TableCell>
                  <TableCell>Escalation Time</TableCell>
                  <TableCell>Applies To</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPolicies.map((policy) => (
                  <TableRow key={policy.id} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{policy.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{policy.description}</Typography>
                    </TableCell>
                    <TableCell><Chip label={policy.priority.toUpperCase()} color={policy.priority === 'critical' ? 'error' : policy.priority === 'high' ? 'warning' : policy.priority === 'medium' ? 'info' : 'default'} size="small" /></TableCell>
                    <TableCell>{formatTime(policy.responseTime)}</TableCell>
                    <TableCell>{formatTime(policy.resolutionTime)}</TableCell>
                    <TableCell>{formatTime(policy.escalationTime)}</TableCell>
                    <TableCell>{policy.appliesTo.join(', ')}</TableCell>
                    <TableCell><Chip label={policy.status.toUpperCase()} color={policy.status === 'active' ? 'success' : 'default'} size="small" /></TableCell>
                    <TableCell>
                      <Tooltip title="Edit"><IconButton onClick={() => { setSelectedPolicy(policy); setFormData(policy); setDialogOpen(true); }}><Edit /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton onClick={() => handleDelete(policy.id)} color="error"><Delete /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedPolicy ? 'Edit SLA Policy' : 'New SLA Policy'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}><TextField fullWidth label="Policy Name" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Description" multiline rows={2} value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Priority" select value={formData.priority || 'medium'} onChange={(e) => setFormData({ ...formData, priority: e.target.value as SLAPolicy['priority'] })}>
                {['low', 'medium', 'high', 'critical'].map(p => <MenuItem key={p} value={p}>{p.toUpperCase()}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Status" select value={formData.status || 'active'} onChange={(e) => setFormData({ ...formData, status: e.target.value as SLAPolicy['status'] })}>
                {['active', 'inactive'].map(s => <MenuItem key={s} value={s}>{s.toUpperCase()}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth label="Response Time (minutes)" type="number" value={formData.responseTime || ''} onChange={(e) => setFormData({ ...formData, responseTime: Number(e.target.value) })} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth label="Resolution Time (minutes)" type="number" value={formData.resolutionTime || ''} onChange={(e) => setFormData({ ...formData, resolutionTime: Number(e.target.value) })} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth label="Escalation Time (minutes)" type="number" value={formData.escalationTime || ''} onChange={(e) => setFormData({ ...formData, escalationTime: Number(e.target.value) })} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Applies To (comma-separated)" value={formData.appliesTo?.join(', ') || ''} onChange={(e) => setFormData({ ...formData, appliesTo: e.target.value.split(',').map(s => s.trim()) })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>{selectedPolicy ? 'Update' : 'Create'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SLA;
