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
    { question: 'What SA compliance regulations does ARIA support?', answer: 'ARIA supports POPIA (Protection of Personal Information Act), SARS tax compliance (VAT, PAYE, UIF, SDL), B-BBEE reporting, Companies Act requirements, and Labour Relations Act compliance. Built-in templates and automated audit trails ensure you meet all regulatory deadlines.', category: 'General' },
    { question: 'How do I manage VAT returns?', answer: 'Navigate to Compliance > Tax Management > VAT Returns. The system calculates output VAT from sales invoices and input VAT from purchase bills automatically. Review the VAT201 summary, make adjustments if needed, and generate the return for submission to SARS. Historical returns are stored for audit.', category: 'Tax' },
    { question: 'How does ARIA handle audit trails?', answer: 'Every action in ARIA is logged automatically: who did what, when, and from where. View audit trails under Compliance > Audit Trails. Filter by user, date, module, or action type. Logs are tamper-proof, exportable to Excel, and retained for the full statutory period. This covers document creation, edits, approvals, deletions, and login events.', category: 'Audit' },
    { question: 'How do I manage B-BBEE compliance?', answer: 'Go to Compliance > B-BBEE. Track ownership, management control, skills development, enterprise development, and procurement spend against B-BBEE scorecard requirements. Generate reports for verification and maintain supporting documentation for each element.', category: 'B-BBEE' },
    { question: 'How do I ensure POPIA compliance?', answer: 'Navigate to Compliance > POPIA. Review data processing activities, manage consent records, handle data subject access requests (DSARs), and document your information officer details. The system tracks personal data across all modules and supports data export and erasure requests within the required timeframes.', category: 'POPIA' },
    { question: 'How do I generate compliance reports?', answer: 'Go to the Reports section within Compliance. Generate tax compliance summaries, audit trail exports, B-BBEE scorecards, POPIA compliance dashboards, and regulatory filing histories. Reports can be filtered by period and exported to PDF or Excel for submission to regulators.', category: 'Reporting' },
    { question: 'How do I manage regulatory deadlines?', answer: 'ARIA tracks all statutory filing deadlines: monthly VAT (25th), bi-annual PAYE reconciliation (EMP501), annual tax returns, and B-BBEE verification. Automated reminders notify you before each deadline. View the compliance calendar under Compliance > Deadlines.', category: 'Deadlines' },
    { question: 'How do I handle compliance incidents?', answer: 'Navigate to Compliance > Incidents. Log any compliance breach or near-miss, assign to an investigator, document findings, and track remediation actions. The system generates incident reports with timelines and supports POPIA breach notification requirements (72-hour notification to the Information Regulator).', category: 'Incidents' },
    { question: 'How do I manage document retention?', answer: 'Go to Compliance > Data Retention. Configure retention periods per document type (e.g. tax records 5 years, employment records 3 years after termination). The system flags documents approaching expiry and supports secure archival or deletion workflows.', category: 'Data Management' },
    { question: 'How do I submit PAYE and SDL returns?', answer: 'Navigate to People > Payroll > PAYE Returns. The system pre-populates EMP201 data from monthly payroll runs including PAYE, UIF (2%), and SDL (1%). Review totals, generate the return, and submit to SARS eFiling. All submissions are logged under Compliance for audit purposes.', category: 'Tax' },
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
