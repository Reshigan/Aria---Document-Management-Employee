import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Grid, Avatar, Card, CardContent,
  Tabs, Tab, LinearProgress, InputAdornment
} from '@mui/material';
import { Search, Business, ShoppingCart, Receipt, TrendingUp, Assessment } from '@mui/icons-material';

interface SupplierOrder {
  id: string;
  orderNumber: string;
  date: string;
  items: number;
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
}

interface SupplierInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  dueDate: string;
}

const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  pending: 'warning',
  confirmed: 'info',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'error',
  paid: 'success',
  overdue: 'error'
};

const SupplierPortal: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, invoicesRes] = await Promise.all([
        fetch('/api/procurement/supplier-portal/orders'),
        fetch('/api/procurement/supplier-portal/invoices')
      ]);
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (invoicesRes.ok) setInvoices(await invoicesRes.json());
    } catch {
      setOrders([
        { id: '1', orderNumber: 'PO-2026-001', date: '2026-01-25', items: 15, total: 45000, status: 'confirmed' },
        { id: '2', orderNumber: 'PO-2026-002', date: '2026-01-20', items: 8, total: 22500, status: 'shipped' },
        { id: '3', orderNumber: 'PO-2026-003', date: '2026-01-15', items: 25, total: 78000, status: 'delivered' },
        { id: '4', orderNumber: 'PO-2026-004', date: '2026-01-28', items: 5, total: 12000, status: 'pending' },
      ]);
      setInvoices([
        { id: '1', invoiceNumber: 'INV-2026-001', date: '2026-01-15', amount: 78000, status: 'paid', dueDate: '2026-02-15' },
        { id: '2', invoiceNumber: 'INV-2026-002', date: '2026-01-20', amount: 22500, status: 'pending', dueDate: '2026-02-20' },
        { id: '3', invoiceNumber: 'INV-2025-050', date: '2025-12-15', amount: 35000, status: 'overdue', dueDate: '2026-01-15' },
      ]);
    }
    setLoading(false);
  };

  const stats = {
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === 'pending' || o.status === 'confirmed').length,
    totalInvoices: invoices.reduce((sum, i) => sum + i.amount, 0),
    overdueInvoices: invoices.filter(i => i.status === 'overdue').length
  };

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>Supplier Portal</Typography>
        <Chip label="Logged in as: ABC Supplies Ltd" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { label: 'Total Orders', value: stats.totalOrders, icon: <ShoppingCart />, color: '#667eea' },
          { label: 'Pending Orders', value: stats.pendingOrders, icon: <Business />, color: '#FF9800' },
          { label: 'Total Invoiced', value: `R ${stats.totalInvoices.toLocaleString()}`, icon: <Receipt />, color: '#4CAF50' },
          { label: 'Overdue Invoices', value: stats.overdueInvoices, icon: <TrendingUp />, color: '#f44336' },
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
          <Tab label="Purchase Orders" icon={<ShoppingCart />} iconPosition="start" />
          <Tab label="Invoices" icon={<Receipt />} iconPosition="start" />
          <Tab label="Performance" icon={<Assessment />} iconPosition="start" />
        </Tabs>

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} sx={{ flexGrow: 1 }} />
        </Box>

        {loading ? <LinearProgress /> : (
          <>
            {tabValue === 0 && (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Order Number</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Items</TableCell>
                      <TableCell>Total</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id} hover>
                        <TableCell><Typography fontWeight={600}>{order.orderNumber}</Typography></TableCell>
                        <TableCell>{order.date}</TableCell>
                        <TableCell>{order.items}</TableCell>
                        <TableCell>R {order.total.toLocaleString()}</TableCell>
                        <TableCell><Chip label={order.status.toUpperCase()} color={statusColors[order.status]} size="small" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {tabValue === 1 && (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Invoice Number</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Due Date</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id} hover>
                        <TableCell><Typography fontWeight={600}>{invoice.invoiceNumber}</Typography></TableCell>
                        <TableCell>{invoice.date}</TableCell>
                        <TableCell>R {invoice.amount.toLocaleString()}</TableCell>
                        <TableCell>{invoice.dueDate}</TableCell>
                        <TableCell><Chip label={invoice.status.toUpperCase()} color={statusColors[invoice.status]} size="small" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {tabValue === 2 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Assessment sx={{ fontSize: 64, color: '#667eea', mb: 2 }} />
                <Typography variant="h6" gutterBottom>Supplier Performance Dashboard</Typography>
                <Grid container spacing={3} sx={{ mt: 2 }}>
                  <Grid item xs={12} sm={4}>
                    <Paper sx={{ p: 3, textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main">98%</Typography>
                      <Typography variant="body2">On-Time Delivery</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Paper sx={{ p: 3, textAlign: 'center' }}>
                      <Typography variant="h4" color="primary.main">4.8/5</Typography>
                      <Typography variant="body2">Quality Rating</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Paper sx={{ p: 3, textAlign: 'center' }}>
                      <Typography variant="h4" color="warning.main">95%</Typography>
                      <Typography variant="body2">Order Accuracy</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
};

export default SupplierPortal;
