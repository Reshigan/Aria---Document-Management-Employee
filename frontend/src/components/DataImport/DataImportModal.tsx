import React, { useState, useCallback } from 'react';
import { 
  X, Upload, FileSpreadsheet, AlertCircle, CheckCircle, 
  Download, Loader2, ChevronRight, ChevronDown, Eye
} from 'lucide-react';
import api from '../../services/api';

interface ImportField {
  name: string;
  label: string;
  required: boolean;
  type: 'string' | 'number' | 'date' | 'boolean' | 'email';
}

interface ImportConfig {
  entityType: string;
  entityLabel: string;
  fields: ImportField[];
  templateUrl?: string;
}

const importConfigs: Record<string, ImportConfig> = {
  customers: {
    entityType: 'customers',
    entityLabel: 'Customers',
    fields: [
      { name: 'customer_name', label: 'Customer Name', required: true, type: 'string' },
      { name: 'email', label: 'Email', required: false, type: 'email' },
      { name: 'phone', label: 'Phone', required: false, type: 'string' },
      { name: 'address', label: 'Address', required: false, type: 'string' },
      { name: 'city', label: 'City', required: false, type: 'string' },
      { name: 'country', label: 'Country', required: false, type: 'string' },
      { name: 'tax_number', label: 'Tax Number', required: false, type: 'string' },
      { name: 'credit_limit', label: 'Credit Limit', required: false, type: 'number' },
    ],
  },
  suppliers: {
    entityType: 'suppliers',
    entityLabel: 'Suppliers',
    fields: [
      { name: 'supplier_name', label: 'Supplier Name', required: true, type: 'string' },
      { name: 'email', label: 'Email', required: false, type: 'email' },
      { name: 'phone', label: 'Phone', required: false, type: 'string' },
      { name: 'address', label: 'Address', required: false, type: 'string' },
      { name: 'city', label: 'City', required: false, type: 'string' },
      { name: 'country', label: 'Country', required: false, type: 'string' },
      { name: 'tax_number', label: 'Tax Number', required: false, type: 'string' },
      { name: 'payment_terms', label: 'Payment Terms (days)', required: false, type: 'number' },
    ],
  },
  products: {
    entityType: 'products',
    entityLabel: 'Products',
    fields: [
      { name: 'product_code', label: 'Product Code/SKU', required: true, type: 'string' },
      { name: 'product_name', label: 'Product Name', required: true, type: 'string' },
      { name: 'description', label: 'Description', required: false, type: 'string' },
      { name: 'category', label: 'Category', required: false, type: 'string' },
      { name: 'unit_price', label: 'Unit Price', required: true, type: 'number' },
      { name: 'cost_price', label: 'Cost Price', required: false, type: 'number' },
      { name: 'quantity_on_hand', label: 'Quantity on Hand', required: false, type: 'number' },
      { name: 'reorder_level', label: 'Reorder Level', required: false, type: 'number' },
      { name: 'unit_of_measure', label: 'Unit of Measure', required: false, type: 'string' },
    ],
  },
  employees: {
    entityType: 'employees',
    entityLabel: 'Employees',
    fields: [
      { name: 'employee_number', label: 'Employee Number', required: true, type: 'string' },
      { name: 'first_name', label: 'First Name', required: true, type: 'string' },
      { name: 'last_name', label: 'Last Name', required: true, type: 'string' },
      { name: 'email', label: 'Email', required: true, type: 'email' },
      { name: 'phone', label: 'Phone', required: false, type: 'string' },
      { name: 'department', label: 'Department', required: false, type: 'string' },
      { name: 'position', label: 'Position', required: false, type: 'string' },
      { name: 'hire_date', label: 'Hire Date', required: false, type: 'date' },
      { name: 'salary', label: 'Salary', required: false, type: 'number' },
    ],
  },
};

interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: keyof typeof importConfigs;
  onImportComplete?: (count: number) => void;
}

interface ParsedRow {
  data: Record<string, any>;
  errors: string[];
  rowNumber: number;
}

