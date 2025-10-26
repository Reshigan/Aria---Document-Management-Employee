#!/bin/bash
# Generate all remaining frontend pages at warp speed

cd /workspace/project/Aria---Document-Management-Employee/frontend/src/pages

# Create BBBEE Report
cat > reports/BbbeeComplianceReport.tsx << 'EOF'
import React from 'react';
import { Award, TrendingUp } from 'lucide-react';

export default function BbbeeComplianceReportPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <Award className="h-8 w-8" />
        BBBEE Compliance Report
      </h1>
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Current Level</div>
          <div className="text-4xl font-bold text-green-600 mt-2">Level 4</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Score</div>
          <div className="text-4xl font-bold text-blue-600 mt-2">85.2</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Procurement Recognition</div>
          <div className="text-4xl font-bold text-purple-600 mt-2">100%</div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">Scorecard Elements</h3>
        {['Ownership', 'Management Control', 'Skills Development', 'Enterprise Development', 'Socio-Economic Development'].map((element) => (
          <div key={element} className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>{element}</span>
              <span>85%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '85%' }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
EOF

# Create Payroll Report
cat > reports/PayrollActivityReport.tsx << 'EOF'
import React from 'react';
import { DollarSign } from 'lucide-react';
import DataTable from '../../components/shared/DataTable';

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
EOF

# Create Expense Report
cat > reports/ExpenseManagementReport.tsx << 'EOF'
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
EOF

# Create Pending Actions
cat > PendingActions.tsx << 'EOF'
import React from 'react';
import { CheckSquare, X, Check } from 'lucide-react';
import DataTable from '../components/shared/DataTable';

export default function PendingActionsPage() {
  const actions = [
    { id: 1, type: 'Invoice Approval', description: 'Approve invoice #INV-1234 from Supplier A', amount: 15000, priority: 'high' },
    { id: 2, type: 'Expense Claim', description: 'Review expense claim from John Doe', amount: 850, priority: 'medium' },
    { id: 3, type: 'Leave Request', description: 'Approve leave request from Jane Smith', amount: null, priority: 'low' }
  ];

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <CheckSquare className="h-8 w-8" />
        My Pending Actions
      </h1>
      <div className="bg-white rounded-lg shadow">
        <DataTable
          data={actions}
          columns={[
            { key: 'type', label: 'Type' },
            { key: 'description', label: 'Description' },
            { key: 'amount', label: 'Amount', render: (row: any) => row.amount ? `R ${row.amount}` : '-' },
            { key: 'priority', label: 'Priority', render: (row: any) => {
              const colors = { high: 'text-red-600', medium: 'text-yellow-600', low: 'text-green-600' };
              return <span className={colors[row.priority as keyof typeof colors]}>{row.priority}</span>;
            }},
            { key: 'actions', label: 'Actions', render: (row: any) => (
              <div className="flex gap-2">
                <button className="p-2 text-green-600 hover:bg-green-50 rounded"><Check className="h-4 w-4" /></button>
                <button className="p-2 text-red-600 hover:bg-red-50 rounded"><X className="h-4 w-4" /></button>
              </div>
            )}
          ]}
          searchable={true}
          exportable={false}
        />
      </div>
    </div>
  );
}
EOF

echo "✅ Created 4 more pages (7/22 total)"
