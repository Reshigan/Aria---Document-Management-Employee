import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Assessment,
  PictureAsPdf,
  TableChart,
  Download,
  Refresh,
  FilterList
} from '@mui/icons-material';
import axios from 'axios';

interface Report {
  report_id: string;
  name: string;
  description: string;
  category: string;
  parameters: string[];
  supports_export: string[];
}

const ComprehensiveReports: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<string>('');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    company_id: '',
    start_date: '',
    end_date: '',
    as_of_date: ''
  });

  useEffect(() => {
    fetchReports();
  }, [selectedCategory]);

  const fetchReports = async () => {
    try {
      const params = selectedCategory !== 'all' ? { category: selectedCategory } : {};
      const response = await axios.get('/api/reports/list', { params });
      setReports(response.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const generateReport = async () => {
    if (!selectedReport) return;

    setLoading(true);
    try {
      const reportEndpoints: { [key: string]: string } = {
        'trial_balance': '/api/reports/financial/trial-balance',
        'balance_sheet': '/api/reports/financial/balance-sheet',
        'income_statement': '/api/reports/financial/income-statement',
        'ar_aging': '/api/reports/financial/ar-aging',
        'inventory_valuation': '/api/reports/operational/inventory-valuation',
        'payroll_summary': '/api/reports/hr/payroll-summary',
        'production_summary': '/api/reports/manufacturing/production-summary'
      };

      const endpoint = reportEndpoints[selectedReport];
      if (endpoint) {
        const response = await axios.get(endpoint, { params: filters });
        setReportData(response.data);
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format: string) => {
    if (!selectedReport) return;

    try {
      const response = await axios.post('/api/reports/export', {
        report_type: selectedReport,
        export_format: format,
        ...filters
      }, {
        responseType: format === 'pdf' ? 'blob' : 'json'
      });

      if (format === 'pdf' || format === 'csv') {
        const blob = new Blob([response.data]);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${selectedReport}_${new Date().toISOString().split('T')[0]}.${format}`;
        link.click();
      }
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  const categories = [
    { value: 'all', label: 'All Reports' },
    { value: 'financial', label: 'Financial Reports' },
    { value: 'operational', label: 'Operational Reports' },
    { value: 'hr', label: 'HR Reports' },
    { value: 'manufacturing', label: 'Manufacturing Reports' }
  ];

  const renderReportData = () => {
    if (!reportData) return null;

    if (reportData.report_type === 'trial_balance') {
      return (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Account Code</TableCell>
                <TableCell>Account Name</TableCell>
                <TableCell align="right">Debit</TableCell>
                <TableCell align="right">Credit</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reportData.accounts?.map((account: any) => (
                <TableRow key={account.code}>
                  <TableCell>{account.code}</TableCell>
                  <TableCell>{account.name}</TableCell>
                  <TableCell align="right">R {account.debit.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell align="right">R {account.credit.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ fontWeight: 'bold', bgcolor: 'action.hover' }}>
                <TableCell colSpan={2}>TOTAL</TableCell>
                <TableCell align="right">R {reportData.total_debit?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</TableCell>
                <TableCell align="right">R {reportData.total_credit?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      );
    }

    if (reportData.report_type === 'balance_sheet') {
      return (
        <Box>
          <Typography variant="h6" gutterBottom>Assets</Typography>
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell>Cash</TableCell>
                  <TableCell align="right">R {reportData.assets?.current_assets?.cash?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Accounts Receivable</TableCell>
                  <TableCell align="right">R {reportData.assets?.current_assets?.accounts_receivable?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Inventory</TableCell>
                  <TableCell align="right">R {reportData.assets?.current_assets?.inventory?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
                <TableRow sx={{ fontWeight: 'bold' }}>
                  <TableCell>Total Current Assets</TableCell>
                  <TableCell align="right">R {reportData.assets?.current_assets?.total?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
                <TableRow sx={{ fontWeight: 'bold', bgcolor: 'primary.light', color: 'white' }}>
                  <TableCell>TOTAL ASSETS</TableCell>
                  <TableCell align="right">R {reportData.assets?.total_assets?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="h6" gutterBottom>Liabilities & Equity</Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell>Accounts Payable</TableCell>
                  <TableCell align="right">R {reportData.liabilities?.current_liabilities?.accounts_payable?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
                <TableRow sx={{ fontWeight: 'bold' }}>
                  <TableCell>Total Liabilities</TableCell>
                  <TableCell align="right">R {reportData.liabilities?.total_liabilities?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
                <TableRow sx={{ fontWeight: 'bold' }}>
                  <TableCell>Total Equity</TableCell>
                  <TableCell align="right">R {reportData.equity?.total_equity?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
                <TableRow sx={{ fontWeight: 'bold', bgcolor: 'primary.light', color: 'white' }}>
                  <TableCell>TOTAL LIABILITIES & EQUITY</TableCell>
                  <TableCell align="right">R {reportData.total_liabilities_and_equity?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      );
    }

    return (
      <Paper sx={{ p: 2 }}>
        <pre>{JSON.stringify(reportData, null, 2)}</pre>
      </Paper>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          <Assessment sx={{ mr: 1, verticalAlign: 'middle' }} />
          Comprehensive Reports
        </Typography>
        <Chip label={`${reports.length} Reports Available`} color="primary" />
      </Box>

      <Grid container spacing={3}>
        {/* Report Selection */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Select Report</Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={selectedCategory}
                  label="Category"
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {categories.map((cat) => (
                    <MenuItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Report</InputLabel>
                <Select
                  value={selectedReport}
                  label="Report"
                  onChange={(e) => setSelectedReport(e.target.value)}
                >
                  {reports.map((report) => (
                    <MenuItem key={report.report_id} value={report.report_id}>
                      {report.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedReport && (
                <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {reports.find(r => r.report_id === selectedReport)?.description}
                  </Typography>
                </Box>
              )}

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Filters
              </Typography>

              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
              />

              <Button
                fullWidth
                variant="contained"
                onClick={generateReport}
                disabled={!selectedReport || loading}
                startIcon={loading ? <CircularProgress size={20} /> : <Refresh />}
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Report Display */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  {selectedReport ? reports.find(r => r.report_id === selectedReport)?.name : 'Report Preview'}
                </Typography>
                
                {reportData && (
                  <Box>
                    <Tooltip title="Export to PDF">
                      <IconButton onClick={() => exportReport('pdf')}>
                        <PictureAsPdf />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Export to Excel">
                      <IconButton onClick={() => exportReport('excel')}>
                        <TableChart />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Export to CSV">
                      <IconButton onClick={() => exportReport('csv')}>
                        <Download />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}
              </Box>

              {reportData ? (
                renderReportData()
              ) : (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Assessment sx={{ fontSize: 80, color: 'action.disabled', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    Select a report and click Generate to view results
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ComprehensiveReports;
