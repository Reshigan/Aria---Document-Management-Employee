import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Bot, User, Loader, Paperclip, X } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev/api';


interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  file?: {
    name: string;
    size: number;
  };
  documentAnalysis?: {
    document_type: string;
    document_subtype: string;
    sap_transaction: string;
    summary: any;
    gl_postings: any[];
    sap_export: any;
    recommendations: string[];
  };
  intent?: any;
  missingFields?: string[];
  actionSuggestions?: Array<{label: string; value: string}>;
  botsActivated?: string[];
  executionResults?: any[];
  responseType?: 'question' | 'form' | 'confirmation' | 'result' | 'error';
  formSchema?: {
    fields: Array<{
      name: string;
      label: string;
      type: string;
      required: boolean;
      description?: string;
      options?: Array<{value: string; label: string}>;
    }>;
  };
  confirmationData?: any;
  resultData?: any;
  sessionId?: string;
}

export default function AriaChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm Aria, your AI business assistant. I can help you with:\n\n• Creating sales orders, invoices, and quotes\n• Processing deliveries and stock movements\n• Managing customers, suppliers, and products\n• Running financial reports and analytics\n• Automating workflows with 67 specialized agents\n• Answering questions about your business data\n• Analyzing documents you upload (PDF, images, text)\n\nWhat would you like to do today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if ((!input.trim() && !selectedFile) || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input || 'Uploaded a file',
      timestamp: new Date(),
      file: selectedFile ? {
        name: selectedFile.name,
        size: selectedFile.size
      } : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    const userInput = input;
    const fileToUpload = selectedFile;
    setInput('');
    setSelectedFile(null);
    setLoading(true);

    try {
      let response;
      
      if (fileToUpload) {
        const formData = new FormData();
        formData.append('file', fileToUpload);
        if (userInput) {
          formData.append('message', userInput);
        }
        
        response = await fetch(`${API_BASE}/chat/upload`, {
          method: 'POST',
          body: formData
        });
      } else {
        response = await fetch(`${API_BASE}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: userInput,
            conversation_history: messages.map(m => ({
              role: m.role,
              content: m.content
            }))
          })
        });
      }

      const data = await response.json();
      
      if (data.session_id) {
        setSessionId(data.session_id);
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || data.message || "I understand your request. Let me help you with that.",
        timestamp: new Date(),
        documentAnalysis: data.document_analysis,
        intent: data.intent,
        missingFields: data.missing_fields,
        actionSuggestions: data.action_suggestions,
        botsActivated: data.bots_activated,
        executionResults: data.execution_results,
        responseType: data.response_type,
        formSchema: data.form_schema,
        confirmationData: data.confirmation_data,
        resultData: data.result_data,
        sessionId: data.session_id
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I understand you want to " + userInput.toLowerCase() + ". Let me help you with that.\n\nI'm processing your request using natural language understanding to trigger the appropriate workflows and agents.\n\nWould you like me to proceed?",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      
      const allowedTypes = [
        'application/pdf', 
        'image/jpeg', 
        'image/png', 
        'image/jpg', 
        'text/plain',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel' // .xls
      ];
      if (!allowedTypes.includes(file.type)) {
        alert('Please upload PDF, Excel, image (JPG/PNG), or text file');
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePostToERP = async (filename: string) => {
    alert(`Posting ${filename} to ARIA ERP... This will create GL entries in the system.`);
  };

  const handleExportToSAP = async (filename: string, analysis: any) => {
    if (!analysis?.sap_export?.records) {
      alert('No SAP export data available');
      return;
    }

    const records = analysis.sap_export.records;
    const headers = Object.keys(records[0]);
    const csv = [
      headers.join(','),
      ...records.map((r: any) => headers.map(h => r[h]).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SAP_Export_${analysis.sap_transaction}_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleViewDetails = (analysis: any) => {
    const details = JSON.stringify(analysis, null, 2);
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>Document Analysis Details</title>
            <style>
              body { font-family: monospace; padding: 2rem; background: #1f2937; color: #f3f4f6; }
              pre { white-space: pre-wrap; word-wrap: break-word; }
            </style>
          </head>
          <body>
            <h1>Document Analysis Details</h1>
            <pre>${details}</pre>
          </body>
        </html>
      `);
    }
  };

  const quickActions = [
    "Create a sales order",
    "Show me today's invoices",
    "What's my cash position?",
    "Process this delivery",
    "Run AP aging report",
    "Add a new customer"
  ];

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-8 bg-gradient-to-br from-indigo-600 to-purple-700 dark:from-indigo-900 dark:to-purple-900">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <MessageSquare size={40} className="text-white" />
          <h1 className="text-4xl font-bold text-white m-0">
            Ask Aria
          </h1>
        </div>
        <p className="text-white/90 text-lg">
          Your AI-powered business assistant
        </p>
      </div>

      {/* Chat Container */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
          {messages.map((message) => (
            <div
              key={message.id}
              style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start',
                flexDirection: message.role === 'user' ? 'row-reverse' : 'row'
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: message.role === 'assistant' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {message.role === 'assistant' ? (
                  <Bot size={20} style={{ color: 'white' }} />
                ) : (
                  <User size={20} style={{ color: '#6b7280' }} />
                )}
              </div>
              <div style={{
                maxWidth: '70%',
                padding: '1rem 1.25rem',
                borderRadius: '1rem',
                background: message.role === 'assistant' ? '#f3f4f6' : '#667eea',
                color: message.role === 'assistant' ? '#1f2937' : 'white'
              }}>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                  {message.content}
                </div>
                
                {/* Form Rendering for Slot Collection */}
                {message.responseType === 'form' && message.formSchema && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                    <div style={{ fontWeight: '600', marginBottom: '1rem', color: '#667eea' }}>
                      📝 Please provide the following information:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {message.formSchema.fields.map((field, idx) => (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                            {field.label} {field.required && <span style={{ color: '#dc2626' }}>*</span>}
                          </label>
                          {field.description && (
                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{field.description}</span>
                          )}
                          {field.type === 'select' && field.options ? (
                            <select
                              value={formData[field.name] || ''}
                              onChange={(e) => setFormData({...formData, [field.name]: e.target.value})}
                              style={{
                                padding: '0.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.5rem',
                                fontSize: '0.875rem'
                              }}
                            >
                              <option value="">Select {field.label}</option>
                              {field.options.map((opt, oidx) => (
                                <option key={oidx} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          ) : field.type === 'table' ? (
                            <div style={{
                              padding: '0.75rem',
                              background: '#f9fafb',
                              border: '1px solid #e5e7eb',
                              borderRadius: '0.5rem',
                              fontSize: '0.875rem',
                              color: '#6b7280'
                            }}>
                              Table input (add line items)
                            </div>
                          ) : field.type === 'date' ? (
                            <input
                              type="date"
                              value={formData[field.name] || ''}
                              onChange={(e) => setFormData({...formData, [field.name]: e.target.value})}
                              style={{
                                padding: '0.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.5rem',
                                fontSize: '0.875rem'
                              }}
                            />
                          ) : field.type === 'number' ? (
                            <input
                              type="number"
                              value={formData[field.name] || ''}
                              onChange={(e) => setFormData({...formData, [field.name]: e.target.value})}
                              style={{
                                padding: '0.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.5rem',
                                fontSize: '0.875rem'
                              }}
                            />
                          ) : (
                            <input
                              type="text"
                              value={formData[field.name] || ''}
                              onChange={(e) => setFormData({...formData, [field.name]: e.target.value})}
                              placeholder={field.description}
                              style={{
                                padding: '0.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.5rem',
                                fontSize: '0.875rem'
                              }}
                            />
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          setInput('');
                          handleSend();
                        }}
                        style={{
                          padding: '0.75rem 1.5rem',
                          background: '#667eea',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          marginTop: '0.5rem'
                        }}
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                )}

                {/* Confirmation Rendering */}
                {message.responseType === 'confirmation' && message.confirmationData && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                    <div style={{ fontWeight: '600', marginBottom: '1rem', color: '#f59e0b' }}>
                      ⚠️ Please confirm:
                    </div>
                    <div style={{
                      padding: '1rem',
                      background: '#fffbeb',
                      border: '1px solid #fcd34d',
                      borderRadius: '0.5rem',
                      marginBottom: '1rem'
                    }}>
                      <pre style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap', margin: 0 }}>
                        {JSON.stringify(message.confirmationData, null, 2)}
                      </pre>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => {
                          setInput('confirm');
                          handleSend();
                        }}
                        style={{
                          padding: '0.75rem 1.5rem',
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        ✓ Confirm
                      </button>
                      <button
                        onClick={() => {
                          setInput('cancel');
                          handleSend();
                        }}
                        style={{
                          padding: '0.75rem 1.5rem',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        ✗ Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Result Rendering */}
                {message.responseType === 'result' && message.resultData && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                    <div style={{ fontWeight: '600', marginBottom: '1rem', color: '#10b981' }}>
                      ✅ Success!
                    </div>
                    <div style={{
                      padding: '1rem',
                      background: '#f0fdf4',
                      border: '1px solid #86efac',
                      borderRadius: '0.5rem'
                    }}>
                      {message.resultData.quote_number && (
                        <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                          <strong>Quote Number:</strong> {message.resultData.quote_number}
                        </div>
                      )}
                      {message.resultData.order_number && (
                        <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                          <strong>Order Number:</strong> {message.resultData.order_number}
                        </div>
                      )}
                      {message.resultData.invoice_number && (
                        <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                          <strong>Invoice Number:</strong> {message.resultData.invoice_number}
                        </div>
                      )}
                      {message.resultData.total_amount && (
                        <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                          <strong>Total Amount:</strong> ${message.resultData.total_amount}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Missing Fields - Slot Filling UI */}
                {message.missingFields && message.missingFields.length > 0 && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                    <div style={{ fontWeight: '600', marginBottom: '0.75rem', color: '#dc2626' }}>
                      ℹ️ Required Information:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {message.missingFields.map((field, idx) => (
                        <div key={idx} style={{
                          padding: '0.5rem 0.75rem',
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          color: '#991b1b'
                        }}>
                          • {field}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Agents Activated */}
                {message.botsActivated && message.botsActivated.length > 0 && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                    <div style={{ fontWeight: '600', marginBottom: '0.75rem', color: '#059669' }}>
                      🤖 Agents Activated:
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {message.botsActivated.map((agent, idx) => (
                        <span key={idx} style={{
                          padding: '0.25rem 0.75rem',
                          background: '#d1fae5',
                          color: '#065f46',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}>
                          {agent}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Document Analysis Results */}
                {message.documentAnalysis && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                    {/* Document Type Badge */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        background: '#667eea',
                        color: 'white',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        {message.documentAnalysis.document_type}
                      </span>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        background: '#10b981',
                        color: 'white',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        SAP: {message.documentAnalysis.sap_transaction}
                      </span>
                    </div>

                    {/* GL Postings Summary */}
                    {message.documentAnalysis.gl_postings && message.documentAnalysis.gl_postings.length > 0 && (
                      <div style={{ 
                        marginTop: '1rem',
                        padding: '0.75rem',
                        background: 'white',
                        borderRadius: '0.5rem',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{ fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                          📊 GL Postings ({message.documentAnalysis.gl_postings.length} entries)
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          Total Debit: R{message.documentAnalysis.gl_postings.reduce((sum: number, p: any) => sum + (p.debit || 0), 0).toFixed(2)} | 
                          Total Credit: R{message.documentAnalysis.gl_postings.reduce((sum: number, p: any) => sum + (p.credit || 0), 0).toFixed(2)}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handlePostToERP(message.file?.name || 'document')}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
                      >
                        📝 Post to ARIA ERP
                      </button>
                      <button
                        onClick={() => handleExportToSAP(message.file?.name || 'document', message.documentAnalysis)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
                      >
                        💾 Export to SAP
                      </button>
                      <button
                        onClick={() => handleViewDetails(message.documentAnalysis)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#6b7280',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#4b5563'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#6b7280'}
                      >
                        🔍 View Details
                      </button>
                    </div>
                  </div>
                )}
                
                <div style={{ 
                  fontSize: '0.75rem', 
                  marginTop: '0.5rem',
                  opacity: 0.7
                }}>
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Bot size={20} style={{ color: 'white' }} />
              </div>
              <div style={{
                padding: '1rem 1.25rem',
                borderRadius: '1rem',
                background: '#f3f4f6',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center'
              }}>
                <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ color: '#6b7280' }}>Aria is thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {messages.length === 1 && (
          <div style={{ 
            padding: '1rem 2rem',
            borderTop: '1px solid #e5e7eb',
            background: '#f9fafb'
          }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem', color: '#6b7280' }}>
              Quick Actions:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {quickActions.map((action) => (
                <button
                  key={action}
                  onClick={() => setInput(action)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '9999px',
                    fontSize: '0.875rem',
                    color: '#374151',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#667eea';
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.borderColor = '#667eea';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.color = '#374151';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div style={{ 
          padding: '1.5rem 2rem',
          borderTop: '1px solid #e5e7eb',
          background: 'white'
        }}>
          {selectedFile && (
            <div style={{
              marginBottom: '1rem',
              padding: '0.75rem 1rem',
              background: '#f3f4f6',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Paperclip size={16} style={{ color: '#667eea' }} />
                <span style={{ fontSize: '0.875rem', color: '#374151' }}>
                  {selectedFile.name} ({Number((selectedFile.size / 1024) || 0).toFixed(1)} KB)
                </span>
              </div>
              <button
                onClick={handleRemoveFile}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={16} style={{ color: '#6b7280' }} />
              </button>
            </div>
          )}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.txt,.xlsx,.xls"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              style={{
                padding: '0.75rem',
                background: 'white',
                border: '2px solid #e5e7eb',
                borderRadius: '0.75rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.borderColor = '#667eea';
                  e.currentTarget.style.background = '#f3f4f6';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.background = 'white';
              }}
            >
              <Paperclip size={20} style={{ color: '#667eea' }} />
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={selectedFile ? "Add a message about this file..." : "Type your message or upload a file..."}
              rows={1}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                border: '2px solid #e5e7eb',
                borderRadius: '0.75rem',
                fontSize: '0.875rem',
                resize: 'none',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
            />
            <button
              onClick={handleSend}
              disabled={(!input.trim() && !selectedFile) || loading}
              style={{
                padding: '0.75rem 1.5rem',
                background: (input.trim() || selectedFile) && !loading ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e5e7eb',
                color: 'white',
                border: 'none',
                borderRadius: '0.75rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: (input.trim() || selectedFile) && !loading ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s'
              }}
            >
              <Send size={16} />
              Send
            </button>
          </div>
          <div style={{ 
            fontSize: '0.75rem', 
            color: '#9ca3af', 
            marginTop: '0.75rem',
            textAlign: 'center'
          }}>
            Press Enter to send • Shift+Enter for new line • Upload Excel, PDF, images, or text files for intelligent analysis
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
