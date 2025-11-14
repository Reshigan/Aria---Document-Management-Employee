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
      <div style={{ padding: '2rem' }}>
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '1.125rem', color: '#6b7280' }}>Loading {config.title}...</div>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{
          padding: '1rem',
          background: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '0.375rem',
          color: '#991b1b',
          marginBottom: '1rem'
        }}>
          {error || `${config.title} not found`}
        </div>
        <Link
          to={config.listPath}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#2563eb',
            textDecoration: 'none'
          }}
        >
          <ArrowLeft size={16} />
          Back to List
        </Link>
      </div>
    );
  }

  const lines = document[config.lineItems.arrayKey] || [];

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Link
            to={config.listPath}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#6b7280',
              textDecoration: 'none',
              marginBottom: '0.5rem',
              fontSize: '0.875rem'
            }}
          >
            <ArrowLeft size={16} />
            Back to {config.title}s
          </Link>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0.5rem 0' }}>
            {document[config.fields.number]}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'white',
                background: getStatusColor(document[config.fields.status])
              }}
            >
              {document[config.fields.status]?.toUpperCase()}
            </span>
            {config.fields.date && (
              <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                {new Date(document[config.fields.date]).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {config.actions?.customActions?.map((action, idx) => {
            if (action.condition && !action.condition(document)) return null;
            const Icon = action.icon;
            return (
              <button
                key={idx}
                onClick={() => action.onClick(document, loadDocument)}
                style={{
                  padding: '0.5rem 1rem',
                  background: action.color,
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Icon size={16} />
                {action.label}
              </button>
            );
          })}
          {config.actions?.canEdit && (
            <button
              onClick={() => navigate(`${config.listPath}?edit=${id}`)}
              style={{
                padding: '0.5rem 1rem',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Edit size={16} />
              Edit
            </button>
          )}
          {config.actions?.canDelete && (
            <button
              onClick={handleDelete}
              style={{
                padding: '0.5rem 1rem',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Trash2 size={16} />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Document Details */}
      <div style={{
        background: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Details</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          {config.fields.party && document[config.fields.party] && (
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                {config.fields.partyLabel || 'Party'}
              </div>
              <div style={{ fontWeight: '500' }}>{document[config.fields.party]}</div>
            </div>
          )}
          {config.fields.reference && document[config.fields.reference] && (
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Reference</div>
              <div style={{ fontWeight: '500' }}>{document[config.fields.reference]}</div>
            </div>
          )}
          {config.fields.date && (
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Date</div>
              <div style={{ fontWeight: '500' }}>
                {new Date(document[config.fields.date]).toLocaleDateString()}
              </div>
            </div>
          )}
        </div>
        {config.fields.notes && document[config.fields.notes] && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Notes</div>
            <div style={{ color: '#374151' }}>{document[config.fields.notes]}</div>
          </div>
        )}
      </div>

      {/* Line Items */}
      <div style={{
        background: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '2rem'
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>Line Items</h2>
        </div>
        {lines.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
            No line items found
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  {config.lineItems.columns.map((col) => (
                    <th
                      key={col.key}
                      style={{
                        padding: '0.75rem 1rem',
                        textAlign: 'left',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#6b7280',
                        textTransform: 'uppercase'
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((line: any, idx: number) => (
                  <tr key={line.id || idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    {config.lineItems.columns.map((col) => (
                      <td
                        key={col.key}
                        style={{
                          padding: '0.75rem 1rem',
                          fontSize: '0.875rem',
                          color: '#374151'
                        }}
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
        <div style={{
          background: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '1.5rem',
          maxWidth: '400px',
          marginLeft: 'auto'
        }}>
          {config.fields.subtotal && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: '#6b7280' }}>Subtotal:</span>
              <span style={{ fontWeight: '500' }}>{formatCurrency(document[config.fields.subtotal])}</span>
            </div>
          )}
          {config.fields.taxAmount && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: '#6b7280' }}>Tax:</span>
              <span style={{ fontWeight: '500' }}>{formatCurrency(document[config.fields.taxAmount])}</span>
            </div>
          )}
          {config.fields.totalAmount && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: '0.5rem',
              borderTop: '1px solid #e5e7eb',
              marginTop: '0.5rem'
            }}>
              <span style={{ fontWeight: '600', fontSize: '1.125rem' }}>Total:</span>
              <span style={{ fontWeight: '600', fontSize: '1.125rem' }}>
                {formatCurrency(document[config.fields.totalAmount])}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
