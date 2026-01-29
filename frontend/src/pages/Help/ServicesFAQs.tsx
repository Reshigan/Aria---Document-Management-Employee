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
    { question: 'How do I create a service ticket?', answer: 'Navigate to Support > Tickets > New Ticket. Enter customer details, describe the issue, set priority, and assign to a technician. The customer receives automatic updates.', category: 'Tickets' },
    { question: 'How do I schedule a field service visit?', answer: 'Go to Field Service > Schedule. View technician availability, select time slots, and assign jobs. Technicians receive mobile notifications with job details.', category: 'Field Service' },
    { question: 'How do I track SLA compliance?', answer: 'Navigate to Support > SLA Dashboard. View response and resolution times, track breaches, and generate compliance reports. Set up alerts for at-risk tickets.', category: 'SLA' },
    { question: 'How do I manage service contracts?', answer: 'Go to Support > Contracts. Create service agreements, define coverage, set billing schedules, and track renewals. Link contracts to customers and assets.', category: 'Contracts' },
    { question: 'How do I handle escalations?', answer: 'Navigate to Support > Escalations. View escalated tickets, assign to senior staff, track resolution, and document outcomes. Escalation rules can be configured in Settings.', category: 'Escalations' },
    { question: 'How do I manage equipment and assets?', answer: 'Go to Field Service > Equipment. Track customer equipment, maintenance schedules, warranty status, and service history. Link to service tickets and contracts.', category: 'Equipment' },
    { question: 'How do I bill for services?', answer: 'Navigate to Support > Billing. Review completed work, add parts and labor, apply contract discounts, and generate invoices. Time tracking integrates automatically.', category: 'Billing' },
    { question: 'How do I access the customer portal?', answer: 'Customers can access the portal at portal.aria.vantax.co.za. They can log tickets, track status, view invoices, and access knowledge base articles.', category: 'Portal' },
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
