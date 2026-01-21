import React, { useState } from 'react';
import { 
  ArrowLeft, MoreHorizontal, Send, Printer, Copy, Download, 
  Trash2, Edit2, Check, X, Clock, AlertCircle, CheckCircle,
  XCircle, Pause, Play, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './TransactionHeader.css';

type TransactionStatus = 
  | 'draft' 
  | 'pending' 
  | 'approved' 
  | 'sent' 
  | 'partial' 
  | 'paid' 
  | 'overdue' 
  | 'cancelled' 
  | 'void'
  | 'in_progress'
  | 'completed'
  | 'on_hold';

interface TransactionHeaderProps {
  title: string;
  subtitle?: string;
  documentNumber: string;
  status: TransactionStatus;
  amount?: number;
  currency?: string;
  createdAt?: string;
  updatedAt?: string;
  backPath?: string;
  onStatusChange?: (newStatus: TransactionStatus) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onPrint?: () => void;
  onDownload?: () => void;
  onSendEmail?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  showApprovalActions?: boolean;
  customActions?: { label: string; icon: React.ReactNode; onClick: () => void; variant?: 'default' | 'primary' | 'danger' }[];
}

const statusConfig: Record<TransactionStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  draft: { label: 'Draft', color: '#6b7280', bgColor: '#f3f4f6', icon: <Edit2 size={14} /> },
  pending: { label: 'Pending', color: '#f59e0b', bgColor: '#fef3c7', icon: <Clock size={14} /> },
  approved: { label: 'Approved', color: '#10b981', bgColor: '#d1fae5', icon: <Check size={14} /> },
  sent: { label: 'Sent', color: '#3b82f6', bgColor: '#dbeafe', icon: <Send size={14} /> },
  partial: { label: 'Partial', color: '#8b5cf6', bgColor: '#ede9fe', icon: <RefreshCw size={14} /> },
  paid: { label: 'Paid', color: '#10b981', bgColor: '#d1fae5', icon: <CheckCircle size={14} /> },
  overdue: { label: 'Overdue', color: '#ef4444', bgColor: '#fee2e2', icon: <AlertCircle size={14} /> },
  cancelled: { label: 'Cancelled', color: '#6b7280', bgColor: '#f3f4f6', icon: <X size={14} /> },
  void: { label: 'Void', color: '#ef4444', bgColor: '#fee2e2', icon: <XCircle size={14} /> },
  in_progress: { label: 'In Progress', color: '#3b82f6', bgColor: '#dbeafe', icon: <Play size={14} /> },
  completed: { label: 'Completed', color: '#10b981', bgColor: '#d1fae5', icon: <CheckCircle size={14} /> },
  on_hold: { label: 'On Hold', color: '#f59e0b', bgColor: '#fef3c7', icon: <Pause size={14} /> },
};

export const TransactionHeader: React.FC<TransactionHeaderProps> = ({
  title,
  subtitle,
  documentNumber,
  status,
  amount,
  currency = 'ZAR',
  createdAt,
  updatedAt,
  backPath,
  onStatusChange,
  onEdit,
  onDelete,
  onDuplicate,
  onPrint,
  onDownload,
  onSendEmail,
  onApprove,
  onReject,
  showApprovalActions = false,
  customActions = [],
}) => {
  const navigate = useNavigate();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const statusInfo = statusConfig[status];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency,
    }).format(value);
  };

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="transaction-header">
      <div className="transaction-header-top">
        <button className="back-button" onClick={handleBack}>
          <ArrowLeft size={20} />
        </button>
        
        <div className="transaction-header-info">
          <div className="transaction-header-title-row">
            <h1 className="transaction-title">{title}</h1>
            <span className="transaction-number">{documentNumber}</span>
            <div 
              className="transaction-status-badge"
              style={{ backgroundColor: statusInfo.bgColor, color: statusInfo.color }}
              onClick={() => onStatusChange && setShowStatusMenu(!showStatusMenu)}
            >
              {statusInfo.icon}
              <span>{statusInfo.label}</span>
            </div>
            
            {showStatusMenu && onStatusChange && (
              <>
                <div className="status-menu-overlay" onClick={() => setShowStatusMenu(false)} />
                <div className="status-menu">
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <button
                      key={key}
                      className={`status-menu-item ${status === key ? 'active' : ''}`}
                      onClick={() => {
                        onStatusChange(key as TransactionStatus);
                        setShowStatusMenu(false);
                      }}
                    >
                      <span 
                        className="status-menu-indicator"
                        style={{ backgroundColor: config.color }}
                      />
                      {config.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          
          {subtitle && <p className="transaction-subtitle">{subtitle}</p>}
          
          <div className="transaction-meta">
            {createdAt && <span>Created: {createdAt}</span>}
            {updatedAt && <span>Updated: {updatedAt}</span>}
          </div>
        </div>

        {amount !== undefined && (
          <div className="transaction-amount">
            <span className="amount-label">Total Amount</span>
            <span className="amount-value">{formatCurrency(amount)}</span>
          </div>
        )}
      </div>

      <div className="transaction-header-actions">
        {showApprovalActions && status === 'pending' && (
          <div className="approval-actions">
            <button className="action-btn approve" onClick={onApprove}>
              <Check size={16} />
              Approve
            </button>
            <button className="action-btn reject" onClick={onReject}>
              <X size={16} />
              Reject
            </button>
          </div>
        )}

        <div className="primary-actions">
          {onEdit && (
            <button className="action-btn" onClick={onEdit}>
              <Edit2 size={16} />
              Edit
            </button>
          )}
          {onSendEmail && (
            <button className="action-btn primary" onClick={onSendEmail}>
              <Send size={16} />
              Send Email
            </button>
          )}
        </div>

        {customActions.map((action, index) => (
          <button 
            key={index}
            className={`action-btn ${action.variant || 'default'}`}
            onClick={action.onClick}
          >
            {action.icon}
            {action.label}
          </button>
        ))}

        <div className="more-actions">
          <button 
            className="more-btn"
            onClick={() => setShowMoreMenu(!showMoreMenu)}
          >
            <MoreHorizontal size={20} />
          </button>
          
          {showMoreMenu && (
            <>
              <div className="more-menu-overlay" onClick={() => setShowMoreMenu(false)} />
              <div className="more-menu">
                {onPrint && (
                  <button className="more-menu-item" onClick={() => { onPrint(); setShowMoreMenu(false); }}>
                    <Printer size={16} />
                    Print
                  </button>
                )}
                {onDownload && (
                  <button className="more-menu-item" onClick={() => { onDownload(); setShowMoreMenu(false); }}>
                    <Download size={16} />
                    Download PDF
                  </button>
                )}
                {onDuplicate && (
                  <button className="more-menu-item" onClick={() => { onDuplicate(); setShowMoreMenu(false); }}>
                    <Copy size={16} />
                    Duplicate
                  </button>
                )}
                {onDelete && (
                  <>
                    <div className="more-menu-divider" />
                    <button className="more-menu-item danger" onClick={() => { onDelete(); setShowMoreMenu(false); }}>
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionHeader;
