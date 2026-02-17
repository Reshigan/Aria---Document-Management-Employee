import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger'
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const variantColors = {
    danger: { bg: '#fee2e2', text: '#991b1b', button: '#dc2626' },
    warning: { bg: '#fef3c7', text: '#92400e', button: '#f59e0b' },
    info: { bg: '#dbeafe', text: '#1e40af', button: '#3b82f6' }
  };

  const colors = variantColors[variant];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl"
        style={{
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
      >
        <div className="border-b border-gray-200 dark:border-gray-700" style={{
          padding: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              padding: '0.5rem',
              background: colors.bg,
              borderRadius: '0.5rem'
            }}>
              <AlertTriangle size={20} style={{ color: colors.text }} />
            </div>
            <h2 className="text-gray-900 dark:text-white" style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0 }}>{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            style={{
              padding: '0.25rem',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          <p className="text-gray-600 dark:text-gray-300" style={{ fontSize: '0.875rem', margin: 0 }}>
            {message}
          </p>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700" style={{
          padding: '1.5rem',
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-md text-sm font-medium px-3 py-2 cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            style={{
              padding: '0.5rem 1rem',
              background: colors.button,
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
