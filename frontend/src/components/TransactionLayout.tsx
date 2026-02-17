import React, { ReactNode } from 'react';
import { ArrowLeft, Save, Check, X, FileText, Mail, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TransactionLayoutProps {
  title: string;
  documentNumber?: string;
  status?: string;
  children: ReactNode;
  onSave?: () => void;
  onApprove?: () => void;
  onPost?: () => void;
  onCancel?: () => void;
  onPrint?: () => void;
  onEmail?: () => void;
  backUrl?: string;
  showActions?: boolean;
  loading?: boolean;
}

export function TransactionLayout({
  title,
  documentNumber,
  status,
  children,
  onSave,
  onApprove,
  onPost,
  onCancel,
  onPrint,
  onEmail,
  backUrl,
  showActions = true,
  loading = false
}: TransactionLayoutProps) {
  const navigate = useNavigate();

  const getStatusColor = (status?: string) => {
    const colors: Record<string, string> = {
      draft: '#6b7280',
      approved: '#3b82f6',
      posted: '#10b981',
      cancelled: '#ef4444',
      unpaid: '#f59e0b',
      partial: '#8b5cf6',
      paid: '#10b981'
    };
    return colors[status || 'draft'] || '#6b7280';
  };

  const getStatusLabel = (status?: string) => {
    const labels: Record<string, string> = {
      draft: 'Draft',
      approved: 'Approved',
      posted: 'Posted',
      cancelled: 'Cancelled',
      unpaid: 'Unpaid',
      partial: 'Partially Paid',
      paid: 'Paid'
    };
    return labels[status || 'draft'] || status || 'Draft';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-[100]" style={{ padding: '1rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {backUrl && (
              <button
                onClick={() => navigate(backUrl)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                style={{
                  padding: '0.5rem',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div>
              <h1 className="text-gray-900 dark:text-white" style={{ fontSize: '1.5rem', fontWeight: '600', margin: 0 }}>
                {title}
              </h1>
              {documentNumber && (
                <p className="text-gray-500 dark:text-gray-400" style={{ fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                  {documentNumber}
                </p>
              )}
            </div>
            {status && (
              <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: '600',
                color: 'white',
                background: getStatusColor(status),
                textTransform: 'uppercase'
              }}>
                {getStatusLabel(status)}
              </span>
            )}
          </div>

          {showActions && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {onPrint && (
                <button
                  onClick={onPrint}
                  disabled={loading}
                  className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-md text-sm font-medium flex items-center gap-2 px-3 py-2"
                  style={{ opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  <Printer size={16} />
                  Print
                </button>
              )}
              {onEmail && (
                <button
                  onClick={onEmail}
                  disabled={loading}
                  className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-md text-sm font-medium flex items-center gap-2 px-3 py-2"
                  style={{ opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  <Mail size={16} />
                  Email
                </button>
              )}
              {onCancel && status === 'draft' && (
                <button
                  onClick={onCancel}
                  disabled={loading}
                  className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-red-500 rounded-md text-sm font-medium flex items-center gap-2 px-3 py-2"
                  style={{ opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  <X size={16} />
                  Cancel
                </button>
              )}
              {onApprove && status === 'draft' && (
                <button
                  onClick={onApprove}
                  disabled={loading}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#3b82f6',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: 'white',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    opacity: loading ? 0.5 : 1
                  }}
                >
                  <Check size={16} />
                  Approve
                </button>
              )}
              {onPost && (status === 'approved' || status === 'draft') && (
                <button
                  onClick={onPost}
                  disabled={loading}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#10b981',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: 'white',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    opacity: loading ? 0.5 : 1
                  }}
                >
                  <FileText size={16} />
                  Post
                </button>
              )}
              {onSave && status === 'draft' && (
                <button
                  onClick={onSave}
                  disabled={loading}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#2563eb',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: 'white',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    opacity: loading ? 0.5 : 1
                  }}
                >
                  <Save size={16} />
                  Save
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '2rem' }}>
        {children}
      </div>
    </div>
  );
}

interface TransactionCardProps {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function TransactionCard({ title, children, actions }: TransactionCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white" style={{ margin: 0 }}>
          {title}
        </h2>
        {actions && <div>{actions}</div>}
      </div>
      <div style={{ padding: '1.5rem' }}>
        {children}
      </div>
    </div>
  );
}

interface TransactionFieldProps {
  label: string;
  value?: string | number | null;
  type?: 'text' | 'email' | 'date' | 'number' | 'textarea' | 'select';
  options?: { value: string; label: string }[];
  onChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  rows?: number;
}

export function TransactionField({
  label,
  value,
  type = 'text',
  options,
  onChange,
  required,
  disabled,
  placeholder,
  rows = 3
}: TransactionFieldProps) {
  const inputClassName = `w-full px-2 py-1.5 border rounded-md text-sm ${disabled ? 'bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600'}`;

  return (
    <div>
      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      {type === 'textarea' ? (
        <textarea
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          rows={rows}
          className={inputClassName}
          style={{ resize: 'vertical' }}
        />
      ) : type === 'select' ? (
        <select
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          className={inputClassName}
        >
          <option value="">Select...</option>
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          className={inputClassName}
        />
      )}
    </div>
  );
}
