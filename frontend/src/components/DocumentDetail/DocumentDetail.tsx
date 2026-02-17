import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../lib/api';
import { ArrowLeft, Edit, Trash2, Check, FileText, Truck, Package } from 'lucide-react';

export interface LineItem {
  id?: string;
  line_number: number;
  product_id?: string;
  description?: string;
  quantity: number | string;
  unit_price: number | string;
  discount_percent?: number | string;
  tax_rate?: number | string;
  line_total?: number | string;
  [key: string]: any;
}

export interface DocumentDetailConfig {
  title: string;
  apiPath: string;
  listPath: string;
  fields: {
    number: string;
    date: string;
    status: string;
    reference?: string;
    party?: string;
    partyLabel?: string;
    subtotal?: string;
    taxAmount?: string;
    totalAmount?: string;
    notes?: string;
  };
  lineItems: {
    arrayKey: string;
    columns: {
      key: string;
      label: string;
      format?: (value: any) => string;
    }[];
  };
  actions?: {
    canEdit?: boolean;
    canDelete?: boolean;
    customActions?: {
      label: string;
      icon: any;
      color: string;
      onClick: (doc: any, reload: () => void) => Promise<void>;
      condition?: (doc: any) => boolean;
    }[];
  };
}

interface DocumentDetailProps {
  config: DocumentDetailConfig;
}

