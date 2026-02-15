import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, MenuItem, InputAdornment, Avatar,
  LinearProgress, Tooltip, Card, CardContent
} from '@mui/material';
import {
  Add, Edit, Delete, Search, Phone, Email, Business, TrendingUp,
  PersonAdd, FilterList, Download, Upload
} from '@mui/icons-material';

interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  value: number;
  assignedTo: string;
  createdAt: string;
  lastContact: string;
  notes: string;
}

const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  new: 'info',
  contacted: 'primary',
  qualified: 'secondary',
  proposal: 'warning',
  negotiation: 'warning',
  won: 'success',
  lost: 'error'
};

const Leads: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [formData, setFormData] = useState<Partial<Lead>>({});

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const response = await fetch(`${API_BASE}/api/crm/leads`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        const mappedData = (Array.isArray(data) ? data : data.leads || data.data || []).map((l: any) => ({
          id: l.id,
          name: l.name || l.lead_name || 'Unknown',
          company: l.company || l.company_name || '',
          email: l.email || '',
          phone: l.phone || '',
          source: l.source || '',
          status: l.status || 'new',
          value: l.value || l.estimated_value || 0,
          assignedTo: l.assignedTo || l.assigned_to || '',
          createdAt: l.createdAt || l.created_at || '',
          lastContact: l.lastContact || l.last_contact || '',
          notes: l.notes || ''
        }));
        setLeads(mappedData.length > 0 ? mappedData : [
          { id: '1', name: 'John Smith', company: 'ABC Corp', email: 'john@abc.com', phone: '+27 11 123 4567', source: 'Website', status: 'new', value: 50000, assignedTo: 'Sarah', createdAt: '2026-01-15', lastContact: '2026-01-20', notes: 'Interested in ERP solution' },
          { id: '2', name: 'Jane Doe', company: 'XYZ Ltd', email: 'jane@xyz.co.za', phone: '+27 21 987 6543', source: 'Referral', status: 'qualified', value: 120000, assignedTo: 'Mike', createdAt: '2026-01-10', lastContact: '2026-01-25', notes: 'Ready for demo' },
          { id: '3', name: 'Bob Wilson', company: 'Tech Solutions', email: 'bob@tech.com', phone: '+27 31 555 1234', source: 'Trade Show', status: 'proposal', value: 85000, assignedTo: 'Sarah', createdAt: '2026-01-05', lastContact: '2026-01-28', notes: 'Proposal sent' },
        ]);
      } else {
        setLeads([
          { id: '1', name: 'John Smith', company: 'ABC Corp', email: 'john@abc.com', phone: '+27 11 123 4567', source: 'Website', status: 'new', value: 50000, assignedTo: 'Sarah', createdAt: '2026-01-15', lastContact: '2026-01-20', notes: 'Interested in ERP solution' },
          { id: '2', name: 'Jane Doe', company: 'XYZ Ltd', email: 'jane@xyz.co.za', phone: '+27 21 987 6543', source: 'Referral', status: 'qualified', value: 120000, assignedTo: 'Mike', createdAt: '2026-01-10', lastContact: '2026-01-25', notes: 'Ready for demo' },
          { id: '3', name: 'Bob Wilson', company: 'Tech Solutions', email: 'bob@tech.com', phone: '+27 31 555 1234', source: 'Trade Show', status: 'proposal', value: 85000, assignedTo: 'Sarah', createdAt: '2026-01-05', lastContact: '2026-01-28', notes: 'Proposal sent' },
        ]);
      }
    } catch (err) {
      console.error('Error loading leads:', err);
      setLeads([
        { id: '1', name: 'John Smith', company: 'ABC Corp', email: 'john@abc.com', phone: '+27 11 123 4567', source: 'Website', status: 'new', value: 50000, assignedTo: 'Sarah', createdAt: '2026-01-15', lastContact: '2026-01-20', notes: 'Interested in ERP solution' },
        { id: '2', name: 'Jane Doe', company: 'XYZ Ltd', email: 'jane@xyz.co.za', phone: '+27 21 987 6543', source: 'Referral', status: 'qualified', value: 120000, assignedTo: 'Mike', createdAt: '2026-01-10', lastContact: '2026-01-25', notes: 'Ready for demo' },
        { id: '3', name: 'Bob Wilson', company: 'Tech Solutions', email: 'bob@tech.com', phone: '+27 31 555 1234', source: 'Trade Show', status: 'proposal', value: 85000, assignedTo: 'Sarah', createdAt: '2026-01-05', lastContact: '2026-01-28', notes: 'Proposal sent' },
      ]);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const method = selectedLead ? 'PUT' : 'POST';
      const url = selectedLead ? `${API_BASE}/api/crm/leads/${selectedLead.id}` : `${API_BASE}/api/crm/leads`;
      await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify(formData) });
      fetchLeads();
      setDialogOpen(false);
      setFormData({});
      setSelectedLead(null);
    } catch (err) {
      console.error('Error saving lead:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
        await fetch(`${API_BASE}/api/crm/leads/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        fetchLeads();
      } catch (err) {
        console.error('Error deleting lead:', err);
      }
    }
  };

  const filteredLeads = leads.filter(lead =>
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    qualified: leads.filter(l => l.status === 'qualified').length,
    totalValue: leads.reduce((sum, l) => sum + l.value, 0)
  };

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>Lead Management</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<Upload />} sx={{ color: 'white', borderColor: 'white' }}>Import</Button>
          <Button variant="outlined" startIcon={<Download />} sx={{ color: 'white', borderColor: 'white' }}>Export</Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => { setSelectedLead(null); setFormData({}); setDialogOpen(true); }}
            sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>New Lead</Button>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { label: 'Total Leads', value: stats.total, icon: <PersonAdd />, color: '#667eea' },
          { label: 'New Leads', value: stats.new, icon: <TrendingUp />, color: '#4CAF50' },
          { label: 'Qualified', value: stats.qualified, icon: <Business />, color: '#FF9800' },
          { label: 'Pipeline Value', value: `R ${Number(stats.totalValue ?? 0).toLocaleString()}`, icon: <TrendingUp />, color: '#E91E63' },
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
          <TextField placeholder="Search leads..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} sx={{ flexGrow: 1 }} />
          <Button startIcon={<FilterList />}>Filters</Button>
        </Box>

        {loading ? <LinearProgress /> : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Lead</TableCell>
                  <TableCell>Company</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Assigned To</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: '#667eea' }}>{lead.name.charAt(0)}</Avatar>
                        <Typography fontWeight={600}>{lead.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{lead.company}</TableCell>
                    <TableCell>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Email fontSize="small" color="action" />
                          <Typography variant="body2">{lead.email}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Phone fontSize="small" color="action" />
                          <Typography variant="body2">{lead.phone}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{lead.source}</TableCell>
                    <TableCell><Chip label={lead.status.toUpperCase()} color={statusColors[lead.status]} size="small" /></TableCell>
                    <TableCell>R {Number(lead.value ?? 0).toLocaleString()}</TableCell>
                    <TableCell>{lead.assignedTo}</TableCell>
                    <TableCell>
                      <Tooltip title="Edit">
                        <IconButton onClick={() => { setSelectedLead(lead); setFormData(lead); setDialogOpen(true); }}><Edit /></IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton onClick={() => handleDelete(lead.id)} color="error"><Delete /></IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedLead ? 'Edit Lead' : 'New Lead'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Name" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Company" value={formData.company || ''} onChange={(e) => setFormData({ ...formData, company: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Email" type="email" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Phone" value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Source" select value={formData.source || ''} onChange={(e) => setFormData({ ...formData, source: e.target.value })}>
                {['Website', 'Referral', 'Trade Show', 'Cold Call', 'Social Media', 'Other'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Status" select value={formData.status || 'new'} onChange={(e) => setFormData({ ...formData, status: e.target.value as Lead['status'] })}>
                {['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'].map(s => <MenuItem key={s} value={s}>{s.toUpperCase()}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Value (R)" type="number" value={formData.value || ''} onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Assigned To" value={formData.assignedTo || ''} onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Notes" multiline rows={2} value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>{selectedLead ? 'Update' : 'Create'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Leads;
