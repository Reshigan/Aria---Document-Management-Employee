import React from 'react';
import { FileText, BookOpen, Video, HelpCircle, Users, Calendar, DollarSign, UserPlus } from 'lucide-react';

interface HelpArticle {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  readTime: string;
}

const PeopleHelp: React.FC = () => {
  const helpArticles: HelpArticle[] = [
    {
      id: '1',
      title: 'Employee Management',
      description: 'Add, edit, and manage employee records, positions, and departments.',
      category: 'HR',
      icon: <Users size={20} />,
      readTime: '8 min read'
    },
    {
      id: '2',
      title: 'Leave Management Guide',
      description: 'Configure leave types, approve requests, and track leave balances.',
      category: 'HR',
      icon: <Calendar size={20} />,
      readTime: '6 min read'
    },
    {
      id: '3',
      title: 'Payroll Processing',
      description: 'Run payroll, manage salary structures, deductions, and generate payslips.',
      category: 'Payroll',
      icon: <DollarSign size={20} />,
      readTime: '12 min read'
    },
    {
      id: '4',
      title: 'PAYE & UIF Submissions',
      description: 'Generate and submit statutory returns to SARS and Department of Labour.',
      category: 'Payroll',
      icon: <FileText size={20} />,
      readTime: '10 min read'
    },
    {
      id: '5',
      title: 'Recruitment Process',
      description: 'Post jobs, manage applicants, and onboard new employees.',
      category: 'Recruitment',
      icon: <UserPlus size={20} />,
      readTime: '8 min read'
    },
    {
      id: '6',
      title: 'Performance Reviews',
      description: 'Set up review cycles, conduct evaluations, and track employee performance.',
      category: 'HR',
      icon: <BookOpen size={20} />,
      readTime: '7 min read'
    },
    {
      id: '7',
      title: 'Skills Matrix Management',
      description: 'Track employee skills, identify gaps, and plan training needs.',
      category: 'HR',
      icon: <Users size={20} />,
      readTime: '5 min read'
    },
    {
      id: '8',
      title: 'SA Labour Law Compliance',
      description: 'Ensure compliance with BCEA, LRA, and other employment legislation.',
      category: 'Compliance',
      icon: <FileText size={20} />,
      readTime: '15 min read'
    }
  ];

  const faqs = [
    {
      question: 'How do I add a new employee?',
      answer: 'Navigate to HR > Employees, click "Add Employee", fill in personal details, employment information, and banking details, then save.'
    },
    {
      question: 'How do I process monthly payroll?',
      answer: 'Go to Payroll > Runs, create a new payroll run for the period, review calculations, make any adjustments, approve, and generate payslips.'
    },
    {
      question: 'How do I approve leave requests?',
      answer: 'Navigate to HR > Leave, view pending requests, check leave balances, and click Approve or Reject with comments.'
    },
    {
      question: 'How do I submit PAYE returns?',
      answer: 'Go to Payroll > PAYE Returns, select the period, review the calculated amounts, generate the EMP201, and submit to SARS.'
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>People Module Help</h1>
        <p style={{ color: '#6b7280' }}>Learn how to use HR, Payroll, and Recruitment features</p>
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
              <div style={{ color: '#8b5cf6' }}>{article.icon}</div>
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
          <HelpCircle size={24} style={{ color: '#8b5cf6' }} />
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

      <div style={{ marginTop: '24px', padding: '20px', backgroundColor: '#f5f3ff', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Video size={32} style={{ color: '#8b5cf6' }} />
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>Video Tutorials Available</h3>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>Watch step-by-step video guides for all HR and Payroll processes in the Training section.</p>
        </div>
      </div>
    </div>
  );
};

export default PeopleHelp;
