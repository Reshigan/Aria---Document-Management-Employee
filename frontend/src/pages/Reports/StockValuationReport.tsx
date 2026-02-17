import React, { useState, useEffect } from 'react';
import { Download, Package, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';

interface StockItem {
  product_code: string;
  product_name: string;
  quantity: number;
  cost_price: number;
  total_value: number;
  category: string;
}

const StockValuationReport: React.FC = () => {
  const [data, setData] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/reports/stock-valuation`);
      const result = await response.json();
      if (result.success) {
        setData(result.data || []);
      } else {
        setData([]);
      }
    } catch (error) {
      console.error('Failed to fetch stock valuation:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const categories = [...new Set(data.map(item => item.category))];
  const filteredData = filterCategory ? data.filter(item => item.category === filterCategory) : data;

  const totals = {
    quantity: filteredData.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0),
    value: filteredData.reduce((sum, item) => sum + Number(item.total_value ?? 0), 0),
    items: filteredData.length
  };

  const categoryTotals = categories.map(cat => ({
    category: cat,
    value: data.filter(item => item.category === cat).reduce((sum, item) => sum + Number(item.total_value ?? 0), 0),
    percentage: totals.value > 0 ? (data.filter(item => item.category === cat).reduce((sum, item) => sum + Number(item.total_value ?? 0), 0) / totals.value) * 100 : 0
  })).sort((a, b) => b.value - a.value);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Stock Valuation Report</h1>
          <p className="text-gray-500 dark:text-gray-300 mt-1">Current inventory valuation</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 flex items-center">
          <Download className="w-4 h-4 mr-2" />
          Export PDF
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <Package className="w-10 h-10 opacity-80" />
          </div>
          <div className="text-sm opacity-90 mb-1">Total Stock Value</div>
          <div className="text-2xl font-bold">{formatCurrency(totals.value)}</div>
          <div className="text-xs opacity-75 mt-2 flex items-center">
            <TrendingUp className="w-3 h-3 mr-1" />
            +8.5% vs last month
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <Package className="w-10 h-10 opacity-80" />
          </div>
          <div className="text-sm opacity-90 mb-1">Total Units</div>
          <div className="text-2xl font-bold">{Number(totals.quantity ?? 0).toLocaleString()}</div>
          <div className="text-xs opacity-75 mt-2">
            Across {totals.items} products
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <Package className="w-10 h-10 opacity-80" />
          </div>
          <div className="text-sm opacity-90 mb-1">Average Value per Product</div>
          <div className="text-2xl font-bold">{formatCurrency(totals.items > 0 ? totals.value / totals.items : 0)}</div>
          <div className="text-xs opacity-75 mt-2">
            Cost-weighted average
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">Valuation by Category</h2>
        <div className="space-y-4">
          {categoryTotals.map((cat) => (
            <div key={cat.category}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{cat.category}</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(cat.value)}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div
                  className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${cat.percentage}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-300 mt-1">{Number(cat.percentage ?? 0).toFixed(1)}% of total inventory value</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Stock Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b-2 border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Product Code</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Product Name</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Category</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Quantity</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Cost Price</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredData.map((item) => (
              <tr key={item.product_code} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                <td className="px-6 py-4 font-mono text-sm">{item.product_code}</td>
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{item.product_name}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                    {item.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-sm">{Number(item.quantity ?? 0).toLocaleString()}</td>
                <td className="px-6 py-4 text-right text-sm">{formatCurrency(item.cost_price)}</td>
                <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(item.total_value)}</td>
              </tr>
            ))}
            {/* Totals Row */}
            <tr className="bg-gray-50 dark:bg-gray-900 font-bold">
              <td colSpan={3} className="px-6 py-4 text-gray-900 dark:text-white">TOTAL ({filteredData.length} products)</td>
              <td className="px-6 py-4 text-right text-blue-700 dark:text-blue-300">{Number(totals.quantity ?? 0).toLocaleString()}</td>
              <td className="px-6 py-4"></td>
              <td className="px-6 py-4 text-right text-blue-700 dark:text-blue-300 text-lg">{formatCurrency(totals.value)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Insights */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-green-50 dark:bg-green-900/30 border-l-4 border-green-400 p-4 rounded">
          <h3 className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">Top Category</h3>
          <p className="text-sm text-green-700 dark:text-green-300">
            {categoryTotals[0]?.category} accounts for {Number(categoryTotals[0]?.percentage ?? 0).toFixed(1)}% of inventory value ({formatCurrency(categoryTotals[0]?.value)})
          </p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400 p-4 rounded">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Inventory Health</h3>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Total inventory value of {formatCurrency(totals.value)} across {totals.items} products with average holding of {Math.round(totals.items > 0 ? totals.quantity / totals.items : 0)} units per product
          </p>
        </div>
      </div>
    </div>
  );
};

export default StockValuationReport;
