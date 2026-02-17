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
    { question: 'How do I create a purchase order?', answer: 'Navigate to Operations > Procurement > Purchase Orders and click New. Select the supplier, add items with quantities and agreed prices, set the expected delivery date, and save. The PO is auto-numbered and can be emailed directly to the supplier. Once goods arrive, create a Goods Receipt against the PO.', category: 'Procurement' },
    { question: 'How do I manage inventory levels?', answer: 'Go to Operations > Inventory > Items to view all stock. Each item shows current quantity, warehouse location, and valuation. Set reorder points under Inventory > Reorder Points so the system alerts you (and the Inventory Reorder Bot) when stock falls below minimum. Use Stock Adjustments for corrections.', category: 'Inventory' },
    { question: 'How do I process a goods receipt?', answer: 'Navigate to Procurement > Goods Receipts and click New. Select the purchase order, verify quantities received against the PO, note any shortages or damages, and confirm. Stock levels update automatically and the PO status changes to Received. Any discrepancies can trigger a supplier return.', category: 'Inventory' },
    { question: 'How do I create and manage quotes?', answer: 'Go to Operations > Sales & CRM > Quotes and click New. Select the customer, add products with pricing. Send the quote via email or PDF. When the customer accepts, convert it to a Sales Order with one click. Track quote status (Draft, Sent, Accepted, Rejected) from the quotes list.', category: 'Sales' },
    { question: 'How do I manage warehouses?', answer: 'Navigate to Operations > Inventory > Warehouses. Add warehouse locations with addresses and contact details. Use Stock Transfers to move items between warehouses. Each warehouse maintains independent stock levels and can be assigned as the default location for specific products.', category: 'Warehouse' },
    { question: 'How do I track deliveries?', answer: 'Go to Operations > Sales & CRM > Deliveries. View all pending and completed deliveries. Create delivery notes from Sales Orders, assign items and quantities, and mark as dispatched. Update delivery status as goods are shipped and received by the customer.', category: 'Logistics' },
    { question: 'How do I manage manufacturing?', answer: 'Navigate to Operations > Manufacturing. Create Bills of Materials (BOMs) defining components for each product. Generate Work Orders for production runs, allocate raw materials from inventory, track production progress, and record output. Quality inspections can be linked to each work order.', category: 'Manufacturing' },
    { question: 'How do I use CRM for customer management?', answer: 'Go to Operations > Sales & CRM > Customers for the full customer database. Track leads and opportunities through the sales pipeline. Each customer record shows purchase history, open invoices, credit terms, and communication log. Use the CRM Dashboard for sales funnel analytics.', category: 'CRM' },
    { question: 'How do I manage price lists and discounts?', answer: 'Navigate to Operations > Sales & CRM > Price Lists to create customer-specific or volume-based pricing. Set up discount rules under Sales > Discounts. Price lists can be assigned to customer groups and automatically applied when creating quotes and sales orders.', category: 'Pricing' },
    { question: 'How do I handle stock movements and transfers?', answer: 'Go to Inventory > Stock Movements to view all in/out movements. For inter-warehouse transfers, use Inventory > Stock Transfers. Create a transfer, select source and destination warehouses, add items and quantities, and confirm. Both warehouses update in real time.', category: 'Inventory' },
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
