import React, { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Loader, Send, Save, Download } from 'lucide-react';

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_rate: number;
  total: number;
}

interface ProcessedDocument {
  file_id: string;
  file_path: string;
  doc_type: string;
  classification_confidence: number;
  sap_posting?: {
    module: string;
    tcode: string;
    description: string;
    rationale: string;
    confidence: number;
  };
  header: {
    supplier_name: string;
    invoice_number: string;
    invoice_date: string;
    due_date: string;
    total_amount: number;
    vat_amount: number;
    net_amount: number;
  };
  lines: LineItem[];
  field_confidence: Record<string, number>;
  warnings: Array<{
    type: string;
    message: string;
    severity: string;
  }>;
}

export default function DocumentUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [processedDoc, setProcessedDoc] = useState<ProcessedDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [companyId, setCompanyId] = useState(1);
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [instruction, setInstruction] = useState('');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await processFile(files[0]);
    }
  }, [companyId, vendorId, instruction]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  }, [companyId, vendorId, instruction]);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    setProcessedDoc(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('company_id', companyId.toString());
      if (vendorId) formData.append('vendor_id', vendorId.toString());
      if (instruction) formData.append('instruction', instruction);

      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const response = await fetch(`${API_BASE}/api/documents/process`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to process document');
      }

      const data = await response.json();
      setProcessedDoc(data);
    } catch (err: any) {
      setError(err.message || 'Failed to process document');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePostToERP = async () => {
    if (!processedDoc) return;

    setIsPosting(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file_id', processedDoc.file_id);
      formData.append('file_path', processedDoc.file_path);
      formData.append('company_id', companyId.toString());
      formData.append('vendor_id', vendorId?.toString() || '');
      formData.append('doc_type', processedDoc.doc_type);
      formData.append('invoice_number', processedDoc.header.invoice_number);
      formData.append('invoice_date', processedDoc.header.invoice_date);
      formData.append('due_date', processedDoc.header.due_date);
      formData.append('total_amount', processedDoc.header.total_amount.toString());
      formData.append('vat_amount', processedDoc.header.vat_amount.toString());
      formData.append('lines', JSON.stringify(processedDoc.lines));

      const API_BASE_POST = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const response = await fetch(`${API_BASE_POST}/api/documents/post`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to post document');
      }

      const data = await response.json();
      setSuccess(`Bill ${data.bill_number} created successfully!`);
      setProcessedDoc(null);
    } catch (err: any) {
      setError(err.message || 'Failed to post document');
    } finally {
      setIsPosting(false);
    }
  };

  const handleHeaderChange = (field: string, value: any) => {
    if (!processedDoc) return;
    setProcessedDoc({
      ...processedDoc,
      header: {
        ...processedDoc.header,
        [field]: value
      }
    });
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    if (!processedDoc) return;
    const newLines = [...processedDoc.lines];
    newLines[index] = {
      ...newLines[index],
      [field]: parseFloat(value) || 0
    };
    
    if (field === 'quantity' || field === 'unit_price' || field === 'discount_percent') {
      const line = newLines[index];
      const subtotal = line.quantity * line.unit_price;
      const discount = subtotal * (line.discount_percent / 100);
      line.total = subtotal - discount;
    }
    
    setProcessedDoc({
      ...processedDoc,
      lines: newLines
    });
  };

  const handleExportToExcel = async () => {
    if (!processedDoc) return;

    try {
      const formData = new FormData();
      formData.append('doc_type', processedDoc.doc_type);
      formData.append('header', JSON.stringify(processedDoc.header));
      formData.append('lines', JSON.stringify(processedDoc.lines));
      if (processedDoc.sap_posting) {
        formData.append('sap_posting', JSON.stringify(processedDoc.sap_posting));
      }

      const API_BASE_EXPORT = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const response = await fetch(`${API_BASE_EXPORT}/api/documents/export-excel`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to export to Excel');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ARIA_SAP_Export_${processedDoc.doc_type}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setSuccess('Excel file downloaded successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to export to Excel');
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-100 text-green-800';
    if (confidence >= 0.7) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Ask Aria
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Upload documents for automatic processing and posting to ERP</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 dark:text-red-300 font-medium">Error</p>
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-green-800 dark:text-green-300 font-medium">Success</p>
              <p className="text-green-600 dark:text-green-400 text-sm">{success}</p>
            </div>
          </div>
        )}

        {!processedDoc && (
          <div className="bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-8">
            <div className="mb-6 grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Company ID
                </label>
                <input
                  type="number"
                  value={companyId}
                  onChange={(e) => setCompanyId(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Vendor ID (Optional)
                </label>
                <input
                  type="number"
                  value={vendorId || ''}
                  onChange={(e) => setVendorId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                  placeholder="Leave empty to detect"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Instruction (Optional)
                </label>
                <input
                  type="text"
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                  placeholder="e.g., Post to vendor ABC"
                />
              </div>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-xl p-12 text-center transition-all
                ${isDragging 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
                }
              `}
            >
              {isProcessing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin" />
                  <p className="text-gray-600 dark:text-gray-400">Processing document...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Drop your document here
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    or click to browse (PDF, JPG, PNG - max 10MB)
                  </p>
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-block px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium cursor-pointer "
                  >
                    Choose File
                  </label>
                </>
              )}
            </div>
          </div>
        )}

        {processedDoc && (
          <div className="space-y-3">
            <div className="bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-4">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                    {processedDoc.doc_type.charAt(0).toUpperCase() + processedDoc.doc_type.slice(1)} Detected
                  </h2>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(processedDoc.classification_confidence)}`}>
                  {(processedDoc.classification_confidence * 100).toFixed(0)}% confidence
                </span>
              </div>

              {processedDoc.warnings.length > 0 && (
                <div className="mb-6 space-y-2">
                  {processedDoc.warnings.map((warning, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg flex items-start gap-2 ${
                        warning.severity === 'error' ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'
                      }`}
                    >
                      <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        warning.severity === 'error' ? 'text-red-600' : 'text-yellow-600'
                      }`} />
                      <p className={`text-sm ${
                        warning.severity === 'error' ? 'text-red-800' : 'text-yellow-800'
                      }`}>
                        {warning.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Supplier Name
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded ${getConfidenceColor(processedDoc.field_confidence.supplier_name || 0)}`}>
                      {((processedDoc.field_confidence.supplier_name || 0) * 100).toFixed(0)}%
                    </span>
                  </label>
                  <input
                    type="text"
                    value={processedDoc.header.supplier_name}
                    onChange={(e) => handleHeaderChange('supplier_name', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Invoice Number
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded ${getConfidenceColor(processedDoc.field_confidence.invoice_number || 0)}`}>
                      {((processedDoc.field_confidence.invoice_number || 0) * 100).toFixed(0)}%
                    </span>
                  </label>
                  <input
                    type="text"
                    value={processedDoc.header.invoice_number}
                    onChange={(e) => handleHeaderChange('invoice_number', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Invoice Date</label>
                  <input
                    type="date"
                    value={processedDoc.header.invoice_date}
                    onChange={(e) => handleHeaderChange('invoice_date', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={processedDoc.header.due_date}
                    onChange={(e) => handleHeaderChange('due_date', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Net Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={processedDoc.header.net_amount}
                    onChange={(e) => handleHeaderChange('net_amount', parseFloat(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">VAT Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={processedDoc.header.vat_amount}
                    onChange={(e) => handleHeaderChange('vat_amount', parseFloat(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Line Items</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Description</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Qty</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Unit Price</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Discount %</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Tax %</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processedDoc.lines.map((line, idx) => (
                        <tr key={idx} className="border-t border-gray-200 dark:border-gray-700">
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={line.description}
                              onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={line.quantity}
                              onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                              className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              step="0.01"
                              value={line.unit_price}
                              onChange={(e) => handleLineChange(idx, 'unit_price', e.target.value)}
                              className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              step="0.01"
                              value={line.discount_percent}
                              onChange={(e) => handleLineChange(idx, 'discount_percent', e.target.value)}
                              className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              step="0.01"
                              value={line.tax_rate}
                              onChange={(e) => handleLineChange(idx, 'tax_rate', e.target.value)}
                              className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded"
                            />
                          </td>
                          <td className="px-4 py-2 font-medium">
                            R {Number(line.total ?? 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handlePostToERP}
                  disabled={isPosting || !vendorId}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium  disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isPosting ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Post to ERP
                    </>
                  )}
                </button>
                <button
                  onClick={() => setProcessedDoc(null)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
