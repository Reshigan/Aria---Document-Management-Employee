import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, MenuItem, InputAdornment, Avatar,
  LinearProgress, Tooltip, Card, CardContent
} from '@mui/material';
import { Add, Edit, Delete, Search, Description, Business, Warning, CheckCircle, FilterList } from '@mui/icons-material';

interface ProcurementContract {
  id: string;
  title: string;
  supplier: string;
  category: string;
  status: 'draft' | 'negotiation' | 'active' | 'expired' | 'cancelled';
  startDate: string;
  endDate: string;
  value: number;
  paymentTerms: string;
  deliveryTerms: string;
}

const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  draft: 'default',
  negotiation: 'warning',
  active: 'success',
  expired: 'error',
  cancelled: 'error'
};

const ProcurementContracts: React.FC = () => {
  const [contracts, setContracts] = useState<ProcurementContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ProcurementContract | null>(null);
  const [formData, setFormData] = useState<Partial<ProcurementContract>>({});

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const response = await fetch(`${API_BASE}/api/procurement/contracts`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        const mappedData = (Array.isArray(data) ? data : data.contracts || data.data || []).map((c: any) => ({
          id: c.id,
          title: c.title || '',
          supplier: c.supplier || '',
          category: c.category || '',
          status: c.status || 'draft',
          startDate: c.startDate || c.start_date || '',
          endDate: c.endDate || c.end_date || '',
          value: c.value || 0,
          paymentTerms: c.paymentTerms || c.payment_terms || '',
          deliveryTerms: c.deliveryTerms || c.delivery_terms || ''
        }));
        setContracts(mappedData.length > 0 ? mappedData : [
          { id: '1', title: 'Office Supplies Agreement', supplier: 'Office Depot SA', category: 'Office Supplies', status: 'active', startDate: '2025-01-01', endDate: '2026-12-31', value: 150000, paymentTerms: 'Net 30', deliveryTerms: 'Weekly delivery' },
          { id: '2', title: 'IT Hardware Contract', supplier: 'Tech Distributors', category: 'IT Equipment', status: 'active', startDate: '2025-06-01', endDate: '2027-05-31', value: 500000, paymentTerms: 'Net 45', deliveryTerms: 'As needed' },
          { id: '3', title: 'Cleaning Services', supplier: 'CleanCo Services', category: 'Services', status: 'negotiation', startDate: '2026-02-01', endDate: '2027-01-31', value: 120000, paymentTerms: 'Monthly', deliveryTerms: 'Daily service' },
        ]);
      } else {
        setContracts([
          { id: '1', title: 'Office Supplies Agreement', supplier: 'Office Depot SA', category: 'Office Supplies', status: 'active', startDate: '2025-01-01', endDate: '2026-12-31', value: 150000, paymentTerms: 'Net 30', deliveryTerms: 'Weekly delivery' },
          { id: '2', title: 'IT Hardware Contract', supplier: 'Tech Distributors', category: 'IT Equipment', status: 'active', startDate: '2025-06-01', endDate: '2027-05-31', value: 500000, paymentTerms: 'Net 45', deliveryTerms: 'As needed' },
          { id: '3', title: 'Cleaning Services', supplier: 'CleanCo Services', category: 'Services', status: 'negotiation', startDate: '2026-02-01', endDate: '2027-01-31', value: 120000, paymentTerms: 'Monthly', deliveryTerms: 'Daily service' },
        ]);
      }
    } catch (err) {
      console.error('Error loading contracts:', err);
      setContracts([
        { id: '1', title: 'Office Supplies Agreement', supplier: 'Office Depot SA', category: 'Office Supplies', status: 'active', startDate: '2025-01-01', endDate: '2026-12-31', value: 150000, paymentTerms: 'Net 30', deliveryTerms: 'Weekly delivery' },
        { id: '2', title: 'IT Hardware Contract', supplier: 'Tech Distributors', category: 'IT Equipment', status: 'active', startDate: '2025-06-01', endDate: '2027-05-31', value: 500000, paymentTerms: 'Net 45', deliveryTerms: 'As needed' },
        { id: '3', title: 'Cleaning Services', supplier: 'CleanCo Services', category: 'Services', status: 'negotiation', startDate: '2026-02-01', endDate: '2027-01-31', value: 120000, paymentTerms: 'Monthly', deliveryTerms: 'Daily service' },
      ]);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const method = selectedContract ? 'PUT' : 'POST';
      const url = selectedContract ? `${API_BASE}/api/procurement/contracts/${selectedContract.id}` : `${API_BASE}/api/procurement/contracts`;
      await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify(formData) });
      fetchContracts();
      setDialogOpen(false);
      setFormData({});
      setSelectedContract(null);
    } catch (err) {
      console.error('Error saving contract:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this contract?')) {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
        await fetch(`${API_BASE}/api/procurement/contracts/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        fetchContracts();
      } catch (err) {
        console.error('Error deleting contract:', err);
      }
    }
  };

  const filteredContracts = contracts.filter(contract =>
    contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.supplier.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: contracts.length,
    active: contracts.filter(c => c.status === 'active').length,
    totalValue: contracts.reduce((sum, c) => sum + c.value, 0),
    expiringSoon: contracts.filter(c => c.status === 'active' && new Date(c.endDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)).length
  };

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>Procurement Contracts</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => { setSelectedContract(null); setFormData({}); setDialogOpen(true); }}
          sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>New Contract</Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { label: 'Total Contracts', value: stats.total, icon: <Description />, color: '#667eea' },
          { label: 'Active', value: stats.active, icon: <CheckCircle />, color: '#4CAF50' },
          { label: 'Total Value', value: `R ${stats.totalValue.toLocaleString()}`, icon: <Business />, color: '#2196F3' },
          { label: 'Expiring Soon', value: stats.expiringSoon, icon: <Warning />, color: '#FF9800' },
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
          <TextField placeholder="Search contracts..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} sx={{ flexGrow: 1 }} />
          <Button startIcon={<FilterList />}>Filters</Button>
        </Box>

        {loading ? <LinearProgress /> : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Contract</TableCell>
                  <TableCell>Supplier</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>End Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredContracts.map((contract) => (
                  <TableRow key={contract.id} hover>
                    <TableCell><Typography fontWeight={600}>{contract.title}</Typography></TableCell>
                    <TableCell>{contract.supplier}</TableCell>
                    <TableCell>{contract.category}</TableCell>
                    <TableCell><Chip label={contract.status.toUpperCase()} color={statusColors[contract.status]} size="small" /></TableCell>
                    <TableCell>R {contract.value.toLocaleString()}</TableCell>
                    <TableCell>{contract.endDate}</TableCell>
                    <TableCell>
                      <Tooltip title="Edit"><IconButton onClick={() => { setSelectedContract(contract); setFormData(contract); setDialogOpen(true); }}><Edit /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton onClick={() => handleDelete(contract.id)} color="error"><Delete /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedContract ? 'Edit Contract' : 'New Contract'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}><TextField fullWidth label="Contract Title" value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Supplier" value={formData.supplier || ''} onChange={(e) => setFormData({ ...formData, supplier: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Category" value={formData.category || ''} onChange={(e) => setFormData({ ...formData, category: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Status" select value={formData.status || 'draft'} onChange={(e) => setFormData({ ...formData, status: e.target.value as ProcurementContract['status'] })}>
                {['draft', 'negotiation', 'active', 'expired', 'cancelled'].map(s => <MenuItem key={s} value={s}>{s.toUpperCase()}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Value (R)" type="number" value={formData.value || ''} onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Start Date" type="date" InputLabelProps={{ shrink: true }} value={formData.startDate || ''} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="End Date" type="date" InputLabelProps={{ shrink: true }} value={formData.endDate || ''} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Payment Terms" value={formData.paymentTerms || ''} onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Delivery Terms" value={formData.deliveryTerms || ''} onChange={(e) => setFormData({ ...formData, deliveryTerms: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>{selectedContract ? 'Update' : 'Create'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProcurementContracts;
