import React, { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, ArrowRight } from 'lucide-react';

interface ForecastPeriod {
  period: string;
  opening_balance: number;
  inflows: number;
  outflows: number;
  closing_balance: number;
}

const CashForecast: React.FC = () => {
  const [forecastData] = useState<ForecastPeriod[]>([
    { period: 'Week 1 (Jan 20-26)', opening_balance: 1250000, inflows: 450000, outflows: 380000, closing_balance: 1320000 },
    { period: 'Week 2 (Jan 27-Feb 2)', opening_balance: 1320000, inflows: 520000, outflows: 620000, closing_balance: 1220000 },
    { period: 'Week 3 (Feb 3-9)', opening_balance: 1220000, inflows: 380000, outflows: 290000, closing_balance: 1310000 },
    { period: 'Week 4 (Feb 10-16)', opening_balance: 1310000, inflows: 680000, outflows: 450000, closing_balance: 1540000 },
    { period: 'Week 5 (Feb 17-23)', opening_balance: 1540000, inflows: 420000, outflows: 580000, closing_balance: 1380000 },
    { period: 'Week 6 (Feb 24-Mar 2)', opening_balance: 1380000, inflows: 550000, outflows: 390000, closing_balance: 1540000 },
  ]);

  const [expectedInflows] = useState([
    { description: 'Customer Payments - ABC Trading', amount: 125000, due_date: '2026-01-22', probability: 90 },
    { description: 'Customer Payments - XYZ Corp', amount: 85000, due_date: '2026-01-25', probability: 75 },
    { description: 'Customer Payments - Global Industries', amount: 240000, due_date: '2026-01-28', probability: 60 },
    { description: 'Loan Disbursement', amount: 500000, due_date: '2026-02-01', probability: 95 },
  ]);

  const [expectedOutflows] = useState([
    { description: 'Supplier Payments - Batch PB-2026-004', amount: 520000, due_date: '2026-02-01', type: 'Payables' },
    { description: 'Payroll - January', amount: 380000, due_date: '2026-01-25', type: 'Payroll' },
    { description: 'SARS VAT Payment', amount: 125000, due_date: '2026-01-31', type: 'Tax' },
    { description: 'Rent & Utilities', amount: 85000, due_date: '2026-02-01', type: 'Fixed' },
  ]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);

  const currentBalance = 1250000;
  const totalExpectedInflows = expectedInflows.reduce((acc, i) => acc + (i.amount * i.probability / 100), 0);
  const totalExpectedOutflows = expectedOutflows.reduce((acc, o) => acc + o.amount, 0);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Cash Forecast</h1>
        <p style={{ color: '#6b7280' }}>Project future cash positions and plan liquidity</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><DollarSign size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Current Balance</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{formatCurrency(currentBalance)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><TrendingUp size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Expected Inflows</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(totalExpectedInflows)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fee2e2', borderRadius: '10px' }}><TrendingDown size={24} style={{ color: '#ef4444' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Expected Outflows</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{formatCurrency(totalExpectedOutflows)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#f3e8ff', borderRadius: '10px' }}><Calendar size={24} style={{ color: '#9333ea' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Forecast Period</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>6 Weeks</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Weekly Cash Flow Forecast</h2>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Period</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Opening</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Inflows</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Outflows</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Closing</th>
              </tr>
            </thead>
            <tbody>
              {forecastData.map((period, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#111827' }}>{period.period}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', textAlign: 'right' }}>{formatCurrency(period.opening_balance)}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#10b981', textAlign: 'right' }}>+{formatCurrency(period.inflows)}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#ef4444', textAlign: 'right' }}>-{formatCurrency(period.outflows)}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: period.closing_balance >= period.opening_balance ? '#10b981' : '#ef4444', textAlign: 'right' }}>{formatCurrency(period.closing_balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} style={{ color: '#10b981' }} />
              <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Expected Inflows</h3>
            </div>
            <div style={{ padding: '16px' }}>
              {expectedInflows.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: idx < expectedInflows.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                  <div>
                    <div style={{ fontSize: '14px', color: '#111827' }}>{item.description}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{item.due_date} ({item.probability}% likely)</div>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#10b981' }}>{formatCurrency(item.amount)}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingDown size={18} style={{ color: '#ef4444' }} />
              <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Expected Outflows</h3>
            </div>
            <div style={{ padding: '16px' }}>
              {expectedOutflows.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: idx < expectedOutflows.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                  <div>
                    <div style={{ fontSize: '14px', color: '#111827' }}>{item.description}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{item.due_date} - {item.type}</div>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#ef4444' }}>{formatCurrency(item.amount)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashForecast;
