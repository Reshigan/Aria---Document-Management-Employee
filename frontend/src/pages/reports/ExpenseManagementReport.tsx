import React from 'react';
import { Receipt } from 'lucide-react';

export default function ExpenseManagementReportPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <Receipt className="h-8 w-8" />
        Expense Management Report
      </h1>
      <div className="grid grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Claims', value: 156, color: 'blue' },
          { label: 'Approved', value: 142, color: 'green' },
          { label: 'Pending', value: 12, color: 'yellow' },
          { label: 'Rejected', value: 2, color: 'red' }
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">{stat.label}</div>
            <div className={`text-3xl font-bold text-${stat.color}-600 mt-2`}>{stat.value}</div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">Auto-Coding Accuracy: 90%</h3>
        <p className="text-gray-600">142 of 156 claims auto-coded successfully</p>
      </div>
    </div>
  );
}
