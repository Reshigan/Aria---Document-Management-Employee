import React, { useState } from 'react';
import { Box, Paper, Typography, TextField, InputAdornment, Accordion, AccordionSummary, AccordionDetails, Chip, Grid, Card, CardContent, Avatar } from '@mui/material';
import { Search, ExpandMore, AccountBalance, Receipt, TrendingUp, Help } from '@mui/icons-material';

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

const FinancialFAQs: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expanded, setExpanded] = useState<string | false>(false);

  const faqs: FAQ[] = [
    { question: 'How do I create a new invoice?', answer: 'Navigate to Finance > Invoices > New Invoice. Fill in the customer details, add line items, set payment terms, and click Create. The invoice will be automatically numbered and can be emailed directly to the customer.', category: 'Invoicing' },
    { question: 'How do I reconcile bank transactions?', answer: 'Go to Finance > Bank Reconciliation. Import your bank statement or connect via bank feeds. Match transactions automatically or manually, and resolve any discrepancies before finalizing.', category: 'Banking' },
    { question: 'How do I set up recurring invoices?', answer: 'When creating an invoice, check "Make Recurring" and set the frequency (weekly, monthly, quarterly, annually). The system will automatically generate and optionally send invoices on schedule.', category: 'Invoicing' },
    { question: 'How do I generate financial reports?', answer: 'Navigate to Reports > Financial Reports. Choose from Profit & Loss, Balance Sheet, Cash Flow, Trial Balance, and more. Set date ranges and export to PDF or Excel.', category: 'Reporting' },
    { question: 'How do I handle multi-currency transactions?', answer: 'ARIA supports multiple currencies. Set your base currency in Settings > Company. When creating transactions, select the currency and the system will apply current exchange rates automatically.', category: 'Currency' },
    { question: 'How do I process customer payments?', answer: 'Go to Finance > Payments > Receive Payment. Select the customer, choose invoices to apply payment to, enter payment details, and save. The system updates AR automatically.', category: 'Payments' },
    { question: 'How do I set up tax rates?', answer: 'Navigate to Settings > Tax Rates. Add tax rates for VAT, withholding tax, etc. Assign default rates to products/services and customers as needed.', category: 'Tax' },
    { question: 'How do I close the financial year?', answer: 'Go to Finance > Year End > Close Year. Run pre-close checks, generate year-end reports, make adjusting entries if needed, and finalize. The system will roll forward balances.', category: 'Year End' },
  ];

  const filteredFAQs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = [...new Set(faqs.map(f => f.category))];

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>Financial FAQs</Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { label: 'Total FAQs', value: faqs.length, icon: <Help />, color: '#667eea' },
          { label: 'Categories', value: categories.length, icon: <AccountBalance />, color: '#4CAF50' },
          { label: 'Topics', value: 'AR, AP, GL', icon: <Receipt />, color: '#FF9800' },
          { label: 'Reports', value: 'P&L, BS, CF', icon: <TrendingUp />, color: '#E91E63' },
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

export default FinancialFAQs;
