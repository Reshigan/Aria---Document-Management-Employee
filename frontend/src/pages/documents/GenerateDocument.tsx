import React, { useState } from 'react';
import { FileText, Download, Mail, MessageSquare } from 'lucide-react';

export default function GenerateDocumentPage() {
  const [docType, setDocType] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [lineItems, setLineItems] = useState([{ description: '', quantity: 1, unitPrice: 0 }]);
  const [showPreview, setShowPreview] = useState(false);

  const handleDownload = () => {
    const blob = new Blob(['PDF content'], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docType || 'document'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  const handleCustomerSelect = (name: string) => {
    setCustomerName(name);
    setCustomerSearch('');
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <FileText className="h-8 w-8" />
        Generate Document
      </h1>

      <div className="bg-white rounded-lg shadow p-6 space-y-6" data-testid="invoice-form">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Document Type *
          </label>
          <select
            name="document_type"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer/Supplier *</label>
              <input 
                type="text" 
                name="customer_search"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md" 
                placeholder="Start typing to search..." 
              />
              {customerSearch && (
                <div className="mt-2 space-y-1 border border-gray-200 rounded-md p-2">
                  <div 
                    className="p-2 hover:bg-gray-50 cursor-pointer rounded" 
                    data-testid="customer-abc-manufacturing"
                    onClick={() => handleCustomerSelect('ABC Manufacturing Ltd.')}
                  >
                    ABC Manufacturing Ltd.
                  </div>
                </div>
              )}
              <input 
                type="text" 
                name="customer_name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md mt-2" 
                placeholder="Or enter customer name directly..."
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Document Number</label>
                <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-md" defaultValue="AUTO" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                <input type="date" className="w-full px-4 py-2 border border-gray-300 rounded-md" defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Line Items</label>
              <div className="border border-gray-300 rounded-md p-4 space-y-3">
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
                  className="text-blue-600 hover:underline text-sm" 
                  data-testid="button-add-line-item"
                  onClick={() => setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0 }])}
                >
                  + Add Line Item
                </button>
                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium" data-testid="subtotal">
                      R {lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">VAT (15%):</span>
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
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50" 
                data-testid="button-preview"
                onClick={() => setShowPreview(true)}
              >
                <FileText className="h-4 w-4 inline mr-2" />
                Preview
              </button>
              <button 
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" 
                data-testid="button-download"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 inline mr-2" />
                Generate & Download
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Mail className="h-4 w-4 inline mr-2" />
                Send Email
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
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
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Document Preview</h2>
              <div className="border rounded p-8 bg-gray-50 min-h-[500px]" data-testid="pdf-preview">
                <div className="text-center text-gray-500">PDF Preview would render here</div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
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
