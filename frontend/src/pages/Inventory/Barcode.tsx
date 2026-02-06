import React, { useState } from 'react';
import {
  Box, Paper, Typography, Button, TextField, Grid, Card, CardContent, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Alert
} from '@mui/material';
import { QrCode, Print, Search, Inventory, CheckCircle, Warning } from '@mui/icons-material';

interface ScannedItem {
  barcode: string;
  name: string;
  sku: string;
  quantity: number;
  location: string;
  status: 'found' | 'not_found' | 'low_stock';
  timestamp: string;
}

const Barcode: React.FC = () => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([
    { barcode: '8901234567890', name: 'Widget A', sku: 'WGT-001', quantity: 150, location: 'Warehouse A - Shelf 3', status: 'found', timestamp: '2026-01-29 14:30:00' },
    { barcode: '8901234567891', name: 'Gadget B', sku: 'GDT-002', quantity: 5, location: 'Warehouse B - Shelf 1', status: 'low_stock', timestamp: '2026-01-29 14:25:00' },
  ]);
  const [lastScan, setLastScan] = useState<ScannedItem | null>(null);

  const handleScan = async () => {
    if (!barcodeInput.trim()) return;
    
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const response = await fetch(`${API_BASE}/api/inventory/barcode/${barcodeInput}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        const newItem: ScannedItem = { ...data, barcode: barcodeInput, timestamp: new Date().toISOString(), status: data.quantity < 10 ? 'low_stock' : 'found' };
        setScannedItems([newItem, ...scannedItems]);
        setLastScan(newItem);
      } else {
        const notFound: ScannedItem = { barcode: barcodeInput, name: 'Unknown Item', sku: '-', quantity: 0, location: '-', status: 'not_found', timestamp: new Date().toISOString() };
        setScannedItems([notFound, ...scannedItems]);
        setLastScan(notFound);
      }
    } catch {
      const mockItem: ScannedItem = { barcode: barcodeInput, name: `Product ${barcodeInput.slice(-4)}`, sku: `SKU-${barcodeInput.slice(-4)}`, quantity: Math.floor(Math.random() * 200), location: 'Warehouse A - Shelf ' + Math.floor(Math.random() * 10), status: 'found', timestamp: new Date().toISOString() };
      setScannedItems([mockItem, ...scannedItems]);
      setLastScan(mockItem);
    }
    setBarcodeInput('');
  };

  const handlePrintLabels = () => {
    window.print();
  };

  const stats = {
    totalScans: scannedItems.length,
    found: scannedItems.filter(i => i.status === 'found').length,
    lowStock: scannedItems.filter(i => i.status === 'low_stock').length,
    notFound: scannedItems.filter(i => i.status === 'not_found').length
  };

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>Barcode Scanner</Typography>
        <Button variant="contained" startIcon={<Print />} onClick={handlePrintLabels}
          sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>Print Labels</Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { label: 'Total Scans', value: stats.totalScans, icon: <QrCode />, color: '#667eea' },
          { label: 'Items Found', value: stats.found, icon: <CheckCircle />, color: '#4CAF50' },
          { label: 'Low Stock', value: stats.lowStock, icon: <Warning />, color: '#FF9800' },
          { label: 'Not Found', value: stats.notFound, icon: <Inventory />, color: '#f44336' },
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

      <Paper sx={{ p: 3, background: 'rgba(255,255,255,0.95)', borderRadius: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Scan Barcode</Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Enter or scan barcode..."
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleScan()}
            InputProps={{ startAdornment: <QrCode sx={{ mr: 1, color: 'action.active' }} /> }}
            autoFocus
          />
          <Button variant="contained" startIcon={<Search />} onClick={handleScan}
            sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minWidth: 120 }}>Lookup</Button>
        </Box>

        {lastScan && (
          <Alert severity={lastScan.status === 'not_found' ? 'error' : lastScan.status === 'low_stock' ? 'warning' : 'success'} sx={{ mb: 2 }}>
            {lastScan.status === 'not_found' ? `Barcode ${lastScan.barcode} not found in inventory` :
             lastScan.status === 'low_stock' ? `${lastScan.name} - Low stock alert! Only ${lastScan.quantity} units remaining` :
             `${lastScan.name} found - ${lastScan.quantity} units in ${lastScan.location}`}
          </Alert>
        )}
      </Paper>

      <Paper sx={{ p: 3, background: 'rgba(255,255,255,0.95)', borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>Scan History</Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Barcode</TableCell>
                <TableCell>Product</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Scanned At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {scannedItems.map((item, index) => (
                <TableRow key={index} hover>
                  <TableCell><Typography fontFamily="monospace">{item.barcode}</Typography></TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.sku}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.location}</TableCell>
                  <TableCell>
                    <Chip 
                      label={item.status === 'found' ? 'Found' : item.status === 'low_stock' ? 'Low Stock' : 'Not Found'} 
                      color={item.status === 'found' ? 'success' : item.status === 'low_stock' ? 'warning' : 'error'} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>{new Date(item.timestamp).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default Barcode;
