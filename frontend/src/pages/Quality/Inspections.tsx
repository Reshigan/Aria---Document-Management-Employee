import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, MenuItem, InputAdornment, Avatar,
  LinearProgress, Tooltip, Card, CardContent
} from '@mui/material';
import { Add, Edit, Delete, Search, CheckCircle, Warning, Assignment, FilterList } from '@mui/icons-material';

interface Inspection {
  id: string;
  reference: string;
  type: 'incoming' | 'in_process' | 'final' | 'supplier';
  product: string;
  batchNumber: string;
  inspector: string;
  date: string;
  status: 'pending' | 'passed' | 'failed' | 'on_hold';
  defectsFound: number;
  notes: string;
}

const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  pending: 'warning',
  passed: 'success',
  failed: 'error',
  on_hold: 'default'
};

const Inspections: React.FC = () => {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [formData, setFormData] = useState<Partial<Inspection>>({});

  useEffect(() => {
    fetchInspections();
  }, []);

  const fetchInspections = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/quality/inspections');
      if (response.ok) {
        const data = await response.json();
        setInspections(data);
      } else {
        setInspections([
          { id: '1', reference: 'QI-2026-001', type: 'incoming', product: 'Raw Material A', batchNumber: 'RM-2026-001', inspector: 'John Smith', date: '2026-01-28', status: 'passed', defectsFound: 0, notes: 'All specifications met' },
          { id: '2', reference: 'QI-2026-002', type: 'in_process', product: 'Widget Assembly', batchNumber: 'WA-2026-015', inspector: 'Sarah Johnson', date: '2026-01-28', status: 'pending', defectsFound: 0, notes: 'In progress' },
          { id: '3', reference: 'QI-2026-003', type: 'final', product: 'Finished Product X', batchNumber: 'FP-2026-008', inspector: 'Mike Chen', date: '2026-01-27', status: 'failed', defectsFound: 3, notes: 'Surface defects found' },
          { id: '4', reference: 'QI-2026-004', type: 'supplier', product: 'Component B', batchNumber: 'CB-2026-022', inspector: 'Emily Davis', date: '2026-01-26', status: 'on_hold', defectsFound: 1, notes: 'Awaiting supplier response' },
        ]);
      }
    } catch {
      setInspections([]);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      const method = selectedInspection ? 'PUT' : 'POST';
      const url = selectedInspection ? `/api/quality/inspections/${selectedInspection.id}` : '/api/quality/inspections';
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      fetchInspections();
      setDialogOpen(false);
      setFormData({});
      setSelectedInspection(null);
    } catch {
      console.error('Error saving inspection');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this inspection?')) {
      try {
        await fetch(`/api/quality/inspections/${id}`, { method: 'DELETE' });
        fetchInspections();
      } catch {
        console.error('Error deleting inspection');
      }
    }
  };

  const filteredInspections = inspections.filter(inspection =>
    inspection.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inspection.product.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: inspections.length,
    passed: inspections.filter(i => i.status === 'passed').length,
    failed: inspections.filter(i => i.status === 'failed').length,
    pending: inspections.filter(i => i.status === 'pending').length
  };

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>Quality Inspections</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => { setSelectedInspection(null); setFormData({}); setDialogOpen(true); }}
          sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>New Inspection</Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { label: 'Total Inspections', value: stats.total, icon: <Assignment />, color: '#667eea' },
          { label: 'Passed', value: stats.passed, icon: <CheckCircle />, color: '#4CAF50' },
          { label: 'Failed', value: stats.failed, icon: <Warning />, color: '#f44336' },
          { label: 'Pending', value: stats.pending, icon: <Assignment />, color: '#FF9800' },
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
          <TextField placeholder="Search inspections..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} sx={{ flexGrow: 1 }} />
          <Button startIcon={<FilterList />}>Filters</Button>
        </Box>

        {loading ? <LinearProgress /> : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Reference</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell>Batch</TableCell>
                  <TableCell>Inspector</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Defects</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredInspections.map((inspection) => (
                  <TableRow key={inspection.id} hover>
                    <TableCell><Typography fontWeight={600}>{inspection.reference}</Typography></TableCell>
                    <TableCell><Chip label={inspection.type.replace('_', ' ').toUpperCase()} size="small" /></TableCell>
                    <TableCell>{inspection.product}</TableCell>
                    <TableCell>{inspection.batchNumber}</TableCell>
                    <TableCell>{inspection.inspector}</TableCell>
                    <TableCell>{inspection.date}</TableCell>
                    <TableCell><Chip label={inspection.status.toUpperCase()} color={statusColors[inspection.status]} size="small" /></TableCell>
                    <TableCell>{inspection.defectsFound}</TableCell>
                    <TableCell>
                      <Tooltip title="Edit"><IconButton onClick={() => { setSelectedInspection(inspection); setFormData(inspection); setDialogOpen(true); }}><Edit /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton onClick={() => handleDelete(inspection.id)} color="error"><Delete /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedInspection ? 'Edit Inspection' : 'New Inspection'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Reference" value={formData.reference || ''} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Type" select value={formData.type || 'incoming'} onChange={(e) => setFormData({ ...formData, type: e.target.value as Inspection['type'] })}>
                {['incoming', 'in_process', 'final', 'supplier'].map(t => <MenuItem key={t} value={t}>{t.replace('_', ' ').toUpperCase()}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Product" value={formData.product || ''} onChange={(e) => setFormData({ ...formData, product: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Batch Number" value={formData.batchNumber || ''} onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Inspector" value={formData.inspector || ''} onChange={(e) => setFormData({ ...formData, inspector: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Date" type="date" InputLabelProps={{ shrink: true }} value={formData.date || ''} onChange={(e) => setFormData({ ...formData, date: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Status" select value={formData.status || 'pending'} onChange={(e) => setFormData({ ...formData, status: e.target.value as Inspection['status'] })}>
                {['pending', 'passed', 'failed', 'on_hold'].map(s => <MenuItem key={s} value={s}>{s.toUpperCase()}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Defects Found" type="number" value={formData.defectsFound || 0} onChange={(e) => setFormData({ ...formData, defectsFound: Number(e.target.value) })} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Notes" multiline rows={3} value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>{selectedInspection ? 'Update' : 'Create'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Inspections;
