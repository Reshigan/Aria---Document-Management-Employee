import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { BookOpen, Video, FileQuestion, ArrowRight, Search, ExternalLink } from 'lucide-react';

interface HelpSection {
  title: string;
  description: string;
  articles: { title: string; path: string }[];
}

const helpContent: Record<string, { title: string; description: string; sections: HelpSection[] }> = {
  financial: {
    title: 'Financial Module Help',
    description: 'Learn how to manage your financial operations including General Ledger, Accounts Payable, Accounts Receivable, and Banking.',
    sections: [
      {
        title: 'Getting Started',
        description: 'Essential guides to set up your financial module',
        articles: [
          { title: 'Setting up Chart of Accounts', path: '/help/financial/chart-of-accounts' },
          { title: 'Configuring Tax Rates', path: '/help/financial/tax-rates' },
          { title: 'Bank Account Setup', path: '/help/financial/bank-setup' },
        ]
      },
      {
        title: 'Daily Operations',
        description: 'Common tasks and workflows',
        articles: [
          { title: 'Creating Journal Entries', path: '/help/financial/journal-entries' },
          { title: 'Processing Payments', path: '/help/financial/payments' },
          { title: 'Recording Receipts', path: '/help/financial/receipts' },
        ]
      },
      {
        title: 'Month-End Procedures',
        description: 'Closing and reconciliation processes',
        articles: [
          { title: 'Bank Reconciliation Guide', path: '/help/financial/reconciliation' },
          { title: 'Month-End Close Checklist', path: '/help/financial/month-end' },
          { title: 'Year-End Procedures', path: '/help/financial/year-end' },
        ]
      }
    ]
  },
  operations: {
    title: 'Operations Module Help',
    description: 'Comprehensive guides for Sales, Inventory, Procurement, and Manufacturing operations.',
    sections: [
      {
        title: 'Sales & CRM',
        description: 'Managing customer relationships and sales processes',
        articles: [
          { title: 'Lead Management', path: '/help/operations/leads' },
          { title: 'Quote to Order Process', path: '/help/operations/quote-to-order' },
          { title: 'Customer Segmentation', path: '/help/operations/segmentation' },
        ]
      },
      {
        title: 'Inventory Management',
        description: 'Stock control and warehouse operations',
        articles: [
          { title: 'Stock Adjustments', path: '/help/operations/stock-adjustments' },
          { title: 'Reorder Point Setup', path: '/help/operations/reorder-points' },
          { title: 'Barcode Scanning', path: '/help/operations/barcode' },
        ]
      },
      {
        title: 'Procurement',
        description: 'Supplier management and purchasing',
        articles: [
          { title: 'Creating Purchase Orders', path: '/help/operations/purchase-orders' },
          { title: 'RFQ Process', path: '/help/operations/rfq' },
          { title: 'Supplier Evaluation', path: '/help/operations/supplier-eval' },
        ]
      }
    ]
  },
  people: {
    title: 'People Module Help',
    description: 'HR, Payroll, and Talent Management guides for South African businesses.',
    sections: [
      {
        title: 'HR Administration',
        description: 'Employee and organizational management',
        articles: [
          { title: 'Employee Onboarding', path: '/help/people/onboarding' },
          { title: 'Leave Management', path: '/help/people/leave' },
          { title: 'Org Chart Setup', path: '/help/people/org-chart' },
        ]
      },
      {
        title: 'Payroll',
        description: 'SA payroll processing and compliance',
        articles: [
          { title: 'Payroll Run Process', path: '/help/people/payroll-run' },
          { title: 'PAYE Calculations', path: '/help/people/paye' },
          { title: 'UIF Submissions', path: '/help/people/uif' },
        ]
      },
      {
        title: 'Compliance',
        description: 'South African labour law requirements',
        articles: [
          { title: 'BCEA Requirements', path: '/help/people/bcea' },
          { title: 'EE Reporting', path: '/help/people/ee-reporting' },
          { title: 'Skills Development Levy', path: '/help/people/sdl' },
        ]
      }
    ]
  },
  services: {
    title: 'Services Module Help',
    description: 'Field Service, Projects, and Support management guides.',
    sections: [
      {
        title: 'Field Service',
        description: 'Managing field operations and technicians',
        articles: [
          { title: 'Service Order Workflow', path: '/help/services/service-orders' },
          { title: 'Technician Scheduling', path: '/help/services/scheduling' },
          { title: 'Route Optimization', path: '/help/services/routes' },
        ]
      },
      {
        title: 'Project Management',
        description: 'Project planning and execution',
        articles: [
          { title: 'Project Setup', path: '/help/services/project-setup' },
          { title: 'Milestone Tracking', path: '/help/services/milestones' },
          { title: 'Resource Allocation', path: '/help/services/resources' },
        ]
      },
      {
        title: 'Support',
        description: 'Customer support and helpdesk',
        articles: [
          { title: 'Ticket Management', path: '/help/services/tickets' },
          { title: 'SLA Configuration', path: '/help/services/sla' },
          { title: 'Knowledge Base Setup', path: '/help/services/knowledge-base' },
        ]
      }
    ]
  },
  compliance: {
    title: 'Compliance Module Help',
    description: 'Tax, Legal, and Governance compliance guides for South African businesses.',
    sections: [
      {
        title: 'Tax Compliance',
        description: 'SARS requirements and submissions',
        articles: [
          { title: 'VAT Return Process', path: '/help/compliance/vat' },
          { title: 'Income Tax Provisional', path: '/help/compliance/income-tax' },
          { title: 'Tax Calendar', path: '/help/compliance/tax-calendar' },
        ]
      },
      {
        title: 'B-BBEE',
        description: 'Broad-Based Black Economic Empowerment',
        articles: [
          { title: 'Scorecard Overview', path: '/help/compliance/bbbee-scorecard' },
          { title: 'Ownership Element', path: '/help/compliance/bbbee-ownership' },
          { title: 'Skills Development', path: '/help/compliance/bbbee-skills' },
        ]
      },
      {
        title: 'Governance',
        description: 'Risk management and audit',
        articles: [
          { title: 'Risk Register Setup', path: '/help/compliance/risk-register' },
          { title: 'Audit Trail Review', path: '/help/compliance/audit-trail' },
          { title: 'Policy Management', path: '/help/compliance/policies' },
        ]
      }
    ]
  }
};

