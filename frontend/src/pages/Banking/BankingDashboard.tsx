import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { DollarSign, TrendingUp, TrendingDown, RefreshCw, Download, Upload, CheckCircle, AlertCircle } from 'lucide-react';

const API_URL = 'http://localhost:8000';

interface BankAccount {
  id: string;
  account_number: string;
  account_name: string;
  bank_name: string;
  account_type: string;
  currency: string;
  balance: number;
  available_balance: number;
  status: string;
}

interface BankTransaction {
  id: string;
  account_id: string;
  transaction_date: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
  reconciled: boolean;
  category: string;
}

interface ReconciliationSummary {
  total_bank_balance: number;
  total_gl_balance: number;
  unreconciled_items: number;
  reconciliation_difference: number;
  last_reconciled_date: string;
}

export default function BankingDashboard() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [reconciliation, setReconciliation] = useState<ReconciliationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'accounts' | 'transactions' | 'reconciliation'>('accounts');

  useEffect(() => {
    fetchBankingData();
  }, []);

  const fetchBankingData = async () => {
    try {
      setLoading(true);
      const mockAccounts: BankAccount[] = [
        {
          id: '1',
          account_number: '1234567890',
          account_name: 'Main Operating Account',
          bank_name: 'Standard Bank',
          account_type: 'Current',
          currency: 'ZAR',
          balance: 2500000,
          available_balance: 2450000,
          status: 'active'
        },
        {
          id: '2',
          account_number: '0987654321',
          account_name: 'Payroll Account',
          bank_name: 'FNB',
          account_type: 'Current',
          currency: 'ZAR',
          balance: 850000,
          available_balance: 850000,
          status: 'active'
        },
        {
          id: '3',
          account_number: '5555666677',
          account_name: 'USD Account',
          bank_name: 'Nedbank',
          account_type: 'Foreign Currency',
          currency: 'USD',
          balance: 125000,
          available_balance: 125000,
          status: 'active'
        }
      ];

      const mockTransactions: BankTransaction[] = [
        {
          id: '1',
          account_id: '1',
          transaction_date: '2025-11-04',
          description: 'Customer Payment - ABC Corp',
          reference: 'INV-2025-001',
          debit: 0,
          credit: 150000,
          balance: 2500000,
          reconciled: true,
          category: 'Customer Receipts'
        },
        {
          id: '2',
          account_id: '1',
          transaction_date: '2025-11-03',
          description: 'Supplier Payment - XYZ Ltd',
          reference: 'PO-2025-045',
          debit: 75000,
          credit: 0,
          balance: 2350000,
          reconciled: true,
          category: 'Supplier Payments'
        },
        {
          id: '3',
          account_id: '1',
          transaction_date: '2025-11-02',
          description: 'Bank Charges',
          reference: 'BANK-FEE',
          debit: 250,
          credit: 0,
          balance: 2425000,
          reconciled: false,
          category: 'Bank Charges'
        }
      ];

      const mockReconciliation: ReconciliationSummary = {
        total_bank_balance: 3475000,
        total_gl_balance: 3474750,
        unreconciled_items: 1,
        reconciliation_difference: 250,
        last_reconciled_date: '2025-11-03'
      };

      setAccounts(mockAccounts);
      setTransactions(mockTransactions);
      setReconciliation(mockReconciliation);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching banking data:', error);
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'ZAR') => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const totalBalance = accounts.reduce((sum, acc) => {
    if (acc.currency === 'ZAR') {
      return sum + acc.balance;
    }
    return sum + (acc.balance * 18.5); // Mock USD to ZAR conversion
  }, 0);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.125rem', color: 'var(--gray-600)' }}>Loading banking data...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>Banking & Cash Management</h1>
        <p style={{ color: 'var(--gray-600)' }}>Manage bank accounts, transactions, and reconciliations</p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <Card>
          <CardBody>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '0.5rem' }}>Total Cash Position</div>
                <div style={{ fontSize: '1.875rem', fontWeight: 700 }}>{formatCurrency(totalBalance)}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <TrendingUp size={14} />
                  <span>+5.2% from last month</span>
                </div>
              </div>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--success-light)', borderRadius: '0.5rem' }}>
                <DollarSign size={24} color="var(--success)" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '0.5rem' }}>Active Accounts</div>
                <div style={{ fontSize: '1.875rem', fontWeight: 700 }}>{accounts.length}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginTop: '0.25rem' }}>
                  Across {new Set(accounts.map(a => a.bank_name)).size} banks
                </div>
              </div>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--primary-light)', borderRadius: '0.5rem' }}>
                <CheckCircle size={24} color="var(--primary-600)" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '0.5rem' }}>Unreconciled Items</div>
                <div style={{ fontSize: '1.875rem', fontWeight: 700 }}>{reconciliation?.unreconciled_items || 0}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: '0.25rem' }}>
                  {formatCurrency(reconciliation?.reconciliation_difference || 0)} difference
                </div>
              </div>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--warning-light)', borderRadius: '0.5rem' }}>
                <AlertCircle size={24} color="var(--warning)" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid var(--gray-200)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '2rem' }}>
          {['accounts', 'transactions', 'reconciliation'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              style={{
                padding: '0.75rem 0',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: activeTab === tab ? 'var(--primary-600)' : 'var(--gray-600)',
                borderBottom: activeTab === tab ? '2px solid var(--primary-600)' : '2px solid transparent',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Accounts Tab */}
      {activeTab === 'accounts' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Bank Accounts</h2>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button variant="outline" size="sm">
                <Upload size={16} style={{ marginRight: '0.5rem' }} />
                Import Statement
              </Button>
              <Button variant="primary" size="sm">
                Add Account
              </Button>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '1rem' }}>
            {accounts.map((account) => (
              <Card key={account.id}>
                <CardBody>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{account.account_name}</h3>
                        <Badge variant="success" size="sm">{account.status}</Badge>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>Bank</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{account.bank_name}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>Account Number</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{account.account_number}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>Type</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{account.account_type}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>Currency</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{account.currency}</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '200px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>Current Balance</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatCurrency(account.balance, account.currency)}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginTop: '0.25rem' }}>
                        Available: {formatCurrency(account.available_balance, account.currency)}
                      </div>
                      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <Button variant="outline" size="sm" onClick={() => setSelectedAccount(account.id)}>
                          View Transactions
                        </Button>
                        <Button variant="outline" size="sm">
                          Reconcile
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Recent Transactions</h2>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button variant="outline" size="sm">
                <Download size={16} style={{ marginRight: '0.5rem' }} />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <RefreshCw size={16} style={{ marginRight: '0.5rem' }} />
                Refresh
              </Button>
            </div>
          </div>

          <Card>
            <CardBody style={{ padding: 0 }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--gray-200)', backgroundColor: 'var(--gray-50)' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-600)', textTransform: 'uppercase' }}>Date</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-600)', textTransform: 'uppercase' }}>Description</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-600)', textTransform: 'uppercase' }}>Reference</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-600)', textTransform: 'uppercase' }}>Category</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-600)', textTransform: 'uppercase' }}>Debit</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-600)', textTransform: 'uppercase' }}>Credit</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-600)', textTransform: 'uppercase' }}>Balance</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-600)', textTransform: 'uppercase' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((txn) => (
                      <tr key={txn.id} style={{ borderBottom: '1px solid var(--gray-200)' }}>
                        <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{formatDate(txn.transaction_date)}</td>
                        <td style={{ padding: '0.75rem', fontSize: '0.875rem', fontWeight: 500 }}>{txn.description}</td>
                        <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: 'var(--gray-600)' }}>{txn.reference}</td>
                        <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                          <Badge variant="default" size="sm">{txn.category}</Badge>
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'right', color: txn.debit > 0 ? 'var(--error)' : 'var(--gray-400)' }}>
                          {txn.debit > 0 ? formatCurrency(txn.debit) : '-'}
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'right', color: txn.credit > 0 ? 'var(--success)' : 'var(--gray-400)' }}>
                          {txn.credit > 0 ? formatCurrency(txn.credit) : '-'}
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(txn.balance)}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          {txn.reconciled ? (
                            <Badge variant="success" size="sm">Reconciled</Badge>
                          ) : (
                            <Badge variant="warning" size="sm">Pending</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Reconciliation Tab */}
      {activeTab === 'reconciliation' && reconciliation && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Bank Reconciliation</h2>
            <Button variant="primary" size="sm">
              Start Reconciliation
            </Button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <Card>
              <CardBody>
                <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '0.5rem' }}>Bank Balance</div>
                <div style={{ fontSize: '1.875rem', fontWeight: 700 }}>{formatCurrency(reconciliation.total_bank_balance)}</div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '0.5rem' }}>GL Balance</div>
                <div style={{ fontSize: '1.875rem', fontWeight: 700 }}>{formatCurrency(reconciliation.total_gl_balance)}</div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '0.5rem' }}>Difference</div>
                <div style={{ fontSize: '1.875rem', fontWeight: 700, color: reconciliation.reconciliation_difference === 0 ? 'var(--success)' : 'var(--error)' }}>
                  {formatCurrency(Math.abs(reconciliation.reconciliation_difference))}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '0.5rem' }}>Last Reconciled</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{formatDate(reconciliation.last_reconciled_date)}</div>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Reconciliation Status</CardTitle>
            </CardHeader>
            <CardBody>
              {reconciliation.unreconciled_items === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <CheckCircle size={48} color="var(--success)" style={{ margin: '0 auto 1rem' }} />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>All Reconciled!</h3>
                  <p style={{ color: 'var(--gray-600)' }}>All bank transactions have been reconciled with the general ledger.</p>
                </div>
              ) : (
                <div>
                  <div style={{ padding: '1rem', backgroundColor: 'var(--warning-light)', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <AlertCircle size={20} color="var(--warning)" />
                      <div>
                        <div style={{ fontWeight: 600 }}>Reconciliation Required</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                          {reconciliation.unreconciled_items} unreconciled item(s) with a total difference of {formatCurrency(reconciliation.reconciliation_difference)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                    Review and match unreconciled transactions to complete the bank reconciliation process.
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
