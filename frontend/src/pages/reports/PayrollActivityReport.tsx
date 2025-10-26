import React from 'react';
import { DollarSign } from 'lucide-react';
import { DataTable } from '../../components/shared/DataTable';

export default function PayrollActivityReportPage() {
  const runs = [
    { period: 'October 2025', employees: 45, gross: 450000, net: 350000, status: 'Completed' },
    { period: 'September 2025', employees: 44, gross: 445000, net: 345000, status: 'Completed' }
  ];

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <DollarSign className="h-8 w-8" />
        Payroll Activity Report
      </h1>
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Total Employees</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">45</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Monthly Cost</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">R 450K</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">SARS Submissions</div>
          <div className="text-3xl font-bold text-green-600 mt-2">Up to date</div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow">
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
