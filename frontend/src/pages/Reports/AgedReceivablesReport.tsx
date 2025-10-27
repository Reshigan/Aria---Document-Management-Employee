import React, { useState, useEffect } from 'react';
import { Download, TrendingUp } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface AgedReceivable {
  customer_id: number;
  customer_name: string;
  current: number;
  days_30: number;
  days_60: number;
  days_90: number;
  days_90_plus: number;
  total_outstanding: number;
}

const AgedReceivablesReport: React.FC = () => {
  const [data, setData] = useState<AgedReceivable[]>([]);

  useEffect(() => {
    // Mock data
    setData([
      { customer_id: 1, customer_name: 'ABC Manufacturing', current: 15000, days_30: 8500, days_60: 0, days_90: 0, days_90_plus: 0, total_outstanding: 23500 },
      { customer_id: 2, customer_name: 'XYZ Trading', current: 0, days_30: 12000, days_60: 5000, days_90: 0, days_90_plus: 0, total_outstanding: 17000 },
      { customer_id: 3, customer_name: 'Mega Corp', current: 35000, days_30: 0, days_60: 0, days_90: 8000, days_90_plus: 0, total_outstanding: 43000 },
      { customer_id: 4, customer_name: 'Small Business Ltd', current: 0, days_30: 0, days_60: 0, days_90: 0, days_90_plus: 12000, total_outstanding: 12000 }
    ]);
  }, []);

  const totals = data.reduce((acc, row) => ({
    current: acc.current + row.current,
    days_30: acc.days_30 + row.days_30,
    days_60: acc.days_60 + row.days_60,
    days_90: acc.days_90 + row.days_90,
    days_90_plus: acc.days_90_plus + row.days_90_plus,
    total_outstanding: acc.total_outstanding + row.total_outstanding
  }), { current: 0, days_30: 0, days_60: 0, days_90: 0, days_90_plus: 0, total_outstanding: 0 });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Aged Receivables Report</h1>
          <p className="text-gray-500 mt-1">Outstanding balances by age</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center">
          <Download className="w-4 h-4 mr-2" />
          Export
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Current</div>
          <div className="text-xl font-bold text-green-600">{formatCurrency(totals.current)}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">1-30 Days</div>
          <div className="text-xl font-bold text-blue-600">{formatCurrency(totals.days_30)}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">31-60 Days</div>
          <div className="text-xl font-bold text-yellow-600">{formatCurrency(totals.days_60)}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">61-90 Days</div>
          <div className="text-xl font-bold text-orange-600">{formatCurrency(totals.days_90)}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">90+ Days</div>
          <div className="text-xl font-bold text-red-600">{formatCurrency(totals.days_90_plus)}</div>
        </div>
      </div>

      {/* Total */}
      <div className="bg-blue-600 p-6 rounded shadow mb-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-blue-100 text-sm">Total Outstanding</div>
            <div className="text-4xl font-bold">{formatCurrency(totals.total_outstanding)}</div>
          </div>
          <TrendingUp className="w-16 h-16 opacity-20" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Current</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">1-30</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">31-60</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">61-90</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">90+</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((row) => (
              <tr key={row.customer_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{row.customer_name}</td>
                <td className="px-6 py-4 text-right">{row.current > 0 ? formatCurrency(row.current) : '-'}</td>
                <td className="px-6 py-4 text-right">{row.days_30 > 0 ? formatCurrency(row.days_30) : '-'}</td>
                <td className="px-6 py-4 text-right text-yellow-600">{row.days_60 > 0 ? formatCurrency(row.days_60) : '-'}</td>
                <td className="px-6 py-4 text-right text-orange-600">{row.days_90 > 0 ? formatCurrency(row.days_90) : '-'}</td>
                <td className="px-6 py-4 text-right text-red-600 font-bold">{row.days_90_plus > 0 ? formatCurrency(row.days_90_plus) : '-'}</td>
                <td className="px-6 py-4 text-right font-bold">{formatCurrency(row.total_outstanding)}</td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-bold">
              <td className="px-6 py-4">TOTAL</td>
              <td className="px-6 py-4 text-right text-green-600">{formatCurrency(totals.current)}</td>
              <td className="px-6 py-4 text-right text-blue-600">{formatCurrency(totals.days_30)}</td>
              <td className="px-6 py-4 text-right text-yellow-600">{formatCurrency(totals.days_60)}</td>
              <td className="px-6 py-4 text-right text-orange-600">{formatCurrency(totals.days_90)}</td>
              <td className="px-6 py-4 text-right text-red-600">{formatCurrency(totals.days_90_plus)}</td>
              <td className="px-6 py-4 text-right text-blue-700 text-lg">{formatCurrency(totals.total_outstanding)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AgedReceivablesReport;
