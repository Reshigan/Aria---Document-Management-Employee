import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, TrendingUp, DollarSign, Package, Users, FileSpreadsheet, BarChart3, PieChart } from 'lucide-react';

interface ReportCategory {
  title: string;
  icon: React.ReactNode;
  color: string;
  reports: {
    name: string;
    path: string;
    description: string;
  }[];
}

const reportCategories: ReportCategory[] = [
  {
    title: 'Financial Reports',
    icon: <DollarSign size={24} />,
    color: '#8b5cf6',
    reports: [
      { name: 'Trial Balance', path: '/reports/financial/trial-balance', description: 'Account balances summary' },
      { name: 'Balance Sheet', path: '/reports/financial/balance-sheet', description: 'Assets, liabilities, equity' },
      { name: 'Income Statement', path: '/reports/financial/income-statement', description: 'Revenue and expenses' },
      { name: 'Cash Flow', path: '/reports/ar-ap/cash-flow', description: 'Cash inflows and outflows' },
    ]
  },
  {
    title: 'AR/AP Reports',
    icon: <FileText size={24} />,
    color: '#10b981',
    reports: [
      { name: 'AR Aging', path: '/reports/ar-aging', description: 'Accounts receivable aging' },
      { name: 'AP Aging', path: '/reports/ar-ap/ap-aging', description: 'Accounts payable aging' },
    ]
  },
  {
    title: 'Inventory Reports',
    icon: <Package size={24} />,
    color: '#f59e0b',
    reports: [
      { name: 'Stock Valuation', path: '/reports/stock-valuation', description: 'Inventory value by item' },
      { name: 'Inventory Valuation', path: '/reports/inventory/valuation', description: 'Complete inventory valuation' },
    ]
  },
  {
    title: 'Sales & Purchase Reports',
    icon: <TrendingUp size={24} />,
    color: '#6366f1',
    reports: [
      { name: 'Sales KPIs', path: '/reports/sales-purchase/sales-kpis', description: 'Sales performance metrics' },
      { name: 'Purchase KPIs', path: '/reports/sales-purchase/purchase-kpis', description: 'Purchase performance metrics' },
    ]
  },
  {
    title: 'Tax & Compliance',
    icon: <FileSpreadsheet size={24} />,
    color: '#dc2626',
    reports: [
      { name: 'VAT Summary', path: '/reports/vat-summary', description: 'VAT collected and paid' },
      { name: 'BBBEE Compliance', path: '/reports/compliance/bbbee', description: 'BBBEE scorecard' },
    ]
  },
  {
    title: 'HR & Payroll Reports',
    icon: <Users size={24} />,
    color: '#14b8a6',
    reports: [
      { name: 'Payroll Activity', path: '/reports/payroll/activity', description: 'Payroll runs and payments' },
      { name: 'Expense Management', path: '/reports/expense/management', description: 'Employee expenses' },
    ]
  },
];

export const ReportsDashboard: React.FC = () => {
  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Reports</h1>
        <p style={{ color: '#6b7280' }}>Comprehensive reporting across all ERP modules</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        {reportCategories.map((category) => (
          <div
            key={category.title}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ color: category.color }}>
                {category.icon}
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>{category.title}</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {category.reports.map((report) => (
                <Link
                  key={report.path}
                  to={report.path}
                  style={{
                    display: 'block',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                    border: '1px solid #e5e7eb',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f9fafb';
                    e.currentTarget.style.borderColor = category.color;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                >
                  <div style={{ fontWeight: '500', color: '#111827', marginBottom: '0.25rem' }}>
                    {report.name}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {report.description}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReportsDashboard;
