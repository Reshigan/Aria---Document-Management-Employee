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
    { question: 'How do I add a new employee?', answer: 'Navigate to People > Human Resources > Employees and click Add. Fill in personal details (ID number, contact info), employment information (start date, position, department), bank details for salary payments, and tax numbers (PAYE, UIF). The system creates a user account and triggers the onboarding workflow automatically.', category: 'Onboarding' },
    { question: 'How do I process leave requests?', answer: 'Go to People > Human Resources > Leave Management. View all pending requests with employee name, leave type, dates, and balance. Approve or reject with one click. The Leave Calendar shows team availability at a glance. Leave balances accrue automatically based on company policy and are deducted on approval.', category: 'Leave' },
    { question: 'How do I run payroll?', answer: 'Navigate to People > Payroll > Payroll Runs and click New Run. Select the pay period (monthly). The system calculates gross pay, PAYE tax, UIF (1%), SDL (1%), medical aid, pension, and other deductions automatically. Review the summary, make any manual adjustments, and process. Payslips are generated and can be emailed to each employee.', category: 'Payroll' },
    { question: 'How do I manage salary structures?', answer: 'Go to People > Payroll > Salary Structures. Define pay grades with basic salary, allowances (travel, housing, phone), and deduction rules. Assign structures to employees or positions. Changes are reflected in the next payroll run automatically.', category: 'Payroll' },
    { question: 'How do I handle PAYE and UIF submissions?', answer: 'Navigate to People > Payroll > PAYE Returns or UIF Returns. The system pre-populates submission data from payroll runs. Review the calculations, generate the EMP201 return, and submit to SARS. Historical submissions are stored for audit purposes.', category: 'Tax' },
    { question: 'How do I conduct performance reviews?', answer: 'Go to People > Talent > Performance Reviews. Create review cycles (quarterly, annual), set KPIs and objectives for each employee, collect 360-degree feedback, and conduct evaluations. Track progress against goals and generate performance reports for management review.', category: 'Performance' },
    { question: 'How do I manage recruitment?', answer: 'Navigate to People > Talent > Recruitment. Post job openings, track applicants through stages (Applied, Screening, Interview, Offer, Hired), schedule interviews, and send offer letters. Convert successful applicants to employees with one click to start onboarding.', category: 'Recruitment' },
    { question: 'How do I manage training programmes?', answer: 'Go to People > Talent > Training. Create training courses with modules, assign to employees or departments, track completion and scores. The system tracks skills development and compliance training requirements. Generate training reports and certificates.', category: 'Training' },
    { question: 'How do I view the organisation chart?', answer: 'Navigate to People > Human Resources > Org Chart. View the company hierarchy by department, reporting lines, and positions. Click on any node to see employee details. The org chart updates automatically when employees are added or moved between departments.', category: 'Organisation' },
    { question: 'How do I track attendance?', answer: 'Go to People > Human Resources > Attendance. View daily attendance records, clock-in/out times, overtime hours, and absence patterns. Generate attendance reports by department or individual for any date range.', category: 'Attendance' },
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
