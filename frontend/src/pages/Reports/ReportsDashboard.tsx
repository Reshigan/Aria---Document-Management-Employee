import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, TrendingUp, DollarSign, Package, Users, FileSpreadsheet, BarChart3, ChevronRight } from 'lucide-react';

interface ReportCategory {
  title: string;
  icon: React.ElementType;
  gradient: string;
  shadowColor: string;
  reports: {
    name: string;
    path: string;
    description: string;
  }[];
}

const reportCategories: ReportCategory[] = [
  {
    title: 'Financial Reports',
    icon: DollarSign,
    gradient: 'from-violet-500 to-purple-500',
    shadowColor: 'shadow-violet-500/30',
    reports: [
      { name: 'Trial Balance', path: '/reports/financial/trial-balance', description: 'Account balances summary' },
      { name: 'Balance Sheet', path: '/reports/financial/balance-sheet', description: 'Assets, liabilities, equity' },
      { name: 'Income Statement', path: '/reports/financial/income-statement', description: 'Revenue and expenses' },
      { name: 'Cash Flow', path: '/reports/ar-ap/cash-flow', description: 'Cash inflows and outflows' },
    ]
  },
  {
    title: 'AR/AP Reports',
    icon: FileText,
    gradient: 'from-emerald-500 to-teal-500',
    shadowColor: 'shadow-emerald-500/30',
    reports: [
      { name: 'AR Aging', path: '/reports/ar-aging', description: 'Accounts receivable aging' },
      { name: 'AP Aging', path: '/reports/ar-ap/ap-aging', description: 'Accounts payable aging' },
    ]
  },
  {
    title: 'Inventory Reports',
    icon: Package,
    gradient: 'from-amber-500 to-orange-500',
    shadowColor: 'shadow-amber-500/30',
    reports: [
      { name: 'Stock Valuation', path: '/reports/stock-valuation', description: 'Inventory value by item' },
      { name: 'Inventory Valuation', path: '/reports/inventory/valuation', description: 'Complete inventory valuation' },
    ]
  },
  {
    title: 'Sales & Purchase Reports',
    icon: TrendingUp,
    gradient: 'from-indigo-500 to-blue-500',
    shadowColor: 'shadow-indigo-500/30',
    reports: [
      { name: 'Sales KPIs', path: '/reports/sales-purchase/sales-kpis', description: 'Sales performance metrics' },
      { name: 'Purchase KPIs', path: '/reports/sales-purchase/purchase-kpis', description: 'Purchase performance metrics' },
    ]
  },
  {
    title: 'Tax & Compliance',
    icon: FileSpreadsheet,
    gradient: 'from-red-500 to-rose-500',
    shadowColor: 'shadow-red-500/30',
    reports: [
      { name: 'VAT Summary', path: '/reports/vat-summary', description: 'VAT collected and paid' },
      { name: 'BBBEE Compliance', path: '/reports/compliance/bbbee', description: 'BBBEE scorecard' },
    ]
  },
  {
    title: 'HR & Payroll Reports',
    icon: Users,
    gradient: 'from-teal-500 to-cyan-500',
    shadowColor: 'shadow-teal-500/30',
    reports: [
      { name: 'Payroll Activity', path: '/reports/payroll/activity', description: 'Payroll runs and payments' },
      { name: 'Expense Management', path: '/reports/expense/management', description: 'Employee expenses' },
    ]
  },
];

export const ReportsDashboard: React.FC = () => {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl ">
              <BarChart3 className="h-7 w-7 text-white" />
            </div>
            Reports
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Comprehensive reporting across all ERP modules</p>
        </div>

        {/* Report Categories Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {reportCategories.map((category) => {
            const IconComponent = category.icon;
            return (
              <div
                key={category.title}
                className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700  duration-300"
              >
                {/* Category Header */}
                <div className="flex items-center gap-3 mb-5">
                  <div className={`p-2 bg-gradient-to-br ${category.gradient} rounded-lg ${category.shadowColor}`}>
                    <IconComponent className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{category.title}</h2>
                </div>

                {/* Report Links */}
                <div className="space-y-2">
                  {category.reports.map((report) => (
                    <Link
                      key={report.path}
                      to={report.path}
                      className="group flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200"
                    >
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {report.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {report.description}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ReportsDashboard;
