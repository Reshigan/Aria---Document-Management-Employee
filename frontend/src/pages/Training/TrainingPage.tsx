import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Clock, CheckCircle, BookOpen, Award, ChevronRight } from 'lucide-react';

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  duration: string;
  lessons: number;
  completed: number;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
}

interface TrainingContent {
  title: string;
  description: string;
  modules: TrainingModule[];
}

const trainingContent: Record<string, Record<string, TrainingContent>> = {
  financial: {
    gl: {
      title: 'General Ledger Training',
      description: 'Master the fundamentals of General Ledger management in ARIA ERP',
      modules: [
        { id: 'gl-1', title: 'Introduction to Chart of Accounts', description: 'Learn how to set up and manage your chart of accounts', duration: '15 min', lessons: 4, completed: 0, level: 'Beginner' },
        { id: 'gl-2', title: 'Journal Entry Processing', description: 'Create, review, and post journal entries', duration: '25 min', lessons: 6, completed: 0, level: 'Beginner' },
        { id: 'gl-3', title: 'Period Close Procedures', description: 'Month-end and year-end closing processes', duration: '30 min', lessons: 5, completed: 0, level: 'Intermediate' },
        { id: 'gl-4', title: 'Financial Reporting', description: 'Generate trial balance, income statement, and balance sheet', duration: '20 min', lessons: 4, completed: 0, level: 'Intermediate' },
      ]
    },
    'ap-ar': {
      title: 'Accounts Payable & Receivable',
      description: 'Complete training on managing payables and receivables',
      modules: [
        { id: 'apar-1', title: 'Vendor Management', description: 'Set up and manage vendor master data', duration: '20 min', lessons: 5, completed: 0, level: 'Beginner' },
        { id: 'apar-2', title: 'Invoice Processing', description: 'Create and process vendor invoices', duration: '25 min', lessons: 6, completed: 0, level: 'Beginner' },
        { id: 'apar-3', title: 'Payment Processing', description: 'Process payments and manage payment batches', duration: '20 min', lessons: 4, completed: 0, level: 'Intermediate' },
        { id: 'apar-4', title: 'Customer Invoicing', description: 'Create customer invoices and credit notes', duration: '25 min', lessons: 5, completed: 0, level: 'Beginner' },
        { id: 'apar-5', title: 'Collections Management', description: 'Manage AR aging and collections', duration: '20 min', lessons: 4, completed: 0, level: 'Intermediate' },
      ]
    },
    reconciliation: {
      title: 'Bank Reconciliation',
      description: 'Learn to reconcile bank statements efficiently',
      modules: [
        { id: 'recon-1', title: 'Bank Account Setup', description: 'Configure bank accounts in the system', duration: '15 min', lessons: 3, completed: 0, level: 'Beginner' },
        { id: 'recon-2', title: 'Statement Import', description: 'Import and process bank statements', duration: '20 min', lessons: 4, completed: 0, level: 'Beginner' },
        { id: 'recon-3', title: 'Matching Transactions', description: 'Auto-match and manual matching techniques', duration: '25 min', lessons: 5, completed: 0, level: 'Intermediate' },
        { id: 'recon-4', title: 'Reconciliation Review', description: 'Review and finalize reconciliations', duration: '15 min', lessons: 3, completed: 0, level: 'Intermediate' },
      ]
    },
    videos: {
      title: 'Financial Video Tutorials',
      description: 'Watch comprehensive video guides for financial operations',
      modules: [
        { id: 'vid-1', title: 'Quick Start: Financial Module', description: 'Get started with the financial module in 10 minutes', duration: '10 min', lessons: 1, completed: 0, level: 'Beginner' },
        { id: 'vid-2', title: 'Month-End Close Walkthrough', description: 'Step-by-step month-end closing process', duration: '20 min', lessons: 1, completed: 0, level: 'Intermediate' },
        { id: 'vid-3', title: 'Bank Reconciliation Demo', description: 'Complete bank reconciliation demonstration', duration: '15 min', lessons: 1, completed: 0, level: 'Beginner' },
      ]
    }
  },
  operations: {
    sales: {
      title: 'Sales Process Training',
      description: 'Master the complete sales cycle from lead to delivery',
      modules: [
        { id: 'sales-1', title: 'Lead Management', description: 'Capture and qualify sales leads', duration: '20 min', lessons: 4, completed: 0, level: 'Beginner' },
        { id: 'sales-2', title: 'Quote Creation', description: 'Create and manage sales quotations', duration: '25 min', lessons: 5, completed: 0, level: 'Beginner' },
        { id: 'sales-3', title: 'Order Processing', description: 'Convert quotes to orders and manage fulfillment', duration: '30 min', lessons: 6, completed: 0, level: 'Intermediate' },
        { id: 'sales-4', title: 'Delivery Management', description: 'Schedule and track deliveries', duration: '20 min', lessons: 4, completed: 0, level: 'Intermediate' },
      ]
    },
    inventory: {
      title: 'Inventory Management Training',
      description: 'Learn to manage stock levels and warehouse operations',
      modules: [
        { id: 'inv-1', title: 'Product Setup', description: 'Configure products and categories', duration: '25 min', lessons: 5, completed: 0, level: 'Beginner' },
        { id: 'inv-2', title: 'Stock Movements', description: 'Process receipts, issues, and transfers', duration: '30 min', lessons: 6, completed: 0, level: 'Beginner' },
        { id: 'inv-3', title: 'Reorder Management', description: 'Set up and manage reorder points', duration: '20 min', lessons: 4, completed: 0, level: 'Intermediate' },
        { id: 'inv-4', title: 'Stock Takes', description: 'Conduct physical inventory counts', duration: '25 min', lessons: 5, completed: 0, level: 'Intermediate' },
      ]
    },
    procurement: {
      title: 'Procurement Workflow Training',
      description: 'Complete procurement process from requisition to receipt',
      modules: [
        { id: 'proc-1', title: 'Supplier Management', description: 'Set up and evaluate suppliers', duration: '20 min', lessons: 4, completed: 0, level: 'Beginner' },
        { id: 'proc-2', title: 'Purchase Requisitions', description: 'Create and approve purchase requests', duration: '20 min', lessons: 4, completed: 0, level: 'Beginner' },
        { id: 'proc-3', title: 'RFQ Process', description: 'Request and compare supplier quotes', duration: '25 min', lessons: 5, completed: 0, level: 'Intermediate' },
        { id: 'proc-4', title: 'Purchase Orders', description: 'Create and manage purchase orders', duration: '25 min', lessons: 5, completed: 0, level: 'Beginner' },
        { id: 'proc-5', title: 'Goods Receipt', description: 'Process goods receipts and quality checks', duration: '20 min', lessons: 4, completed: 0, level: 'Intermediate' },
      ]
    },
    manufacturing: {
      title: 'Manufacturing Setup Training',
      description: 'Configure and manage manufacturing operations',
      modules: [
        { id: 'mfg-1', title: 'BOM Management', description: 'Create and manage bills of materials', duration: '30 min', lessons: 6, completed: 0, level: 'Intermediate' },
        { id: 'mfg-2', title: 'Work Orders', description: 'Create and process work orders', duration: '25 min', lessons: 5, completed: 0, level: 'Intermediate' },
        { id: 'mfg-3', title: 'Production Planning', description: 'Plan and schedule production', duration: '30 min', lessons: 6, completed: 0, level: 'Advanced' },
        { id: 'mfg-4', title: 'Quality Control', description: 'Implement quality inspections', duration: '20 min', lessons: 4, completed: 0, level: 'Intermediate' },
      ]
    },
    videos: {
      title: 'Operations Video Tutorials',
      description: 'Watch comprehensive video guides for operations',
      modules: [
        { id: 'vid-1', title: 'Sales Order Walkthrough', description: 'Complete sales order process demo', duration: '15 min', lessons: 1, completed: 0, level: 'Beginner' },
        { id: 'vid-2', title: 'Inventory Management Demo', description: 'Stock management best practices', duration: '20 min', lessons: 1, completed: 0, level: 'Beginner' },
      ]
    }
  },
  people: {
    employees: {
      title: 'Employee Management Training',
      description: 'Learn to manage employee records and HR processes',
      modules: [
        { id: 'emp-1', title: 'Employee Onboarding', description: 'Set up new employee records', duration: '25 min', lessons: 5, completed: 0, level: 'Beginner' },
        { id: 'emp-2', title: 'Position Management', description: 'Configure positions and org structure', duration: '20 min', lessons: 4, completed: 0, level: 'Intermediate' },
        { id: 'emp-3', title: 'Document Management', description: 'Manage employee documents and contracts', duration: '15 min', lessons: 3, completed: 0, level: 'Beginner' },
      ]
    },
    payroll: {
      title: 'Payroll Processing Training',
      description: 'Master SA payroll processing and compliance',
      modules: [
        { id: 'pay-1', title: 'Salary Structures', description: 'Configure salary components and structures', duration: '25 min', lessons: 5, completed: 0, level: 'Intermediate' },
        { id: 'pay-2', title: 'Payroll Run', description: 'Process monthly payroll', duration: '30 min', lessons: 6, completed: 0, level: 'Intermediate' },
        { id: 'pay-3', title: 'Tax Calculations', description: 'PAYE, UIF, and SDL calculations', duration: '25 min', lessons: 5, completed: 0, level: 'Advanced' },
        { id: 'pay-4', title: 'Payslip Generation', description: 'Generate and distribute payslips', duration: '15 min', lessons: 3, completed: 0, level: 'Beginner' },
      ]
    },
    leave: {
      title: 'Leave Management Training',
      description: 'Configure and manage employee leave',
      modules: [
        { id: 'leave-1', title: 'Leave Types Setup', description: 'Configure leave types per BCEA', duration: '20 min', lessons: 4, completed: 0, level: 'Beginner' },
        { id: 'leave-2', title: 'Leave Requests', description: 'Process leave applications', duration: '15 min', lessons: 3, completed: 0, level: 'Beginner' },
        { id: 'leave-3', title: 'Leave Calendar', description: 'View and manage team leave', duration: '15 min', lessons: 3, completed: 0, level: 'Beginner' },
      ]
    },
    'labour-law': {
      title: 'SA Labour Law Compliance',
      description: 'Understand South African labour law requirements',
      modules: [
        { id: 'law-1', title: 'BCEA Overview', description: 'Basic Conditions of Employment Act', duration: '30 min', lessons: 6, completed: 0, level: 'Intermediate' },
        { id: 'law-2', title: 'LRA Basics', description: 'Labour Relations Act fundamentals', duration: '25 min', lessons: 5, completed: 0, level: 'Intermediate' },
        { id: 'law-3', title: 'EE Act', description: 'Employment Equity requirements', duration: '25 min', lessons: 5, completed: 0, level: 'Advanced' },
      ]
    },
    videos: {
      title: 'People Video Tutorials',
      description: 'Watch comprehensive video guides for HR and Payroll',
      modules: [
        { id: 'vid-1', title: 'Payroll Run Demo', description: 'Complete payroll processing walkthrough', duration: '25 min', lessons: 1, completed: 0, level: 'Intermediate' },
        { id: 'vid-2', title: 'Leave Management Demo', description: 'Managing employee leave requests', duration: '15 min', lessons: 1, completed: 0, level: 'Beginner' },
      ]
    }
  },
  services: {
    'field-service': {
      title: 'Field Service Training',
      description: 'Manage field operations and technicians',
      modules: [
        { id: 'fs-1', title: 'Service Order Creation', description: 'Create and manage service orders', duration: '20 min', lessons: 4, completed: 0, level: 'Beginner' },
        { id: 'fs-2', title: 'Technician Assignment', description: 'Assign and schedule technicians', duration: '20 min', lessons: 4, completed: 0, level: 'Beginner' },
        { id: 'fs-3', title: 'Route Planning', description: 'Optimize service routes', duration: '25 min', lessons: 5, completed: 0, level: 'Intermediate' },
        { id: 'fs-4', title: 'Service Completion', description: 'Complete and invoice services', duration: '20 min', lessons: 4, completed: 0, level: 'Beginner' },
      ]
    },
    projects: {
      title: 'Project Management Training',
      description: 'Plan and execute projects effectively',
      modules: [
        { id: 'proj-1', title: 'Project Setup', description: 'Create and configure projects', duration: '25 min', lessons: 5, completed: 0, level: 'Beginner' },
        { id: 'proj-2', title: 'Task Management', description: 'Create and assign tasks', duration: '20 min', lessons: 4, completed: 0, level: 'Beginner' },
        { id: 'proj-3', title: 'Resource Planning', description: 'Allocate resources to projects', duration: '25 min', lessons: 5, completed: 0, level: 'Intermediate' },
        { id: 'proj-4', title: 'Milestone Tracking', description: 'Track project milestones', duration: '20 min', lessons: 4, completed: 0, level: 'Intermediate' },
      ]
    },
    timesheets: {
      title: 'Timesheet Entry Training',
      description: 'Record and manage time entries',
      modules: [
        { id: 'ts-1', title: 'Time Entry Basics', description: 'Record daily time entries', duration: '15 min', lessons: 3, completed: 0, level: 'Beginner' },
        { id: 'ts-2', title: 'Timesheet Approval', description: 'Submit and approve timesheets', duration: '15 min', lessons: 3, completed: 0, level: 'Beginner' },
        { id: 'ts-3', title: 'Billing Integration', description: 'Link time to billing', duration: '20 min', lessons: 4, completed: 0, level: 'Intermediate' },
      ]
    },
    support: {
      title: 'Support Ticket Training',
      description: 'Handle customer support efficiently',
      modules: [
        { id: 'sup-1', title: 'Ticket Creation', description: 'Create and categorize tickets', duration: '15 min', lessons: 3, completed: 0, level: 'Beginner' },
        { id: 'sup-2', title: 'Ticket Assignment', description: 'Route and assign tickets', duration: '15 min', lessons: 3, completed: 0, level: 'Beginner' },
        { id: 'sup-3', title: 'SLA Management', description: 'Configure and monitor SLAs', duration: '20 min', lessons: 4, completed: 0, level: 'Intermediate' },
        { id: 'sup-4', title: 'Knowledge Base', description: 'Create and manage KB articles', duration: '20 min', lessons: 4, completed: 0, level: 'Intermediate' },
      ]
    },
    videos: {
      title: 'Services Video Tutorials',
      description: 'Watch comprehensive video guides for services',
      modules: [
        { id: 'vid-1', title: 'Field Service Demo', description: 'Complete field service workflow', duration: '20 min', lessons: 1, completed: 0, level: 'Beginner' },
        { id: 'vid-2', title: 'Project Management Demo', description: 'Project setup and tracking', duration: '20 min', lessons: 1, completed: 0, level: 'Beginner' },
      ]
    }
  },
  compliance: {
    tax: {
      title: 'SA Tax Compliance Training',
      description: 'Master South African tax requirements',
      modules: [
        { id: 'tax-1', title: 'VAT Fundamentals', description: 'Understanding VAT in South Africa', duration: '30 min', lessons: 6, completed: 0, level: 'Intermediate' },
        { id: 'tax-2', title: 'VAT Returns', description: 'Prepare and submit VAT returns', duration: '25 min', lessons: 5, completed: 0, level: 'Intermediate' },
        { id: 'tax-3', title: 'PAYE Compliance', description: 'Employer PAYE obligations', duration: '25 min', lessons: 5, completed: 0, level: 'Intermediate' },
        { id: 'tax-4', title: 'Provisional Tax', description: 'Provisional tax calculations', duration: '20 min', lessons: 4, completed: 0, level: 'Advanced' },
      ]
    },
    'b-bbee': {
      title: 'B-BBEE Compliance Training',
      description: 'Understand and improve your B-BBEE scorecard',
      modules: [
        { id: 'bee-1', title: 'B-BBEE Overview', description: 'Understanding the B-BBEE framework', duration: '25 min', lessons: 5, completed: 0, level: 'Beginner' },
        { id: 'bee-2', title: 'Ownership Element', description: 'Black ownership requirements', duration: '20 min', lessons: 4, completed: 0, level: 'Intermediate' },
        { id: 'bee-3', title: 'Management Control', description: 'Management representation', duration: '20 min', lessons: 4, completed: 0, level: 'Intermediate' },
        { id: 'bee-4', title: 'Skills Development', description: 'Training and development spend', duration: '20 min', lessons: 4, completed: 0, level: 'Intermediate' },
        { id: 'bee-5', title: 'Enterprise Development', description: 'ED and SD contributions', duration: '25 min', lessons: 5, completed: 0, level: 'Advanced' },
      ]
    },
    assets: {
      title: 'Fixed Assets Training',
      description: 'Manage fixed assets and depreciation',
      modules: [
        { id: 'asset-1', title: 'Asset Registration', description: 'Register and categorize assets', duration: '20 min', lessons: 4, completed: 0, level: 'Beginner' },
        { id: 'asset-2', title: 'Depreciation Setup', description: 'Configure depreciation methods', duration: '25 min', lessons: 5, completed: 0, level: 'Intermediate' },
        { id: 'asset-3', title: 'Asset Disposal', description: 'Process asset disposals', duration: '20 min', lessons: 4, completed: 0, level: 'Intermediate' },
      ]
    },
    audit: {
      title: 'Audit Preparation Training',
      description: 'Prepare for internal and external audits',
      modules: [
        { id: 'audit-1', title: 'Audit Trail Review', description: 'Review system audit trails', duration: '20 min', lessons: 4, completed: 0, level: 'Intermediate' },
        { id: 'audit-2', title: 'Document Preparation', description: 'Prepare audit documentation', duration: '25 min', lessons: 5, completed: 0, level: 'Intermediate' },
        { id: 'audit-3', title: 'Control Testing', description: 'Test internal controls', duration: '30 min', lessons: 6, completed: 0, level: 'Advanced' },
      ]
    },
    videos: {
      title: 'Compliance Video Tutorials',
      description: 'Watch comprehensive video guides for compliance',
      modules: [
        { id: 'vid-1', title: 'VAT Return Demo', description: 'Complete VAT return process', duration: '20 min', lessons: 1, completed: 0, level: 'Intermediate' },
        { id: 'vid-2', title: 'B-BBEE Scorecard Demo', description: 'Understanding your scorecard', duration: '25 min', lessons: 1, completed: 0, level: 'Beginner' },
      ]
    }
  }
};

