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
    { question: 'How do I create a new invoice?', answer: 'Go to Receivables > Customer Invoices and click New. Select a customer, add line items with product, quantity, and unit price. VAT is calculated automatically at 15%. Save to create as Draft, then change status to Approved to finalise. You can print or email the invoice directly from the detail view.', category: 'Invoicing' },
    { question: 'How do I create a sales order?', answer: 'Navigate to Operations > Sales & CRM > Sales Orders and click New. Select the customer, add products with quantities and pricing. Sales orders flow into deliveries and invoices. You can also create orders via Ask ARIA using natural language, e.g. "Create SO for Customer X, 5 units of Product Y at R1,500."', category: 'Sales' },
    { question: 'How do I reconcile bank transactions?', answer: 'Go to Financial > Banking & Cash > Reconciliation. Upload your bank statement CSV or enter transactions manually. The system suggests matches against open invoices and payments. Confirm each match, resolve discrepancies, and finalise to update your ledger balances.', category: 'Banking' },
    { question: 'How do I post journal entries?', answer: 'Navigate to Financial > Core Accounting > Journal Entries and click New. Enter the date, reference, and add debit/credit lines ensuring the entry balances. Select accounts from the Chart of Accounts. Save as Draft for review, then Post to update the General Ledger.', category: 'General Ledger' },
    { question: 'How do I generate financial reports?', answer: 'Go to any report from the Financial menu: Trial Balance, Balance Sheet, Income Statement, or Cash Flow. Set the reporting period and click Generate. Reports can be exported to PDF or Excel. Use the Reports section under each module for specialised reports like AR/AP Aging.', category: 'Reporting' },
    { question: 'How do I handle multi-currency transactions?', answer: 'Set your base currency (ZAR) in Settings > Company. When creating invoices or purchase orders, select the transaction currency. ARIA applies the current exchange rate automatically and calculates the ZAR equivalent. Realised gains/losses are posted when payments are processed.', category: 'Currency' },
    { question: 'How do I process customer payments?', answer: 'Go to Receivables > Receipts and click New. Select the customer to see their open invoices. Enter the payment amount, method (EFT, cash, card), and reference number. Allocate to specific invoices. The AR balance updates automatically on save.', category: 'Payments' },
    { question: 'How do I set up VAT and tax rates?', answer: 'Navigate to Compliance > Tax Management. The standard SA VAT rate of 15% is pre-configured. You can add additional rates for zero-rated, exempt, or withholding tax. Assign default tax rates to products and customer accounts so they apply automatically on transactions.', category: 'Tax' },
    { question: 'How do I manage accounts payable?', answer: 'Go to Financial > Payables to manage vendor bills, payments, and expense claims. Create bills from purchase orders or manually. Schedule payments in batches. Track AP aging to manage cash flow and supplier relationships.', category: 'Payables' },
    { question: 'How do I close the financial period?', answer: 'Use the Help > Financial > Month-End Close Checklist to work through all required steps: bank reconciliation, AR/AP review, accruals, depreciation, inventory valuation, and trial balance review. Once complete, generate financial statements and close the period in General Ledger.', category: 'Period Close' },
    { question: 'How do I manage budgets?', answer: 'Navigate to Financial > Core Accounting > Budget Management. Create annual budgets by account and cost centre. The system tracks actual vs budget variances in real time. Generate budget comparison reports from Reports > Financial to monitor performance.', category: 'Budgets' },
    { question: 'How do I handle credit notes?', answer: 'Go to Receivables > Credit Notes and click New. Select the original invoice, specify the reason and amount to credit. The credit note reduces the customer balance and can be applied to future invoices or refunded.', category: 'Invoicing' },
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
