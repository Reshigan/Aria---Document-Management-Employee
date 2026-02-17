import React, { useState } from 'react';
import { Box, Paper, Typography, Grid, Card, CardContent, Avatar, Stepper, Step, StepLabel, StepContent, Button, Checkbox, FormControlLabel, Alert, LinearProgress } from '@mui/material';
import { CheckCircle, Schedule, Inventory, LocalShipping, Warning } from '@mui/icons-material';

interface ChecklistItem {
  id: string;
  task: string;
  description: string;
  completed: boolean;
}

const OperationsMonthEnd: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: '1', task: 'Physical Inventory Count', description: 'Run cycle counts or full stock take via Inventory > Items. Compare physical counts to system quantities. Document variances for each warehouse location.', completed: false },
    { id: '2', task: 'Inventory Adjustments', description: 'Go to Inventory > Stock Adjustments. Process write-offs for damaged/expired stock and corrections for count discrepancies. Ensure all adjustments have supervisor approval.', completed: false },
    { id: '3', task: 'Open PO Review', description: 'Review all open Purchase Orders in Procurement. Follow up on overdue deliveries with suppliers. Cancel or amend POs that are no longer required. Update expected delivery dates.', completed: false },
    { id: '4', task: 'Goods Receipt Verification', description: 'Ensure all goods received this month have matching Goods Receipts. Check for unmatched delivery notes. Verify three-way match (PO, GRN, Invoice) for all procurement transactions.', completed: false },
    { id: '5', task: 'Sales Order Fulfilment Review', description: 'Review all open Sales Orders. Check delivery status and backorder quantities. Follow up on partially fulfilled orders. Update customers on expected delivery dates.', completed: false },
    { id: '6', task: 'Production Order Closure', description: 'Close all completed Work Orders in Manufacturing. Review work-in-progress (WIP) for accuracy. Reconcile raw material consumption against BOMs. Record any production variances.', completed: false },
    { id: '7', task: 'Scrap and Waste Recording', description: 'Record all production scrap, defective items, and waste in Inventory > Adjustments. Review scrap rates against targets. Investigate any unusual waste levels.', completed: false },
    { id: '8', task: 'Quality Review', description: 'Review all quality inspection results for the month. Close resolved quality issues. Ensure non-conformance reports are documented and corrective actions assigned.', completed: false },
    { id: '9', task: 'Supplier Performance Review', description: 'Evaluate supplier delivery performance (on-time %, quality rejection rate). Update supplier ratings. Flag underperforming suppliers for review or replacement.', completed: false },
    { id: '10', task: 'Logistics and Shipping Costs', description: 'Review all shipping and logistics expenses. Reconcile carrier invoices against delivery records. Identify cost-saving opportunities for next month.', completed: false },
  ]);

  const handleToggle = (id: string) => {
    setChecklist(checklist.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  };

  const completedCount = checklist.filter(item => item.completed).length;
  const progress = (completedCount / checklist.length) * 100;

  const steps = [
    { label: 'Inventory Count & Adjustments', items: checklist.slice(0, 2) },
    { label: 'Procurement & Receipts', items: checklist.slice(2, 5) },
    { label: 'Production & Quality', items: checklist.slice(5, 8) },
    { label: 'Supplier & Logistics Review', items: checklist.slice(8, 10) },
  ];

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>Operations Month-End Checklist</Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { label: 'Total Tasks', value: checklist.length, icon: <Inventory />, color: '#667eea' },
          { label: 'Completed', value: completedCount, icon: <CheckCircle />, color: '#4CAF50' },
          { label: 'Remaining', value: checklist.length - completedCount, icon: <Schedule />, color: '#FF9800' },
          { label: 'Progress', value: `${Math.round(progress)}%`, icon: <LocalShipping />, color: '#E91E63' },
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
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>Overall Progress</Typography>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 10, borderRadius: 5 }} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{completedCount} of {checklist.length} tasks completed</Typography>
        </Box>

        {progress < 100 && (
          <Alert severity="warning" icon={<Warning />} sx={{ mb: 3 }}>
            Complete all tasks before month-end to ensure accurate inventory and operations reporting.
          </Alert>
        )}

        {progress === 100 && (
          <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 3 }}>
            All operations month-end tasks completed! Ready for period close.
          </Alert>
        )}
      </Paper>

      <Paper sx={{ p: 3, background: 'rgba(255,255,255,0.95)', borderRadius: 2 }}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel><Typography fontWeight={600}>{step.label}</Typography></StepLabel>
              <StepContent>
                <Box sx={{ mb: 2 }}>
                  {step.items.map((item) => (
                    <Box key={item.id} sx={{ mb: 1 }}>
                      <FormControlLabel
                        control={<Checkbox checked={item.completed} onChange={() => handleToggle(item.id)} />}
                        label={
                          <Box>
                            <Typography fontWeight={item.completed ? 400 : 600} sx={{ textDecoration: item.completed ? 'line-through' : 'none' }}>{item.task}</Typography>
                            <Typography variant="caption" color="text.secondary">{item.description}</Typography>
                          </Box>
                        }
                      />
                    </Box>
                  ))}
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Button variant="contained" onClick={() => setActiveStep(index + 1)} sx={{ mr: 1, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                    {index === steps.length - 1 ? 'Finish' : 'Continue'}
                  </Button>
                  <Button disabled={index === 0} onClick={() => setActiveStep(index - 1)}>Back</Button>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Paper>
    </Box>
  );
};

export default OperationsMonthEnd;
