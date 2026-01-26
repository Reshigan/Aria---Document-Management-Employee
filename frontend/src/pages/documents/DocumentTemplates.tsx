import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Search } from 'lucide-react';

const DOCUMENT_CATEGORIES = [
  { name: 'Sales', testId: 'category-sales', count: 11, templates: ['Quote', 'Sales Order', 'Delivery Note', 'Tax Invoice', 'Credit Note', 'Debit Note', 'Statement'] },
  { name: 'Purchase', testId: 'category-purchase', count: 8, templates: ['Purchase Requisition', 'RFQ', 'Purchase Order', 'GRN'] },
  { name: 'Manufacturing', testId: 'category-manufacturing', count: 10, templates: ['BOM', 'Manufacturing Order', 'Work Order', 'Job Card'] },
  { name: 'Inventory', testId: 'category-inventory', count: 10, templates: ['Stock Transfer', 'Stock Adjustment', 'Stock Take Sheet'] },
  { name: 'HR/Payroll', testId: 'category-hr', count: 12, templates: ['Employment Contract', 'Payslip', 'IRP5', 'Leave Request'] },
  { name: 'Finance', testId: 'category-finance', count: 13, templates: ['Payment Voucher', 'Journal Entry', 'P&L', 'Balance Sheet'] },
  { name: 'Compliance (SA)', testId: 'category-compliance', count: 9, templates: ['VAT201', 'EMP201', 'BBBEE Certificate', 'Tax Clearance'] }
];

export default function DocumentTemplatesPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const navigate = useNavigate();

  const handleTemplateClick = (template: string) => {
    navigate('/documents/generate');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <FileText className="h-8 w-8" />
        Document Templates
      </h1>

      <div className="mb-6">
        <div className="flex-1 relative mb-4">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            name="search"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-4 py-2 rounded-lg ${selectedCategory === 'All' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            All Categories
          </button>
          {DOCUMENT_CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-4 py-2 rounded-lg ${selectedCategory === cat.name ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              data-testid={`filter-${cat.name.toLowerCase()}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {DOCUMENT_CATEGORIES.map((category) => (
          <div 
            key={category.name} 
            className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 ${selectedCategory === category.name ? 'ring-2 ring-blue-600 active' : ''}`}
            data-testid={category.testId}
          >
            <h3 className="text-lg font-bold mb-2">{category.name}</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{category.count} templates</p>
            <ul className="space-y-2">
              {category.templates.map((template) => (
                <li 
                  key={template} 
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  data-testid={template === 'Tax Invoice' ? 'template-tax-invoice' : undefined}
                  onClick={() => handleTemplateClick(template)}
                >
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
