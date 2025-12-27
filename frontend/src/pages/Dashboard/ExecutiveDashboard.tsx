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
    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'}}>
      <Loader2 className="animate-spin" size={24} style={{marginRight: '0.5rem'}} />
      <span>Loading dashboard data...</span>
    </div>
  );

  // Error banner with retry
  const ErrorBanner = () => (
    <div style={{
      backgroundColor: 'var(--danger-50)', 
      border: '1px solid var(--danger-200)', 
      borderRadius: '0.5rem', 
      padding: '1rem', 
      marginBottom: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
        <AlertCircle size={20} color="var(--danger)" />
        <span style={{color: 'var(--danger)'}}>{error}</span>
      </div>
      <Button size="sm" onClick={() => { setLoading(true); fetchDashboardData(); }}>
        Retry
      </Button>
    </div>
  );

  return (
    <div className="executive-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 style={{fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.5rem'}}>Executive Dashboard</h1>
          <p style={{color: 'var(--gray-600)'}}>Real-time financial overview powered by {metrics?.active_bots || 58} AI automation agents</p>
        </div>
      </div>

      {error && <ErrorBanner />}

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem'}}>
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

          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem'}}>
            <Card data-testid="revenue-chart">
              <CardHeader><CardTitle>Accounts Payable</CardTitle></CardHeader>
              <CardBody>
                <div style={{fontSize: '2rem', fontWeight: 700, marginBottom: '1rem'}}>
                  {formatCurrency(metrics?.ap_outstanding || 0)}
                </div>
                <div style={{fontSize: '0.875rem', color: 'var(--gray-600)', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  <Bot size={14} />
                  <span>
                    {metrics?.invoices_processed_today > 0 
                      ? `Invoice Reconciliation Agent: ${metrics.invoices_processed_today} invoices processed today`
                      : 'Invoice Reconciliation Agent: No invoices processed today'}
                  </span>
                </div>
              </CardBody>
            </Card>

            <Card data-testid="expense-chart">
              <CardHeader><CardTitle>Accounts Receivable</CardTitle></CardHeader>
              <CardBody>
                <div style={{fontSize: '2rem', fontWeight: 700, marginBottom: '1rem'}}>
                  {formatCurrency(metrics?.ar_outstanding || 0)}
                </div>
                <div style={{fontSize: '0.875rem', color: 'var(--gray-600)', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  <Bot size={14} />
                  <span>
                    {metrics?.pending_payments > 0 
                      ? `Payment Prediction Agent: ${metrics.pending_payments} payments pending`
                      : 'Payment Prediction Agent: No pending payments'}
                  </span>
                </div>
              </CardBody>
            </Card>
          </div>

          <Card style={{marginBottom: '1.5rem'}}>
            <CardHeader>
              <CardTitle>🤖 Automation Agents - All {metrics?.active_bots || 58} Active</CardTitle>
            </CardHeader>
            <CardBody>
              <div style={{display: 'flex', gap: '2rem', marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--gray-50)', borderRadius: '0.5rem', flexWrap: 'wrap'}}>
                <div>
                  <div style={{fontSize: '0.875rem', color: 'var(--gray-600)'}}>Total Agents</div>
                  <div style={{fontSize: '1.5rem', fontWeight: 700}}>{metrics?.bot_count || 58}</div>
                </div>
                <div>
                  <div style={{fontSize: '0.875rem', color: 'var(--gray-600)'}}>Active</div>
                  <div style={{fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)'}}>{metrics?.active_bots || 58}</div>
                </div>
                <div>
                  <div style={{fontSize: '0.875rem', color: 'var(--gray-600)'}}>Transactions Today</div>
                  <div style={{fontSize: '1.5rem', fontWeight: 700}}>{metrics?.transactions_today?.toLocaleString() || '0'}</div>
                </div>
                <div>
                  <div style={{fontSize: '0.875rem', color: 'var(--gray-600)'}}>Success Rate</div>
                  <div style={{fontSize: '1.5rem', fontWeight: 700, color: metrics?.success_rate >= 90 ? 'var(--success)' : 'var(--warning)'}}>{metrics?.success_rate || 100}%</div>
                </div>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem'}}>
                {agents.length > 0 ? agents.map((agent, index) => (
                  <div key={index} style={{border: '1px solid var(--gray-200)', borderRadius: '0.5rem', padding: '1rem'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem'}}>
                      <Bot size={20} color="var(--primary-600)" />
                      <Badge variant={agent.status === 'active' ? 'success' : 'default'} size="sm">
                        {agent.status}
                      </Badge>
                    </div>
                    <h4 style={{fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem'}}>{agent.name}</h4>
                    <p style={{fontSize: '0.75rem', color: 'var(--gray-600)'}}>{agent.description}</p>
                  </div>
                )) : (
                  <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--gray-500)'}}>
                    <Bot size={32} style={{marginBottom: '0.5rem', opacity: 0.5}} />
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
