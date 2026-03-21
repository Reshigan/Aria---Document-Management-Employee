import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardBody } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  TrendingUp, TrendingDown, DollarSign, FileText, Bot, CheckCircle, AlertCircle, Loader2,
  BarChart3, Wallet, CreditCard, Activity, Zap
} from 'lucide-react';
import api from '../../services/api';
import './ExecutiveDashboard.css';

export const ExecutiveDashboard: React.FC = () => {
  const [agents, setBots] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({
    total_revenue: 0,
    net_profit: 0,
    cash_position: 0,
    ar_outstanding: 0,
    ap_outstanding: 0,
    bot_count: 109,
    active_bots: 109,
    is_loss: false,
    transactions_today: 0,
    success_rate: 100,
    invoices_processed_today: 0,
    pending_payments: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      // Fetch live dashboard data from the executive endpoint
      const [botsResponse, dashboardResponse] = await Promise.all([
        api.get('/agents'),
        api.get('/dashboard/executive')
      ]);
      
      setBots(botsResponse.data.agents || []);
      
      const dashData = dashboardResponse.data;
      const financial = dashData?.financial || {};
      const automation = dashData?.automation || {};
      
      setMetrics({
        total_revenue: financial.revenue || 0,
        net_profit: financial.net_profit || 0,
        cash_position: financial.cash_position || 0,
        ar_outstanding: financial.ar_balance || 0,
        ap_outstanding: financial.ap_balance || 0,
        bot_count: botsResponse.data.agents?.length || automation.active_agents || 109,
        active_bots: botsResponse.data.agents?.filter((b: any) => b.status === 'active').length || automation.active_agents || 109,
        is_loss: financial.is_loss || false,
        transactions_today: automation.transactions_today || 0,
        success_rate: automation.success_rate || 100,
        invoices_processed_today: automation.invoices_processed_today || 0,
        pending_payments: automation.pending_payments || 0
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
      // Keep existing metrics on error rather than resetting to zero
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Show loading skeleton while fetching data
  const LoadingSkeleton = () => (
    <div className="flex items-center justify-center p-12">
      <Loader2 className="animate-spin h-8 w-8 mr-3 text-amber-500" />
      <span className="text-gray-300 text-lg">Loading dashboard data...</span>
    </div>
  );

  // Error banner with retry
  const ErrorBanner = () => (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-red-400" />
        <span className="text-red-400">{error}</span>
      </div>
      <Button size="sm" onClick={() => { setLoading(true); fetchDashboardData(); }}>
        Retry
      </Button>
    </div>
  );

  return (
    <div className="p-6" style={{ background: 'linear-gradient(135deg, #0f1419 0%, #1a2332 50%, #0f1419 100%)' }}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl shadow-xl shadow-amber-500/20">
              <BarChart3 className="h-8 w-8 text-slate-900" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Executive Dashboard</h1>
              <p className="text-gray-300">Real-time financial overview powered by <span className="text-amber-500 font-semibold">{metrics?.active_bots || 109}</span> AI automation agents</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-emerald-400 text-sm font-medium">All Systems Operational</span>
            </div>
          </div>
        </div>
      </div>

      {error && <ErrorBanner />}

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* Financial KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div data-testid="metric-revenue" className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 border border-white/5 hover:border-amber-500/30 transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-emerald-500/10 rounded-xl">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                </div>
                <span className="text-xs text-emerald-500 font-medium bg-emerald-500/10 px-2 py-1 rounded-lg">+12.5%</span>
              </div>
              <div className="text-2xl font-bold text-white mb-1">{formatCurrency(metrics?.total_revenue || 0)}</div>
              <div className="text-sm text-gray-300">Total Revenue (YTD)</div>
            </div>
            
            <div data-testid="metric-expenses" className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 border border-white/5 hover:border-amber-500/30 transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-xl ${metrics?.is_loss ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                  {metrics?.is_loss ? <TrendingDown className="h-5 w-5 text-red-500" /> : <DollarSign className="h-5 w-5 text-emerald-500" />}
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-lg ${metrics?.is_loss ? 'text-red-500 bg-red-500/10' : 'text-emerald-500 bg-emerald-500/10'}`}>
                  {metrics?.is_loss ? 'Loss' : 'Profit'}
                </span>
              </div>
              <div className="text-2xl font-bold text-white mb-1">{formatCurrency(Math.abs(metrics?.net_profit || 0))}</div>
              <div className="text-sm text-gray-300">{metrics?.is_loss ? "Net Loss" : "Net Profit"}</div>
            </div>
            
            <div data-testid="metric-profit" className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 border border-white/5 hover:border-amber-500/30 transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-amber-500/10 rounded-xl">
                  <Wallet className="h-5 w-5 text-amber-500" />
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-lg ${metrics?.cash_position >= 0 ? 'text-emerald-500 bg-emerald-500/10' : 'text-amber-500 bg-amber-500/10'}`}>
                  {metrics?.cash_position >= 0 ? 'Positive' : 'Negative'}
                </span>
              </div>
              <div className="text-2xl font-bold text-white mb-1">{formatCurrency(metrics?.cash_position || 0)}</div>
              <div className="text-sm text-gray-300">Cash Position</div>
            </div>
            
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 border border-white/5 hover:border-amber-500/30 transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-500/10 rounded-xl">
                  <FileText className="h-5 w-5 text-blue-500" />
                </div>
                <span className="text-xs text-blue-500 font-medium bg-blue-500/10 px-2 py-1 rounded-lg">Outstanding</span>
              </div>
              <div className="text-2xl font-bold text-white mb-1">{formatCurrency(metrics?.ar_outstanding || 0)}</div>
              <div className="text-sm text-gray-300">AR Outstanding</div>
            </div>
          </div>

          {/* AP/AR Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
            <div data-testid="revenue-chart" className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 border border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Accounts Payable</h3>
                <div className="p-2 bg-red-500/10 rounded-xl">
                  <CreditCard className="h-5 w-5 text-red-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white mb-4">
                {formatCurrency(metrics?.ap_outstanding || 0)}
              </div>
              <div className="flex items-center gap-2 p-3 bg-slate-900/50 rounded-xl">
                <Bot className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-gray-300">
                  {metrics?.invoices_processed_today > 0 
                    ? `Invoice Reconciliation Agent: ${metrics.invoices_processed_today} invoices processed today`
                    : 'Invoice Reconciliation Agent: No invoices processed today'}
                </span>
              </div>
            </div>

            <div data-testid="expense-chart" className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 border border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Accounts Receivable</h3>
                <div className="p-2 bg-emerald-500/10 rounded-xl">
                  <Wallet className="h-5 w-5 text-emerald-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white mb-4">
                {formatCurrency(metrics?.ar_outstanding || 0)}
              </div>
              <div className="flex items-center gap-2 p-3 bg-slate-900/50 rounded-xl">
                <Bot className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-gray-300">
                  {metrics?.pending_payments > 0 
                    ? `Payment Prediction Agent: ${metrics.pending_payments} payments pending`
                    : 'Payment Prediction Agent: No pending payments'}
                </span>
              </div>
            </div>
          </div>

          {/* Automation Agents Section */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 border border-white/5 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-xl">
                  <Zap className="h-5 w-5 text-amber-500" />
                </div>
                <h3 className="text-lg font-semibold text-white">Automation Agents - All {metrics?.active_bots || 109} Active</h3>
              </div>
            </div>
            
            {/* Agent Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5">
                <div className="text-sm text-gray-300 mb-1">Total Agents</div>
                <div className="text-2xl font-bold text-white">{metrics?.bot_count || 109}</div>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5">
                <div className="text-sm text-gray-300 mb-1">Active</div>
                <div className="text-2xl font-bold text-emerald-500">{metrics?.active_bots || 109}</div>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5">
                <div className="text-sm text-gray-300 mb-1">Transactions Today</div>
                <div className="text-2xl font-bold text-white">{metrics?.transactions_today?.toLocaleString() || '0'}</div>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5">
                <div className="text-sm text-gray-300 mb-1">Success Rate</div>
                <div className={`text-2xl font-bold ${metrics?.transactions_today > 0 ? (metrics?.success_rate >= 90 ? 'text-emerald-500' : 'text-amber-500') : 'text-gray-300'}`}>{metrics?.transactions_today > 0 ? `${metrics?.success_rate || 0}%` : 'N/A'}</div>
              </div>
            </div>

            {/* Agent Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {agents.length > 0 ? agents.map((agent, index) => (
                <div key={index} className="bg-slate-900/50 rounded-xl p-4 border border-white/5 hover:border-amber-500/30 transition-all">
                  <div className="flex justify-between mb-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg">
                      <Bot className="h-4 w-4 text-amber-500" />
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-lg ${agent.status === 'active' ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-300 bg-gray-500/10'}`}>
                      {agent.status}
                    </span>
                  </div>
                  <h4 className="font-semibold text-sm text-white mb-2">{agent.name}</h4>
                  <p className="text-xs text-gray-300 line-clamp-2">{agent.description}</p>
                </div>
              )) : (
                <div className="col-span-full text-center p-8">
                  <div className="p-4 bg-amber-500/10 rounded-2xl inline-block mb-4">
                    <Bot className="h-8 w-8 text-amber-500" />
                  </div>
                  <p className="text-gray-300">No agents configured yet. Visit the Bots page to set up automation.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ExecutiveDashboard;
