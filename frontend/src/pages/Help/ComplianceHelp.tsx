import React from 'react';
import { FileText, BookOpen, Video, HelpCircle, Shield, Scale, Building, AlertTriangle } from 'lucide-react';

interface HelpArticle {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  readTime: string;
}

const ComplianceHelp: React.FC = () => {
  const helpArticles: HelpArticle[] = [
    {
      id: '1',
      title: 'VAT Compliance Guide',
      description: 'Understand VAT requirements, generate returns, and submit to SARS.',
      category: 'Tax',
      icon: <FileText size={20} />,
      readTime: '10 min read'
    },
    {
      id: '2',
      title: 'B-BBEE Scorecard Management',
      description: 'Track and improve your B-BBEE compliance score.',
      category: 'B-BBEE',
      icon: <Scale size={20} />,
      readTime: '12 min read'
    },
    {
      id: '3',
      title: 'Fixed Asset Management',
      description: 'Register assets, calculate depreciation, and maintain records.',
      category: 'Assets',
      icon: <Building size={20} />,
      readTime: '8 min read'
    },
    {
      id: '4',
      title: 'Audit Trail & Controls',
      description: 'Maintain complete audit trails and internal controls.',
      category: 'Audit',
      icon: <Shield size={20} />,
      readTime: '7 min read'
    },
    {
      id: '5',
      title: 'Risk Register Management',
      description: 'Identify, assess, and mitigate business risks.',
      category: 'Risk',
      icon: <AlertTriangle size={20} />,
      readTime: '9 min read'
    },
    {
      id: '6',
      title: 'Document Control',
      description: 'Manage controlled documents, versions, and approvals.',
      category: 'Documents',
      icon: <FileText size={20} />,
      readTime: '6 min read'
    },
    {
      id: '7',
      title: 'Policy Management',
      description: 'Create, distribute, and track policy acknowledgements.',
      category: 'Policies',
      icon: <BookOpen size={20} />,
      readTime: '5 min read'
    },
    {
      id: '8',
      title: 'Audit Preparation Checklist',
      description: 'Prepare for internal and external audits with confidence.',
      category: 'Audit',
      icon: <Shield size={20} />,
      readTime: '15 min read'
    }
  ];

  const faqs = [
    {
      question: 'How do I generate a VAT return?',
      answer: 'Navigate to Compliance > VAT Returns, select the period, review input and output VAT, make adjustments if needed, and generate the return for submission.'
    },
    {
      question: 'How do I update my B-BBEE scorecard?',
      answer: 'Go to Compliance > B-BBEE, update each element (ownership, management, skills development, etc.), upload supporting documents, and calculate your score.'
    },
    {
      question: 'How do I register a new fixed asset?',
      answer: 'Navigate to Compliance > Asset Register, click "Add Asset", enter details including cost, useful life, and depreciation method, then save.'
    },
    {
      question: 'How do I view the audit trail?',
      answer: 'Go to Compliance > Audit Trail, filter by date range, user, or action type to view all system activities and changes.'
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>Compliance Module Help</h1>
        <p style={{ color: '#6b7280' }}>Learn how to manage tax, B-BBEE, assets, and regulatory compliance</p>
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
              <div style={{ color: '#ef4444' }}>{article.icon}</div>
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
          <HelpCircle size={24} style={{ color: '#ef4444' }} />
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

      <div style={{ marginTop: '24px', padding: '20px', backgroundColor: '#fef2f2', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Video size={32} style={{ color: '#ef4444' }} />
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>Video Tutorials Available</h3>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>Watch step-by-step video guides for all compliance processes in the Training section.</p>
        </div>
      </div>
    </div>
  );
};

export default ComplianceHelp;
