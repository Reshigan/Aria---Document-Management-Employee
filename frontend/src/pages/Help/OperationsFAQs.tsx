import React, { useState } from 'react';
import { Box, Paper, Typography, TextField, InputAdornment, Accordion, AccordionSummary, AccordionDetails, Chip, Grid, Card, CardContent, Avatar } from '@mui/material';
import { Search, ExpandMore, Settings, Inventory, LocalShipping, Help } from '@mui/icons-material';

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

const OperationsFAQs: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expanded, setExpanded] = useState<string | false>(false);

  const faqs: FAQ[] = [
    { question: 'How do I create a purchase order?', answer: 'Navigate to Procurement > Purchase Orders > New PO. Select the supplier, add items, set delivery dates, and submit for approval. The PO will be automatically numbered and can be emailed to the supplier.', category: 'Procurement' },
    { question: 'How do I manage inventory levels?', answer: 'Go to Inventory > Stock Levels. Set minimum and maximum stock levels for each item. The system will alert you when stock falls below minimum or exceeds maximum levels.', category: 'Inventory' },
    { question: 'How do I process a goods receipt?', answer: 'Navigate to Inventory > Goods Receipt. Select the PO, verify quantities received, note any discrepancies, and confirm receipt. Stock levels are updated automatically.', category: 'Inventory' },
    { question: 'How do I set up warehouse locations?', answer: 'Go to Settings > Inventory > Warehouses. Add warehouse details, define zones, aisles, and bin locations. Assign default locations for products.', category: 'Warehouse' },
    { question: 'How do I track shipments?', answer: 'Navigate to Logistics > Shipments. View all outbound shipments, track carrier status, and update delivery confirmations. Integration with major carriers provides real-time tracking.', category: 'Logistics' },
    { question: 'How do I manage production orders?', answer: 'Go to Manufacturing > Production Orders. Create orders from sales orders or manually, allocate materials, schedule production, and track progress through each stage.', category: 'Manufacturing' },
    { question: 'How do I handle returns?', answer: 'Navigate to Sales > Returns or Procurement > Returns. Create a return authorization, process the return, update inventory, and issue credit notes or refunds as needed.', category: 'Returns' },
    { question: 'How do I set up approval workflows?', answer: 'Go to Settings > Workflows. Define approval rules based on document type, amount thresholds, and departments. Assign approvers and set escalation rules.', category: 'Workflows' },
  ];

  const filteredFAQs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = [...new Set(faqs.map(f => f.category))];

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>Operations FAQs</Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { label: 'Total FAQs', value: faqs.length, icon: <Help />, color: '#667eea' },
          { label: 'Categories', value: categories.length, icon: <Settings />, color: '#4CAF50' },
          { label: 'Topics', value: 'Inventory, Logistics', icon: <Inventory />, color: '#FF9800' },
          { label: 'Modules', value: 'Procurement, Mfg', icon: <LocalShipping />, color: '#E91E63' },
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

export default OperationsFAQs;