const HelpPage: React.FC = () => {
  const { module } = useParams<{ module: string }>();
  const content = module ? helpContent[module] : null;

  if (!content) {
    return (
      <div style={{ padding: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', marginBottom: '24px' }}>Help Center</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {Object.entries(helpContent).map(([key, value]) => (
            <Link
              key={key}
              to={`/help/${key}`}
              style={{
                display: 'block',
                padding: '24px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
            >
              <BookOpen size={32} style={{ color: '#2563eb', marginBottom: '12px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>{value.title}</h3>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>{value.description}</p>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Link to="/help" style={{ color: '#6b7280', textDecoration: 'none' }}>Help Center</Link>
          <span style={{ color: '#6b7280' }}>/</span>
          <span style={{ color: '#111827' }}>{content.title}</span>
        </div>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', marginBottom: '8px' }}>{content.title}</h1>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>{content.description}</p>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ position: 'relative', maxWidth: '500px' }}>
          <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search help articles..."
            style={{
              width: '100%',
              padding: '12px 12px 12px 44px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gap: '24px' }}>
        {content.sections.map((section, idx) => (
          <div key={idx} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>{section.title}</h2>
            <p style={{ color: '#6b7280', marginBottom: '16px' }}>{section.description}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {section.articles.map((article, aidx) => (
                <Link
                  key={aidx}
                  to={article.path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: '#111827'
                  }}
                >
                  <span>{article.title}</span>
                  <ArrowRight size={16} style={{ color: '#6b7280' }} />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '32px', padding: '24px', backgroundColor: '#eff6ff', borderRadius: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Video size={32} style={{ color: '#2563eb' }} />
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>Video Tutorials</h3>
            <p style={{ color: '#6b7280' }}>Watch step-by-step video guides for this module</p>
          </div>
          <Link
            to={`/training/${module}/videos`}
            style={{
              marginLeft: 'auto',
              padding: '8px 16px',
              backgroundColor: '#2563eb',
              color: 'white',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '500'
            }}
          >
            Watch Videos
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
