import React, { useState, useEffect } from 'react';
import { botsAPI } from '../services/api';
import { Bot, CheckCircle, Loader, AlertCircle, Play, FileText, DollarSign, Users, TrendingUp, Shield, Package } from 'lucide-react';

interface BotData {
  name: string;
  type: string;
  description: string;
  capabilities: string[];
}

interface BotListResponse {
  success: boolean;
  count: number;
  agents: BotData[];
}

const iconMap: Record<string, any> = {
  invoice_reconciliation: FileText,
  expense_management: DollarSign,
  accounts_payable: DollarSign,
  ar_collections: TrendingUp,
  bank_reconciliation: FileText,
  lead_qualification: Users,
  payroll_sa: Users,
  bbbee_compliance: Shield,
};

export default function BotsLive() {
  const [agents, setBots] = useState<BotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executingBot, setExecutingBot] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<any>(null);

  useEffect(() => {
    loadBots();
  }, []);

  const loadBots = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await botsAPI.list();
      const data = response.data as BotListResponse;
      setBots(data.agents || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const executeBot = async (botName: string) => {
    try {
      setExecutingBot(botName);
      setExecutionResult(null);
      
      // Sample test data for each agent
      const testData: Record<string, any> = {
        invoice_reconciliation: {
          invoice_number: 'INV-2025-001',
          amount: 15000.00,
          supplier: 'Acme Corp'
        },
        expense_management: {
          expense_id: 'EXP-001',
          amount: 500.00,
          category: 'Travel'
        },
        accounts_payable: {
          invoice_number: 'AP-001',
          vendor: 'Tech Supplies',
          amount: 2500.00
        },
        ar_collections: {
          customer_id: 'CUST-001',
          invoice_number: 'AR-001',
          amount_due: 10000.00,
          days_overdue: 15
        },
        bank_reconciliation: {
          transaction_id: 'TXN-001',
          amount: 5000.00,
          date: '2025-10-27'
        },
        lead_qualification: {
          lead_id: 'LEAD-001',
          company: 'StartupCo',
          revenue: 1000000,
          industry: 'Technology'
        },
        payroll_sa: {
          employee_id: 'EMP-001',
          gross_salary: 35000,
          tax_year: 2025
        },
        bbbee_compliance: {
          company_id: 'COMP-001',
          scorecard_year: 2025
        }
      };

      const response = await botsAPI.execute(botName, testData[botName] || {});
      setExecutionResult(response.data);
    } catch (err: any) {
      setExecutionResult({ error: err.message });
    } finally {
      setExecutingBot(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading agents from API...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
            Connection Error
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-center mb-4">{error}</p>
          <button
            onClick={loadBots}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium py-2 px-4 rounded-xl transition-all shadow-lg shadow-indigo-500/30"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Live Agent Status
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Real-time data from backend API - {agents.length} agents operational
              </p>
            </div>
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="w-6 h-6" />
              <span className="font-semibold">Connected</span>
            </div>
          </div>
        </div>

        {/* Agent Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => {
            const Icon = iconMap[agent.name] || Bot;
            return (
              <div
                key={agent.name}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all border border-gray-100 dark:border-gray-700"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-xl">
                    <Icon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Active</span>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {agent.type.replace(/Agent$/, '').replace(/([A-Z])/g, ' $1').trim()}
                </h3>
                
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  {agent.description}
                </p>

                {agent.capabilities.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Capabilities:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {agent.capabilities.slice(0, 3).map((cap, idx) => (
                        <span
                          key={idx}
                          className="inline-block bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs px-2 py-1 rounded-lg"
                        >
                          {cap.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {agent.capabilities.length > 3 && (
                        <span className="inline-block bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs px-2 py-1 rounded-lg">
                          +{agent.capabilities.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => executeBot(agent.name)}
                  disabled={executingBot === agent.name}
                  className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-medium transition-all ${
                    executingBot === agent.name
                      ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed text-gray-500 dark:text-gray-400'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/30'
                  }`}
                >
                  {executingBot === agent.name ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Test Execute
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Execution Result */}
        {executionResult && (
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Last Execution Result
            </h3>
            <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl overflow-auto max-h-96 text-sm text-gray-800 dark:text-gray-200">
              {JSON.stringify(executionResult, null, 2)}
            </pre>
          </div>
        )}

        {/* API Info */}
        <div className="mt-8 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-6">
          <h3 className="font-semibold text-indigo-900 dark:text-indigo-300 mb-2">API Information</h3>
          <div className="text-sm text-indigo-800 dark:text-indigo-400 space-y-1">
            <p><strong>Endpoint:</strong> {window.location.origin}/api</p>
            <p><strong>Agents Loaded:</strong> {agents.length}</p>
            <p><strong>Status:</strong> All systems operational</p>
          </div>
        </div>
      </div>
    </div>
  );
}
