import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, MenuItem, InputAdornment, Avatar,
  LinearProgress, Tooltip, Card, CardContent
} from '@mui/material';
import { Add, Edit, Search, Warning, TrendingUp, Assignment, FilterList, Visibility } from '@mui/icons-material';

interface Escalation {
  id: string;
  ticketNumber: string;
  subject: string;
  customer: string;
  level: 1 | 2 | 3;
  reason: string;
  escalatedBy: string;
  escalatedTo: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  escalatedAt: string;
  resolvedAt: string | null;
  slaBreached: boolean;
}

const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  open: 'error',
  in_progress: 'warning',
  resolved: 'success',
  closed: 'default'
};

const Escalations: React.FC = () => {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEscalation, setSelectedEscalation] = useState<Escalation | null>(null);
  const [formData, setFormData] = useState<Partial<Escalation>>({});

  useEffect(() => {
    fetchEscalations();
  }, []);

  const fetchEscalations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/support/escalations');
      if (response.ok) {
        const data = await response.json();
        setEscalations(data);
      } else {
        setEscalations([
          { id: '1', ticketNumber: 'TKT-2026-001', subject: 'System outage affecting production', customer: 'ABC Corp', level: 3, reason: 'Critical system down', escalatedBy: 'John Smith', escalatedTo: 'CTO', status: 'in_progress', escalatedAt: '2026-01-28 10:30', resolvedAt: null, slaBreached: true },
          { id: '2', ticketNumber: 'TKT-2026-015', subject: 'Data sync issues', customer: 'XYZ Ltd', level: 2, reason: 'Unresolved for 48 hours', escalatedBy: 'Sarah Johnson', escalatedTo: 'Tech Lead', status: 'open', escalatedAt: '2026-01-27 14:00', resolvedAt: null, slaBreached: false },
          { id: '3', ticketNumber: 'TKT-2026-008', subject: 'Billing dispute', customer: 'Tech Solutions', level: 1, reason: 'Customer requested manager', escalatedBy: 'Mike Chen', escalatedTo: 'Support Manager', status: 'resolved', escalatedAt: '2026-01-26 09:15', resolvedAt: '2026-01-26 16:30', slaBreached: false },
        ]);
      }
    } catch {
      setEscalations([]);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      const method = selectedEscalation ? 'PUT' : 'POST';
      const url = selectedEscalation ? `/api/support/escalations/${selectedEscalation.id}` : '/api/support/escalations';
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      fetchEscalations();
      setDialogOpen(false);
      setFormData({});
      setSelectedEscalation(null);
    } catch {
      console.error('Error saving escalation');
    }
  };

  const filteredEscalations = escalations.filter(esc =>
    esc.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    esc.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    esc.customer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: escalations.length,
    open: escalations.filter(e => e.status === 'open' || e.status === 'in_progress').length,
    slaBreached: escalations.filter(e => e.slaBreached).length,
    level3: escalations.filter(e => e.level === 3 && e.status !== 'resolved' && e.status !== 'closed').length
  };

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>Escalation Management</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => { setSelectedEscalation(null); setFormData({}); setDialogOpen(true); }}
          sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>New Escalation</Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { label: 'Total Escalations', value: stats.total, icon: <TrendingUp />, color: '#667eea' },
          { label: 'Active', value: stats.open, icon: <Assignment />, color: '#FF9800' },
          { label: 'SLA Breached', value: stats.slaBreached, icon: <Warning />, color: '#f44336' },
          { label: 'Level 3 Active', value: stats.level3, icon: <Warning />, color: '#E91E63' },
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
          <TextField placeholder="Search escalations..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} sx={{ flexGrow: 1 }} />
          <Button startIcon={<FilterList />}>Filters</Button>
        </Box>

        {loading ? <LinearProgress /> : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Ticket</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Level</TableCell>
                  <TableCell>Escalated To</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>SLA</TableCell>
                  <TableCell>Escalated At</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredEscalations.map((esc) => (
                  <TableRow key={esc.id} hover>
                    <TableCell><Typography fontWeight={600}>{esc.ticketNumber}</Typography></TableCell>
                    <TableCell>{esc.subject}</TableCell>
                    <TableCell>{esc.customer}</TableCell>
                    <TableCell><Chip label={`Level ${esc.level}`} color={esc.level === 3 ? 'error' : esc.level === 2 ? 'warning' : 'default'} size="small" /></TableCell>
                    <TableCell>{esc.escalatedTo}</TableCell>
                    <TableCell><Chip label={esc.status.replace('_', ' ').toUpperCase()} color={statusColors[esc.status]} size="small" /></TableCell>
                    <TableCell>{esc.slaBreached ? <Chip label="BREACHED" color="error" size="small" /> : <Chip label="OK" color="success" size="small" />}</TableCell>
                    <TableCell>{esc.escalatedAt}</TableCell>
                    <TableCell>
                      <Tooltip title="View"><IconButton><Visibility /></IconButton></Tooltip>
                      <Tooltip title="Edit"><IconButton onClick={() => { setSelectedEscalation(esc); setFormData(esc); setDialogOpen(true); }}><Edit /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedEscalation ? 'Edit Escalation' : 'New Escalation'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Ticket Number" value={formData.ticketNumber || ''} onChange={(e) => setFormData({ ...formData, ticketNumber: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Customer" value={formData.customer || ''} onChange={(e) => setFormData({ ...formData, customer: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Subject" value={formData.subject || ''} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Level" select value={formData.level || 1} onChange={(e) => setFormData({ ...formData, level: Number(e.target.value) as 1 | 2 | 3 })}>
                {[1, 2, 3].map(l => <MenuItem key={l} value={l}>Level {l}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Status" select value={formData.status || 'open'} onChange={(e) => setFormData({ ...formData, status: e.target.value as Escalation['status'] })}>
                {['open', 'in_progress', 'resolved', 'closed'].map(s => <MenuItem key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Escalated By" value={formData.escalatedBy || ''} onChange={(e) => setFormData({ ...formData, escalatedBy: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Escalated To" value={formData.escalatedTo || ''} onChange={(e) => setFormData({ ...formData, escalatedTo: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Reason" multiline rows={2} value={formData.reason || ''} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>{selectedEscalation ? 'Update' : 'Create'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Escalations;
