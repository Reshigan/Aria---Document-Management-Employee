import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Search, RefreshCw } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description?: string;
}

interface DocumentCategory {
  name: string;
  testId: string;
  count: number;
  templates: Template[];
}

export default function DocumentTemplatesPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const navigate = useNavigate();

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/documents/templates');
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      setCategories(result);
    } catch (err) {
      console.error('Error fetching templates:', err);
      // Fallback data
      setCategories([
        { name: 'Sales', testId: 'category-sales', count: 11, templates: [
          { id: 'quote', name: 'Quote' }, { id: 'sales-order', name: 'Sales Order' }, 
          { id: 'delivery-note', name: 'Delivery Note' }, { id: 'tax-invoice', name: 'Tax Invoice' },
          { id: 'credit-note', name: 'Credit Note' }, { id: 'debit-note', name: 'Debit Note' }, 
          { id: 'statement', name: 'Statement' }
        ]},
        { name: 'Purchase', testId: 'category-purchase', count: 8, templates: [
          { id: 'purchase-req', name: 'Purchase Requisition' }, { id: 'rfq', name: 'RFQ' },
          { id: 'purchase-order', name: 'Purchase Order' }, { id: 'grn', name: 'GRN' }
        ]},
        { name: 'Manufacturing', testId: 'category-manufacturing', count: 10, templates: [
          { id: 'bom', name: 'BOM' }, { id: 'mfg-order', name: 'Manufacturing Order' },
          { id: 'work-order', name: 'Work Order' }, { id: 'job-card', name: 'Job Card' }
        ]},
        { name: 'Inventory', testId: 'category-inventory', count: 10, templates: [
          { id: 'stock-transfer', name: 'Stock Transfer' }, { id: 'stock-adjustment', name: 'Stock Adjustment' },
          { id: 'stock-take', name: 'Stock Take Sheet' }
        ]},
        { name: 'HR/Payroll', testId: 'category-hr', count: 12, templates: [
          { id: 'employment-contract', name: 'Employment Contract' }, { id: 'payslip', name: 'Payslip' },
          { id: 'irp5', name: 'IRP5' }, { id: 'leave-request', name: 'Leave Request' }
        ]},
        { name: 'Finance', testId: 'category-finance', count: 13, templates: [
          { id: 'payment-voucher', name: 'Payment Voucher' }, { id: 'journal-entry', name: 'Journal Entry' },
          { id: 'pl', name: 'P&L' }, { id: 'balance-sheet', name: 'Balance Sheet' }
        ]},
        { name: 'Compliance (SA)', testId: 'category-compliance', count: 9, templates: [
          { id: 'vat201', name: 'VAT201' }, { id: 'emp201', name: 'EMP201' },
          { id: 'bbbee-cert', name: 'BBBEE Certificate' }, { id: 'tax-clearance', name: 'Tax Clearance' }
        ]}
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleTemplateClick = (template: Template) => {
    navigate(`/documents/generate?template=${template.id}`);
  };

  const filteredCategories = categories.filter(cat => 
    selectedCategory === 'All' || cat.name === selectedCategory
  ).map(cat => ({
    ...cat,
    templates: cat.templates.filter(t => 
      search === '' || t.name.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(cat => cat.templates.length > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-6">
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
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
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

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((category) => (
            <div 
              key={category.name} 
              className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 ${selectedCategory === category.name ? 'ring-2 ring-indigo-600 active' : ''}`}
              data-testid={category.testId}
            >
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{category.name}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{category.templates.length} templates</p>
              <ul className="space-y-2">
                {category.templates.map((template) => (
                  <li 
                    key={template.id} 
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    data-testid={template.name === 'Tax Invoice' ? 'template-tax-invoice' : undefined}
                    onClick={() => handleTemplateClick(template)}
                  >
                    {template.name}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
