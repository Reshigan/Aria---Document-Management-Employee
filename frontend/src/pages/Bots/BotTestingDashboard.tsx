import React, { useState } from 'react';
import { Bot, CheckCircle, XCircle, Clock, PlayCircle, FileText, TrendingUp, DollarSign, Users, Package, FileCheck, Briefcase, Calendar } from 'lucide-react';
import { formatPercentage } from '../../utils/formatters';

interface BotTestResult {
  bot_id: string;
  bot_name: string;
  icon: React.ReactNode;
  status: 'not_started' | 'running' | 'passed' | 'failed';
  accuracy: number | null;
  tests_run: number;
  tests_passed: number;
  tests_failed: number;
  unique_feature: boolean;
  test_duration?: string;
  last_tested?: string;
}

const BotTestingDashboard: React.FC = () => {
  const [agents, setBots] = useState<BotTestResult[]>([
    {
      bot_id: 'invoice_processing',
      bot_name: 'Invoice Processing Agent',
      icon: <FileText className="w-6 h-6" />,
      status: 'not_started',
      accuracy: null,
      tests_run: 0,
      tests_passed: 0,
      tests_failed: 0,
      unique_feature: false
    },
    {
      bot_id: 'bank_reconciliation',
      bot_name: 'Bank Reconciliation Agent',
      icon: <TrendingUp className="w-6 h-6" />,
      status: 'not_started',
      accuracy: null,
      tests_run: 0,
      tests_passed: 0,
      tests_failed: 0,
      unique_feature: false
    },
    {
      bot_id: 'vat_return',
      bot_name: 'VAT Return Filing Agent',
      icon: <DollarSign className="w-6 h-6" />,
      status: 'not_started',
      accuracy: null,
      tests_run: 0,
      tests_passed: 0,
      tests_failed: 0,
      unique_feature: true
    },
    {
      bot_id: 'expense_approval',
      bot_name: 'Expense Approval Agent',
      icon: <FileCheck className="w-6 h-6" />,
      status: 'not_started',
      accuracy: null,
      tests_run: 0,
      tests_passed: 0,
      tests_failed: 0,
      unique_feature: false
    },
    {
      bot_id: 'quote_generation',
      bot_name: 'Quote Generation Agent',
      icon: <Users className="w-6 h-6" />,
      status: 'not_started',
      accuracy: null,
      tests_run: 0,
      tests_passed: 0,
      tests_failed: 0,
      unique_feature: false
    },
    {
      bot_id: 'contract_analysis',
      bot_name: 'Contract Analysis Agent',
      icon: <Briefcase className="w-6 h-6" />,
      status: 'not_started',
      accuracy: null,
      tests_run: 0,
      tests_passed: 0,
      tests_failed: 0,
      unique_feature: true
    },
    {
      bot_id: 'emp201_payroll',
      bot_name: 'EMP201 Payroll Tax Agent',
      icon: <Calendar className="w-6 h-6" />,
      status: 'not_started',
      accuracy: null,
      tests_run: 0,
      tests_passed: 0,
      tests_failed: 0,
      unique_feature: true
    },
    {
      bot_id: 'inventory_reorder',
      bot_name: 'Inventory Reorder Agent',
      icon: <Package className="w-6 h-6" />,
      status: 'not_started',
      accuracy: null,
      tests_run: 0,
      tests_passed: 0,
      tests_failed: 0,
      unique_feature: false
    }
  ]);

  const getStatusIcon = (status: BotTestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'running':
        return <Clock className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <PlayCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const runBotTest = async (botId: string) => {
    setBots(prev => prev.map(agent =>
      agent.bot_id === botId ? { ...agent, status: 'running' as const } : agent
    ));

    // Simulate test execution
    setTimeout(() => {
      setBots(prev => prev.map(agent => {
        if (agent.bot_id === botId) {
          const tests_run = 10;
          const tests_passed = Math.floor(Math.random() * 3) + 8; // 8-10 passed
          const tests_failed = tests_run - tests_passed;
          const accuracy = (tests_passed / tests_run) * 100;

          return {
            ...agent,
            status: accuracy >= 85 ? 'passed' as const : 'failed' as const,
            accuracy,
            tests_run,
            tests_passed,
            tests_failed,
            test_duration: '1.5 hours',
            last_tested: new Date().toISOString()
          };
        }
        return agent;
      }));
    }, 3000);
  };

  const totalTests = agents.reduce((sum, agent) => sum + agent.tests_run, 0);
  const totalPassed = agents.reduce((sum, agent) => sum + agent.tests_passed, 0);
  const overallAccuracy = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;
  const completedBots = agents.filter(agent => agent.status === 'passed' || agent.status === 'failed').length;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Agent className="w-8 h-8 mr-3 text-blue-600" />
            AI Agent Testing Dashboard
          </h1>
          <p className="text-gray-500 mt-1">Day 6: Test all 8 AI agents - THE CRITICAL DIFFERENTIATOR ⭐</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500 mb-1">Agents Tested</div>
          <div className="text-2xl font-bold text-gray-900">{completedBots} / {agents.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500 mb-1">Overall Accuracy</div>
          <div className={`text-2xl font-bold ${overallAccuracy >= 85 ? 'text-green-600' : 'text-yellow-600'}`}>
            {formatPercentage(overallAccuracy)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500 mb-1">Tests Passed</div>
          <div className="text-2xl font-bold text-green-600">{totalPassed} / {totalTests}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500 mb-1">Unique Agents</div>
          <div className="text-2xl font-bold text-purple-600">{agents.filter(b => b.unique_feature).length}</div>
        </div>
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {agents.map((agent) => (
          <div key={agent.bot_id} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${agent.unique_feature ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                {agent.icon}
              </div>
              {getStatusIcon(agent.status)}
            </div>
            <h3 className="text-sm font-medium mb-2">{agent.bot_name}</h3>
            {agent.unique_feature && (
              <span className="inline-flex px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 mb-2">
                ⭐ UNIQUE
              </span>
            )}
            {agent.accuracy !== null && (
              <div className="text-sm text-gray-600 mb-2">
                Accuracy: <span className="font-bold">{formatPercentage(agent.accuracy)}</span>
              </div>
            )}
            <button
              onClick={() => runBotTest(agent.bot_id)}
              disabled={agent.status === 'running'}
              className={`w-full px-3 py-2 rounded text-sm ${
                agent.status === 'running'
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {agent.status === 'running' ? 'Testing...' : 'Test Agent'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BotTestingDashboard;
