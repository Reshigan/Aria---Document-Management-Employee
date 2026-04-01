import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/erp/page-header'
import { KPICard } from '@/components/erp/kpi-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DollarSign, TrendingUp, Building, PieChart } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import api from '@/lib/api'

interface BudgetSummary {
  total_budget: number
  total_actual: number
  variance_percent: number
}

interface AssetSummary {
  total_assets: number
  total_cost: number
  total_book_value: number
}

export default function FinancialPlanningDashboard() {
  // Mock chart data for demonstration
  const budgetChartData = [
    { month: 'Jan', budget: 80000, actual: 75000 },
    { month: 'Feb', budget: 85000, actual: 82000 },
    { month: 'Mar', budget: 90000, actual: 88000 },
    { month: 'Apr', budget: 95000, actual: 92000 },
    { month: 'May', budget: 100000, actual: 98000 },
    { month: 'Jun', budget: 105000, actual: 102000 },
  ];

  // Get budget summary
  const { data: budgetData, isLoading: budgetLoading } = useQuery({
    queryKey: ['budget-summary'],
    queryFn: async () => {
      // This would be an endpoint that gets overall budget vs actual
      // For now we'll mock it or use a simplified version
      return {
        total_budget: 1000000,
        total_actual: 850000,
        variance_percent: -15
      }
    },
  })

  // Get asset summary
  const { data: assetData, isLoading: assetLoading } = useQuery({
    queryKey: ['asset-summary'],
    queryFn: () => api.get<{ 
      total_assets: number; 
      total_cost: number; 
      total_book_value: number 
    }>('/new-pages/assets').then(res => {
      // Extract summary data from assets response
      const assets = Array.isArray(res) ? res : (res as any).assets || [];
      return {
        total_assets: assets.length,
        total_cost: assets.reduce((sum: number, asset: any) => sum + (asset.purchase_price || 0), 0),
        total_book_value: assets.reduce((sum: number, asset: any) => sum + (asset.current_value || 0), 0)
      }
    }),
  })

  if (budgetLoading || assetLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Financial Planning Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Financial Planning Dashboard" 
        description="Overview of budgets, assets, and financial planning"
      />
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Total Budget" 
          value={budgetData?.total_budget || 0} 
          format="currency" 
          icon={<DollarSign className="h-4 w-4" />} 
        />
        <KPICard 
          title="Actual Spending" 
          value={budgetData?.total_actual || 0} 
          format="currency" 
          icon={<TrendingUp className="h-4 w-4" />} 
        />
        <KPICard 
          title="Budget Variance" 
          value={budgetData?.variance_percent || 0} 
          format="percent" 
          icon={<PieChart className="h-4 w-4" />} 
        />
        <KPICard 
          title="Total Assets" 
          value={assetData?.total_assets || 0} 
          icon={<Building className="h-4 w-4" />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Budget vs Actual (Monthly)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Amount']} />
                  <Legend />
                  <Bar dataKey="budget" name="Budget" fill="#8884d8" />
                  <Bar dataKey="actual" name="Actual" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Asset Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Total Asset Cost</span>
                <span className="font-medium">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                  }).format(assetData?.total_cost || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Book Value</span>
                <span className="font-medium">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                  }).format(assetData?.total_book_value || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Depreciation Rate</span>
                <span className="font-medium">
                  {assetData && assetData.total_cost > 0 
                    ? Math.round(((assetData.total_cost - assetData.total_book_value) / assetData.total_cost) * 100) 
                    : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Budget Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center p-4 bg-green-50 rounded-lg">
                <span className="text-2xl font-bold text-green-600">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                  }).format(budgetData?.total_budget || 0)}
                </span>
                <span className="text-sm text-gray-600">Total Budget</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-blue-50 rounded-lg">
                <span className="text-2xl font-bold text-blue-600">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                  }).format(budgetData?.total_actual || 0)}
                </span>
                <span className="text-sm text-gray-600">Actual Spending</span>
              </div>
              <div className={`flex flex-col items-center p-4 rounded-lg ${budgetData?.variance_percent && budgetData.variance_percent < 0 ? 'bg-red-50' : 'bg-yellow-50'}`}>
                <span className={`text-2xl font-bold ${budgetData?.variance_percent && budgetData.variance_percent < 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                  {budgetData?.variance_percent || 0}%
                </span>
                <span className="text-sm text-gray-600">Budget Variance</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}