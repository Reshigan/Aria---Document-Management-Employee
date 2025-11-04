import React, { useState, useEffect } from 'react';
import axios from 'axios';

const GeneralLedger = () => {
  const [activeTab, setActiveTab] = useState('accounts');
  const [accounts, setAccounts] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewAccountModal, setShowNewAccountModal] = useState(false);
  const [showNewJournalModal, setShowNewJournalModal] = useState(false);

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
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount || 0);
  };

  const getAccountTypeColor = (type) => {
    const colors = {
      asset: 'bg-blue-500',
      liability: 'bg-red-500',
      equity: 'bg-purple-500',
      revenue: 'bg-green-500',
      expense: 'bg-orange-500'
    };
    return colors[type] || 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <a href="/erp-dashboard" className="text-white/70 hover:text-white text-sm mb-2 inline-block">
                ← Back to Dashboard
              </a>
              <h1 className="text-3xl font-bold text-white">General Ledger</h1>
              <p className="text-white/70 mt-1">Chart of Accounts & Journal Entries</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.location.href = '/erp-reports'}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
              >
                View Reports
              </button>
              <button
                onClick={() => activeTab === 'accounts' ? setShowNewAccountModal(true) : setShowNewJournalModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition"
              >
                {activeTab === 'accounts' ? '+ New Account' : '+ New Journal Entry'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex space-x-4 mb-8">
          <button
            onClick={() => setActiveTab('accounts')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'accounts'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            Chart of Accounts
          </button>
          <button
            onClick={() => setActiveTab('journal')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'journal'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            Journal Entries
          </button>
          <button
            onClick={() => setActiveTab('trial-balance')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'trial-balance'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            Trial Balance
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-white text-xl">Loading...</div>
          </div>
        ) : (
          <>
            {/* Chart of Accounts */}
            {activeTab === 'accounts' && (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white">Account Code</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white">Account Name</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white">Type</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white">Category</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white">Status</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-white">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {accounts.length > 0 ? (
                        accounts.map((account) => (
                          <tr key={account.id} className="hover:bg-white/5 transition">
                            <td className="px-6 py-4 text-white font-mono">{account.account_code}</td>
                            <td className="px-6 py-4 text-white">{account.account_name}</td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getAccountTypeColor(account.account_type)}`}>
                                {account.account_type}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-white/70 text-sm">{account.account_category || '-'}</td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                account.is_active ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                              }`}>
                                {account.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button className="text-blue-400 hover:text-blue-300 text-sm mr-3">Edit</button>
                              <button className="text-red-400 hover:text-red-300 text-sm">Delete</button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="px-6 py-12 text-center text-white/70">
                            No accounts found. Click "+ New Account" to create one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Journal Entries */}
            {activeTab === 'journal' && (
              <div className="space-y-6">
                {journalEntries.length > 0 ? (
                  journalEntries.map((entry) => (
                    <div key={entry.id} className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-white">{entry.entry_number}</h3>
                          <p className="text-white/70 text-sm">{entry.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white text-sm">{new Date(entry.entry_date).toLocaleDateString()}</p>
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-2 ${
                            entry.status === 'posted' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'
                          }`}>
                            {entry.status}
                          </span>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-white/5">
                            <tr>
                              <th className="px-4 py-2 text-left text-sm font-semibold text-white">Account</th>
                              <th className="px-4 py-2 text-right text-sm font-semibold text-white">Debit</th>
                              <th className="px-4 py-2 text-right text-sm font-semibold text-white">Credit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {entry.lines?.map((line, idx) => (
                              <tr key={idx}>
                                <td className="px-4 py-2 text-white text-sm">
                                  {line.account_code} - {line.account_name}
                                </td>
                                <td className="px-4 py-2 text-right text-white text-sm">
                                  {line.debit_amount > 0 ? formatCurrency(line.debit_amount) : '-'}
                                </td>
                                <td className="px-4 py-2 text-right text-white text-sm">
                                  {line.credit_amount > 0 ? formatCurrency(line.credit_amount) : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 border border-white/20 text-center">
                    <p className="text-white/70">No journal entries found. Click "+ New Journal Entry" to create one.</p>
                  </div>
                )}
              </div>
            )}

            {/* Trial Balance */}
            {activeTab === 'trial-balance' && (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                <h2 className="text-2xl font-bold text-white mb-6">Trial Balance</h2>
                <p className="text-white/70 mb-4">As of {new Date().toLocaleDateString()}</p>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white">Account Code</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white">Account Name</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-white">Debit</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-white">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      <tr>
                        <td colSpan="4" className="px-6 py-12 text-center text-white/70">
                          Loading trial balance...
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default GeneralLedger;
