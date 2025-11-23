import React, { useState } from 'react';
import { TrendingUp, Download } from 'lucide-react';

export default function ProfitLossStatementPage() {
  const [period, setPeriod] = useState('month');

  const data = {
    revenue: { sales: 450000, services: 120000, other: 15000 },
    costs: { cogs: 180000, labor: 145000, overhead: 50000 },
    expenses: { marketing: 25000, admin: 18000, depreciation: 12000 }
  };

  const totalRevenue = Object.values(data.revenue).reduce((a, b) => a + b, 0);
  const totalCosts = Object.values(data.costs).reduce((a, b) => a + b, 0);
  const totalExpenses = Object.values(data.expenses).reduce((a, b) => a + b, 0);
  const netProfit = totalRevenue - totalCosts - totalExpenses;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <TrendingUp className="h-8 w-8" />
          Profit & Loss Statement
        </h1>
        <div className="flex gap-3">
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="px-4 py-2 border rounded-lg">
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg" data-testid="button-export-pdf">
            <Download className="h-4 w-4 inline mr-2" />
            Export PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div data-testid="section-revenue">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Revenue</h3>
          {Object.entries(data.revenue).map(([key, value]) => (
            <div key={key} className="flex justify-between py-2 border-b" data-testid={key === 'sales' ? 'revenue-sales' : undefined}>
              <span className="capitalize">{key}</span>
              <span className="font-medium">R {value.toLocaleString()}</span>
            </div>
          ))}
          <div className="flex justify-between py-2 font-bold text-lg" data-testid="total">
            <span>Total Revenue</span>
            <span className="text-green-600">R {totalRevenue.toLocaleString()}</span>
          </div>
        </div>

        <div data-testid="section-cogs">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Cost of Sales</h3>
          {Object.entries(data.costs).map(([key, value]) => (
            <div key={key} className="flex justify-between py-2 border-b">
              <span className="capitalize">{key}</span>
              <span className="font-medium">R {value.toLocaleString()}</span>
            </div>
          ))}
          <div className="flex justify-between py-2 font-bold">
            <span>Total Costs</span>
            <span className="text-red-600">R {totalCosts.toLocaleString()}</span>
          </div>
        </div>

        <div data-testid="section-expenses">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Operating Expenses</h3>
          {Object.entries(data.expenses).map(([key, value]) => (
            <div key={key} className="flex justify-between py-2 border-b">
              <span className="capitalize">{key}</span>
              <span className="font-medium">R {value.toLocaleString()}</span>
            </div>
          ))}
          <div className="flex justify-between py-2 font-bold">
            <span>Total Expenses</span>
            <span className="text-red-600">R {totalExpenses.toLocaleString()}</span>
          </div>
        </div>

        <div className="pt-4 border-t-2">
          <div className="flex justify-between py-2 text-xl font-bold" data-testid="net-profit">
            <span>Net Profit</span>
            <span className={netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
              R {netProfit.toLocaleString()}
            </span>
          </div>
          <div className="text-sm text-gray-600 text-right">
            {((netProfit / totalRevenue) * 100).toFixed(1)}% profit margin
          </div>
        </div>
      </div>
    </div>
  );
}
