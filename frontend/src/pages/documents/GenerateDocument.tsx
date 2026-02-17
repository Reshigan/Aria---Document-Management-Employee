import React, { useState, useEffect } from 'react';
import { FileText, Download, Mail, MessageSquare, Loader2, CheckCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev/api';


interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export default function GenerateDocumentPage() {
  const [docType, setDocType] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [lineItems, setLineItems] = useState([{ description: '', quantity: 1, unitPrice: 0 }]);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (customerSearch.length >= 2) {
      searchCustomers(customerSearch);
    }
  }, [customerSearch]);

  const searchCustomers = async (query: string) => {
    try {
      const token = localStorage.getItem('token');
      const companyId = localStorage.getItem('selectedCompanyId');
      const response = await fetch(`${API_BASE}/customers?search=${encodeURIComponent(query)}&company_id=${companyId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || data || []);
      }
    } catch (error) {
      console.error('Error searching customers:', error);
    }
  };

  const handleGenerateDocument = async () => {
    if (!docType || !customerName) {
      alert('Please select document type and customer');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const companyId = localStorage.getItem('selectedCompanyId');
      
      const response = await fetch(`${API_BASE}/documents/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          company_id: companyId,
          document_type: docType,
          customer_name: customerName,
          customer_id: selectedCustomer?.id,
          document_date: documentDate,
          line_items: lineItems.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unitPrice
          })),
          vat_rate: 15
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${docType}-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to generate document');
      }
    } catch (error) {
      console.error('Error generating document:', error);
      alert('Failed to generate document');
    } finally {
      setLoading(false);
    }
  };

  const documentTypes = [
    { value: 'quote', label: 'Quote' },
    { value: 'sales_order', label: 'Sales Order' },
    { value: 'tax_invoice', label: 'Tax Invoice' },
    { value: 'delivery_note', label: 'Delivery Note' },
    { value: 'purchase_order', label: 'Purchase Order' },
    { value: 'rfq', label: 'RFQ' },
    { value: 'grn', label: 'GRN' },
    { value: 'payment_voucher', label: 'Payment Voucher' },
    { value: 'journal_entry', label: 'Journal Entry' }
  ];

  const handleLineItemChange = (index: number, field: string, value: string | number) => {
    const newLineItems = [...lineItems];
    newLineItems[index] = { ...newLineItems[index], [field]: value };
    setLineItems(newLineItems);
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerName(customer.name);
    setCustomerSearch('');
    setCustomers([]);
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-3">
        <FileText className="h-8 w-8" />
        Generate Document
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 space-y-3" data-testid="invoice-form">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Document Type *
          </label>
          <select
            name="document_type"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
          >
            <option value="">Select document type...</option>
            {documentTypes.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        {docType && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Customer/Supplier *</label>
              <input 
                type="text" 
                name="customer_search"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md" 
                placeholder="Start typing to search..." 
              />
              {customers.length > 0 && (
                <div className="mt-2 space-y-1 border border-gray-200 dark:border-gray-700 rounded-md p-2 max-h-48 overflow-y-auto">
                  {customers.map((customer) => (
                    <div 
                      key={customer.id}
                      className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 cursor-pointer rounded" 
                      onClick={() => handleCustomerSelect(customer)}
                    >
                      {customer.name}
                      {customer.email && <span className="text-xs text-gray-500 ml-2">({customer.email})</span>}
                    </div>
                  ))}
                </div>
              )}
              <input 
                type="text" 
                name="customer_name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md mt-2" 
                placeholder="Or enter customer name directly..."
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Document Number</label>
                <input type="text" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md" defaultValue="AUTO" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date *</label>
                <input type="date" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md" defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Line Items</label>
              <div className="border border-gray-300 dark:border-gray-600 rounded-md p-4 space-y-3">
                {lineItems.map((item, index) => (
                  <div key={index} className="flex gap-3 items-center">
                    <input 
                      type="text" 
                      name={`description_${index}`}
                      placeholder="Description" 
                      className="flex-1 px-3 py-2 border rounded" 
                      value={item.description}
                      onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                    />
                    <input 
                      type="number" 
                      name={`quantity_${index}`}
                      placeholder="Qty" 
                      className="w-20 px-3 py-2 border rounded" 
                      value={item.quantity}
                      onChange={(e) => handleLineItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                    <input 
                      type="number" 
                      name={`unit_price_${index}`}
                      placeholder="Price" 
                      className="w-28 px-3 py-2 border rounded" 
                      value={item.unitPrice}
                      onChange={(e) => handleLineItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    />
                    <div className="w-28 text-right font-medium" data-testid={`line-total-${index}`}>
                      R {(item.quantity * item.unitPrice).toFixed(2)}
                    </div>
                  </div>
                ))}
                <button 
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm" 
                  data-testid="button-add-line-item"
                  onClick={() => setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0 }])}
                >
                  + Add Line Item
                </button>
                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                    <span className="font-medium" data-testid="subtotal">
                      R {lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">VAT (15%):</span>
                    <span className="font-medium" data-testid="vat">
                      R {(lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) * 0.15).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span data-testid="total">
                      R {(lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) * 1.15).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <button 
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900" 
                data-testid="button-preview"
                onClick={() => setShowPreview(true)}
              >
                <FileText className="h-4 w-4 inline mr-2" />
                Preview
              </button>
              <button 
                className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2" 
                data-testid="button-download"
                onClick={handleGenerateDocument}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {loading ? 'Generating...' : success ? 'Downloaded!' : 'Generate & Download'}
              </button>
              <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                <Mail className="h-4 w-4 inline mr-2" />
                Send Email
              </button>
              <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                <MessageSquare className="h-4 w-4 inline mr-2" />
                WhatsApp
              </button>
            </div>
          </>
        )}
      </div>

      {/* PDF Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4">
              <h2 className="text-2xl font-bold mb-4">Document Preview</h2>
              <div className="border rounded p-8 bg-gray-50 dark:bg-gray-900 min-h-[500px]" data-testid="pdf-preview">
                <div className="text-center text-gray-500 dark:text-gray-400">PDF Preview would render here</div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
