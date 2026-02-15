import { useEffect, useState } from 'react'
import api from '../services/api'
import { DashboardStats, RecentActivity } from '../types'
import { 
  TrendingUp, TrendingDown, DollarSign, 
  AlertCircle, FileText, CreditCard, ArrowUpRight, ArrowDownRight,
  Activity, Wallet, PieChart, BarChart3, RefreshCw, Calendar,
  Users, ShoppingCart, Package, Clock, CheckCircle, XCircle, AlertTriangle
} from 'lucide-react'

interface ActionableItem {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  link: string;
}

interface AlertItem {
  id: string;
  type: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  link: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activity, setActivity] = useState<RecentActivity | null>(null)
  const [pendingApprovals, setPendingApprovals] = useState<ActionableItem[]>([])
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      const [statsRes, activityRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/recent-activity'),
      ])
      setStats(statsRes.data)
      setActivity(activityRes.data)
      
      // Load pending approvals from API
      try {
        const approvalsRes = await api.get('/dashboard/pending-approvals')
        setPendingApprovals(approvalsRes.data.approvals || [])
      } catch (e) {
        console.error('Failed to load pending approvals:', e)
        setPendingApprovals([])
      }
      
      // Load alerts from API
      try {
        const alertsRes = await api.get('/dashboard/alerts')
        setAlerts(alertsRes.data.alerts || [])
      } catch (e) {
        console.error('Failed to load alerts:', e)
        setAlerts([])
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error)
      setStats({
        total_receivables: 0,
        overdue_receivables: 0,
        total_payables: 0,
        overdue_payables: 0,
        total_revenue: 0,
        revenue_growth: 0,
        profit: 0,
        cash_in: 0,
        cash_out: 0,
        net_cash_flow: 0
      })
      setActivity({ recent_invoices: [], recent_payments: [] })
      setPendingApprovals([])
      setAlerts([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              {getGreeting()}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Modern Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="group relative overflow-hidden bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-slate-700" data-testid="metric-cost-saved">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full -mr-16 -mt-16" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center ">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <ArrowUpRight className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Receivables</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(stats?.total_receivables || 0)}</p>
              <p className="text-xs text-orange-500 mt-2">Overdue: {formatCurrency(stats?.overdue_receivables || 0)}</p>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-slate-700" data-testid="metric-expenses">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/10 to-transparent rounded-full -mr-16 -mt-16" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center ">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <ArrowDownRight className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Payables</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(stats?.total_payables || 0)}</p>
              <p className="text-xs text-red-500 mt-2">Overdue: {formatCurrency(stats?.overdue_payables || 0)}</p>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-slate-700" data-testid="metric-revenue">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full -mr-16 -mt-16" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center ">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <span className="flex items-center text-emerald-500 text-sm font-medium">
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  {stats?.revenue_growth?.toFixed(1) || 0}%
                </span>
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Revenue (MTD)</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(stats?.total_revenue || 0)}</p>
              <p className="text-xs text-emerald-500 mt-2">Growth this month</p>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-slate-700" data-testid="metric-profit">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full -mr-16 -mt-16" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center ">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <Activity className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Profit (MTD)</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(stats?.profit || 0)}</p>
              <p className="text-xs text-purple-500 mt-2">Net profit this month</p>
            </div>
          </div>
        </div>

        {/* Cash Flow Summary - Modern Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              Cash Flow Summary
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-3 py-1 rounded-full">This Month</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div className="text-center p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
              <ArrowUpRight className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Cash In</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats?.cash_in || 0)}</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
              <ArrowDownRight className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Cash Out</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(stats?.cash_out || 0)}</p>
            </div>
            <div className={`text-center p-4 rounded-xl border ${(stats?.net_cash_flow || 0) >= 0 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800'}`}>
              <Activity className={`w-8 h-8 mx-auto mb-2 ${(stats?.net_cash_flow || 0) >= 0 ? 'text-blue-500' : 'text-orange-500'}`} />
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Net Cash Flow</p>
              <p className={`text-2xl font-bold ${(stats?.net_cash_flow || 0) >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                {formatCurrency(stats?.net_cash_flow || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Actionable Widgets - Pending Approvals & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Approvals */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Pending Approvals
              </h2>
              <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium px-2 py-1 rounded-full">
                {pendingApprovals.length} items
              </span>
            </div>
            <div className="space-y-3">
              {pendingApprovals.map((item) => (
                <a key={item.id} href={item.link} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      item.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30' :
                      item.priority === 'medium' ? 'bg-amber-100 dark:bg-amber-900/30' :
                      'bg-blue-100 dark:bg-blue-900/30'
                    }`}>
                      <Clock className={`w-5 h-5 ${
                        item.priority === 'high' ? 'text-red-600 dark:text-red-400' :
                        item.priority === 'medium' ? 'text-amber-600 dark:text-amber-400' :
                        'text-blue-600 dark:text-blue-400'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{item.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    item.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                    item.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  }`}>
                    {item.priority}
                  </span>
                </a>
              ))}
              {pendingApprovals.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-emerald-300 dark:text-emerald-600 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400">No pending approvals</p>
                </div>
              )}
            </div>
          </div>

          {/* System Alerts */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Alerts & Notifications
              </h2>
              <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium px-2 py-1 rounded-full">
                {alerts.filter(a => a.severity === 'critical').length} critical
              </span>
            </div>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <a key={alert.id} href={alert.link} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      alert.severity === 'critical' ? 'bg-red-100 dark:bg-red-900/30' :
                      alert.severity === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30' :
                      'bg-blue-100 dark:bg-blue-900/30'
                    }`}>
                      {alert.severity === 'critical' ? (
                        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      ) : alert.severity === 'warning' ? (
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white capitalize">{alert.type.replace('_', ' ')}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{alert.message}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    alert.severity === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                    alert.severity === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  }`}>
                    {alert.severity}
                  </span>
                </a>
              ))}
              {alerts.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-emerald-300 dark:text-emerald-600 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400">No alerts</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                Recent Invoices
              </h2>
              <a href="/ar/invoices" className="text-sm text-blue-500 hover:text-blue-600 font-medium">View All</a>
            </div>
            <div className="space-y-3">
              {activity?.recent_invoices?.slice(0, 5).map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{invoice.invoice_number}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(invoice.invoice_date)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(invoice.total_amount)}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      invoice.status === 'overdue' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>
                      {invoice.status}
                    </span>
                  </div>
                </div>
              ))}
              {!activity?.recent_invoices?.length && (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400">No recent invoices</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-500" />
                Recent Payments
              </h2>
              <a href="/payments" className="text-sm text-blue-500 hover:text-blue-600 font-medium">View All</a>
            </div>
            <div className="space-y-3">
              {activity?.recent_payments?.slice(0, 5).map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{payment.payment_number}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(payment.payment_date)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(payment.amount)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{payment.payment_method}</p>
                  </div>
                </div>
              ))}
              {!activity?.recent_payments?.length && (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400">No recent payments</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <a href="/quotes/new" className="flex flex-col items-center p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">New Quote</span>
            </a>
            <a href="/ar/invoices/new" className="flex flex-col items-center p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">New Invoice</span>
            </a>
            <a href="/erp/purchase-orders" className="flex flex-col items-center p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">New PO</span>
            </a>
            <a href="/erp/customers" className="flex flex-col items-center p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Customers</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string
  icon: any
  color: string
  subtitle?: string
  testId?: string
}

function StatCard({ title, value, icon: Icon, color, subtitle, testId }: StatCardProps) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    orange: 'bg-orange-100 text-orange-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
  }

  return (
    <div className="bg-white rounded-lg shadow p-4" data-testid={testId}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <div className={`p-2 rounded-lg ${colors[color as keyof typeof colors]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
    </div>
  )
}
