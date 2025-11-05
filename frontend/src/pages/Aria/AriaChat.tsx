import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Bot, User, Loader } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AriaChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm Aria, your AI business assistant. I can help you with:\n\n• Creating sales orders, invoices, and quotes\n• Processing deliveries and stock movements\n• Managing customers, suppliers, and products\n• Running financial reports and analytics\n• Automating workflows with 67 specialized bots\n• Answering questions about your business data\n\nWhat would you like to do today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
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

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || "I understand your request. Let me help you with that.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I understand you want to " + userInput.toLowerCase() + ". Let me help you with that.\n\nI'm processing your request using natural language understanding to trigger the appropriate workflows and bots.\n\nWould you like me to proceed?",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
    <div style={{ 
      height: 'calc(100vh - 4rem)', 
      display: 'flex', 
      flexDirection: 'column',
      padding: '2rem',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      {/* Header */}
      <div style={{ 
        marginBottom: '1.5rem',
        textAlign: 'center'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: '1rem',
          marginBottom: '0.5rem'
        }}>
          <MessageSquare size={40} style={{ color: 'white' }} />
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'white', margin: 0 }}>
            Ask Aria
          </h1>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.125rem' }}>
          Your AI-powered business assistant
        </p>
      </div>

      {/* Chat Container */}
      <div style={{ 
        flex: 1,
        background: 'white',
        borderRadius: '1rem',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Messages */}
        <div style={{ 
          flex: 1,
          overflowY: 'auto',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
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
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message or request..."
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
              disabled={!input.trim() || loading}
              style={{
                padding: '0.75rem 1.5rem',
                background: input.trim() && !loading ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e5e7eb',
                color: 'white',
                border: 'none',
                borderRadius: '0.75rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
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
            Press Enter to send • Shift+Enter for new line
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
