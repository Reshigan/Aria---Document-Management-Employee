import React, { useState } from 'react';
import { FileText, Download, Mail, MessageSquare } from 'lucide-react';

export default function GenerateDocumentPage() {
  const [docType, setDocType] = useState('');
  const [formData, setFormData] = useState({});

  const documentTypes = {
    'Sales': ['Quote', 'Sales Order', 'Tax Invoice', 'Delivery Note'],
    'Purchase': ['Purchase Order', 'RFQ', 'GRN'],
    'Finance': ['Payment Voucher', 'Journal Entry']
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <FileText className="h-8 w-8" />
        Generate Document
      </h1>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Document Type *
          </label>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Select document type...</option>
            {Object.entries(documentTypes).map(([category, types]) => (
              <optgroup key={category} label={category}>
                {types.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {docType && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer/Supplier *</label>
              <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-md" placeholder="Start typing to search..." />
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
              <div className="border border-gray-300 rounded-md p-4">
                <button className="text-blue-600 hover:underline text-sm">+ Add Line Item</button>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <button className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <FileText className="h-4 w-4 inline mr-2" />
                Preview
              </button>
              <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
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
    </div>
  );
}
