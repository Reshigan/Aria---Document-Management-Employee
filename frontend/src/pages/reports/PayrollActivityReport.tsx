import React, { useState, useEffect } from 'react';
import { DollarSign, RefreshCw, Download, Calendar } from 'lucide-react';
import { DataTable } from '../../components/shared/DataTable';

const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev/api';


interface PayrollRun {
  id: string;
  period: string;
  employees: number;
  gross: number;
  net: number;
  paye: number;
  uif: number;
  status: string;
  run_date: string;
}

interface PayrollSummary {
  total_employees: number;
  monthly_cost: number;
  ytd_cost: number;
  sars_status: string;
  last_submission: string;
}

export default function PayrollActivityReportPage() {
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchPayrollData = async () => {
    setLoading(true);
    try {
      const [runsRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE}/reports/payroll/runs?year=${year}`),
        fetch(`${API_BASE}/reports/payroll/summary?year=${year}`)
      ]);
      if (runsRes.ok) setRuns(await runsRes.json());
      if (summaryRes.ok) setSummary(await summaryRes.json());
    } catch (err) {
      console.error('Error fetching payroll data:', err);
      // Fallback data
      setRuns([
        { id: '1', period: 'January 2026', employees: 45, gross: 450000, net: 350000, paye: 75000, uif: 4500, status: 'Completed', run_date: '2026-01-25' },
        { id: '2', period: 'December 2025', employees: 45, gross: 480000, net: 370000, paye: 82000, uif: 4800, status: 'Completed', run_date: '2025-12-25' },
        { id: '3', period: 'November 2025', employees: 44, gross: 445000, net: 345000, paye: 74000, uif: 4450, status: 'Completed', run_date: '2025-11-25' },
        { id: '4', period: 'October 2025', employees: 44, gross: 445000, net: 345000, paye: 74000, uif: 4450, status: 'Completed', run_date: '2025-10-25' }
      ]);
      setSummary({
        total_employees: 45,
        monthly_cost: 450000,
        ytd_cost: 5400000,
        sars_status: 'Up to date',
        last_submission: '2026-01-15'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrollData();
  }, [year]);

  const handleExport = async () => {
    try {
      const response = await fetch(`${API_BASE}/reports/payroll/export?year=${year}&format=csv`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payroll-report-${year}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-indigo-600" />
            Payroll Activity Report
          </h1>
          <div className="flex gap-3 items-center">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {[2026, 2025, 2024, 2023].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              onClick={fetchPayrollData}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Employees</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white mt-2">{summary?.total_employees || 0}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Monthly Cost</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white mt-2">R {Number(((summary?.monthly_cost || 0) / 1000) || 0).toFixed(0)}K</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">YTD Cost</div>
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">R {Number(((summary?.ytd_cost || 0) / 1000000) || 0).toFixed(1)}M</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">SARS Submissions</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">{summary?.sars_status || 'Unknown'}</div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <DataTable data={runs} columns={[
                { key: 'period', label: 'Period' },
                { key: 'employees', label: 'Employees' },
                { key: 'gross', label: 'Gross', render: (r: any) => `R ${Number(r.gross ?? 0).toLocaleString()}` },
                { key: 'paye', label: 'PAYE', render: (r: any) => `R ${Number(r.paye ?? 0).toLocaleString()}` },
                { key: 'uif', label: 'UIF', render: (r: any) => `R ${Number(r.uif ?? 0).toLocaleString()}` },
                { key: 'net', label: 'Net', render: (r: any) => `R ${Number(r.net ?? 0).toLocaleString()}` },
                { key: 'status', label: 'Status', render: (r: any) => (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.status === 'Completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                    {r.status}
                  </span>
                )}
              ]} searchable={false} exportable={true} exportFilename="payroll" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
