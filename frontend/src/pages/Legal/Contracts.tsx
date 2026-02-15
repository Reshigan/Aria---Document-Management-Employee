import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, MenuItem, InputAdornment, Avatar,
  LinearProgress, Tooltip, Card, CardContent
} from '@mui/material';
import { Add, Edit, Delete, Search, Description, Gavel, Warning, CheckCircle, FilterList, Download } from '@mui/icons-material';

interface Contract {
  id: string;
  title: string;
  type: 'employment' | 'vendor' | 'client' | 'nda' | 'lease' | 'service';
  party: string;
  status: 'draft' | 'pending_review' | 'active' | 'expired' | 'terminated';
  startDate: string;
  endDate: string;
  value: number;
  renewalDate: string;
  assignedTo: string;
}

const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  draft: 'default',
  pending_review: 'warning',
  active: 'success',
  expired: 'error',
  terminated: 'error'
};

const Contracts: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [formData, setFormData] = useState<Partial<Contract>>({});

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const response = await fetch(`${API_BASE}/api/legal/contracts`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        const mappedData = (Array.isArray(data) ? data : data.contracts || data.data || []).map((c: any) => ({
          id: c.id,
          title: c.title || c.contract_name || '',
          type: c.type || c.contract_type || 'service',
          party: c.party || c.party_name || '',
          status: c.status || 'draft',
          startDate: c.startDate || c.start_date || '',
          endDate: c.endDate || c.end_date || '',
          value: c.value || c.contract_value || 0,
          renewalDate: c.renewalDate || c.renewal_date || '',
          assignedTo: c.assignedTo || c.assigned_to || ''
        }));
        setContracts(mappedData.length > 0 ? mappedData : [
          { id: '1', title: 'Office Lease Agreement', type: 'lease', party: 'Property Holdings Ltd', status: 'active', startDate: '2024-01-01', endDate: '2027-12-31', value: 1200000, renewalDate: '2027-06-30', assignedTo: 'Legal Team' },
          { id: '2', title: 'IT Services Contract', type: 'service', party: 'Tech Solutions Inc', status: 'active', startDate: '2025-06-01', endDate: '2026-05-31', value: 450000, renewalDate: '2026-03-01', assignedTo: 'IT Department' },
          { id: '3', title: 'Employment Contract - J. Smith', type: 'employment', party: 'John Smith', status: 'active', startDate: '2025-03-15', endDate: '2028-03-14', value: 0, renewalDate: '2028-01-15', assignedTo: 'HR Department' },
          { id: '4', title: 'NDA - ABC Corp', type: 'nda', party: 'ABC Corporation', status: 'pending_review', startDate: '2026-02-01', endDate: '2029-01-31', value: 0, renewalDate: '', assignedTo: 'Legal Team' },
          { id: '5', title: 'Vendor Agreement - Supplies Co', type: 'vendor', party: 'Supplies Co Ltd', status: 'expired', startDate: '2024-01-01', endDate: '2025-12-31', value: 250000, renewalDate: '', assignedTo: 'Procurement' },
        ]);
      } else {
        setContracts([
          { id: '1', title: 'Office Lease Agreement', type: 'lease', party: 'Property Holdings Ltd', status: 'active', startDate: '2024-01-01', endDate: '2027-12-31', value: 1200000, renewalDate: '2027-06-30', assignedTo: 'Legal Team' },
          { id: '2', title: 'IT Services Contract', type: 'service', party: 'Tech Solutions Inc', status: 'active', startDate: '2025-06-01', endDate: '2026-05-31', value: 450000, renewalDate: '2026-03-01', assignedTo: 'IT Department' },
          { id: '3', title: 'Employment Contract - J. Smith', type: 'employment', party: 'John Smith', status: 'active', startDate: '2025-03-15', endDate: '2028-03-14', value: 0, renewalDate: '2028-01-15', assignedTo: 'HR Department' },
          { id: '4', title: 'NDA - ABC Corp', type: 'nda', party: 'ABC Corporation', status: 'pending_review', startDate: '2026-02-01', endDate: '2029-01-31', value: 0, renewalDate: '', assignedTo: 'Legal Team' },
          { id: '5', title: 'Vendor Agreement - Supplies Co', type: 'vendor', party: 'Supplies Co Ltd', status: 'expired', startDate: '2024-01-01', endDate: '2025-12-31', value: 250000, renewalDate: '', assignedTo: 'Procurement' },
        ]);
      }
    } catch (err) {
      console.error('Error loading contracts:', err);
      setContracts([
        { id: '1', title: 'Office Lease Agreement', type: 'lease', party: 'Property Holdings Ltd', status: 'active', startDate: '2024-01-01', endDate: '2027-12-31', value: 1200000, renewalDate: '2027-06-30', assignedTo: 'Legal Team' },
        { id: '2', title: 'IT Services Contract', type: 'service', party: 'Tech Solutions Inc', status: 'active', startDate: '2025-06-01', endDate: '2026-05-31', value: 450000, renewalDate: '2026-03-01', assignedTo: 'IT Department' },
        { id: '3', title: 'Employment Contract - J. Smith', type: 'employment', party: 'John Smith', status: 'active', startDate: '2025-03-15', endDate: '2028-03-14', value: 0, renewalDate: '2028-01-15', assignedTo: 'HR Department' },
        { id: '4', title: 'NDA - ABC Corp', type: 'nda', party: 'ABC Corporation', status: 'pending_review', startDate: '2026-02-01', endDate: '2029-01-31', value: 0, renewalDate: '', assignedTo: 'Legal Team' },
        { id: '5', title: 'Vendor Agreement - Supplies Co', type: 'vendor', party: 'Supplies Co Ltd', status: 'expired', startDate: '2024-01-01', endDate: '2025-12-31', value: 250000, renewalDate: '', assignedTo: 'Procurement' },
      ]);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const method = selectedContract ? 'PUT' : 'POST';
      const url = selectedContract ? `${API_BASE}/api/legal/contracts/${selectedContract.id}` : `${API_BASE}/api/legal/contracts`;
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
        await fetch(`${API_BASE}/api/legal/contracts/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        fetchContracts();
      } catch (err) {
        console.error('Error deleting contract:', err);
      }
    }
  };

  const filteredContracts = contracts.filter(contract =>
    contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.party.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: contracts.length,
    active: contracts.filter(c => c.status === 'active').length,
    expiringSoon: contracts.filter(c => c.status === 'active' && new Date(c.endDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)).length,
    totalValue: contracts.reduce((sum, c) => sum + c.value, 0)
  };

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>Contract Management</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<Download />} sx={{ color: 'white', borderColor: 'white' }}>Export</Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => { setSelectedContract(null); setFormData({}); setDialogOpen(true); }}
            sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>New Contract</Button>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { label: 'Total Contracts', value: stats.total, icon: <Description />, color: '#667eea' },
          { label: 'Active', value: stats.active, icon: <CheckCircle />, color: '#4CAF50' },
          { label: 'Expiring Soon', value: stats.expiringSoon, icon: <Warning />, color: '#FF9800' },
          { label: 'Total Value', value: `R ${Number(stats.totalValue ?? 0).toLocaleString()}`, icon: <Gavel />, color: '#E91E63' },
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
                  <TableCell>Type</TableCell>
                  <TableCell>Party</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Start Date</TableCell>
                  <TableCell>End Date</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredContracts.map((contract) => (
                  <TableRow key={contract.id} hover>
                    <TableCell><Typography fontWeight={600}>{contract.title}</Typography></TableCell>
                    <TableCell><Chip label={contract.type.toUpperCase()} size="small" /></TableCell>
                    <TableCell>{contract.party}</TableCell>
                    <TableCell><Chip label={contract.status.replace('_', ' ').toUpperCase()} color={statusColors[contract.status]} size="small" /></TableCell>
                    <TableCell>{contract.startDate}</TableCell>
                    <TableCell>{contract.endDate}</TableCell>
                    <TableCell>{contract.value > 0 ? `R ${Number(contract.value ?? 0).toLocaleString()}` : '-'}</TableCell>
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
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Type" select value={formData.type || 'service'} onChange={(e) => setFormData({ ...formData, type: e.target.value as Contract['type'] })}>
                {['employment', 'vendor', 'client', 'nda', 'lease', 'service'].map(t => <MenuItem key={t} value={t}>{t.toUpperCase()}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Party" value={formData.party || ''} onChange={(e) => setFormData({ ...formData, party: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Status" select value={formData.status || 'draft'} onChange={(e) => setFormData({ ...formData, status: e.target.value as Contract['status'] })}>
                {['draft', 'pending_review', 'active', 'expired', 'terminated'].map(s => <MenuItem key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Value (R)" type="number" value={formData.value || ''} onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Start Date" type="date" InputLabelProps={{ shrink: true }} value={formData.startDate || ''} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="End Date" type="date" InputLabelProps={{ shrink: true }} value={formData.endDate || ''} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Renewal Date" type="date" InputLabelProps={{ shrink: true }} value={formData.renewalDate || ''} onChange={(e) => setFormData({ ...formData, renewalDate: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Assigned To" value={formData.assignedTo || ''} onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })} /></Grid>
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

export default Contracts;
