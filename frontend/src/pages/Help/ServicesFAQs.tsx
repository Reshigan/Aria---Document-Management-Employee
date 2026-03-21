import React, { useState } from 'react';
import { Box, Paper, Typography, TextField, InputAdornment, Accordion, AccordionSummary, AccordionDetails, Chip, Grid, Card, CardContent, Avatar } from '@mui/material';
import { Search, ExpandMore, Support, Build, Assignment, Help } from '@mui/icons-material';

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

const ServicesFAQs: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expanded, setExpanded] = useState<string | false>(false);

  const faqs: FAQ[] = [
    { question: 'How do I create a helpdesk ticket?', answer: 'Navigate to Services > Helpdesk > Tickets and click New. Enter the customer, describe the issue, set priority (Low, Medium, High, Critical), and assign to a team or technician. The ticket is auto-numbered and the customer receives email updates as the status changes.', category: 'Helpdesk' },
    { question: 'How do I schedule field service work?', answer: 'Go to Services > Field Service > Scheduling. View technician availability on the calendar, drag-and-drop to assign jobs, and set time windows. Service orders include customer address, equipment details, and required parts. Technicians see their schedule and job details in real time.', category: 'Field Service' },
    { question: 'How do I manage service orders?', answer: 'Navigate to Services > Field Service > Service Orders and click New. Link to a customer, select the equipment being serviced, describe the work required, assign a technician, and set the scheduled date. Track progress from Open through In Progress to Completed.', category: 'Field Service' },
    { question: 'How do I manage service contracts?', answer: 'Go to Services > Field Service > Service Contracts. Create agreements defining coverage scope, SLA terms, response times, and billing frequency. Link contracts to specific customers and equipment. The system tracks contract expiry dates and sends renewal reminders automatically.', category: 'Contracts' },
    { question: 'How do I manage projects?', answer: 'Navigate to Services > Project Management > Projects. Create projects with milestones, tasks, and resource assignments. Track progress with Gantt charts or Kanban boards. Log time against project tasks and generate project profitability reports.', category: 'Projects' },
    { question: 'How do I track timesheets?', answer: 'Go to Services > Project Management > Timesheets. Employees log daily hours against projects, service orders, or internal tasks. Managers approve timesheets weekly. Approved time feeds into payroll and project billing calculations automatically.', category: 'Timesheets' },
    { question: 'How do I manage helpdesk teams?', answer: 'Navigate to Services > Helpdesk > Teams. Create support teams (e.g. IT Support, Customer Care), assign members, set up auto-assignment rules, and define escalation paths. Each team can have its own SLA targets and working hours.', category: 'Helpdesk' },
    { question: 'How do I handle equipment and asset tracking?', answer: 'Go to Services > Field Service > Equipment to maintain a register of customer and company assets. Record serial numbers, warranty dates, maintenance schedules, and full service history. Link equipment to service contracts and automatically schedule preventive maintenance.', category: 'Assets' },
    { question: 'How do I route field service technicians?', answer: 'Navigate to Services > Field Service > Route Planning. View all scheduled jobs on a map, optimise routes by proximity and priority, and assign efficiently. Technicians receive updated routes with turn-by-turn directions and customer contact details.', category: 'Field Service' },
    { question: 'How do I generate service reports?', answer: 'Go to the Reports section within Services. Generate ticket volume and resolution reports, SLA compliance dashboards, technician utilisation rates, project profitability analyses, and customer satisfaction metrics. Export to PDF or Excel.', category: 'Reporting' },
  ];

  const filteredFAQs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = [...new Set(faqs.map(f => f.category))];

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>Services FAQs</Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { label: 'Total FAQs', value: faqs.length, icon: <Help />, color: '#667eea' },
          { label: 'Categories', value: categories.length, icon: <Support />, color: '#4CAF50' },
          { label: 'Topics', value: 'Support, Field', icon: <Build />, color: '#FF9800' },
          { label: 'Modules', value: 'SLA, Contracts', icon: <Assignment />, color: '#E91E63' },
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

export default ServicesFAQs;
