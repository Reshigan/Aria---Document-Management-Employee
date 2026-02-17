import React, { useState } from 'react';
import { Box, Paper, Typography, Grid, Card, CardContent, Avatar, Stepper, Step, StepLabel, StepContent, Button, Checkbox, FormControlLabel, Alert, LinearProgress } from '@mui/material';
import { CheckCircle, Schedule, People, AccountBalance, Warning } from '@mui/icons-material';

interface ChecklistItem {
  id: string;
  task: string;
  description: string;
  completed: boolean;
}

const PeopleMonthEnd: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: '1', task: 'Timesheet Approval', description: 'Go to People > Payroll. Review and approve all employee timesheets and overtime claims. Reject or query any discrepancies before payroll processing.', completed: false },
    { id: '2', task: 'Leave Balance Verification', description: 'Navigate to HR > Leave Management. Verify leave balances are accurate. Ensure all approved leave is recorded. Check annual leave accruals are calculating correctly per company policy.', completed: false },
    { id: '3', task: 'Payroll Processing', description: 'Run payroll via Payroll > Payroll Runs. Review gross-to-net calculations, verify PAYE brackets, check UIF (1% employee + 1% employer), and SDL (1%). Process allowances, deductions, and bonuses. Generate payslips.', completed: false },
    { id: '4', task: 'PAYE & Statutory Submissions', description: 'Generate EMP201 return from Payroll > PAYE Returns. Verify PAYE, UIF, and SDL totals match payroll. Submit to SARS by the 7th of the following month. File proof of submission.', completed: false },
    { id: '5', task: 'Benefits Reconciliation', description: 'Reconcile medical aid contributions, pension/provident fund deductions, and group life premiums to provider statements. Ensure employee and employer portions are correct.', completed: false },
    { id: '6', task: 'New Hire & Termination Processing', description: 'Ensure all new starters have completed onboarding: signed contracts, bank details captured, tax numbers registered. Process any terminations: final pay, leave payouts, and exit documentation.', completed: false },
    { id: '7', task: 'Training Compliance Check', description: 'Review mandatory training completion under People > Talent > Training. Follow up on overdue courses. Ensure health & safety, compliance, and skills development training is on track.', completed: false },
    { id: '8', task: 'Attendance & Absence Review', description: 'Review attendance records for the month. Flag excessive absenteeism. Verify sick leave certificates are on file. Update records for any unpaid leave taken.', completed: false },
    { id: '9', task: 'HR Metrics & Reporting', description: 'Generate monthly HR reports: headcount, turnover rate, leave utilisation, overtime analysis, and training compliance. Present to management for review. Archive for annual reporting.', completed: false },
    { id: '10', task: 'Payroll Journal Posting', description: 'Ensure payroll journals are posted to the General Ledger. Reconcile salary clearing account, PAYE/UIF/SDL control accounts, and net pay bank account. Clear any differences.', completed: false },
  ]);

  const handleToggle = (id: string) => {
    setChecklist(checklist.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  };

  const completedCount = checklist.filter(item => item.completed).length;
  const progress = (completedCount / checklist.length) * 100;

  const steps = [
    { label: 'Time & Leave', items: checklist.slice(0, 2) },
    { label: 'Payroll & Statutory', items: checklist.slice(2, 5) },
    { label: 'Staff & Training', items: checklist.slice(5, 8) },
    { label: 'Reporting & Journals', items: checklist.slice(8, 10) },
  ];

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>People Month-End Checklist</Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { label: 'Total Tasks', value: checklist.length, icon: <People />, color: '#667eea' },
          { label: 'Completed', value: completedCount, icon: <CheckCircle />, color: '#4CAF50' },
          { label: 'Remaining', value: checklist.length - completedCount, icon: <Schedule />, color: '#FF9800' },
          { label: 'Progress', value: `${Math.round(progress)}%`, icon: <AccountBalance />, color: '#E91E63' },
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
            Complete all tasks before payroll deadline to ensure timely employee payments.
          </Alert>
        )}

        {progress === 100 && (
          <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 3 }}>
            All HR month-end tasks completed! Payroll is ready for processing.
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

export default PeopleMonthEnd;
