import React, { useState } from 'react';
import { Box, Paper, Typography, TextField, InputAdornment, Accordion, AccordionSummary, AccordionDetails, Chip, Grid, Card, CardContent, Avatar } from '@mui/material';
import { Search, ExpandMore, People, Work, School, Help } from '@mui/icons-material';

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

const PeopleFAQs: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expanded, setExpanded] = useState<string | false>(false);

  const faqs: FAQ[] = [
    { question: 'How do I add a new employee?', answer: 'Navigate to HR > Employees > Add Employee. Fill in personal details, employment information, bank details, and tax information. The system will create login credentials and notify the employee.', category: 'Onboarding' },
    { question: 'How do I process leave requests?', answer: 'Go to HR > Leave Management. View pending requests, check leave balances, and approve or reject requests. Employees are notified automatically of decisions.', category: 'Leave' },
    { question: 'How do I run payroll?', answer: 'Navigate to Payroll > Run Payroll. Select the pay period, review calculated amounts, make any adjustments, and process. Payslips are generated and can be emailed to employees.', category: 'Payroll' },
    { question: 'How do I set up employee benefits?', answer: 'Go to HR > Benefits. Configure benefit plans (medical aid, pension, etc.), set eligibility rules, and assign to employees. Deductions are calculated automatically in payroll.', category: 'Benefits' },
    { question: 'How do I conduct performance reviews?', answer: 'Navigate to HR > Performance. Create review cycles, set objectives, collect feedback, and conduct evaluations. Track progress and generate performance reports.', category: 'Performance' },
    { question: 'How do I manage training programs?', answer: 'Go to Training > Programs. Create training courses, assign to employees, track completion, and generate certificates. Monitor training compliance and skills development.', category: 'Training' },
    { question: 'How do I handle employee termination?', answer: 'Navigate to HR > Employees > select employee > Terminate. Complete the exit checklist, calculate final pay, process leave payouts, and generate termination documents.', category: 'Offboarding' },
    { question: 'How do I generate HR reports?', answer: 'Go to Reports > HR Reports. Choose from headcount, turnover, leave analysis, payroll summaries, and more. Export to PDF or Excel for further analysis.', category: 'Reporting' },
  ];

  const filteredFAQs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = [...new Set(faqs.map(f => f.category))];

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>People & HR FAQs</Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { label: 'Total FAQs', value: faqs.length, icon: <Help />, color: '#667eea' },
          { label: 'Categories', value: categories.length, icon: <People />, color: '#4CAF50' },
          { label: 'Topics', value: 'HR, Payroll', icon: <Work />, color: '#FF9800' },
          { label: 'Modules', value: 'Training, Benefits', icon: <School />, color: '#E91E63' },
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
        <TextField fullWidth placeholder="Search FAQs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} sx={{ mb: 3 }} />

        {filteredFAQs.map((faq, index) => (
          <Accordion key={index} expanded={expanded === `panel${index}`} onChange={(_, isExpanded) => setExpanded(isExpanded ? `panel${index}` : false)} sx={{ mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Typography fontWeight={600}>{faq.question}</Typography>
                <Chip label={faq.category} size="small" sx={{ ml: 'auto', mr: 2 }} />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography color="text.secondary">{faq.answer}</Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Paper>
    </Box>
  );
};

export default PeopleFAQs;
