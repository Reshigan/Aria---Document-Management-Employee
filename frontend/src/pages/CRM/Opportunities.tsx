import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, MenuItem, InputAdornment, Avatar,
  LinearProgress, Tooltip, Card, CardContent
} from '@mui/material';
import {
  Add, Edit, Delete, Search, AttachMoney, Business, TrendingUp,
  FilterList, Download, CalendarToday
} from '@mui/icons-material';

interface Opportunity {
  id: string;
  name: string;
  customer: string;
  value: number;
  stage: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  probability: number;
  expectedCloseDate: string;
  assignedTo: string;
  source: string;
  notes: string;
}

const stageColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  prospecting: 'info',
  qualification: 'primary',
  proposal: 'warning',
  negotiation: 'secondary',
  closed_won: 'success',
  closed_lost: 'error'
};

const Opportunities: React.FC = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [formData, setFormData] = useState<Partial<Opportunity>>({});

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const response = await fetch(`${API_BASE}/api/crm/opportunities`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        const mappedData = (Array.isArray(data) ? data : data.opportunities || data.data || []).map((o: any) => ({
          id: o.id,
          name: o.name || o.opportunity_name || 'Unknown',
          customer: o.customer || o.customer_name || 'Unknown',
          value: o.value || o.deal_value || 0,
          stage: o.stage || 'prospecting',
          probability: o.probability || 0,
          expectedCloseDate: o.expectedCloseDate || o.expected_close_date || '',
          assignedTo: o.assignedTo || o.assigned_to || '',
          source: o.source || '',
          notes: o.notes || ''
        }));
        setOpportunities(mappedData.length > 0 ? mappedData : [
          { id: '1', name: 'ERP Implementation - ABC Corp', customer: 'ABC Corp', value: 250000, stage: 'proposal', probability: 60, expectedCloseDate: '2026-02-28', assignedTo: 'Sarah', source: 'Website Lead', notes: 'Full ERP implementation project' },
          { id: '2', name: 'Payroll Module - XYZ Ltd', customer: 'XYZ Ltd', value: 75000, stage: 'negotiation', probability: 80, expectedCloseDate: '2026-02-15', assignedTo: 'Mike', source: 'Referral', notes: 'Payroll and HR modules' },
          { id: '3', name: 'Inventory System - Tech Solutions', customer: 'Tech Solutions', value: 120000, stage: 'qualification', probability: 40, expectedCloseDate: '2026-03-31', assignedTo: 'Sarah', source: 'Trade Show', notes: 'Warehouse management focus' },
          { id: '4', name: 'Financial Suite - Global Inc', customer: 'Global Inc', value: 180000, stage: 'closed_won', probability: 100, expectedCloseDate: '2026-01-20', assignedTo: 'John', source: 'Cold Call', notes: 'Won - Implementation starting' },
        ]);
      } else {
        setOpportunities([
          { id: '1', name: 'ERP Implementation - ABC Corp', customer: 'ABC Corp', value: 250000, stage: 'proposal', probability: 60, expectedCloseDate: '2026-02-28', assignedTo: 'Sarah', source: 'Website Lead', notes: 'Full ERP implementation project' },
          { id: '2', name: 'Payroll Module - XYZ Ltd', customer: 'XYZ Ltd', value: 75000, stage: 'negotiation', probability: 80, expectedCloseDate: '2026-02-15', assignedTo: 'Mike', source: 'Referral', notes: 'Payroll and HR modules' },
          { id: '3', name: 'Inventory System - Tech Solutions', customer: 'Tech Solutions', value: 120000, stage: 'qualification', probability: 40, expectedCloseDate: '2026-03-31', assignedTo: 'Sarah', source: 'Trade Show', notes: 'Warehouse management focus' },
          { id: '4', name: 'Financial Suite - Global Inc', customer: 'Global Inc', value: 180000, stage: 'closed_won', probability: 100, expectedCloseDate: '2026-01-20', assignedTo: 'John', source: 'Cold Call', notes: 'Won - Implementation starting' },
        ]);
      }
    } catch (err) {
      console.error('Error loading opportunities:', err);
      setOpportunities([
        { id: '1', name: 'ERP Implementation - ABC Corp', customer: 'ABC Corp', value: 250000, stage: 'proposal', probability: 60, expectedCloseDate: '2026-02-28', assignedTo: 'Sarah', source: 'Website Lead', notes: 'Full ERP implementation project' },
        { id: '2', name: 'Payroll Module - XYZ Ltd', customer: 'XYZ Ltd', value: 75000, stage: 'negotiation', probability: 80, expectedCloseDate: '2026-02-15', assignedTo: 'Mike', source: 'Referral', notes: 'Payroll and HR modules' },
        { id: '3', name: 'Inventory System - Tech Solutions', customer: 'Tech Solutions', value: 120000, stage: 'qualification', probability: 40, expectedCloseDate: '2026-03-31', assignedTo: 'Sarah', source: 'Trade Show', notes: 'Warehouse management focus' },
        { id: '4', name: 'Financial Suite - Global Inc', customer: 'Global Inc', value: 180000, stage: 'closed_won', probability: 100, expectedCloseDate: '2026-01-20', assignedTo: 'John', source: 'Cold Call', notes: 'Won - Implementation starting' },
      ]);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const method = selectedOpp ? 'PUT' : 'POST';
      const url = selectedOpp ? `${API_BASE}/api/crm/opportunities/${selectedOpp.id}` : `${API_BASE}/api/crm/opportunities`;
      await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify(formData) });
      fetchOpportunities();
      setDialogOpen(false);
      setFormData({});
      setSelectedOpp(null);
    } catch (err) {
      console.error('Error saving opportunity:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this opportunity?')) {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
        await fetch(`${API_BASE}/api/crm/opportunities/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        fetchOpportunities();
      } catch (err) {
        console.error('Error deleting opportunity:', err);
      }
    }
  };

  const filteredOpps = opportunities.filter(opp =>
    opp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opp.customer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: opportunities.length,
    totalValue: opportunities.reduce((sum, o) => sum + o.value, 0),
    weightedValue: opportunities.reduce((sum, o) => sum + (o.value * o.probability / 100), 0),
    wonValue: opportunities.filter(o => o.stage === 'closed_won').reduce((sum, o) => sum + o.value, 0)
  };

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>Sales Opportunities</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<Download />} sx={{ color: 'white', borderColor: 'white' }}>Export</Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => { setSelectedOpp(null); setFormData({}); setDialogOpen(true); }}
            sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>New Opportunity</Button>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { label: 'Total Pipeline', value: `R ${stats.totalValue.toLocaleString()}`, icon: <AttachMoney />, color: '#667eea' },
          { label: 'Weighted Value', value: `R ${Math.round(stats.weightedValue).toLocaleString()}`, icon: <TrendingUp />, color: '#4CAF50' },
          { label: 'Won This Month', value: `R ${stats.wonValue.toLocaleString()}`, icon: <Business />, color: '#FF9800' },
          { label: 'Active Deals', value: stats.total, icon: <TrendingUp />, color: '#E91E63' },
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
          <TextField placeholder="Search opportunities..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} sx={{ flexGrow: 1 }} />
          <Button startIcon={<FilterList />}>Filters</Button>
        </Box>

        {loading ? <LinearProgress /> : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Opportunity</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Stage</TableCell>
                  <TableCell>Probability</TableCell>
                  <TableCell>Expected Close</TableCell>
                  <TableCell>Assigned To</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredOpps.map((opp) => (
                  <TableRow key={opp.id} hover>
                    <TableCell><Typography fontWeight={600}>{opp.name}</Typography></TableCell>
                    <TableCell>{opp.customer}</TableCell>
                    <TableCell>R {opp.value.toLocaleString()}</TableCell>
                    <TableCell><Chip label={opp.stage.replace('_', ' ').toUpperCase()} color={stageColors[opp.stage]} size="small" /></TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress variant="determinate" value={opp.probability} sx={{ width: 60, height: 8, borderRadius: 4 }} />
                        <Typography variant="body2">{opp.probability}%</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalendarToday fontSize="small" color="action" />
                        <Typography variant="body2">{opp.expectedCloseDate}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{opp.assignedTo}</TableCell>
                    <TableCell>
                      <Tooltip title="Edit">
                        <IconButton onClick={() => { setSelectedOpp(opp); setFormData(opp); setDialogOpen(true); }}><Edit /></IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton onClick={() => handleDelete(opp.id)} color="error"><Delete /></IconButton>
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
        <DialogTitle>{selectedOpp ? 'Edit Opportunity' : 'New Opportunity'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}><TextField fullWidth label="Opportunity Name" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Customer" value={formData.customer || ''} onChange={(e) => setFormData({ ...formData, customer: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Value (R)" type="number" value={formData.value || ''} onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })} /></Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Stage" select value={formData.stage || 'prospecting'} onChange={(e) => setFormData({ ...formData, stage: e.target.value as Opportunity['stage'] })}>
                {['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'].map(s => <MenuItem key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Probability (%)" type="number" value={formData.probability || ''} onChange={(e) => setFormData({ ...formData, probability: Number(e.target.value) })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Expected Close Date" type="date" InputLabelProps={{ shrink: true }} value={formData.expectedCloseDate || ''} onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Assigned To" value={formData.assignedTo || ''} onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Notes" multiline rows={3} value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>{selectedOpp ? 'Update' : 'Create'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Opportunities;
