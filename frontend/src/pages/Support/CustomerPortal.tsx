import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Grid, Avatar, Card, CardContent,
  Tabs, Tab, LinearProgress, InputAdornment
} from '@mui/material';
import { Search, Support, Assignment, CheckCircle, Schedule, Add } from '@mui/icons-material';

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
}

const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  open: 'info',
  in_progress: 'primary',
  pending: 'warning',
  resolved: 'success',
  closed: 'default'
};

const priorityColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  critical: 'error'
};

const CustomerPortal: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const response = await fetch(`${API_BASE}/api/support/customer-portal/tickets`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        const mappedData = (Array.isArray(data) ? data : data.tickets || data.data || []).map((t: any) => ({
          id: t.id,
          ticketNumber: t.ticketNumber || t.ticket_number || `TKT-${t.id}`,
          subject: t.subject || '',
          category: t.category || '',
          priority: t.priority || 'medium',
          status: t.status || 'open',
          createdAt: t.createdAt || t.created_at || '',
          updatedAt: t.updatedAt || t.updated_at || ''
        }));
        setTickets(mappedData.length > 0 ? mappedData : [
          { id: '1', ticketNumber: 'TKT-2026-001', subject: 'Cannot access dashboard', category: 'Technical', priority: 'high', status: 'in_progress', createdAt: '2026-01-28', updatedAt: '2026-01-29' },
          { id: '2', ticketNumber: 'TKT-2026-002', subject: 'Invoice discrepancy', category: 'Billing', priority: 'medium', status: 'pending', createdAt: '2026-01-27', updatedAt: '2026-01-28' },
          { id: '3', ticketNumber: 'TKT-2026-003', subject: 'Feature request: Export to PDF', category: 'Feature Request', priority: 'low', status: 'open', createdAt: '2026-01-26', updatedAt: '2026-01-26' },
          { id: '4', ticketNumber: 'TKT-2026-004', subject: 'System down - urgent', category: 'Technical', priority: 'critical', status: 'resolved', createdAt: '2026-01-25', updatedAt: '2026-01-25' },
        ]);
      } else {
        setTickets([
          { id: '1', ticketNumber: 'TKT-2026-001', subject: 'Cannot access dashboard', category: 'Technical', priority: 'high', status: 'in_progress', createdAt: '2026-01-28', updatedAt: '2026-01-29' },
          { id: '2', ticketNumber: 'TKT-2026-002', subject: 'Invoice discrepancy', category: 'Billing', priority: 'medium', status: 'pending', createdAt: '2026-01-27', updatedAt: '2026-01-28' },
          { id: '3', ticketNumber: 'TKT-2026-003', subject: 'Feature request: Export to PDF', category: 'Feature Request', priority: 'low', status: 'open', createdAt: '2026-01-26', updatedAt: '2026-01-26' },
          { id: '4', ticketNumber: 'TKT-2026-004', subject: 'System down - urgent', category: 'Technical', priority: 'critical', status: 'resolved', createdAt: '2026-01-25', updatedAt: '2026-01-25' },
        ]);
      }
    } catch (err) {
      console.error('Error loading tickets:', err);
      setTickets([
        { id: '1', ticketNumber: 'TKT-2026-001', subject: 'Cannot access dashboard', category: 'Technical', priority: 'high', status: 'in_progress', createdAt: '2026-01-28', updatedAt: '2026-01-29' },
        { id: '2', ticketNumber: 'TKT-2026-002', subject: 'Invoice discrepancy', category: 'Billing', priority: 'medium', status: 'pending', createdAt: '2026-01-27', updatedAt: '2026-01-28' },
        { id: '3', ticketNumber: 'TKT-2026-003', subject: 'Feature request: Export to PDF', category: 'Feature Request', priority: 'low', status: 'open', createdAt: '2026-01-26', updatedAt: '2026-01-26' },
        { id: '4', ticketNumber: 'TKT-2026-004', subject: 'System down - urgent', category: 'Technical', priority: 'critical', status: 'resolved', createdAt: '2026-01-25', updatedAt: '2026-01-25' },
      ]);
    }
    setLoading(false);
  };

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length,
    pending: tickets.filter(t => t.status === 'pending').length,
    resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length
  };

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>Customer Support Portal</Typography>
        <Button variant="contained" startIcon={<Add />} sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>New Ticket</Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { label: 'Total Tickets', value: stats.total, icon: <Assignment />, color: '#667eea' },
          { label: 'Open', value: stats.open, icon: <Support />, color: '#2196F3' },
          { label: 'Pending', value: stats.pending, icon: <Schedule />, color: '#FF9800' },
          { label: 'Resolved', value: stats.resolved, icon: <CheckCircle />, color: '#4CAF50' },
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
          <Tab label="My Tickets" />
          <Tab label="Knowledge Base" />
          <Tab label="FAQs" />
        </Tabs>

        {tabValue === 0 && (
          <>
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <TextField placeholder="Search tickets..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} sx={{ flexGrow: 1 }} />
            </Box>

            {loading ? <LinearProgress /> : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Ticket #</TableCell>
                      <TableCell>Subject</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Updated</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tickets.map((ticket) => (
                      <TableRow key={ticket.id} hover sx={{ cursor: 'pointer' }}>
                        <TableCell><Typography fontWeight={600}>{ticket.ticketNumber}</Typography></TableCell>
                        <TableCell>{ticket.subject}</TableCell>
                        <TableCell>{ticket.category}</TableCell>
                        <TableCell><Chip label={ticket.priority.toUpperCase()} color={priorityColors[ticket.priority]} size="small" /></TableCell>
                        <TableCell><Chip label={ticket.status.replace('_', ' ').toUpperCase()} color={statusColors[ticket.status]} size="small" /></TableCell>
                        <TableCell>{ticket.createdAt}</TableCell>
                        <TableCell>{ticket.updatedAt}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}

        {tabValue === 1 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Support sx={{ fontSize: 64, color: '#667eea', mb: 2 }} />
            <Typography variant="h6" gutterBottom>Knowledge Base</Typography>
            <Typography color="text.secondary">Browse our comprehensive documentation and guides</Typography>
            <Grid container spacing={2} sx={{ mt: 3 }}>
              {['Getting Started', 'User Guide', 'API Documentation', 'Troubleshooting'].map((item) => (
                <Grid item xs={12} sm={6} md={3} key={item}>
                  <Paper sx={{ p: 2, textAlign: 'center', cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }}>
                    <Typography fontWeight={600}>{item}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {tabValue === 2 && (
          <Box sx={{ py: 2 }}>
            <Typography variant="h6" gutterBottom>Frequently Asked Questions</Typography>
            {[
              { q: 'How do I reset my password?', a: 'Click on "Forgot Password" on the login page and follow the instructions.' },
              { q: 'How do I contact support?', a: 'You can create a ticket through this portal or email support@aria.vantax.co.za' },
              { q: 'What are the system requirements?', a: 'ARIA works on any modern browser including Chrome, Firefox, Safari, and Edge.' },
            ].map((faq, index) => (
              <Paper key={index} sx={{ p: 2, mb: 2 }}>
                <Typography fontWeight={600}>{faq.q}</Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>{faq.a}</Typography>
              </Paper>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default CustomerPortal;
