/**
 * Automation Panel Component
 * Shows available agents for current document with execution logs
 */
import React, { useState, useEffect } from 'react';
import { Bot, Play, Clock, CheckCircle, XCircle, ChevronRight, Loader } from 'lucide-react';
import { botsService, ariaControllerService, getBotsForDocumentType } from '../services/bots';
import type { Agent as BotType, BotExecution } from '../types/erp';

interface AutomationPanelProps {
  documentType: string;
  documentId: string;
  documentData?: any;
  onExecutionComplete?: (result: any) => void;
}

export function AutomationPanel({
  documentType,
  documentId,
  documentData,
  onExecutionComplete
}: AutomationPanelProps) {
  const [availableBots, setAvailableBots] = useState<BotType[]>([]);
  const [executions, setExecutions] = useState<BotExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAvailableBots();
    loadExecutions();
  }, [documentType, documentId]);

  const loadAvailableBots = async () => {
    try {
      const agents = await getBotsForDocumentType(documentType);
      setAvailableBots(agents);
    } catch (err: any) {
      console.error('Error loading agents:', err);
      setError(err.response?.data?.detail || 'Failed to load available agents');
    } finally {
      setLoading(false);
    }
  };

  const loadExecutions = async () => {
    try {
      const execList = await botsService.listExecutions({
        document_id: documentId,
        limit: 10
      });
      setExecutions(execList);
    } catch (err) {
      console.error('Error loading executions:', err);
    }
  };

  const executeBot = async (botId: string) => {
    try {
      setExecuting(botId);
      setError(null);

      const context = {
        document_type: documentType,
        document_id: documentId,
        document_data: documentData
      };

      const result = await botsService.execute(botId, context);
      
      await loadExecutions();
      onExecutionComplete?.(result);
    } catch (err: any) {
      console.error('Error executing agent:', err);
      setError(err.response?.data?.detail || 'Failed to execute agent');
    } finally {
      setExecuting(null);
    }
  };

  const getExecutionStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle size={14} style={{ color: '#059669' }} />;
      case 'failed':
        return <XCircle size={14} style={{ color: '#dc2626' }} />;
      case 'running':
        return <Loader size={14} style={{ color: '#2563eb' }} className="animate-spin" />;
      default:
        return <Clock size={14} style={{ color: '#6b7280' }} />;
    }
  };

  if (loading) {
    return (
      <div style={{
        padding: '1.5rem',
        background: 'white',
        borderRadius: '0.5rem',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ textAlign: 'center', color: '#6b7280' }}>
          Loading automation...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '0.5rem',
      border: '1px solid #e5e7eb',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid #e5e7eb',
        background: '#f9fafb'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Bot size={18} style={{ color: '#2563eb' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>
            Automation
          </h3>
        </div>
      </div>

      {/* Available Agents */}
      <div style={{ padding: '1rem' }}>
        <div style={{
          fontSize: '0.75rem',
          fontWeight: '600',
          color: '#6b7280',
          textTransform: 'uppercase',
          marginBottom: '0.75rem'
        }}>
          Available Agents
        </div>

        {availableBots.length === 0 ? (
          <div style={{
            padding: '1rem',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '0.875rem'
          }}>
            No agents available for this document type
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {availableBots.map(agent => (
              <div
                key={agent.id}
                style={{
                  padding: '0.75rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.375rem',
                  background: agent.is_active ? 'white' : '#f9fafb'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '0.5rem'
                }}>
                  <div>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      marginBottom: '0.25rem'
                    }}>
                      {agent.name}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6b7280'
                    }}>
                      {agent.description}
                    </div>
                  </div>
                  <button
                    onClick={() => executeBot(agent.id)}
                    disabled={!agent.is_active || executing === agent.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.375rem 0.75rem',
                      background: agent.is_active ? '#2563eb' : '#d1d5db',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      cursor: agent.is_active ? 'pointer' : 'not-allowed',
                      opacity: executing === agent.id ? 0.7 : 1
                    }}
                  >
                    {executing === agent.id ? (
                      <>
                        <Loader size={12} className="animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play size={12} />
                        Run
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          margin: '0 1rem 1rem 1rem',
          padding: '0.75rem',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '0.375rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            color: '#dc2626'
          }}>
            <XCircle size={14} />
            {error}
          </div>
        </div>
      )}

      {/* Execution History */}
      {executions.length > 0 && (
        <div style={{
          borderTop: '1px solid #e5e7eb',
          padding: '1rem'
        }}>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: '600',
            color: '#6b7280',
            textTransform: 'uppercase',
            marginBottom: '0.75rem'
          }}>
            Recent Executions
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {executions.slice(0, 5).map(execution => (
              <div
                key={execution.id}
                style={{
                  padding: '0.75rem',
                  background: '#f9fafb',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.25rem'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontWeight: '500'
                  }}>
                    {getExecutionStatusIcon(execution.status)}
                    {execution.bot_name}
                  </div>
                  <div style={{ color: '#6b7280' }}>
                    {execution.started_at ? new Date(execution.started_at).toLocaleTimeString() : '-'}
                  </div>
                </div>
                {execution.error && (
                  <div style={{ color: '#dc2626', marginTop: '0.25rem' }}>
                    {execution.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for use in sidebars
 */
export function AutomationPanelCompact({
  documentType,
  documentId,
  onOpenFull
}: {
  documentType: string;
  documentId: string;
  onOpenFull?: () => void;
}) {
  const [botCount, setBotCount] = useState(0);

  useEffect(() => {
    loadBotCount();
  }, [documentType]);

  const loadBotCount = async () => {
    try {
      const agents = await getBotsForDocumentType(documentType);
      setBotCount(agents.filter(b => b.is_active).length);
    } catch (err) {
      console.error('Error loading agent count:', err);
    }
  };

  return (
    <button
      onClick={onOpenFull}
      style={{
        width: '100%',
        padding: '0.75rem',
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '0.375rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <Bot size={16} style={{ color: '#2563eb' }} />
        <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>
          Automation ({botCount})
        </span>
      </div>
      <ChevronRight size={16} style={{ color: '#6b7280' }} />
    </button>
  );
}
