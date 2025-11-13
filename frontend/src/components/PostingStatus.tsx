/**
 * Posting Status Component
 * Shows document status and GL posting information
 */
import React from 'react';
import { CheckCircle, Clock, XCircle, FileText, ExternalLink } from 'lucide-react';

export type DocumentStatus = 'draft' | 'approved' | 'posted' | 'rejected' | 'cancelled';

interface PostingStatusProps {
  status: DocumentStatus | string;
  glEntryId?: string;
  glPosted?: boolean;
  postedAt?: string;
  postedBy?: string;
  error?: string;
  onViewJournal?: (entryId: string) => void;
}

export function PostingStatus({
  status,
  glEntryId,
  glPosted,
  postedAt,
  postedBy,
  error,
  onViewJournal
}: PostingStatusProps) {
  const getStatusConfig = (status: string) => {
    const configs: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
      draft: {
        icon: <Clock size={16} />,
        color: '#6b7280',
        bg: '#f3f4f6',
        label: 'Draft'
      },
      approved: {
        icon: <CheckCircle size={16} />,
        color: '#2563eb',
        bg: '#dbeafe',
        label: 'Approved'
      },
      posted: {
        icon: <CheckCircle size={16} />,
        color: '#059669',
        bg: '#d1fae5',
        label: 'Posted'
      },
      rejected: {
        icon: <XCircle size={16} />,
        color: '#dc2626',
        bg: '#fee2e2',
        label: 'Rejected'
      },
      cancelled: {
        icon: <XCircle size={16} />,
        color: '#6b7280',
        bg: '#f3f4f6',
        label: 'Cancelled'
      }
    };

    return configs[status.toLowerCase()] || configs.draft;
  };

  const config = getStatusConfig(status);

  return (
    <div style={{
      padding: '1rem',
      background: 'white',
      borderRadius: '0.5rem',
      border: '1px solid #e5e7eb'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '0.75rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          borderRadius: '9999px',
          background: config.bg,
          color: config.color,
          fontWeight: '500',
          fontSize: '0.875rem'
        }}>
          {config.icon}
          {config.label}
        </div>
      </div>

      {/* GL Posting Information */}
      {(glPosted || glEntryId) && (
        <div style={{
          marginTop: '0.75rem',
          padding: '0.75rem',
          background: '#f0fdf4',
          border: '1px solid #86efac',
          borderRadius: '0.375rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <FileText size={14} style={{ color: '#059669' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#059669' }}>
              Posted to General Ledger
            </span>
          </div>
          
          {glEntryId ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                Journal Entry: {glEntryId.substring(0, 8)}...
              </span>
              {onViewJournal && (
                <button
                  onClick={() => onViewJournal(glEntryId)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.25rem 0.5rem',
                    background: 'transparent',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  View Journal
                  <ExternalLink size={12} />
                </button>
              )}
            </div>
          ) : (
            <div style={{ fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic' }}>
              GL journal entry link unavailable
            </div>
          )}

          {postedAt && (
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
              Posted: {new Date(postedAt).toLocaleString()}
            </div>
          )}

          {postedBy && (
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              By: {postedBy}
            </div>
          )}
        </div>
      )}

      {/* Show hint when document is posted but GL info is missing */}
      {status === 'posted' && !glPosted && !glEntryId && (
        <div style={{
          marginTop: '0.75rem',
          padding: '0.75rem',
          background: '#fef3c7',
          border: '1px solid #fde68a',
          borderRadius: '0.375rem'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#92400e' }}>
            Document posted but GL posting status unavailable
          </div>
        </div>
      )}

      {/* Error Information */}
      {error && (
        <div style={{
          marginTop: '0.75rem',
          padding: '0.75rem',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '0.375rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.25rem'
          }}>
            <XCircle size={14} style={{ color: '#dc2626' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#dc2626' }}>
              Posting Error
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            {error}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for use in tables/lists
 */
export function PostingStatusBadge({ status, glPosted }: { status: string; glPosted?: boolean }) {
  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; bg: string }> = {
      draft: { color: '#6b7280', bg: '#f3f4f6' },
      approved: { color: '#2563eb', bg: '#dbeafe' },
      posted: { color: '#059669', bg: '#d1fae5' },
      rejected: { color: '#dc2626', bg: '#fee2e2' },
      cancelled: { color: '#6b7280', bg: '#f3f4f6' }
    };
    return configs[status.toLowerCase()] || configs.draft;
  };

  const config = getStatusConfig(status);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span style={{
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: '500',
        background: config.bg,
        color: config.color,
        textTransform: 'capitalize'
      }}>
        {status}
      </span>
      {glPosted && (
        <span style={{
          padding: '0.25rem 0.5rem',
          borderRadius: '0.25rem',
          fontSize: '0.625rem',
          fontWeight: '500',
          background: '#d1fae5',
          color: '#059669'
        }}>
          GL
        </span>
      )}
    </div>
  );
}
