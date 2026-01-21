import React, { useState } from 'react';
import { FileText, Download, Upload, CheckCircle, Clock, AlertTriangle, Users } from 'lucide-react';

interface UIFReturn {
  id: number;
  period: string;
  reference: string;
  employees_count: number;
  total_remuneration: number;
  employee_contribution: number;
  employer_contribution: number;
  total_contribution: number;
  due_date: string;
  submitted_date: string | null;
  payment_date: string | null;
  status: 'DRAFT' | 'SUBMITTED' | 'PAID' | 'OVERDUE';
}

const UIFReturns: React.FC = () => {
  const [returns, setReturns] = useState<UIFReturn[]>([
    { id: 1, period: 'January 2026', reference: 'UIF-2026-01', employees_count: 63, total_remuneration: 2850000, employee_contribution: 11169, employer_contribution: 11169, total_contribution: 22338, due_date: '2026-02-07', submitted_date: null, payment_date: null, status: 'DRAFT' },
    { id: 2, period: 'December 2025', reference: 'UIF-2025-12', employees_count: 61, total_remuneration: 2780000, employee_contribution: 10890, employer_contribution: 10890, total_contribution: 21780, due_date: '2026-01-07', submitted_date: '2026-01-05', payment_date: '2026-01-06', status: 'PAID' },
    { id: 3, period: 'November 2025', reference: 'UIF-2025-11', employees_count: 60, total_remuneration: 2720000, employee_contribution: 10656, employer_contribution: 10656, total_contribution: 21312, due_date: '2025-12-07', submitted_date: '2025-12-04', payment_date: '2025-12-05', status: 'PAID' },
    { id: 4, period: 'October 2025', reference: 'UIF-2025-10', employees_count: 58, total_remuneration: 2650000, employee_contribution: 10382, employer_contribution: 10382, total_contribution: 20764, due_date: '2025-11-07', submitted_date: '2025-11-06', payment_date: '2025-11-06', status: 'PAID' },
  ]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      DRAFT: { bg: '#f3f4f6', text: '#374151', icon: <FileText size={14} /> },
      SUBMITTED: { bg: '#dbeafe', text: '#1e40af', icon: <Clock size={14} /> },
      PAID: { bg: '#dcfce7', text: '#166534', icon: <CheckCircle size={14} /> },
      OVERDUE: { bg: '#fee2e2', text: '#991b1b', icon: <AlertTriangle size={14} /> }
    };
    const c = config[status] || config.DRAFT;
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{c.icon} {status}</span>;
  };

  const handleSubmit = (id: number) => {
    setReturns(returns.map(r => r.id === id ? { ...r, status: 'SUBMITTED' as const, submitted_date: new Date().toISOString().split('T')[0] } : r));
  };

  const handlePay = (id: number) => {
    setReturns(returns.map(r => r.id === id ? { ...r, status: 'PAID' as const, payment_date: new Date().toISOString().split('T')[0] } : r));
  };

  const currentReturn = returns.find(r => r.status === 'DRAFT');
  const ytdContributions = returns.filter(r => r.status === 'PAID').reduce((acc, r) => acc + r.total_contribution, 0);
  const ytdEmployees = returns.filter(r => r.status === 'PAID').length > 0 ? returns.filter(r => r.status === 'PAID')[0].employees_count : 0;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>UIF Returns</h1>
        <p style={{ color: '#6b7280' }}>Unemployment Insurance Fund monthly declarations</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><Users size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Registered Employees</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>{currentReturn?.employees_count || ytdEmployees}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}><FileText size={24} style={{ color: '#f59e0b' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Current Liability</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{formatCurrency(currentReturn?.total_contribution || 0)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><CheckCircle size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>YTD Contributions</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(ytdContributions)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#e0e7ff', borderRadius: '10px' }}><FileText size={24} style={{ color: '#6366f1' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Contribution Rate</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6366f1' }}>2%</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1e40af', marginBottom: '8px' }}>UIF Contribution Rules</h4>
        <ul style={{ fontSize: '14px', color: '#1e40af', margin: 0, paddingLeft: '20px' }}>
          <li>Employee contribution: 1% of remuneration (max R177.12 per month)</li>
          <li>Employer contribution: 1% of remuneration (max R177.12 per month)</li>
          <li>Total contribution: 2% (1% employee + 1% employer)</li>
          <li>Maximum monthly remuneration for UIF: R17,712</li>
        </ul>
      </div>

      {currentReturn && (
        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#92400e', marginBottom: '4px' }}>Current Period: {currentReturn.period}</h3>
              <p style={{ fontSize: '14px', color: '#b45309' }}>Due date: {currentReturn.due_date} | Total: {formatCurrency(currentReturn.total_contribution)}</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                <Download size={16} /> Download U-Filing
              </button>
              <button onClick={() => handleSubmit(currentReturn.id)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                <Upload size={16} /> Submit to UIF
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Return History</h2>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Period</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Employees</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Remuneration</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Employee</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Employer</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Total</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {returns.map((ret) => (
              <tr key={ret.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{ret.period}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{ret.reference}</div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>{ret.employees_count}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', textAlign: 'right' }}>{formatCurrency(ret.total_remuneration)}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', textAlign: 'right' }}>{formatCurrency(ret.employee_contribution)}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', textAlign: 'right' }}>{formatCurrency(ret.employer_contribution)}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 'bold', color: '#2563eb', textAlign: 'right' }}>{formatCurrency(ret.total_contribution)}</td>
                <td style={{ padding: '12px 16px' }}>{getStatusBadge(ret.status)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button style={{ padding: '4px 8px', marginRight: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Download size={16} /></button>
                  {ret.status === 'SUBMITTED' && (
                    <button onClick={() => handlePay(ret.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#10b981', background: 'none', border: 'none', cursor: 'pointer' }}>Mark Paid</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UIFReturns;
