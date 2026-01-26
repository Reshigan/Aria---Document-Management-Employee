import React from 'react';
import { DollarSign } from 'lucide-react';
import { DataTable } from '../../components/shared/DataTable';

export default function PayrollActivityReportPage() {
  const runs = [
    { period: 'October 2025', employees: 45, gross: 450000, net: 350000, status: 'Completed' },
    { period: 'September 2025', employees: 44, gross: 445000, net: 345000, status: 'Completed' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <DollarSign className="h-8 w-8" />
        Payroll Activity Report
      </h1>
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Employees</div>
          <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mt-2">45</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Monthly Cost</div>
          <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mt-2">R 450K</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">SARS Submissions</div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">Up to date</div>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
        <DataTable data={runs} columns={[
          { key: 'period', label: 'Period' },
          { key: 'employees', label: 'Employees' },
          { key: 'gross', label: 'Gross', render: (r: any) => `R ${r.gross.toLocaleString()}` },
          { key: 'net', label: 'Net', render: (r: any) => `R ${r.net.toLocaleString()}` },
          { key: 'status', label: 'Status' }
        ]} searchable={false} exportable={true} exportFilename="payroll" />
      </div>
    </div>
  );
}
