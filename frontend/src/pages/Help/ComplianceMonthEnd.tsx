import React, { useState } from 'react';
import { Box, Paper, Typography, Grid, Card, CardContent, Avatar, Stepper, Step, StepLabel, StepContent, Button, Checkbox, FormControlLabel, Alert, LinearProgress } from '@mui/material';
import { CheckCircle, Schedule, Assignment, Gavel, Warning } from '@mui/icons-material';

interface ChecklistItem {
  id: string;
  task: string;
  description: string;
  completed: boolean;
}

const ComplianceMonthEnd: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: '1', task: 'Review Access Logs', description: 'Navigate to Compliance > Audit Trails. Review all login attempts, failed access, and unusual activity. Flag and investigate any unauthorized access or suspicious patterns.', completed: false },
    { id: '2', task: 'VAT Return Preparation', description: 'Reconcile VAT output (sales) and input (purchases) to control accounts. Generate the VAT201 return data. Ensure all tax invoices meet SARS requirements (VAT number, line item details).', completed: false },
    { id: '3', task: 'Audit Trail Export', description: 'Export monthly audit trails for all modules to Excel/PDF. Archive securely for the statutory retention period. Ensure audit logs are complete with user, timestamp, action, and document reference.', completed: false },
    { id: '4', task: 'POPIA Compliance Review', description: 'Review any pending Data Subject Access Requests (DSARs). Verify personal data processing activities are documented. Check consent records are current. Update the Information Officer register if needed.', completed: false },
    { id: '5', task: 'B-BBEE Tracking Update', description: 'Update B-BBEE scorecard elements: procurement spend with qualifying suppliers, skills development hours, enterprise development contributions. Ensure supporting documentation is filed for annual verification.', completed: false },
    { id: '6', task: 'Security Incident Review', description: 'Review and close any security incidents from the month. Document root causes and corrective actions. Verify POPIA breach notifications were sent within 72 hours if applicable.', completed: false },
    { id: '7', task: 'Policy & Regulatory Updates', description: 'Check for any changes to SA tax rates, labour law amendments, or regulatory requirements. Update system configurations and policies accordingly. Communicate changes to affected teams.', completed: false },
    { id: '8', task: 'Compliance Training Check', description: 'Verify all staff have completed mandatory compliance training (POPIA awareness, anti-fraud, health & safety). Follow up on overdue completions. Schedule refresher training where needed.', completed: false },
    { id: '9', task: 'Data Retention Review', description: 'Check for documents approaching retention expiry. Process approved deletions or archival. Verify retention policies are being followed across all modules.', completed: false },
    { id: '10', task: 'Monthly Compliance Report', description: 'Generate the monthly compliance summary: tax filings status, audit findings, incident summary, training completion rates, and outstanding regulatory actions. Submit to compliance committee.', completed: false },
  ]);

  const handleToggle = (id: string) => {
    setChecklist(checklist.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  };

  const completedCount = checklist.filter(item => item.completed).length;
  const progress = (completedCount / checklist.length) * 100;

  const steps = [
    { label: 'Access & VAT', items: checklist.slice(0, 3) },
    { label: 'POPIA & B-BBEE', items: checklist.slice(3, 6) },
    { label: 'Policy & Training', items: checklist.slice(6, 8) },
    { label: 'Retention & Reporting', items: checklist.slice(8, 10) },
  ];

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>Compliance Month-End Checklist</Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { label: 'Total Tasks', value: checklist.length, icon: <Assignment />, color: '#667eea' },
          { label: 'Completed', value: completedCount, icon: <CheckCircle />, color: '#4CAF50' },
          { label: 'Remaining', value: checklist.length - completedCount, icon: <Schedule />, color: '#FF9800' },
          { label: 'Progress', value: `${Math.round(progress)}%`, icon: <Gavel />, color: '#E91E63' },
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
            Complete all tasks before month-end to ensure compliance requirements are met.
          </Alert>
        )}

        {progress === 100 && (
          <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 3 }}>
            All compliance tasks completed! You can now generate the final compliance report.
          </Alert>
        )}
      </Paper>

      <Paper sx={{ p: 3, background: 'rgba(255,255,255,0.95)', borderRadius: 2 }}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel>
                <Typography fontWeight={600}>{step.label}</Typography>
              </StepLabel>
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

export default ComplianceMonthEnd;
