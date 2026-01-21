import React from 'react';
import { FileText, BookOpen, Video, HelpCircle, Wrench, FolderKanban, Clock, Headphones } from 'lucide-react';

interface HelpArticle {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  readTime: string;
}

const ServicesHelp: React.FC = () => {
  const helpArticles: HelpArticle[] = [
    {
      id: '1',
      title: 'Field Service Overview',
      description: 'Manage service orders, technicians, and route planning.',
      category: 'Field Service',
      icon: <Wrench size={20} />,
      readTime: '8 min read'
    },
    {
      id: '2',
      title: 'Service Contracts Guide',
      description: 'Create and manage service level agreements with customers.',
      category: 'Field Service',
      icon: <FileText size={20} />,
      readTime: '6 min read'
    },
    {
      id: '3',
      title: 'Project Management',
      description: 'Create projects, track milestones, and manage resources.',
      category: 'Projects',
      icon: <FolderKanban size={20} />,
      readTime: '10 min read'
    },
    {
      id: '4',
      title: 'Timesheet Management',
      description: 'Track time spent on projects and tasks for billing.',
      category: 'Projects',
      icon: <Clock size={20} />,
      readTime: '5 min read'
    },
    {
      id: '5',
      title: 'Support Ticket System',
      description: 'Handle customer support requests and track resolution.',
      category: 'Support',
      icon: <Headphones size={20} />,
      readTime: '7 min read'
    },
    {
      id: '6',
      title: 'Knowledge Base Setup',
      description: 'Create and organize help articles for customers and staff.',
      category: 'Support',
      icon: <BookOpen size={20} />,
      readTime: '6 min read'
    }
  ];

  const faqs = [
    {
      question: 'How do I create a service order?',
      answer: 'Navigate to Field Service > Orders, click "New Order", select the customer and service type, assign a technician, set the schedule, and save.'
    },
    {
      question: 'How do I track project progress?',
      answer: 'Go to Projects > Dashboard, select your project, view the milestone tracker, update task statuses, and check the overall completion percentage.'
    },
    {
      question: 'How do I log time on a project?',
      answer: 'Navigate to Projects > Timesheets, click "Log Time", select the project and task, enter hours worked with description, and submit.'
    },
    {
      question: 'How do I handle a support ticket?',
      answer: 'Go to Support > Tickets, open the ticket, review the issue, add internal notes or customer responses, update status, and resolve when complete.'
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>Services Module Help</h1>
        <p style={{ color: '#6b7280' }}>Learn how to use Field Service, Projects, and Support features</p>
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
              <div style={{ color: '#f59e0b' }}>{article.icon}</div>
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
          <HelpCircle size={24} style={{ color: '#f59e0b' }} />
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

      <div style={{ marginTop: '24px', padding: '20px', backgroundColor: '#fffbeb', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Video size={32} style={{ color: '#f59e0b' }} />
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>Video Tutorials Available</h3>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>Watch step-by-step video guides for all service processes in the Training section.</p>
        </div>
      </div>
    </div>
  );
};

export default ServicesHelp;
