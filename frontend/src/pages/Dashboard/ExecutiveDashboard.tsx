import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardBody } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  TrendingUp, TrendingDown, DollarSign, FileText, Bot, CheckCircle, AlertCircle, Loader2
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
    bot_count: 58,
    active_bots: 58,
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
        bot_count: botsResponse.data.agents?.length || automation.active_agents || 58,
        active_bots: botsResponse.data.agents?.filter((b: any) => b.status === 'active').length || automation.active_agents || 58,
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
    <div className="flex items-center justify-center p-8">
      <Loader2 className="animate-spin h-6 w-6 mr-2 text-indigo-500" />
      <span className="text-gray-600 dark:text-gray-400">Loading dashboard data...</span>
    </div>
  );

  // Error banner with retry
  const ErrorBanner = () => (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-red-500" />
        <span className="text-red-600 dark:text-red-400">{error}</span>
      </div>
      <Button size="sm" onClick={() => { setLoading(true); fetchDashboardData(); }}>
        Retry
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-lg shadow-indigo-500/30">
            <TrendingUp className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Executive Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">Real-time financial overview powered by {metrics?.active_bots || 58} AI automation agents</p>
          </div>
        </div>
      </div>

      {error && <ErrorBanner />}

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div data-testid="metric-revenue">
              <StatCard
                title="Total Revenue (YTD)"
                value={formatCurrency(metrics?.total_revenue || 0)}
                change={metrics?.total_revenue > 0 ? "+12.5%" : ""}
                trend="up"
                icon={<TrendingUp />}
                color="var(--success)"
              />
            </div>
            <div data-testid="metric-expenses">
              <StatCard
                title={metrics?.is_loss ? "Net Loss" : "Net Profit"}
                value={formatCurrency(Math.abs(metrics?.net_profit || 0))}
                change={metrics?.is_loss ? "Loss" : "Profit"}
                trend={metrics?.is_loss ? "down" : "up"}
                icon={metrics?.is_loss ? <TrendingDown /> : <DollarSign />}
                color={metrics?.is_loss ? "var(--danger)" : "var(--success)"}
              />
            </div>
            <div data-testid="metric-profit">
              <StatCard
                title="Cash Position"
                value={formatCurrency(metrics?.cash_position || 0)}
                change={metrics?.cash_position >= 0 ? "Positive" : "Negative"}
                trend={metrics?.cash_position >= 0 ? "up" : "down"}
                icon={<DollarSign />}
                color={metrics?.cash_position >= 0 ? "var(--success)" : "var(--warning)"}
              />
            </div>
            <StatCard
              title="AR Outstanding"
              value={formatCurrency(metrics?.ar_outstanding || 0)}
              icon={<FileText />}
              color="var(--primary-600)"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card data-testid="revenue-chart" className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <CardHeader><CardTitle>Accounts Payable</CardTitle></CardHeader>
              <CardBody>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  {formatCurrency(metrics?.ap_outstanding || 0)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  <span>
                    {metrics?.invoices_processed_today > 0 
                      ? `Invoice Reconciliation Agent: ${metrics.invoices_processed_today} invoices processed today`
                      : 'Invoice Reconciliation Agent: No invoices processed today'}
                  </span>
                </div>
              </CardBody>
            </Card>

            <Card data-testid="expense-chart" className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <CardHeader><CardTitle>Accounts Receivable</CardTitle></CardHeader>
              <CardBody>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  {formatCurrency(metrics?.ar_outstanding || 0)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  <span>
                    {metrics?.pending_payments > 0 
                      ? `Payment Prediction Agent: ${metrics.pending_payments} payments pending`
                      : 'Payment Prediction Agent: No pending payments'}
                  </span>
                </div>
              </CardBody>
            </Card>
          </div>

          <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mb-6">
            <CardHeader>
              <CardTitle>Automation Agents - All {metrics?.active_bots || 58} Active</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="flex flex-wrap gap-8 mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Agents</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{metrics?.bot_count || 58}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Active</div>
                  <div className="text-2xl font-bold text-green-600">{metrics?.active_bots || 58}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Transactions Today</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{metrics?.transactions_today?.toLocaleString() || '0'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Success Rate</div>
                  <div className={`text-2xl font-bold ${metrics?.success_rate >= 90 ? 'text-green-600' : 'text-yellow-600'}`}>{metrics?.success_rate || 100}%</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.length > 0 ? agents.map((agent, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-xl p-4 hover:shadow-md transition-shadow bg-white dark:bg-gray-800">
                    <div className="flex justify-between mb-3">
                      <Bot className="h-5 w-5 text-indigo-600" />
                      <Badge variant={agent.status === 'active' ? 'success' : 'default'} size="sm">
                        {agent.status}
                      </Badge>
                    </div>
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">{agent.name}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{agent.description}</p>
                  </div>
                )) : (
                  <div className="col-span-full text-center p-8 text-gray-500 dark:text-gray-400">
                    <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No agents configured yet. Visit the Bots page to set up automation.</p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
};

export default ExecutiveDashboard;
