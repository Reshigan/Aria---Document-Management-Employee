import React, { useState } from 'react';
import { Box, Paper, Typography, TextField, InputAdornment, Accordion, AccordionSummary, AccordionDetails, Chip, Grid, Card, CardContent, Avatar } from '@mui/material';
import { Search, ExpandMore, Gavel, Security, Assignment, Help } from '@mui/icons-material';

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

const ComplianceFAQs: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expanded, setExpanded] = useState<string | false>(false);

  const faqs: FAQ[] = [
    { question: 'What compliance regulations does ARIA support?', answer: 'ARIA supports POPIA (Protection of Personal Information Act), GDPR, SOX, and various industry-specific regulations. The system includes built-in compliance templates and automated audit trails.', category: 'General' },
    { question: 'How does ARIA handle data retention policies?', answer: 'ARIA allows you to configure data retention policies per document type. You can set automatic archival and deletion schedules while maintaining compliance with legal requirements.', category: 'Data Management' },
    { question: 'What audit trail capabilities are available?', answer: 'ARIA maintains comprehensive audit trails including user actions, document access, modifications, approvals, and system events. All logs are tamper-proof and exportable for compliance reporting.', category: 'Audit' },
    { question: 'How do I generate compliance reports?', answer: 'Navigate to Reports > Compliance Reports. You can generate POPIA compliance reports, access logs, data breach reports, and custom compliance dashboards.', category: 'Reporting' },
    { question: 'What security certifications does ARIA have?', answer: 'ARIA is ISO 27001 certified and follows SOC 2 Type II standards. We undergo regular third-party security audits and penetration testing.', category: 'Security' },
    { question: 'How do I handle a data subject access request (DSAR)?', answer: 'Go to Compliance > DSAR Management. You can log requests, track progress, generate data exports, and document responses within the required timeframes.', category: 'POPIA/GDPR' },
    { question: 'What happens when a compliance violation is detected?', answer: 'ARIA automatically flags potential violations and notifies designated compliance officers. The system creates an incident record and guides you through the remediation process.', category: 'Violations' },
    { question: 'How do I set up compliance workflows?', answer: 'Navigate to Settings > Compliance > Workflows. You can create approval chains, mandatory review processes, and automated compliance checks for different document types.', category: 'Configuration' },
  ];

  const filteredFAQs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = [...new Set(faqs.map(f => f.category))];

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>Compliance FAQs</Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { label: 'Total FAQs', value: faqs.length, icon: <Help />, color: '#667eea' },
          { label: 'Categories', value: categories.length, icon: <Assignment />, color: '#4CAF50' },
          { label: 'Compliance Topics', value: 'POPIA, GDPR, SOX', icon: <Gavel />, color: '#FF9800' },
          { label: 'Security', value: 'ISO 27001', icon: <Security />, color: '#E91E63' },
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
        <TextField
          fullWidth
          placeholder="Search FAQs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
          sx={{ mb: 3 }}
        />

        {filteredFAQs.map((faq, index) => (
          <Accordion
            key={index}
            expanded={expanded === `panel${index}`}
            onChange={(_, isExpanded) => setExpanded(isExpanded ? `panel${index}` : false)}
            sx={{ mb: 1 }}
          >
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

export default ComplianceFAQs;
