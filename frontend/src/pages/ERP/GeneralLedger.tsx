import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

interface Account {
  id: number;
  account_code: string;
  account_name: string;
  account_type: string;
  account_category: string;
  is_active: boolean;
}

interface JournalEntry {
  id: number;
  entry_number: string;
  entry_date: string;
  description: string;
  status: string;
  lines: JournalEntryLine[];
}

interface JournalEntryLine {
  account_code: string;
  account_name: string;
  debit_amount: number;
  credit_amount: number;
}

const GeneralLedger: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'accounts' | 'journal' | 'trial-balance'>('accounts');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [trialBalance, setTrialBalance] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'accounts') {
        const response = await axios.get('/api/erp/gl/accounts');
        setAccounts(response.data.accounts || []);
      } else if (activeTab === 'journal') {
        const response = await axios.get('/api/erp/gl/journal-entries');
        setJournalEntries(response.data.entries || []);
      } else if (activeTab === 'trial-balance') {
        const response = await axios.get('/api/erp/reports/trial-balance');
        setTrialBalance(response.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount || 0);
  };

  const getAccountTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      asset: 'var(--primary-600)',
      liability: 'var(--error)',
      equity: '#8b5cf6',
      revenue: 'var(--success)',
      expense: 'var(--warning)'
    };
    return colors[type] || 'var(--gray-500)';
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>General Ledger</h1>
        <p style={{ color: 'var(--gray-600)' }}>Chart of Accounts, Journal Entries & Trial Balance</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <Button
          onClick={() => setActiveTab('accounts')}
          variant={activeTab === 'accounts' ? 'primary' : 'secondary'}
        >
          Chart of Accounts
        </Button>
        <Button
          onClick={() => setActiveTab('journal')}
          variant={activeTab === 'journal' ? 'primary' : 'secondary'}
        >
          Journal Entries
        </Button>
        <Button
          onClick={() => setActiveTab('trial-balance')}
          variant={activeTab === 'trial-balance' ? 'primary' : 'secondary'}
        >
          Trial Balance Report
        </Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>
      ) : (
        <>
          {/* Chart of Accounts */}
          {activeTab === 'accounts' && (
            <Card>
              <CardHeader>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <CardTitle>Chart of Accounts ({accounts.length})</CardTitle>
                  <Button size="sm">+ New Account</Button>
                </div>
              </CardHeader>
              <CardBody>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--gray-200)' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Code</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Name</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Type</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Category</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Status</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.map((account) => (
                        <tr key={account.id} style={{ borderBottom: '1px solid var(--gray-200)' }}>
                          <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{account.account_code}</td>
                          <td style={{ padding: '0.75rem' }}>{account.account_name}</td>
                          <td style={{ padding: '0.75rem' }}>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: 'white',
                              backgroundColor: getAccountTypeColor(account.account_type)
                            }}>
                              {account.account_type}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem', color: 'var(--gray-600)' }}>{account.account_category || '-'}</td>
                          <td style={{ padding: '0.75rem' }}>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              backgroundColor: account.is_active ? '#d1fae5' : 'var(--gray-200)',
                              color: account.is_active ? '#065f46' : 'var(--gray-700)'
                            }}>
                              {account.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                            <button style={{ color: 'var(--primary-600)', marginRight: '1rem', cursor: 'pointer', background: 'none', border: 'none' }}>Edit</button>
                            <button style={{ color: 'var(--error)', cursor: 'pointer', background: 'none', border: 'none' }}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Journal Entries */}
          {activeTab === 'journal' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Journal Entries</h2>
                <Button>+ New Entry</Button>
              </div>
              {journalEntries.map((entry) => (
                <Card key={entry.id}>
                  <CardBody>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <div>
                        <h3 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{entry.entry_number}</h3>
                        <p style={{ color: 'var(--gray-600)', fontSize: '0.875rem' }}>{entry.description}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>{new Date(entry.entry_date).toLocaleDateString()}</p>
                        <span style={{
                          display: 'inline-block',
                          marginTop: '0.5rem',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: entry.status === 'posted' ? '#d1fae5' : '#fef3c7',
                          color: entry.status === 'posted' ? '#065f46' : '#92400e'
                        }}>
                          {entry.status}
                        </span>
                      </div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                          <th style={{ padding: '0.5rem', textAlign: 'left', fontSize: '0.875rem' }}>Account</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.875rem' }}>Debit</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.875rem' }}>Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entry.lines?.map((line, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--gray-200)' }}>
                            <td style={{ padding: '0.5rem', fontSize: '0.875rem' }}>
                              {line.account_code} - {line.account_name}
                            </td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.875rem' }}>
                              {line.debit_amount > 0 ? formatCurrency(line.debit_amount) : '-'}
                            </td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.875rem' }}>
                              {line.credit_amount > 0 ? formatCurrency(line.credit_amount) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}

          {/* Trial Balance */}
          {activeTab === 'trial-balance' && trialBalance && (
            <Card>
              <CardHeader>
                <CardTitle>Trial Balance - As of {trialBalance.as_of_date}</CardTitle>
              </CardHeader>
              <CardBody>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--gray-200)' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Code</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Account Name</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>Debit</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trialBalance.accounts?.map((account: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--gray-200)' }}>
                        <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{account.account_code}</td>
                        <td style={{ padding: '0.75rem' }}>{account.account_name}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          {account.balance_type === 'debit' ? formatCurrency(account.balance) : '-'}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          {account.balance_type === 'credit' ? formatCurrency(account.balance) : '-'}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ backgroundColor: 'var(--gray-100)', fontWeight: 700, borderTop: '2px solid var(--gray-300)' }}>
                      <td colSpan={2} style={{ padding: '0.75rem' }}>Total</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>{formatCurrency(trialBalance.total_debits)}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>{formatCurrency(trialBalance.total_credits)}</td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                  <span style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    fontWeight: 600,
                    backgroundColor: trialBalance.balanced ? '#d1fae5' : '#fee2e2',
                    color: trialBalance.balanced ? '#065f46' : '#991b1b'
                  }}>
                    {trialBalance.balanced ? '✓ Balanced' : '✗ Not Balanced'}
                  </span>
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default GeneralLedger;
