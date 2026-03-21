import React, { useState } from 'react';
import { Box, Paper, Typography, Grid, Card, CardContent, Avatar, Stepper, Step, StepLabel, StepContent, Button, Checkbox, FormControlLabel, Alert, LinearProgress } from '@mui/material';
import { CheckCircle, Schedule, AccountBalance, TrendingUp, Warning } from '@mui/icons-material';

interface ChecklistItem {
  id: string;
  task: string;
  description: string;
  completed: boolean;
}

const FinancialMonthEnd: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: '1', task: 'Bank Reconciliation', description: 'Go to Banking > Reconciliation. Match all bank statement lines to GL entries. Resolve outstanding items and ensure bank balance agrees to GL.', completed: false },
    { id: '2', task: 'Accounts Receivable Review', description: 'Review AR Aging report (Reports > AR/AP > AR Aging). Follow up on 60+ day overdue invoices. Process any bad debt write-offs and ensure collections are up to date.', completed: false },
    { id: '3', task: 'Accounts Payable Review', description: 'Ensure all supplier invoices received this month are captured in AP. Check AP Aging for missed payments. Schedule upcoming payments and process payment batches.', completed: false },
    { id: '4', task: 'Expense Accruals', description: 'Post journal entries for expenses incurred but not yet invoiced (utilities, rent, professional fees). Reverse prior month accruals that have now been invoiced.', completed: false },
    { id: '5', task: 'Revenue Recognition', description: 'Review deferred revenue and recognise earned portions. Ensure sales cut-off is correct — no next-month invoices in current period. Adjust prepaid income entries.', completed: false },
    { id: '6', task: 'Fixed Asset Depreciation', description: 'Run monthly depreciation schedule for all asset classes (straight-line or reducing balance). Review new acquisitions and disposals. Post depreciation journal entry.', completed: false },
    { id: '7', task: 'Inventory Valuation', description: 'Go to Inventory > Valuation. Verify stock counts match system quantities. Process adjustments for damaged/obsolete stock. Review weighted average cost calculations.', completed: false },
    { id: '8', task: 'VAT Reconciliation', description: 'Reconcile VAT output (from sales) and VAT input (from purchases) to the VAT control accounts. Prepare VAT201 return data. Ensure all tax invoices meet SARS requirements.', completed: false },
    { id: '9', task: 'Intercompany Reconciliation', description: 'If applicable, reconcile all intercompany loan accounts, management fees, and shared cost allocations. Ensure both entities agree on balances before period close.', completed: false },
    { id: '10', task: 'Trial Balance Review', description: 'Generate Trial Balance (Reports > Financial > Trial Balance). Investigate unusual balances, suspense account items, and variance to prior month. Clear all reconciling items.', completed: false },
    { id: '11', task: 'Payroll Reconciliation', description: 'Verify payroll journals are posted correctly. Reconcile PAYE, UIF, and SDL control accounts to EMP201 submission. Check net pay clearing account is zero.', completed: false },
    { id: '12', task: 'Generate Financial Statements', description: 'Generate Income Statement, Balance Sheet, and Cash Flow Statement. Compare to budget and prior period. Document significant variances. Present to management for review.', completed: false },
  ]);

  const handleToggle = (id: string) => {
    setChecklist(checklist.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  };

  const completedCount = checklist.filter(item => item.completed).length;
  const progress = (completedCount / checklist.length) * 100;

  const steps = [
    { label: 'Bank & Receivables', items: checklist.slice(0, 3) },
    { label: 'Accruals & Revenue', items: checklist.slice(3, 6) },
    { label: 'Inventory & VAT', items: checklist.slice(6, 9) },
    { label: 'Review & Reporting', items: checklist.slice(9, 12) },
  ];

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>Financial Month-End Checklist</Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { label: 'Total Tasks', value: checklist.length, icon: <AccountBalance />, color: '#667eea' },
          { label: 'Completed', value: completedCount, icon: <CheckCircle />, color: '#4CAF50' },
          { label: 'Remaining', value: checklist.length - completedCount, icon: <Schedule />, color: '#FF9800' },
          { label: 'Progress', value: `${Math.round(progress)}%`, icon: <TrendingUp />, color: '#E91E63' },
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
            Complete all tasks before closing the month to ensure accurate financial statements.
          </Alert>
        )}

        {progress === 100 && (
          <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 3 }}>
            All financial month-end tasks completed! You can now close the period.
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

export default FinancialMonthEnd;
