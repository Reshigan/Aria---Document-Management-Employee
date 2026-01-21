import React from 'react';
import { FileText, BookOpen, Video, HelpCircle, DollarSign, CreditCard, Building, PiggyBank } from 'lucide-react';

interface HelpArticle {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  readTime: string;
}

const FinancialHelp: React.FC = () => {
  const helpArticles: HelpArticle[] = [
    {
      id: '1',
      title: 'General Ledger Overview',
      description: 'Learn how to manage your chart of accounts, journal entries, and financial reporting.',
      category: 'General Ledger',
      icon: <BookOpen size={20} />,
      readTime: '5 min read'
    },
    {
      id: '2',
      title: 'Budget Management Guide',
      description: 'Create and track budgets, set up budget periods, and monitor variances.',
      category: 'Budgeting',
      icon: <DollarSign size={20} />,
      readTime: '8 min read'
    },
    {
      id: '3',
      title: 'Accounts Payable Workflow',
      description: 'Process supplier invoices, manage payment batches, and handle expense claims.',
      category: 'Accounts Payable',
      icon: <CreditCard size={20} />,
      readTime: '10 min read'
    },
    {
      id: '4',
      title: 'Accounts Receivable Best Practices',
      description: 'Manage customer invoices, credit notes, and collections effectively.',
      category: 'Accounts Receivable',
      icon: <FileText size={20} />,
      readTime: '7 min read'
    },
    {
      id: '5',
      title: 'Bank Reconciliation Process',
      description: 'Step-by-step guide to reconciling bank statements with your records.',
      category: 'Banking',
      icon: <Building size={20} />,
      readTime: '6 min read'
    },
    {
      id: '6',
      title: 'Cash Flow Forecasting',
      description: 'Predict future cash positions and plan for financial needs.',
      category: 'Banking',
      icon: <PiggyBank size={20} />,
      readTime: '8 min read'
    },
    {
      id: '7',
      title: 'Month-End Close Procedures',
      description: 'Complete checklist for closing your books at month end.',
      category: 'Reporting',
      icon: <FileText size={20} />,
      readTime: '12 min read'
    },
    {
      id: '8',
      title: 'Financial Reports Guide',
      description: 'Understanding profit & loss, balance sheet, and cash flow statements.',
      category: 'Reporting',
      icon: <BookOpen size={20} />,
      readTime: '15 min read'
    }
  ];

  const faqs = [
    {
      question: 'How do I create a journal entry?',
      answer: 'Navigate to General Ledger > Journal Entries, click "New Entry", select the accounts, enter debits and credits ensuring they balance, then save.'
    },
    {
      question: 'How do I process a supplier payment?',
      answer: 'Go to Accounts Payable > Payments, select the invoices to pay, choose the payment method, and submit the payment batch for approval.'
    },
    {
      question: 'How do I generate a VAT return?',
      answer: 'Navigate to Compliance > VAT Returns, select the period, review the calculated amounts, make any adjustments, and submit to SARS.'
    },
    {
      question: 'How do I reconcile a bank account?',
      answer: 'Go to Banking > Reconciliation, select the bank account, import or enter the statement, match transactions, and finalize the reconciliation.'
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>Financial Module Help</h1>
        <p style={{ color: '#6b7280' }}>Learn how to use the financial features of ARIA ERP</p>
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
              <div style={{ color: '#3b82f6' }}>{article.icon}</div>
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
          <HelpCircle size={24} style={{ color: '#3b82f6' }} />
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

      <div style={{ marginTop: '24px', padding: '20px', backgroundColor: '#eff6ff', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Video size={32} style={{ color: '#3b82f6' }} />
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>Video Tutorials Available</h3>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>Watch step-by-step video guides for all financial processes in the Training section.</p>
        </div>
      </div>
    </div>
  );
};

export default FinancialHelp;
