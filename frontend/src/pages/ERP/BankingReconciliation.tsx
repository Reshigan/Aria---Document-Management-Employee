import React, { useState, useEffect } from 'react';
import { 
  Building2, Plus, Search, Filter, Download, Upload, 
  CheckCircle, XCircle, Clock, AlertCircle, DollarSign,
  FileText, TrendingUp
} from 'lucide-react';

interface BankAccount {
  id: string;
  account_number: string;
  account_name: string;
  bank_name: string;
  account_type: string;
  currency: string;
  current_balance: number;
  is_active: boolean;
  created_at: string;
}

interface BankStatement {
  id: string;
  bank_account_id: string;
  account_name: string;
  statement_date: string;
  opening_balance: number;
  closing_balance: number;
  total_debits: number;
  total_credits: number;
  status: string;
  created_at: string;
}

interface BankTransaction {
  id: string;
  bank_statement_id: string;
  transaction_date: string;
  description: string;
  reference: string;
  debit_amount: number;
  credit_amount: number;
  balance: number;
  is_reconciled: boolean;
  matched_transaction_id?: string;
}

interface ReconciliationRule {
  id: string;
  rule_name: string;
  rule_type: string;
  pattern: string;
  gl_account: string;
  is_active: boolean;
  created_at: string;
}

type TabType = 'accounts' | 'statements' | 'transactions' | 'rules';

const BankingReconciliation: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('accounts');
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankStatements, setBankStatements] = useState<BankStatement[]>([]);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [reconciliationRules, setReconciliationRules] = useState<ReconciliationRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const companyId = localStorage.getItem('selectedCompanyId') || '';

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      switch (activeTab) {
        case 'accounts':
          const accountsRes = await fetch(`/api/erp/banking/bank-accounts?company_id=${companyId}`, { headers });
          if (accountsRes.ok) {
            const data = await accountsRes.json();
            setBankAccounts(data.bank_accounts || []);
          }
          break;
        case 'statements':
          const statementsRes = await fetch(`/api/erp/banking/bank-statements?company_id=${companyId}`, { headers });
          if (statementsRes.ok) {
            const data = await statementsRes.json();
            setBankStatements(data.bank_statements || []);
          }
          break;
        case 'transactions':
          const transactionsRes = await fetch(`/api/erp/banking/bank-transactions?company_id=${companyId}`, { headers });
          if (transactionsRes.ok) {
            const data = await transactionsRes.json();
            setBankTransactions(data.bank_transactions || []);
          }
          break;
        case 'rules':
          const rulesRes = await fetch(`/api/erp/banking/reconciliation-rules?company_id=${companyId}`, { headers });
          if (rulesRes.ok) {
            const data = await rulesRes.json();
            setReconciliationRules(data.reconciliation_rules || []);
          }
          break;
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-3 h-3" /> },
      reconciled: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
      unreconciled: { color: 'bg-red-100 text-red-800', icon: <XCircle className="w-3 h-3" /> },
      partial: { color: 'bg-blue-100 text-blue-800', icon: <AlertCircle className="w-3 h-3" /> }
    };

    const config = statusConfig[status.toLowerCase()] || statusConfig.pending;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon}
        {status}
      </span>
    );
  };

  const renderBankAccounts = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Bank Accounts</h3>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          New Bank Account
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bankAccounts.map((account) => (
          <div key={account.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{account.account_name}</h4>
                  <p className="text-sm text-gray-500">{account.bank_name}</p>
                </div>
              </div>
              {account.is_active ? (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Active</span>
              ) : (
                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">Inactive</span>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Account Number:</span>
                <span className="font-medium">{account.account_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Type:</span>
                <span className="font-medium">{account.account_type}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Currency:</span>
                <span className="font-medium">{account.currency}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t">
                <span className="text-gray-500">Current Balance:</span>
                <span className="font-bold text-lg text-gray-900">
                  R {account.current_balance.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100">
                View Statements
              </button>
              <button className="flex-1 px-3 py-2 text-sm bg-gray-50 text-gray-600 rounded hover:bg-gray-100">
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {bankAccounts.length === 0 && !loading && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No bank accounts found</p>
          <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Add Your First Bank Account
          </button>
        </div>
      )}
    </div>
  );

  const renderBankStatements = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Bank Statements</h3>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
            <Upload className="w-4 h-4" />
            Import Statement
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            New Statement
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statement Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opening Balance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Closing Balance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Debits</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credits</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bankStatements.map((statement) => (
              <tr key={statement.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{statement.account_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(statement.statement_date).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">R {statement.opening_balance.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">R {statement.closing_balance.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">R {statement.total_debits.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">R {statement.total_credits.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(statement.status)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button className="text-blue-600 hover:text-blue-900 mr-3">Reconcile</button>
                  <button className="text-blue-600 hover:text-blue-900">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderBankTransactions = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Bank Transactions</h3>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <CheckCircle className="w-4 h-4" />
            Auto-Match
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Debit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bankTransactions.map((transaction) => (
              <tr key={transaction.id} className={`hover:bg-gray-50 ${transaction.is_reconciled ? 'bg-green-50' : ''}`}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(transaction.transaction_date).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{transaction.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{transaction.reference}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                  {transaction.debit_amount > 0 ? `R ${transaction.debit_amount.toLocaleString()}` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                  {transaction.credit_amount > 0 ? `R ${transaction.credit_amount.toLocaleString()}` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">R {transaction.balance.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {transaction.is_reconciled ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3" />
                      Reconciled
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <Clock className="w-3 h-3" />
                      Pending
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {!transaction.is_reconciled && (
                    <button className="text-blue-600 hover:text-blue-900">Match</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderReconciliationRules = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Reconciliation Rules</h3>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          New Rule
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rule Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pattern</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">GL Account</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reconciliationRules.map((rule) => (
              <tr key={rule.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{rule.rule_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rule.rule_type}</td>
                <td className="px-6 py-4 text-sm text-gray-500 font-mono">{rule.pattern}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rule.gl_account}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {rule.is_active ? (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Active</span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">Inactive</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                  <button className="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-600">Please select a company to view banking data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banking & Reconciliation</h1>
          <p className="text-gray-600">Manage bank accounts, statements, and automated reconciliation</p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('accounts')}
            className={`${
              activeTab === 'accounts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Building2 className="w-4 h-4" />
            Bank Accounts
          </button>
          <button
            onClick={() => setActiveTab('statements')}
            className={`${
              activeTab === 'statements'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <FileText className="w-4 h-4" />
            Statements
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`${
              activeTab === 'transactions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <DollarSign className="w-4 h-4" />
            Transactions
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`${
              activeTab === 'rules'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <TrendingUp className="w-4 h-4" />
            Rules
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {activeTab === 'accounts' && renderBankAccounts()}
          {activeTab === 'statements' && renderBankStatements()}
          {activeTab === 'transactions' && renderBankTransactions()}
          {activeTab === 'rules' && renderReconciliationRules()}
        </>
      )}
    </div>
  );
};

export default BankingReconciliation;
