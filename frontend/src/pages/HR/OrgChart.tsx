import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Button, Avatar, Card, CardContent, Grid, Chip, TextField, InputAdornment } from '@mui/material';
import { Search, Download, ZoomIn, ZoomOut, AccountTree, Person, Business } from '@mui/icons-material';

interface Employee {
  id: string;
  name: string;
  title: string;
  department: string;
  email: string;
  phone: string;
  managerId: string | null;
  directReports: string[];
  avatar?: string;
}

const OrgChart: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/hr/org-chart');
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      } else {
        setEmployees([
          { id: '1', name: 'Sarah Johnson', title: 'CEO', department: 'Executive', email: 'sarah@company.com', phone: '+27 11 123 4567', managerId: null, directReports: ['2', '3', '4'] },
          { id: '2', name: 'Michael Chen', title: 'CFO', department: 'Finance', email: 'michael@company.com', phone: '+27 11 123 4568', managerId: '1', directReports: ['5', '6'] },
          { id: '3', name: 'Emily Davis', title: 'CTO', department: 'Technology', email: 'emily@company.com', phone: '+27 11 123 4569', managerId: '1', directReports: ['7', '8'] },
          { id: '4', name: 'James Wilson', title: 'COO', department: 'Operations', email: 'james@company.com', phone: '+27 11 123 4570', managerId: '1', directReports: ['9', '10'] },
          { id: '5', name: 'Lisa Brown', title: 'Finance Manager', department: 'Finance', email: 'lisa@company.com', phone: '+27 11 123 4571', managerId: '2', directReports: [] },
          { id: '6', name: 'David Lee', title: 'Accountant', department: 'Finance', email: 'david@company.com', phone: '+27 11 123 4572', managerId: '2', directReports: [] },
          { id: '7', name: 'Anna Smith', title: 'Dev Lead', department: 'Technology', email: 'anna@company.com', phone: '+27 11 123 4573', managerId: '3', directReports: [] },
          { id: '8', name: 'Tom Harris', title: 'QA Lead', department: 'Technology', email: 'tom@company.com', phone: '+27 11 123 4574', managerId: '3', directReports: [] },
          { id: '9', name: 'Kate Miller', title: 'HR Manager', department: 'Operations', email: 'kate@company.com', phone: '+27 11 123 4575', managerId: '4', directReports: [] },
          { id: '10', name: 'Robert Taylor', title: 'Facilities Manager', department: 'Operations', email: 'robert@company.com', phone: '+27 11 123 4576', managerId: '4', directReports: [] },
        ]);
      }
    } catch {
      setEmployees([]);
    }
    setLoading(false);
  };

  const getEmployeeById = (id: string) => employees.find(e => e.id === id);
  const getRootEmployees = () => employees.filter(e => e.managerId === null);
  const getDirectReports = (managerId: string) => employees.filter(e => e.managerId === managerId);

  const EmployeeCard: React.FC<{ employee: Employee; level: number }> = ({ employee, level }) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', m: 1 }}>
      <Card sx={{ minWidth: 200, background: level === 0 ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white', color: level === 0 ? 'white' : 'inherit', borderRadius: 2, boxShadow: 3 }}>
        <CardContent sx={{ textAlign: 'center', p: 2 }}>
          <Avatar sx={{ width: 60, height: 60, mx: 'auto', mb: 1, bgcolor: level === 0 ? 'rgba(255,255,255,0.2)' : '#667eea', fontSize: 24 }}>
            {employee.name.split(' ').map(n => n[0]).join('')}
          </Avatar>
          <Typography variant="subtitle1" fontWeight={700}>{employee.name}</Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>{employee.title}</Typography>
          <Chip label={employee.department} size="small" sx={{ mt: 1, bgcolor: level === 0 ? 'rgba(255,255,255,0.2)' : undefined }} />
        </CardContent>
      </Card>
      {getDirectReports(employee.id).length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
          <Box sx={{ width: 2, height: 20, bgcolor: '#667eea' }} />
          <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap' }}>
            {getDirectReports(employee.id).map(report => (
              <EmployeeCard key={report.id} employee={report} level={level + 1} />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );

  const stats = {
    total: employees.length,
    departments: [...new Set(employees.map(e => e.department))].length,
    managers: employees.filter(e => e.directReports.length > 0).length
  };

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>Organization Chart</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<ZoomOut />} onClick={() => setZoom(Math.max(50, zoom - 10))} sx={{ color: 'white', borderColor: 'white' }}>-</Button>
          <Typography sx={{ color: 'white', alignSelf: 'center' }}>{zoom}%</Typography>
          <Button variant="outlined" startIcon={<ZoomIn />} onClick={() => setZoom(Math.min(150, zoom + 10))} sx={{ color: 'white', borderColor: 'white' }}>+</Button>
          <Button variant="contained" startIcon={<Download />} sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>Export</Button>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { label: 'Total Employees', value: stats.total, icon: <Person />, color: '#667eea' },
          { label: 'Departments', value: stats.departments, icon: <Business />, color: '#4CAF50' },
          { label: 'Managers', value: stats.managers, icon: <AccountTree />, color: '#FF9800' },
        ].map((stat, index) => (
          <Grid item xs={12} sm={4} key={index}>
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
        <TextField placeholder="Search employees..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} sx={{ width: 300 }} />
      </Paper>

      <Paper sx={{ p: 3, background: 'rgba(255,255,255,0.95)', borderRadius: 2, overflow: 'auto' }}>
        <Box sx={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', display: 'flex', justifyContent: 'center', minHeight: 400 }}>
          {loading ? (
            <Typography>Loading organization chart...</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {getRootEmployees().map(employee => (
                <EmployeeCard key={employee.id} employee={employee} level={0} />
              ))}
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default OrgChart;