export default function DataImportModal({ 
  isOpen, 
  onClose, 
  entityType,
  onImportComplete 
}: DataImportModalProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [headers, setHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  const config = importConfigs[entityType];

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.xlsx'))) {
      setFile(droppedFile);
      parseFile(droppedFile);
    }
  }, []);

  const parseFile = async (file: File) => {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      alert('File must have at least a header row and one data row');
      return;
    }

    const headerLine = lines[0];
    const fileHeaders = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    setHeaders(fileHeaders);

    // Auto-map columns based on name similarity
    const autoMapping: Record<string, string> = {};
    config.fields.forEach(field => {
      const matchingHeader = fileHeaders.find(h => 
        h.toLowerCase().replace(/[_\s]/g, '') === field.name.toLowerCase().replace(/[_\s]/g, '') ||
        h.toLowerCase().replace(/[_\s]/g, '') === field.label.toLowerCase().replace(/[_\s]/g, '')
      );
      if (matchingHeader) {
        autoMapping[field.name] = matchingHeader;
      }
    });
    setColumnMapping(autoMapping);

    // Parse data rows
    const dataRows: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const rowData: Record<string, any> = {};
      fileHeaders.forEach((header, index) => {
        rowData[header] = values[index] || '';
      });
      dataRows.push({
        data: rowData,
        errors: [],
        rowNumber: i + 1,
      });
    }
    setParsedData(dataRows);
    setStep('mapping');
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const validateData = (): ParsedRow[] => {
    return parsedData.map(row => {
      const errors: string[] = [];
      const mappedData: Record<string, any> = {};

      config.fields.forEach(field => {
        const sourceColumn = columnMapping[field.name];
        let value = sourceColumn ? row.data[sourceColumn] : '';

        // Type conversion and validation
        if (field.required && !value) {
          errors.push(`${field.label} is required`);
        }

        if (value) {
          switch (field.type) {
            case 'number':
              const num = parseFloat(value);
              if (isNaN(num)) {
                errors.push(`${field.label} must be a number`);
              } else {
                value = num;
              }
              break;
            case 'email':
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                errors.push(`${field.label} must be a valid email`);
              }
              break;
            case 'date':
              const date = new Date(value);
              if (isNaN(date.getTime())) {
                errors.push(`${field.label} must be a valid date`);
              } else {
                value = date.toISOString().split('T')[0];
              }
              break;
            case 'boolean':
              value = ['true', '1', 'yes', 'y'].includes(value.toLowerCase());
              break;
          }
        }

        mappedData[field.name] = value;
      });

      return { ...row, data: mappedData, errors };
    });
  };

  const handlePreview = () => {
    const validated = validateData();
    setParsedData(validated);
    setStep('preview');
  };

  const handleImport = async () => {
    setStep('importing');
    setImporting(true);

    const validRows = parsedData.filter(row => row.errors.length === 0);
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const row of validRows) {
      try {
        await api.post(`/${entityType}`, row.data);
        success++;
      } catch (error: any) {
        failed++;
        errors.push(`Row ${row.rowNumber}: ${error.message || 'Import failed'}`);
      }
    }

    // Count rows with validation errors
    const validationErrors = parsedData.filter(row => row.errors.length > 0);
    failed += validationErrors.length;
    validationErrors.forEach(row => {
      errors.push(`Row ${row.rowNumber}: ${row.errors.join(', ')}`);
    });

    setImportResult({ success, failed, errors });
    setImporting(false);
    setStep('complete');
    
    if (onImportComplete) {
      onImportComplete(success);
    }
  };

  const downloadTemplate = () => {
    const headers = config.fields.map(f => f.name).join(',');
    const exampleRow = config.fields.map(f => {
      switch (f.type) {
        case 'number': return '0';
        case 'date': return '2024-01-01';
        case 'boolean': return 'true';
        case 'email': return 'example@email.com';
        default: return `Example ${f.label}`;
      }
    }).join(',');
    
    const csv = `${headers}\n${exampleRow}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entityType}_import_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetModal = () => {
    setStep('upload');
    setFile(null);
    setParsedData([]);
    setColumnMapping({});
    setHeaders([]);
    setImportResult(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Import {config.entityLabel}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-300">
              Upload a CSV or Excel file to import data
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            {['upload', 'mapping', 'preview', 'complete'].map((s, i) => (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-2 ${
                  step === s ? 'text-blue-600 dark:text-blue-400' : 
                  ['upload', 'mapping', 'preview', 'complete'].indexOf(step) > i ? 'text-green-600 dark:text-green-400' : 
                  'text-gray-300'
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    step === s ? 'bg-blue-100 dark:bg-blue-900/30' :
                    ['upload', 'mapping', 'preview', 'complete'].indexOf(step) > i ? 'bg-green-100 dark:bg-green-900/30' :
                    'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    {['upload', 'mapping', 'preview', 'complete'].indexOf(step) > i ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span className="text-sm font-medium capitalize">{s}</span>
                </div>
                {i < 3 && <ChevronRight className="h-4 w-4 text-gray-300" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
              >
                <Upload className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Drop your file here, or browse
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">
                  Supports CSV and Excel files
                </p>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Select File
                </label>
              </div>

              {/* Download Template */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Need a template?</p>
                  <p className="text-sm text-gray-500 dark:text-gray-300">
                    Download our CSV template with all required fields
                  </p>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                >
                  <Download className="h-4 w-4" />
                  Download Template
                </button>
              </div>

              {/* Required Fields */}
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Required Fields</h3>
                <div className="flex flex-wrap gap-2">
                  {config.fields.filter(f => f.required).map(field => (
                    <span key={field.name} className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-sm">
                      {field.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'mapping' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <FileSpreadsheet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">{file?.name}</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">{parsedData.length} rows found</p>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-4">Map Columns</h3>
                <div className="space-y-3">
                  {config.fields.map(field => (
                    <div key={field.name} className="flex items-center gap-4">
                      <div className="w-1/3">
                        <span className={`text-sm ${field.required ? 'font-medium' : ''} text-gray-700 dark:text-gray-300`}>
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                      <select
                        value={columnMapping[field.name] || ''}
                        onChange={(e) => setColumnMapping({ ...columnMapping, [field.name]: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">-- Select column --</option>
                        {headers.map(header => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex gap-4">
                <div className="flex-1 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                    {parsedData.filter(r => r.errors.length === 0).length}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-500">Valid rows</p>
                </div>
                <div className="flex-1 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                    {parsedData.filter(r => r.errors.length > 0).length}
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-500">Rows with errors</p>
                </div>
              </div>

              {/* Error Details */}
              {parsedData.some(r => r.errors.length > 0) && (
                <div className="border border-red-200 dark:border-red-800 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setShowErrors(!showErrors)}
                    className="w-full px-4 py-3 bg-red-50 dark:bg-red-900/20 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      <span className="font-medium text-red-700 dark:text-red-300">
                        {parsedData.filter(r => r.errors.length > 0).length} rows have validation errors
                      </span>
                    </div>
                    {showErrors ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </button>
                  {showErrors && (
                    <div className="p-4 max-h-48 overflow-y-auto">
                      {parsedData.filter(r => r.errors.length > 0).map(row => (
                        <div key={row.rowNumber} className="text-sm mb-2">
                          <span className="font-medium text-gray-700 dark:text-gray-300">Row {row.rowNumber}:</span>
                          <span className="text-red-600 dark:text-red-400 ml-2">{row.errors.join(', ')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Preview Table */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Row</th>
                        {config.fields.slice(0, 5).map(field => (
                          <th key={field.name} className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">
                            {field.label}
                          </th>
                        ))}
                        <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {parsedData.slice(0, 10).map(row => (
                        <tr key={row.rowNumber} className={row.errors.length > 0 ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                          <td className="px-4 py-3 text-gray-500">{row.rowNumber}</td>
                          {config.fields.slice(0, 5).map(field => (
                            <td key={field.name} className="px-4 py-3 text-gray-900 dark:text-white">
                              {String(row.data[field.name] || '-')}
                            </td>
                          ))}
                          <td className="px-4 py-3">
                            {row.errors.length > 0 ? (
                              <span className="text-red-600 dark:text-red-400">Error</span>
                            ) : (
                              <span className="text-green-600 dark:text-green-400">Valid</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedData.length > 10 && (
                  <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-500">
                    Showing 10 of {parsedData.length} rows
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="py-12 text-center">
              <Loader2 className="h-12 w-12 mx-auto text-blue-600 animate-spin mb-4" />
              <p className="text-lg font-medium text-gray-900 dark:text-white">Importing data...</p>
              <p className="text-sm text-gray-500 dark:text-gray-300">Please wait while we process your file</p>
            </div>
          )}

          {step === 'complete' && importResult && (
            <div className="py-8 text-center">
              {importResult.success > 0 ? (
                <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
              ) : (
                <AlertCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
              )}
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Import Complete
              </h3>
              <div className="flex justify-center gap-8 mb-6">
                <div>
                  <p className="text-3xl font-bold text-green-600">{importResult.success}</p>
                  <p className="text-sm text-gray-500">Imported</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-red-600">{importResult.failed}</p>
                  <p className="text-sm text-gray-500">Failed</p>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="text-left max-h-48 overflow-y-auto bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-4">
                  <p className="font-medium text-red-700 dark:text-red-300 mb-2">Errors:</p>
                  {importResult.errors.slice(0, 10).map((error, i) => (
                    <p key={i} className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  ))}
                  {importResult.errors.length > 10 && (
                    <p className="text-sm text-red-500 mt-2">...and {importResult.errors.length - 10} more</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <button
            onClick={step === 'complete' ? resetModal : onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            {step === 'complete' ? 'Import More' : 'Cancel'}
          </button>
          <div className="flex gap-3">
            {step === 'mapping' && (
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Back
              </button>
            )}
            {step === 'preview' && (
              <button
                onClick={() => setStep('mapping')}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Back
              </button>
            )}
            {step === 'mapping' && (
              <button
                onClick={handlePreview}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Preview Import
              </button>
            )}
            {step === 'preview' && (
              <button
                onClick={handleImport}
                disabled={parsedData.filter(r => r.errors.length === 0).length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import {parsedData.filter(r => r.errors.length === 0).length} Records
              </button>
            )}
            {step === 'complete' && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