const TrainingPage: React.FC = () => {
  const { module, topic } = useParams<{ module: string; topic: string }>();
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  const moduleContent = module ? trainingContent[module] : null;
  const topicContent = moduleContent && topic ? moduleContent[topic] : null;

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Beginner': return { bg: '#dcfce7', text: '#166534' };
      case 'Intermediate': return { bg: '#fef3c7', text: '#92400e' };
      case 'Advanced': return { bg: '#fee2e2', text: '#991b1b' };
      default: return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  if (!moduleContent) {
    return (
      <div style={{ padding: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', marginBottom: '8px' }}>Training Center</h1>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>Select a module to start learning</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {Object.entries(trainingContent).map(([key, topics]) => (
            <Link
              key={key}
              to={`/training/${key}`}
              style={{
                display: 'block',
                padding: '24px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                textDecoration: 'none',
                color: 'inherit'
              }}
            >
              <Award size={32} style={{ color: '#2563eb', marginBottom: '12px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', textTransform: 'capitalize' }}>{key} Training</h3>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>{Object.keys(topics).length} courses available</p>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (!topicContent) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <Link to="/training" style={{ color: '#6b7280', textDecoration: 'none' }}>Training</Link>
          <ChevronRight size={16} style={{ color: '#6b7280' }} />
          <span style={{ color: '#111827', textTransform: 'capitalize' }}>{module}</span>
        </div>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'capitalize' }}>{module} Training</h1>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>Select a course to begin</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {Object.entries(moduleContent).map(([key, content]) => (
            <Link
              key={key}
              to={`/training/${module}/${key}`}
              style={{
                display: 'block',
                padding: '24px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                textDecoration: 'none',
                color: 'inherit'
              }}
            >
              <BookOpen size={24} style={{ color: '#2563eb', marginBottom: '12px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>{content.title}</h3>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '12px' }}>{content.description}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#6b7280' }}>
                <span>{content.modules.length} modules</span>
                <span>{content.modules.reduce((acc, m) => acc + m.lessons, 0)} lessons</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
        <Link to="/training" style={{ color: '#6b7280', textDecoration: 'none' }}>Training</Link>
        <ChevronRight size={16} style={{ color: '#6b7280' }} />
        <Link to={`/training/${module}`} style={{ color: '#6b7280', textDecoration: 'none', textTransform: 'capitalize' }}>{module}</Link>
        <ChevronRight size={16} style={{ color: '#6b7280' }} />
        <span style={{ color: '#111827' }}>{topicContent.title}</span>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', marginBottom: '8px' }}>{topicContent.title}</h1>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>{topicContent.description}</p>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div style={{ padding: '16px 24px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>{topicContent.modules.length}</div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Modules</div>
        </div>
        <div style={{ padding: '16px 24px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>{topicContent.modules.reduce((acc, m) => acc + m.lessons, 0)}</div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Lessons</div>
        </div>
        <div style={{ padding: '16px 24px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>{topicContent.modules.reduce((acc, m) => acc + parseInt(m.duration), 0)} min</div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Duration</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {topicContent.modules.map((mod, idx) => {
          const levelColor = getLevelColor(mod.level);
          return (
            <div
              key={mod.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                border: selectedModule === mod.id ? '2px solid #2563eb' : '2px solid transparent'
              }}
              onClick={() => setSelectedModule(selectedModule === mod.id ? null : mod.id)}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    backgroundColor: '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Play size={24} style={{ color: '#2563eb' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>{mod.title}</h3>
                    <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>{mod.description}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#6b7280' }}>
                        <Clock size={14} /> {mod.duration}
                      </span>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>{mod.lessons} lessons</span>
                      <span style={{
                        padding: '2px 8px',
                        fontSize: '11px',
                        fontWeight: '600',
                        borderRadius: '9999px',
                        backgroundColor: levelColor.bg,
                        color: levelColor.text
                      }}>
                        {mod.level}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Start
                </button>
              </div>
              {selectedModule === mod.id && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                  <p style={{ color: '#6b7280', fontSize: '14px' }}>
                    This module contains {mod.lessons} lessons covering {mod.description.toLowerCase()}. 
                    Estimated completion time is {mod.duration}.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TrainingPage;
