import { useEffect, useState } from 'react'
import api from '../services/api'
import { DashboardStats, RecentActivity } from '../types'
import { 
  TrendingUp, TrendingDown, DollarSign, 
  AlertCircle, FileText, CreditCard 
} from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activity, setActivity] = useState<RecentActivity | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const [statsRes, activityRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/recent-activity'),
      ])
      setStats(statsRes.data)
      setActivity(activityRes.data)
    } catch (error) {
      console.error('Failed to load dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your business finances</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Receivables"
          value={formatCurrency(stats?.total_receivables || 0)}
          icon={DollarSign}
          color="blue"
          subtitle={`Overdue: ${formatCurrency(stats?.overdue_receivables || 0)}`}
          testId="metric-cost-saved"
        />
        <StatCard
          title="Total Payables"
          value={formatCurrency(stats?.total_payables || 0)}
          icon={AlertCircle}
          color="orange"
          subtitle={`Overdue: ${formatCurrency(stats?.overdue_payables || 0)}`}
          testId="metric-expenses"
        />
        <StatCard
          title="Revenue (MTD)"
          value={formatCurrency(stats?.total_revenue || 0)}
          icon={TrendingUp}
          color="green"
          subtitle={`Growth: ${stats?.revenue_growth?.toFixed(1) || 0}%`}
          testId="metric-revenue"
        />
        <StatCard
          title="Profit (MTD)"
          value={formatCurrency(stats?.profit || 0)}
          icon={DollarSign}
          color="purple"
          subtitle="Net profit this month"
          testId="metric-profit"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-600" />
              Recent Invoices
            </h2>
          </div>
          <div className="space-y-3">
            {activity?.recent_invoices?.slice(0, 5).map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{invoice.invoice_number}</p>
                  <p className="text-sm text-gray-600">{formatDate(invoice.invoice_date)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatCurrency(invoice.total_amount)}</p>
                  <p className={`text-xs ${
                    invoice.status === 'paid' ? 'text-green-600' :
                    invoice.status === 'overdue' ? 'text-red-600' :
                    'text-yellow-600'
                  }`}>
                    {invoice.status}
                  </p>
                </div>
              </div>
            ))}
            {!activity?.recent_invoices?.length && (
              <p className="text-gray-500 text-center py-4">No recent invoices</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <CreditCard className="h-5 w-5 mr-2 text-green-600" />
              Recent Payments
            </h2>
          </div>
          <div className="space-y-3">
            {activity?.recent_payments?.slice(0, 5).map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{payment.payment_number}</p>
                  <p className="text-sm text-gray-600">{formatDate(payment.payment_date)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatCurrency(payment.amount)}</p>
                  <p className="text-xs text-gray-600">{payment.payment_method}</p>
                </div>
              </div>
            ))}
            {!activity?.recent_payments?.length && (
              <p className="text-gray-500 text-center py-4">No recent payments</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cash Flow Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">Cash In</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(stats?.cash_in || 0)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Cash Out</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(stats?.cash_out || 0)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Net Cash Flow</p>
            <p className={`text-2xl font-bold ${
              (stats?.net_cash_flow || 0) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(stats?.net_cash_flow || 0)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6" data-testid="revenue-chart">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Chart</h2>
          <div className="h-64 flex items-center justify-center text-gray-400">
            Revenue chart placeholder
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6" data-testid="expense-chart">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Expense Chart</h2>
          <div className="h-64 flex items-center justify-center text-gray-400">
            Expense chart placeholder
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
    <div className="bg-white rounded-lg shadow p-6" data-testid={testId}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <div className={`p-2 rounded-lg ${colors[color as keyof typeof colors]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
    </div>
  )
}
