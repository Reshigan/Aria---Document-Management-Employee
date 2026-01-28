import React, { useState, useEffect } from 'react';
import { Download, FileText, AlertCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface VATData {
  period_start: string;
  period_end: string;
  output_vat: number;
  input_vat: number;
  net_vat: number;
  sales_excl_vat: number;
  purchases_excl_vat: number;
}

const VATSummaryReport: React.FC = () => {
  const [period, setPeriod] = useState({
    start: '2025-10-01',
    end: '2025-10-31'
  });

  const [data, setData] = useState<VATData | null>(null);

  useEffect(() => {
    const fetchVATData = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
        const response = await fetch(`${API_BASE}/api/reports/vat-summary?start=${period.start}&end=${period.end}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
          const result = await response.json();
          setData(result.data || result);
        } else {
          setData({
            period_start: period.start,
            period_end: period.end,
            sales_excl_vat: 0,
            output_vat: 0,
            purchases_excl_vat: 0,
            input_vat: 0,
            net_vat: 0
          });
        }
      } catch (err) {
        console.error('Failed to load VAT data:', err);
        setData({
          period_start: period.start,
          period_end: period.end,
          sales_excl_vat: 0,
          output_vat: 0,
          purchases_excl_vat: 0,
          input_vat: 0,
          net_vat: 0
        });
      }
    };
    fetchVATData();
  }, [period]);

  if (!data) return <div>Loading...</div>;

  const isRefund = data.net_vat < 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">VAT Summary Report (VAT201)</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">South African Revenue Service (SARS) VAT Return</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 flex items-center">
          <Download className="w-4 h-4 mr-2" />
          Export VAT201
        </button>
      </div>

      {/* Period Selection */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">VAT Period:</label>
          <input
            type="date"
            value={period.start}
            onChange={(e) => setPeriod({ ...period, start: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
          <span className="text-gray-500 dark:text-gray-400">to</span>
          <input
            type="date"
            value={period.end}
            onChange={(e) => setPeriod({ ...period, end: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
          <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">
            Report Generated: {formatDate(new Date())}
          </div>
        </div>
      </div>

      {/* VAT Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Output VAT */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-8 h-8 opacity-80" />
            <span className="text-xs font-medium bg-white dark:bg-gray-800 bg-opacity-20 px-2 py-1 rounded">OUTPUT</span>
          </div>
          <div className="text-sm opacity-90 mb-1">Output VAT (Sales)</div>
          <div className="text-3xl font-bold">{formatCurrency(data.output_vat)}</div>
          <div className="text-xs opacity-75 mt-2">
            Sales excl VAT: {formatCurrency(data.sales_excl_vat)}
          </div>
        </div>

        {/* Input VAT */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-8 h-8 opacity-80" />
            <span className="text-xs font-medium bg-white dark:bg-gray-800 bg-opacity-20 px-2 py-1 rounded">INPUT</span>
          </div>
          <div className="text-sm opacity-90 mb-1">Input VAT (Purchases)</div>
          <div className="text-3xl font-bold">{formatCurrency(data.input_vat)}</div>
          <div className="text-xs opacity-75 mt-2">
            Purchases excl VAT: {formatCurrency(data.purchases_excl_vat)}
          </div>
        </div>

        {/* Net VAT */}
        <div className={`bg-gradient-to-br ${isRefund ? 'from-orange-500 to-orange-600' : 'from-red-500 to-red-600'} rounded-lg shadow-lg p-6 text-white`}>
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-8 h-8 opacity-80" />
            <span className="text-xs font-medium bg-white dark:bg-gray-800 bg-opacity-20 px-2 py-1 rounded">
              {isRefund ? 'REFUND' : 'PAYABLE'}
            </span>
          </div>
          <div className="text-sm opacity-90 mb-1">Net VAT {isRefund ? 'Refundable' : 'Payable'}</div>
          <div className="text-3xl font-bold">{formatCurrency(Math.abs(data.net_vat))}</div>
          <div className="text-xs opacity-75 mt-2">
            {isRefund ? 'Claim from SARS' : 'Pay to SARS'}
          </div>
        </div>
      </div>

      {/* VAT201 Form Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden mb-6">
        <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">VAT201 Return Form</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Period: {formatDate(new Date(period.start))} - {formatDate(new Date(period.end))}</p>
        </div>

        <div className="p-6">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Box</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Description</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">Amount (ZAR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                <td className="px-4 py-3 font-mono text-sm">1</td>
                <td className="px-4 py-3 text-sm">Output Tax (Standard Rated Supplies)</td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(data.output_vat)}</td>
              </tr>
              <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                <td className="px-4 py-3 font-mono text-sm">2</td>
                <td className="px-4 py-3 text-sm">Output Tax (Zero Rated Supplies)</td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(0)}</td>
              </tr>
              <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                <td className="px-4 py-3 font-mono text-sm">3</td>
                <td className="px-4 py-3 text-sm">Output Tax (Exempt Supplies)</td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(0)}</td>
              </tr>
              <tr className="bg-blue-50 dark:bg-blue-900/30 font-semibold">
                <td className="px-4 py-3 font-mono text-sm">4</td>
                <td className="px-4 py-3 text-sm">Total Output Tax (1+2+3)</td>
                <td className="px-4 py-3 text-right text-blue-700 dark:text-blue-300">{formatCurrency(data.output_vat)}</td>
              </tr>
              <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                <td className="px-4 py-3 font-mono text-sm">5</td>
                <td className="px-4 py-3 text-sm">Input Tax (Standard Rated Purchases)</td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(data.input_vat)}</td>
              </tr>
              <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                <td className="px-4 py-3 font-mono text-sm">6</td>
                <td className="px-4 py-3 text-sm">Input Tax (Zero Rated Purchases)</td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(0)}</td>
              </tr>
              <tr className="bg-green-50 dark:bg-green-900/30 font-semibold">
                <td className="px-4 py-3 font-mono text-sm">7</td>
                <td className="px-4 py-3 text-sm">Total Input Tax (5+6)</td>
                <td className="px-4 py-3 text-right text-green-700 dark:text-green-300">{formatCurrency(data.input_vat)}</td>
              </tr>
              <tr className={`${isRefund ? 'bg-orange-50' : 'bg-red-50'} font-bold`}>
                <td className="px-4 py-3 font-mono text-sm">8</td>
                <td className="px-4 py-3 text-sm">
                  Net VAT {isRefund ? 'Refund' : 'Payable'} (4-7)
                </td>
                <td className={`px-4 py-3 text-right text-lg ${isRefund ? 'text-orange-700' : 'text-red-700'}`}>
                  {formatCurrency(Math.abs(data.net_vat))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Supporting Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
            Sales Summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Standard Rated Sales:</span>
              <span className="font-medium">{formatCurrency(data.sales_excl_vat)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">VAT on Sales (15%):</span>
              <span className="font-medium text-blue-600 dark:text-blue-400">{formatCurrency(data.output_vat)}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="font-semibold">Total Sales (incl VAT):</span>
              <span className="font-bold">{formatCurrency(data.sales_excl_vat + data.output_vat)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />
            Purchases Summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Standard Rated Purchases:</span>
              <span className="font-medium">{formatCurrency(data.purchases_excl_vat)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">VAT on Purchases (15%):</span>
              <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(data.input_vat)}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="font-semibold">Total Purchases (incl VAT):</span>
              <span className="font-bold">{formatCurrency(data.purchases_excl_vat + data.input_vat)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SARS eFiling Notice */}
      <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400 p-4 rounded">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-blue-400 mr-3 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
              Ready for SARS eFiling
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              This VAT201 return is ready to be submitted to SARS eFiling. 
              {isRefund 
                ? ` You are eligible for a VAT refund of ${formatCurrency(Math.abs(data.net_vat))}. SARS will process your refund within 21 working days.`
                : ` Payment of ${formatCurrency(data.net_vat)} is due by the 25th of the following month. Submit this return before the deadline to avoid penalties.`
              }
            </p>
            <button className="mt-3 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded text-sm hover:bg-blue-700">
              Submit to SARS eFiling
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VATSummaryReport;
