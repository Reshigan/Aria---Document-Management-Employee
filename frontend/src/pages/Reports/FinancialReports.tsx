import { useState, useEffect } from 'react';
import { FileText, TrendingUp, DollarSign, BarChart3, Download, Calendar } from 'lucide-react';

interface ReportData {
  trial_balance?: any;
  profit_loss?: any;
  balance_sheet?: any;
  cash_flow?: any;
  aged_receivables?: any;
  aged_payables?: any;
}

export default function FinancialReports() {
  const [selectedReport, setSelectedReport] = useState<string>('trial_balance');
  const [reportData, setReportData] = useState<ReportData>({});
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });

  const reports = [
    { id: 'trial_balance', name: 'Trial Balance', icon: BarChart3, endpoint: '/api/reports/trial-balance' },
    { id: 'profit_loss', name: 'Profit & Loss', icon: TrendingUp, endpoint: '/api/reports/profit-and-loss' },
    { id: 'balance_sheet', name: 'Balance Sheet', icon: FileText, endpoint: '/api/reports/balance-sheet' },
    { id: 'cash_flow', name: 'Cash Flow', icon: DollarSign, endpoint: '/api/reports/cash-flow' },
    { id: 'aged_receivables', name: 'Aged Receivables', icon: FileText, endpoint: '/api/reports/aged-receivables' },
    { id: 'aged_payables', name: 'Aged Payables', icon: FileText, endpoint: '/api/reports/aged-payables' }
  ];

  const fetchReport = async (reportId: string) => {
    setLoading(true);
    try {
      const report = reports.find(r => r.id === reportId);
      if (!report) return;

      const params = new URLSearchParams({
        start_date: dateRange.start_date,
        end_date: dateRange.end_date
      });

      const response = await fetch(`${report.endpoint}?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReportData(prev => ({ ...prev, [reportId]: data }));
      }
    } catch (error) {
      console.error('Failed to fetch report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(selectedReport);
  }, [selectedReport, dateRange]);

  const renderTrialBalance = () => {
    const data = reportData.trial_balance;
    if (!data) return null;

    return (
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Account Code</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Account Name</th>
              <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Debit</th>
              <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Credit</th>
            </tr>
          </thead>
          <tbody>
            {data.accounts?.map((account: any, idx: number) => (
              <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '1rem', color: '#6b7280' }}>{account.account_code}</td>
                <td style={{ padding: '1rem', fontWeight: '500' }}>{account.account_name}</td>
                <td style={{ padding: '1rem', textAlign: 'right', color: '#059669' }}>
                  {account.debit > 0 ? `R ${account.debit.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}` : '-'}
                </td>
                <td style={{ padding: '1rem', textAlign: 'right', color: '#dc2626' }}>
                  {account.credit > 0 ? `R ${account.credit.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}` : '-'}
                </td>
              </tr>
            ))}
            <tr style={{ background: '#f9fafb', fontWeight: 'bold' }}>
              <td colSpan={2} style={{ padding: '1rem' }}>Total</td>
              <td style={{ padding: '1rem', textAlign: 'right', color: '#059669' }}>
                R {data.total_debit?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </td>
              <td style={{ padding: '1rem', textAlign: 'right', color: '#dc2626' }}>
                R {data.total_credit?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderProfitLoss = () => {
    const data = reportData.profit_loss;
    if (!data) return null;

    return (
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '2rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Revenue</h3>
          {data.revenue?.map((item: any, idx: number) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
              <span>{item.account_name}</span>
              <span style={{ fontWeight: '500' }}>R {item.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', fontWeight: 'bold', fontSize: '1.125rem' }}>
            <span>Total Revenue</span>
            <span style={{ color: '#059669' }}>R {data.total_revenue?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Expenses</h3>
          {data.expenses?.map((item: any, idx: number) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
              <span>{item.account_name}</span>
              <span style={{ fontWeight: '500' }}>R {item.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', fontWeight: 'bold', fontSize: '1.125rem' }}>
            <span>Total Expenses</span>
            <span style={{ color: '#dc2626' }}>R {data.total_expenses?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div style={{ borderTop: '2px solid #374151', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: 'bold' }}>
            <span>Net Profit</span>
            <span style={{ color: data.net_profit >= 0 ? '#059669' : '#dc2626' }}>
              R {data.net_profit?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderBalanceSheet = () => {
    const data = reportData.balance_sheet;
    if (!data) return null;

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Assets</h3>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#6b7280' }}>Current Assets</h4>
            {data.current_assets?.map((item: any, idx: number) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                <span>{item.account_name}</span>
                <span>R {item.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontWeight: 'bold', borderTop: '1px solid #e5e7eb' }}>
              <span>Total Current Assets</span>
              <span>R {data.total_current_assets?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#6b7280' }}>Fixed Assets</h4>
            {data.fixed_assets?.map((item: any, idx: number) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                <span>{item.account_name}</span>
                <span>R {item.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontWeight: 'bold', borderTop: '1px solid #e5e7eb' }}>
              <span>Total Fixed Assets</span>
              <span>R {data.total_fixed_assets?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div style={{ borderTop: '2px solid #374151', marginTop: '1rem', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 'bold' }}>
              <span>Total Assets</span>
              <span style={{ color: '#059669' }}>R {data.total_assets?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Liabilities & Equity</h3>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#6b7280' }}>Current Liabilities</h4>
            {data.current_liabilities?.map((item: any, idx: number) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                <span>{item.account_name}</span>
                <span>R {item.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontWeight: 'bold', borderTop: '1px solid #e5e7eb' }}>
              <span>Total Current Liabilities</span>
              <span>R {data.total_current_liabilities?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#6b7280' }}>Long-term Liabilities</h4>
            {data.long_term_liabilities?.map((item: any, idx: number) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                <span>{item.account_name}</span>
                <span>R {item.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontWeight: 'bold', borderTop: '1px solid #e5e7eb' }}>
              <span>Total Long-term Liabilities</span>
              <span>R {data.total_long_term_liabilities?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#6b7280' }}>Equity</h4>
            {data.equity?.map((item: any, idx: number) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                <span>{item.account_name}</span>
                <span>R {item.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontWeight: 'bold', borderTop: '1px solid #e5e7eb' }}>
              <span>Total Equity</span>
              <span>R {data.total_equity?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div style={{ borderTop: '2px solid #374151', marginTop: '1rem', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 'bold' }}>
              <span>Total Liabilities & Equity</span>
              <span style={{ color: '#dc2626' }}>R {data.total_liabilities_equity?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAgedReport = (type: 'receivables' | 'payables') => {
    const data = type === 'receivables' ? reportData.aged_receivables : reportData.aged_payables;
    if (!data) return null;

    return (
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                {type === 'receivables' ? 'Customer' : 'Supplier'}
              </th>
              <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Current</th>
              <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>1-30 Days</th>
              <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>31-60 Days</th>
              <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>61-90 Days</th>
              <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>90+ Days</th>
              <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items?.map((item: any, idx: number) => (
              <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '1rem', fontWeight: '500' }}>{item.name}</td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>R {item.current.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>R {item.days_1_30.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>R {item.days_31_60.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>R {item.days_61_90.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                <td style={{ padding: '1rem', textAlign: 'right', color: '#dc2626' }}>R {item.days_90_plus.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>R {item.total.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
            <tr style={{ background: '#f9fafb', fontWeight: 'bold' }}>
              <td style={{ padding: '1rem' }}>Total</td>
              <td style={{ padding: '1rem', textAlign: 'right' }}>R {data.total_current?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
              <td style={{ padding: '1rem', textAlign: 'right' }}>R {data.total_1_30?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
              <td style={{ padding: '1rem', textAlign: 'right' }}>R {data.total_31_60?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
              <td style={{ padding: '1rem', textAlign: 'right' }}>R {data.total_61_90?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
              <td style={{ padding: '1rem', textAlign: 'right', color: '#dc2626' }}>R {data.total_90_plus?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
              <td style={{ padding: '1rem', textAlign: 'right' }}>R {data.grand_total?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderReport = () => {
    if (loading) {
      return <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Loading report...</div>;
    }

    switch (selectedReport) {
      case 'trial_balance':
        return renderTrialBalance();
      case 'profit_loss':
        return renderProfitLoss();
      case 'balance_sheet':
        return renderBalanceSheet();
      case 'aged_receivables':
        return renderAgedReport('receivables');
      case 'aged_payables':
        return renderAgedReport('payables');
      default:
        return <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Select a report to view</div>;
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Financial Reports</h1>
        <p style={{ color: '#6b7280' }}>View comprehensive financial reports and analytics</p>
      </div>

      <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
        <div style={{ flex: '0 0 250px' }}>
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#374151' }}>Reports</h3>
            {reports.map((report) => {
              const Icon = report.icon;
              return (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    background: selectedReport === report.id ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                    color: selectedReport === report.id ? 'white' : '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    marginBottom: '0.5rem',
                    textAlign: 'left'
                  }}
                >
                  <Icon size={18} />
                  {report.name}
                </button>
              );
            })}
          </div>

          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1rem', marginTop: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#374151', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={18} />
              Date Range
            </h3>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', marginBottom: '0.25rem', color: '#6b7280' }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.start_date}
                  onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', marginBottom: '0.25rem', color: '#6b7280' }}>
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.end_date}
                  onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              {reports.find(r => r.id === selectedReport)?.name}
            </h2>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: '#f3f4f6',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                color: '#374151'
              }}
            >
              <Download size={18} />
              Export PDF
            </button>
          </div>

          {renderReport()}
        </div>
      </div>
    </div>
  );
}
