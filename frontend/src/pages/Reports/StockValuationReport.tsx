import React, { useState, useEffect } from 'react';
import { Download, Package, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

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
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    // Mock data
    setData([
      { product_code: 'PROD-001', product_name: 'Laptop Dell XPS 15', quantity: 15, cost_price: 18000, total_value: 270000, category: 'Electronics' },
      { product_code: 'PROD-002', product_name: 'Office Chair Executive', quantity: 8, cost_price: 2500, total_value: 20000, category: 'Furniture' },
      { product_code: 'PROD-003', product_name: 'Printer HP LaserJet', quantity: 25, cost_price: 4500, total_value: 112500, category: 'Electronics' },
      { product_code: 'PROD-004', product_name: 'Monitor 27" 4K', quantity: 3, cost_price: 6000, total_value: 18000, category: 'Electronics' },
      { product_code: 'PROD-005', product_name: 'Desk Standing', quantity: 12, cost_price: 3500, total_value: 42000, category: 'Furniture' },
      { product_code: 'PROD-006', product_name: 'Keyboard Mechanical', quantity: 45, cost_price: 1200, total_value: 54000, category: 'Electronics' }
    ]);
  }, []);

  const categories = [...new Set(data.map(item => item.category))];
  const filteredData = filterCategory ? data.filter(item => item.category === filterCategory) : data;

  const totals = {
    quantity: filteredData.reduce((sum, item) => sum + item.quantity, 0),
    value: filteredData.reduce((sum, item) => sum + item.total_value, 0),
    items: filteredData.length
  };

  const categoryTotals = categories.map(cat => ({
    category: cat,
    value: data.filter(item => item.category === cat).reduce((sum, item) => sum + item.total_value, 0),
    percentage: (data.filter(item => item.category === cat).reduce((sum, item) => sum + item.total_value, 0) / totals.value) * 100
  })).sort((a, b) => b.value - a.value);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stock Valuation Report</h1>
          <p className="text-gray-500 mt-1">Current inventory valuation</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center">
          <Download className="w-4 h-4 mr-2" />
          Export PDF
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Package className="w-10 h-10 opacity-80" />
          </div>
          <div className="text-sm opacity-90 mb-1">Total Stock Value</div>
          <div className="text-3xl font-bold">{formatCurrency(totals.value)}</div>
          <div className="text-xs opacity-75 mt-2 flex items-center">
            <TrendingUp className="w-3 h-3 mr-1" />
            +8.5% vs last month
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Package className="w-10 h-10 opacity-80" />
          </div>
          <div className="text-sm opacity-90 mb-1">Total Units</div>
          <div className="text-3xl font-bold">{totals.quantity.toLocaleString()}</div>
          <div className="text-xs opacity-75 mt-2">
            Across {totals.items} products
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Package className="w-10 h-10 opacity-80" />
          </div>
          <div className="text-sm opacity-90 mb-1">Average Value per Product</div>
          <div className="text-3xl font-bold">{formatCurrency(totals.value / totals.items)}</div>
          <div className="text-xs opacity-75 mt-2">
            Cost-weighted average
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Valuation by Category</h2>
        <div className="space-y-4">
          {categoryTotals.map((cat) => (
            <div key={cat.category}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700">{cat.category}</span>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(cat.value)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${cat.percentage}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">{cat.percentage.toFixed(1)}% of total inventory value</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b-2 border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cost Price</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredData.map((item) => (
              <tr key={item.product_code} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-mono text-sm">{item.product_code}</td>
                <td className="px-6 py-4 font-medium text-gray-900">{item.product_name}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                    {item.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-sm">{item.quantity.toLocaleString()}</td>
                <td className="px-6 py-4 text-right text-sm">{formatCurrency(item.cost_price)}</td>
                <td className="px-6 py-4 text-right font-semibold text-gray-900">{formatCurrency(item.total_value)}</td>
              </tr>
            ))}
            {/* Totals Row */}
            <tr className="bg-gray-50 font-bold">
              <td colSpan={3} className="px-6 py-4 text-gray-900">TOTAL ({filteredData.length} products)</td>
              <td className="px-6 py-4 text-right text-blue-700">{totals.quantity.toLocaleString()}</td>
              <td className="px-6 py-4"></td>
              <td className="px-6 py-4 text-right text-blue-700 text-lg">{formatCurrency(totals.value)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Insights */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
          <h3 className="text-sm font-medium text-green-800 mb-2">Top Category</h3>
          <p className="text-sm text-green-700">
            {categoryTotals[0]?.category} accounts for {categoryTotals[0]?.percentage.toFixed(1)}% of inventory value ({formatCurrency(categoryTotals[0]?.value)})
          </p>
        </div>
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Inventory Health</h3>
          <p className="text-sm text-blue-700">
            Total inventory value of {formatCurrency(totals.value)} across {totals.items} products with average holding of {Math.round(totals.quantity / totals.items)} units per product
          </p>
        </div>
      </div>
    </div>
  );
};

export default StockValuationReport;
