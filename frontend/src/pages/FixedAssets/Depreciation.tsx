import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, MenuItem, InputAdornment, Avatar,
  LinearProgress, Tooltip, Card, CardContent
} from '@mui/material';
import { Add, Edit, Search, TrendingDown, AccountBalance, Calculate, FilterList, Download } from '@mui/icons-material';

interface DepreciationRecord {
  id: string;
  assetName: string;
  assetCode: string;
  category: string;
  purchaseValue: number;
  currentValue: number;
  depreciationMethod: 'straight_line' | 'declining_balance' | 'units_of_production';
  usefulLife: number;
  annualDepreciation: number;
  accumulatedDepreciation: number;
  lastCalculated: string;
}

const Depreciation: React.FC = () => {
  const [records, setRecords] = useState<DepreciationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DepreciationRecord | null>(null);
  const [formData, setFormData] = useState<Partial<DepreciationRecord>>({});

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/fixed-assets/depreciation');
      if (response.ok) {
        const data = await response.json();
        setRecords(data);
      } else {
        setRecords([
          { id: '1', assetName: 'Office Building', assetCode: 'FA-001', category: 'Buildings', purchaseValue: 5000000, currentValue: 4250000, depreciationMethod: 'straight_line', usefulLife: 40, annualDepreciation: 125000, accumulatedDepreciation: 750000, lastCalculated: '2026-01-31' },
          { id: '2', assetName: 'Delivery Vehicle Fleet', assetCode: 'FA-002', category: 'Vehicles', purchaseValue: 850000, currentValue: 510000, depreciationMethod: 'declining_balance', usefulLife: 5, annualDepreciation: 170000, accumulatedDepreciation: 340000, lastCalculated: '2026-01-31' },
          { id: '3', assetName: 'Computer Equipment', assetCode: 'FA-003', category: 'IT Equipment', purchaseValue: 250000, currentValue: 100000, depreciationMethod: 'straight_line', usefulLife: 3, annualDepreciation: 83333, accumulatedDepreciation: 150000, lastCalculated: '2026-01-31' },
          { id: '4', assetName: 'Manufacturing Machinery', assetCode: 'FA-004', category: 'Machinery', purchaseValue: 1200000, currentValue: 840000, depreciationMethod: 'units_of_production', usefulLife: 10, annualDepreciation: 120000, accumulatedDepreciation: 360000, lastCalculated: '2026-01-31' },
        ]);
      }
    } catch {
      setRecords([]);
    }
    setLoading(false);
  };

  const handleRunDepreciation = async () => {
    if (window.confirm('Run depreciation calculation for all assets?')) {
      try {
        await fetch('/api/fixed-assets/depreciation/run', { method: 'POST' });
        fetchRecords();
      } catch {
        console.error('Error running depreciation');
      }
    }
  };

  const filteredRecords = records.filter(record =>
    record.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.assetCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalAssets: records.length,
    totalPurchaseValue: records.reduce((sum, r) => sum + r.purchaseValue, 0),
    totalCurrentValue: records.reduce((sum, r) => sum + r.currentValue, 0),
    totalAccumulatedDep: records.reduce((sum, r) => sum + r.accumulatedDepreciation, 0)
  };

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>Asset Depreciation</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<Download />} sx={{ color: 'white', borderColor: 'white' }}>Export Report</Button>
          <Button variant="contained" startIcon={<Calculate />} onClick={handleRunDepreciation}
            sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>Run Depreciation</Button>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { label: 'Total Assets', value: stats.totalAssets, icon: <AccountBalance />, color: '#667eea' },
          { label: 'Purchase Value', value: `R ${stats.totalPurchaseValue.toLocaleString()}`, icon: <AccountBalance />, color: '#4CAF50' },
          { label: 'Current Value', value: `R ${stats.totalCurrentValue.toLocaleString()}`, icon: <TrendingDown />, color: '#2196F3' },
          { label: 'Accumulated Depreciation', value: `R ${stats.totalAccumulatedDep.toLocaleString()}`, icon: <TrendingDown />, color: '#FF9800' },
        ].map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: stat.color }}>{stat.icon}</Avatar>
                <Box>
                  <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>{stat.value}</Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>{stat.label}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 3, background: 'rgba(255,255,255,0.95)', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField placeholder="Search assets..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} sx={{ flexGrow: 1 }} />
          <Button startIcon={<FilterList />}>Filters</Button>
        </Box>

        {loading ? <LinearProgress /> : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Asset</TableCell>
                  <TableCell>Code</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Purchase Value</TableCell>
                  <TableCell>Current Value</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell>Annual Depreciation</TableCell>
                  <TableCell>Accumulated</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id} hover>
                    <TableCell><Typography fontWeight={600}>{record.assetName}</Typography></TableCell>
                    <TableCell>{record.assetCode}</TableCell>
                    <TableCell><Chip label={record.category} size="small" /></TableCell>
                    <TableCell>R {record.purchaseValue.toLocaleString()}</TableCell>
                    <TableCell>R {record.currentValue.toLocaleString()}</TableCell>
                    <TableCell>{record.depreciationMethod.replace(/_/g, ' ')}</TableCell>
                    <TableCell>R {record.annualDepreciation.toLocaleString()}</TableCell>
                    <TableCell>R {record.accumulatedDepreciation.toLocaleString()}</TableCell>
                    <TableCell>
                      <Tooltip title="View Details"><IconButton onClick={() => { setSelectedRecord(record); setFormData(record); setDialogOpen(true); }}><Edit /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Depreciation Details</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Asset Name" value={formData.assetName || ''} InputProps={{ readOnly: true }} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Asset Code" value={formData.assetCode || ''} InputProps={{ readOnly: true }} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Category" value={formData.category || ''} InputProps={{ readOnly: true }} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Depreciation Method" value={formData.depreciationMethod?.replace(/_/g, ' ') || ''} InputProps={{ readOnly: true }} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Purchase Value" value={`R ${formData.purchaseValue?.toLocaleString() || 0}`} InputProps={{ readOnly: true }} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Current Value" value={`R ${formData.currentValue?.toLocaleString() || 0}`} InputProps={{ readOnly: true }} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Useful Life (Years)" value={formData.usefulLife || ''} InputProps={{ readOnly: true }} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Annual Depreciation" value={`R ${formData.annualDepreciation?.toLocaleString() || 0}`} InputProps={{ readOnly: true }} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Accumulated Depreciation" value={`R ${formData.accumulatedDepreciation?.toLocaleString() || 0}`} InputProps={{ readOnly: true }} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Last Calculated" value={formData.lastCalculated || ''} InputProps={{ readOnly: true }} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Depreciation;
