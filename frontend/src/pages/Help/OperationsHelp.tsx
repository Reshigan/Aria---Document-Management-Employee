import React from 'react';
import { FileText, BookOpen, Video, HelpCircle, ShoppingCart, Package, Truck, Factory } from 'lucide-react';

interface HelpArticle {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  readTime: string;
}

const OperationsHelp: React.FC = () => {
  const helpArticles: HelpArticle[] = [
    {
      id: '1',
      title: 'CRM Overview',
      description: 'Manage leads, opportunities, and customer relationships effectively.',
      category: 'CRM',
      icon: <BookOpen size={20} />,
      readTime: '6 min read'
    },
    {
      id: '2',
      title: 'Sales Process Guide',
      description: 'From quotation to invoice - complete sales workflow documentation.',
      category: 'Sales',
      icon: <ShoppingCart size={20} />,
      readTime: '10 min read'
    },
    {
      id: '3',
      title: 'Inventory Management',
      description: 'Stock control, adjustments, transfers, and reorder point management.',
      category: 'Inventory',
      icon: <Package size={20} />,
      readTime: '12 min read'
    },
    {
      id: '4',
      title: 'Procurement Workflow',
      description: 'Requisitions, RFQs, purchase orders, and supplier management.',
      category: 'Procurement',
      icon: <Truck size={20} />,
      readTime: '8 min read'
    },
    {
      id: '5',
      title: 'Manufacturing Operations',
      description: 'Production planning, work orders, and machine maintenance.',
      category: 'Manufacturing',
      icon: <Factory size={20} />,
      readTime: '15 min read'
    },
    {
      id: '6',
      title: 'Barcode Scanner Setup',
      description: 'Configure and use barcode scanning for inventory operations.',
      category: 'Inventory',
      icon: <Package size={20} />,
      readTime: '5 min read'
    }
  ];

  const faqs = [
    {
      question: 'How do I create a sales quotation?',
      answer: 'Navigate to Sales > Quotations, click "New Quote", select the customer, add products with quantities and prices, then save or send to customer.'
    },
    {
      question: 'How do I process a stock adjustment?',
      answer: 'Go to Inventory > Adjustments, create a new adjustment, select the warehouse and products, enter the quantity changes with reasons, and submit for approval.'
    },
    {
      question: 'How do I create a purchase order?',
      answer: 'Navigate to Procurement > Purchase Orders, click "New PO", select the supplier, add items, set delivery dates, and submit for approval.'
    },
    {
      question: 'How do I track a lead through the sales pipeline?',
      answer: 'Go to CRM > Leads, view the lead details, update the stage as you progress, add notes and activities, and convert to opportunity when qualified.'
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>Operations Module Help</h1>
        <p style={{ color: '#6b7280' }}>Learn how to use CRM, Sales, Inventory, Procurement, and Manufacturing features</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {helpArticles.map(article => (
          <div
            key={article.id}
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              transition: 'box-shadow 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ color: '#10b981' }}>{article.icon}</div>
              <span style={{ fontSize: '12px', color: '#6b7280', backgroundColor: '#f3f4f6', padding: '2px 8px', borderRadius: '4px' }}>
                {article.category}
              </span>
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>{article.title}</h3>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>{article.description}</p>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>{article.readTime}</span>
          </div>
        ))}
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <HelpCircle size={24} style={{ color: '#10b981' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Frequently Asked Questions</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {faqs.map((faq, index) => (
            <div key={index} style={{ borderBottom: index < faqs.length - 1 ? '1px solid #e5e7eb' : 'none', paddingBottom: '16px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>{faq.question}</h4>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '24px', padding: '20px', backgroundColor: '#ecfdf5', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Video size={32} style={{ color: '#10b981' }} />
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>Video Tutorials Available</h3>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>Watch step-by-step video guides for all operations processes in the Training section.</p>
        </div>
      </div>
    </div>
  );
};

export default OperationsHelp;
