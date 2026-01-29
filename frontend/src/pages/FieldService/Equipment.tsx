import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, MenuItem, InputAdornment, Avatar,
  LinearProgress, Tooltip, Card, CardContent
} from '@mui/material';
import { Add, Edit, Delete, Search, Build, Warning, CheckCircle, FilterList } from '@mui/icons-material';

interface Equipment {
  id: string;
  name: string;
  serialNumber: string;
  type: string;
  status: 'available' | 'in_use' | 'maintenance' | 'retired';
  location: string;
  assignedTo: string;
  lastService: string;
  nextService: string;
  purchaseDate: string;
  value: number;
}

const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  available: 'success',
  in_use: 'primary',
  maintenance: 'warning',
  retired: 'error'
};

const Equipment: React.FC = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Equipment | null>(null);
  const [formData, setFormData] = useState<Partial<Equipment>>({});

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/field-service/equipment');
      if (response.ok) {
        const data = await response.json();
        setEquipment(data);
      } else {
        setEquipment([
          { id: '1', name: 'Diagnostic Tool Pro', serialNumber: 'DT-2024-001', type: 'Diagnostic', status: 'available', location: 'Warehouse A', assignedTo: '', lastService: '2026-01-01', nextService: '2026-04-01', purchaseDate: '2024-06-15', value: 15000 },
          { id: '2', name: 'Power Drill Set', serialNumber: 'PD-2024-002', type: 'Power Tool', status: 'in_use', location: 'Field', assignedTo: 'John Smith', lastService: '2025-12-15', nextService: '2026-03-15', purchaseDate: '2024-03-20', value: 5500 },
          { id: '3', name: 'Multimeter Advanced', serialNumber: 'MM-2024-003', type: 'Diagnostic', status: 'maintenance', location: 'Service Center', assignedTo: '', lastService: '2025-11-01', nextService: '2026-02-01', purchaseDate: '2023-09-10', value: 3200 },
        ]);
      }
    } catch {
      setEquipment([]);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      const method = selectedItem ? 'PUT' : 'POST';
      const url = selectedItem ? `/api/field-service/equipment/${selectedItem.id}` : '/api/field-service/equipment';
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      fetchEquipment();
      setDialogOpen(false);
      setFormData({});
      setSelectedItem(null);
    } catch {
      console.error('Error saving equipment');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this equipment?')) {
      try {
        await fetch(`/api/field-service/equipment/${id}`, { method: 'DELETE' });
        fetchEquipment();
      } catch {
        console.error('Error deleting equipment');
      }
    }
  };

  const filteredEquipment = equipment.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: equipment.length,
    available: equipment.filter(e => e.status === 'available').length,
    inUse: equipment.filter(e => e.status === 'in_use').length,
    maintenance: equipment.filter(e => e.status === 'maintenance').length
  };

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>Equipment Management</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => { setSelectedItem(null); setFormData({}); setDialogOpen(true); }}
          sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>Add Equipment</Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { label: 'Total Equipment', value: stats.total, icon: <Build />, color: '#667eea' },
          { label: 'Available', value: stats.available, icon: <CheckCircle />, color: '#4CAF50' },
          { label: 'In Use', value: stats.inUse, icon: <Build />, color: '#2196F3' },
          { label: 'In Maintenance', value: stats.maintenance, icon: <Warning />, color: '#FF9800' },
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
          <TextField placeholder="Search equipment..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} sx={{ flexGrow: 1 }} />
          <Button startIcon={<FilterList />}>Filters</Button>
        </Box>

        {loading ? <LinearProgress /> : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Equipment</TableCell>
                  <TableCell>Serial Number</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Assigned To</TableCell>
                  <TableCell>Next Service</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredEquipment.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell><Typography fontWeight={600}>{item.name}</Typography></TableCell>
                    <TableCell>{item.serialNumber}</TableCell>
                    <TableCell>{item.type}</TableCell>
                    <TableCell><Chip label={item.status.replace('_', ' ').toUpperCase()} color={statusColors[item.status]} size="small" /></TableCell>
                    <TableCell>{item.location}</TableCell>
                    <TableCell>{item.assignedTo || '-'}</TableCell>
                    <TableCell>{item.nextService}</TableCell>
                    <TableCell>
                      <Tooltip title="Edit"><IconButton onClick={() => { setSelectedItem(item); setFormData(item); setDialogOpen(true); }}><Edit /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton onClick={() => handleDelete(item.id)} color="error"><Delete /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedItem ? 'Edit Equipment' : 'Add Equipment'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Name" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Serial Number" value={formData.serialNumber || ''} onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Type" value={formData.type || ''} onChange={(e) => setFormData({ ...formData, type: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Status" select value={formData.status || 'available'} onChange={(e) => setFormData({ ...formData, status: e.target.value as Equipment['status'] })}>
                {['available', 'in_use', 'maintenance', 'retired'].map(s => <MenuItem key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Location" value={formData.location || ''} onChange={(e) => setFormData({ ...formData, location: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Assigned To" value={formData.assignedTo || ''} onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Last Service" type="date" InputLabelProps={{ shrink: true }} value={formData.lastService || ''} onChange={(e) => setFormData({ ...formData, lastService: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Next Service" type="date" InputLabelProps={{ shrink: true }} value={formData.nextService || ''} onChange={(e) => setFormData({ ...formData, nextService: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Purchase Date" type="date" InputLabelProps={{ shrink: true }} value={formData.purchaseDate || ''} onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Value (R)" type="number" value={formData.value || ''} onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>{selectedItem ? 'Update' : 'Create'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Equipment;
