import React, { useState } from 'react';
import { 
  Trash2, Edit, Download, Mail, CheckSquare, Square, 
  MoreHorizontal, X, AlertTriangle, Loader2
} from 'lucide-react';

interface BulkOperationsProps<T> {
  items: T[];
  selectedIds: string[];
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDelete?: (ids: string[]) => Promise<void>;
  onExport?: (ids: string[]) => Promise<void>;
  onEmail?: (ids: string[]) => Promise<void>;
  onStatusChange?: (ids: string[], status: string) => Promise<void>;
  statusOptions?: { value: string; label: string }[];
  customActions?: {
    label: string;
    icon: React.ReactNode;
    action: (ids: string[]) => Promise<void>;
    variant?: 'default' | 'danger';
  }[];
  getItemId: (item: T) => string;
}

export default function BulkOperations<T>({
  items,
  selectedIds,
  onSelectAll,
  onDeselectAll,
  onDelete,
  onExport,
  onEmail,
  onStatusChange,
  statusOptions,
  customActions,
  getItemId,
}: BulkOperationsProps<T>) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const allSelected = selectedIds.length === items.length && items.length > 0;
  const someSelected = selectedIds.length > 0 && selectedIds.length < items.length;
  const noneSelected = selectedIds.length === 0;

  const handleAction = async (actionName: string, action: () => Promise<void>) => {
    setLoading(actionName);
    try {
      await action();
    } catch (error) {
      console.error(`${actionName} failed:`, error);
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async () => {
    if (onDelete) {
      await handleAction('delete', () => onDelete(selectedIds));
      setShowConfirmDelete(false);
      onDeselectAll();
    }
  };

  const handleStatusChange = async (status: string) => {
    if (onStatusChange) {
      await handleAction('status', () => onStatusChange(selectedIds, status));
      setShowStatusMenu(false);
      onDeselectAll();
    }
  };

  if (noneSelected) {
    return null;
  }

  return (
    <>
      {/* Bulk Actions Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 dark:bg-gray-800 text-white rounded-xl shadow-2xl">
          {/* Selection info */}
          <div className="flex items-center gap-2 pr-3 border-r border-gray-700">
            <button
              onClick={allSelected ? onDeselectAll : onSelectAll}
              className="p-1 hover:bg-gray-700 rounded"
            >
              {allSelected ? (
                <CheckSquare className="h-5 w-5 text-blue-400" />
              ) : someSelected ? (
                <div className="relative">
                  <Square className="h-5 w-5" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-0.5 bg-white" />
                  </div>
                </div>
              ) : (
                <Square className="h-5 w-5" />
              )}
            </button>
            <span className="text-sm font-medium">
              {selectedIds.length} selected
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Export */}
            {onExport && (
              <button
                onClick={() => handleAction('export', () => onExport(selectedIds))}
                disabled={loading !== null}
                className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading === 'export' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Export
              </button>
            )}

            {/* Email */}
            {onEmail && (
              <button
                onClick={() => handleAction('email', () => onEmail(selectedIds))}
                disabled={loading !== null}
                className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading === 'email' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Email
              </button>
            )}

            {/* Status Change */}
            {onStatusChange && statusOptions && (
              <div className="relative">
                <button
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  disabled={loading !== null}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading === 'status' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Edit className="h-4 w-4" />
                  )}
                  Change Status
                </button>
                
                {showStatusMenu && (
                  <div className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1">
                    {statusOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => handleStatusChange(option.value)}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Custom Actions */}
            {customActions?.map((action, index) => (
              <button
                key={index}
                onClick={() => handleAction(action.label, () => action.action(selectedIds))}
                disabled={loading !== null}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors disabled:opacity-50 ${
                  action.variant === 'danger' 
                    ? 'hover:bg-red-600 text-red-400 hover:text-white' 
                    : 'hover:bg-gray-700'
                }`}
              >
                {loading === action.label ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  action.icon
                )}
                {action.label}
              </button>
            ))}

            {/* Delete */}
            {onDelete && (
              <button
                onClick={() => setShowConfirmDelete(true)}
                disabled={loading !== null}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:bg-red-600 hover:text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
          </div>

          {/* Close */}
          <button
            onClick={onDeselectAll}
            className="p-1.5 hover:bg-gray-700 rounded-lg ml-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowConfirmDelete(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md mx-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Confirm Delete
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Are you sure you want to delete {selectedIds.length} item{selectedIds.length > 1 ? 's' : ''}?
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              This action cannot be undone. All selected items will be permanently removed.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading === 'delete'}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading === 'delete' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete {selectedIds.length} item{selectedIds.length > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Hook for managing bulk selection
export function useBulkSelection<T>(items: T[], getItemId: (item: T) => string) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(items.map(getItemId));
  };

  const deselectAll = () => {
    setSelectedIds([]);
  };

  const isSelected = (id: string) => selectedIds.includes(id);

  return {
    selectedIds,
    toggleSelection,
    selectAll,
    deselectAll,
    isSelected,
    setSelectedIds,
  };
}
