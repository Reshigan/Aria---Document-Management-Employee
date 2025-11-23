import React from 'react';
import { CheckSquare, X, Check } from 'lucide-react';
import { DataTable } from '../components/shared/DataTable';

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
      <div className="bg-white rounded-lg shadow" data-testid="actions-table">
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
                <button className="p-2 text-green-600 hover:bg-green-50 rounded" data-testid={`action-approve-${row.id}`}><Check className="h-4 w-4" /></button>
                <button className="p-2 text-red-600 hover:bg-red-50 rounded" data-testid={`action-reject-${row.id}`}><X className="h-4 w-4" /></button>
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
