import React, { useState } from 'react';
import { FileText, Search } from 'lucide-react';

const DOCUMENT_CATEGORIES = [
  { name: 'Sales', count: 11, templates: ['Quote', 'Sales Order', 'Delivery Note', 'Tax Invoice', 'Credit Note', 'Debit Note', 'Statement'] },
  { name: 'Purchase', count: 8, templates: ['Purchase Requisition', 'RFQ', 'Purchase Order', 'GRN'] },
  { name: 'Manufacturing', count: 10, templates: ['BOM', 'Manufacturing Order', 'Work Order', 'Job Card'] },
  { name: 'Inventory', count: 10, templates: ['Stock Transfer', 'Stock Adjustment', 'Stock Take Sheet'] },
  { name: 'HR/Payroll', count: 12, templates: ['Employment Contract', 'Payslip', 'IRP5', 'Leave Request'] },
  { name: 'Finance', count: 13, templates: ['Payment Voucher', 'Journal Entry', 'P&L', 'Balance Sheet'] },
  { name: 'Compliance (SA)', count: 9, templates: ['VAT201', 'EMP201', 'BBBEE Certificate', 'Tax Clearance'] }
];

export default function DocumentTemplatesPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <FileText className="h-8 w-8" />
        Document Templates
      </h1>

      <div className="mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option>All Categories</option>
          {DOCUMENT_CATEGORIES.map((cat) => (
            <option key={cat.name}>{cat.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {DOCUMENT_CATEGORIES.map((category) => (
          <div key={category.name} className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-2">{category.name}</h3>
            <p className="text-gray-600 text-sm mb-4">{category.count} templates</p>
            <ul className="space-y-2">
              {category.templates.map((template) => (
                <li key={template} className="text-sm text-blue-600 hover:underline cursor-pointer">
                  {template}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