export function DocumentDetail({ config }: DocumentDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDocument, setEditedDocument] = useState<any>(null);

  useEffect(() => {
    loadDocument();
  }, [id]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const response = await api.get(`${config.apiPath}/${id}`);
      setDocument(response.data);
      setError(null);
    } catch (err: any) {
      console.error(`Error loading ${config.title}:`, err);
      setError(err.response?.data?.detail || `Failed to load ${config.title}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete this ${config.title}?`)) {
      return;
    }

    try {
      await api.delete(`${config.apiPath}/${id}`);
      navigate(config.listPath);
    } catch (err: any) {
      console.error(`Error deleting ${config.title}:`, err);
      setError(err.response?.data?.detail || `Failed to delete ${config.title}`);
    }
  };

  const handleEdit = () => {
    setEditedDocument({ ...document });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedDocument(null);
  };

  const handleSaveEdit = async () => {
    try {
      const updateData: any = {};
      
      if (config.fields.date && editedDocument[config.fields.date] !== document[config.fields.date]) {
        updateData[config.fields.date] = editedDocument[config.fields.date];
      }
      if (config.fields.notes && editedDocument[config.fields.notes] !== document[config.fields.notes]) {
        updateData.notes = editedDocument[config.fields.notes];
      }
      
      await api.patch(`${config.apiPath}/${id}`, updateData);
      setIsEditing(false);
      setEditedDocument(null);
      await loadDocument();
    } catch (err: any) {
      console.error(`Error updating ${config.title}:`, err);
      alert(err.response?.data?.detail || `Failed to update ${config.title}`);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: '#6b7280',
      pending: '#f59e0b',
      approved: '#3b82f6',
      in_progress: '#8b5cf6',
      completed: '#10b981',
      posted: '#10b981',
      shipped: '#10b981',
      received: '#10b981',
      cancelled: '#ef4444',
      rejected: '#ef4444'
    };
    return colors[status?.toLowerCase()] || '#6b7280';
  };

  const formatCurrency = (value: any) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(num || 0);
  };

  const formatNumber = (value: any) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-ZA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3
    }).format(num || 0);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center p-12">
          <div className="text-lg text-gray-500 dark:text-gray-400">Loading {config.title}...</div>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="p-8">
        <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md text-red-800 dark:text-red-300 mb-4">
          {error || `${config.title} not found`}
        </div>
        <Link
          to={config.listPath}
          className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 no-underline"
        >
          <ArrowLeft size={16} />
          Back to List
        </Link>
      </div>
    );
  }

  const lines = document[config.lineItems.arrayKey] || [];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link
            to={config.listPath}
            className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 no-underline mb-2 text-sm"
          >
            <ArrowLeft size={16} />
            Back to {config.title}s
          </Link>
          <h1 className="text-3xl font-bold my-2 text-gray-900 dark:text-white">
            {document[config.fields.number]}
          </h1>
          <div className="flex items-center gap-4">
            <span
              className="inline-block px-3 py-1 rounded-full text-sm font-medium text-white"
              style={{ background: getStatusColor(document[config.fields.status]) }}
            >
              {document[config.fields.status]?.toUpperCase()}
            </span>
            {config.fields.date && (
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                {new Date(document[config.fields.date]).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          {config.actions?.customActions?.map((action, idx) => {
            if (action.condition && !action.condition(document)) return null;
            const Icon = action.icon;
            return (
              <button
                key={idx}
                onClick={() => action.onClick(document, loadDocument)}
                className="px-4 py-2 text-white border-none rounded-md text-sm font-medium cursor-pointer flex items-center gap-2"
                style={{ background: action.color }}
              >
                <Icon size={16} />
                {action.label}
              </button>
            );
          })}
          {config.actions?.canEdit && !isEditing && document.status === 'draft' && (
            <button
              onClick={handleEdit}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white border-none rounded-md text-sm font-medium cursor-pointer flex items-center gap-2"
            >
              <Edit size={16} />
              Edit
            </button>
          )}
          {isEditing && (
            <>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white border-none rounded-md text-sm font-medium cursor-pointer flex items-center gap-2"
              >
                <Check size={16} />
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white border-none rounded-md text-sm font-medium cursor-pointer flex items-center gap-2"
              >
                <ArrowLeft size={16} />
                Cancel
              </button>
            </>
          )}
          {config.actions?.canDelete && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white border-none rounded-md text-sm font-medium cursor-pointer flex items-center gap-2"
            >
              <Trash2 size={16} />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Document Details */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Details</h2>
        <div className="grid grid-cols-2 gap-4">
          {config.fields.party && document[config.fields.party] && (
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                {config.fields.partyLabel || 'Party'}
              </div>
              <div className="font-medium text-gray-900 dark:text-white">{document[config.fields.party]}</div>
            </div>
          )}
          {config.fields.reference && document[config.fields.reference] && (
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Reference</div>
              <div className="font-medium text-gray-900 dark:text-white">{document[config.fields.reference]}</div>
            </div>
          )}
          {config.fields.date && (
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Date</div>
              <div className="font-medium text-gray-900 dark:text-white">
                {new Date(document[config.fields.date]).toLocaleDateString()}
              </div>
            </div>
          )}
        </div>
        {config.fields.notes && (document[config.fields.notes] || isEditing) && (
          <div className="mt-4">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Notes</div>
            {isEditing ? (
              <textarea
                value={editedDocument[config.fields.notes] || ''}
                onChange={(e) => setEditedDocument({ ...editedDocument, [config.fields.notes]: e.target.value })}
                className="w-full min-h-[80px] p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md text-sm font-inherit"
              />
            ) : (
              <div className="text-gray-700 dark:text-gray-300">{document[config.fields.notes]}</div>
            )}
          </div>
        )}
      </div>

      {/* Line Items */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-8">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold m-0 text-gray-900 dark:text-white">Line Items</h2>
        </div>
        {lines.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No line items found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  {config.lineItems.columns.map((col) => (
                    <th
                      key={col.key}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((line: any, idx: number) => (
                  <tr key={line.id || idx} className="border-b border-gray-200 dark:border-gray-700">
                    {config.lineItems.columns.map((col) => (
                      <td
                        key={col.key}
                        className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300"
                      >
                        {col.format ? col.format(line[col.key]) : line[col.key] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Totals */}
      {(config.fields.subtotal || config.fields.taxAmount || config.fields.totalAmount) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 max-w-[400px] ml-auto">
          {config.fields.subtotal && (
            <div className="flex justify-between mb-2">
              <span className="text-gray-500 dark:text-gray-400">Subtotal:</span>
              <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(document[config.fields.subtotal])}</span>
            </div>
          )}
          {config.fields.taxAmount && (
            <div className="flex justify-between mb-2">
              <span className="text-gray-500 dark:text-gray-400">Tax:</span>
              <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(document[config.fields.taxAmount])}</span>
            </div>
          )}
          {config.fields.totalAmount && (
            <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
              <span className="font-semibold text-lg text-gray-900 dark:text-white">Total:</span>
              <span className="font-semibold text-lg text-gray-900 dark:text-white">
                {formatCurrency(document[config.fields.totalAmount])}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
