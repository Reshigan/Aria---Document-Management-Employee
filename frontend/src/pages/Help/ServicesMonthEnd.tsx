import React, { useState } from 'react';
import { Box, Paper, Typography, Grid, Card, CardContent, Avatar, Stepper, Step, StepLabel, StepContent, Button, Checkbox, FormControlLabel, Alert, LinearProgress } from '@mui/material';
import { CheckCircle, Schedule, Support, Build, Warning } from '@mui/icons-material';

interface ChecklistItem {
  id: string;
  task: string;
  description: string;
  completed: boolean;
}

const ServicesMonthEnd: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: '1', task: 'Close Completed Tickets', description: 'Review and close all resolved service tickets', completed: false },
    { id: '2', task: 'SLA Compliance Review', description: 'Review SLA performance and document any breaches', completed: false },
    { id: '3', task: 'Field Service Completion', description: 'Ensure all field service jobs are completed and documented', completed: false },
    { id: '4', task: 'Time Entry Review', description: 'Review and approve all technician time entries', completed: false },
    { id: '5', task: 'Parts Usage Reconciliation', description: 'Reconcile parts used against inventory', completed: false },
    { id: '6', task: 'Contract Billing', description: 'Generate invoices for contract-based services', completed: false },
    { id: '7', task: 'Customer Satisfaction Review', description: 'Review customer feedback and satisfaction scores', completed: false },
    { id: '8', task: 'Service Reports Generation', description: 'Generate monthly service performance reports', completed: false },
  ]);

  const handleToggle = (id: string) => {
    setChecklist(checklist.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  };

  const completedCount = checklist.filter(item => item.completed).length;
  const progress = (completedCount / checklist.length) * 100;

  const steps = [
    { label: 'Ticket & SLA Review', items: checklist.slice(0, 2) },
    { label: 'Field Service & Time', items: checklist.slice(2, 4) },
    { label: 'Parts & Billing', items: checklist.slice(4, 6) },
    { label: 'Satisfaction & Reporting', items: checklist.slice(6, 8) },
  ];

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>Services Month-End Checklist</Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { label: 'Total Tasks', value: checklist.length, icon: <Support />, color: '#667eea' },
          { label: 'Completed', value: completedCount, icon: <CheckCircle />, color: '#4CAF50' },
          { label: 'Remaining', value: checklist.length - completedCount, icon: <Schedule />, color: '#FF9800' },
          { label: 'Progress', value: `${Math.round(progress)}%`, icon: <Build />, color: '#E91E63' },
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
            Complete all tasks before month-end to ensure accurate service billing and reporting.
          </Alert>
        )}

        {progress === 100 && (
          <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 3 }}>
            All service month-end tasks completed! Ready for billing and reporting.
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

export default ServicesMonthEnd;
