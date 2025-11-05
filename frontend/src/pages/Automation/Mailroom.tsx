import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Mail, Inbox, Send, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  to: string;
  received_at: string;
  processed: boolean;
  bot_triggered?: string;
  status: string;
}

export default function Mailroom() {
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [mailboxStatus, setMailboxStatus] = useState({
    connected: true,
    last_poll: new Date().toISOString(),
    unread_count: 0,
    processed_today: 0
  });

  useEffect(() => {
    loadMessages();
    loadMailboxStatus();
  }, []);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await api.get('/automation/mailroom/messages');
      setMessages(response.data);
    } catch (err) {
      console.error('Error loading messages:', err);
      setMessages(generateMockMessages());
    } finally {
      setLoading(false);
    }
  };

  const loadMailboxStatus = async () => {
    try {
      const response = await api.get('/automation/mailroom/status');
      setMailboxStatus(response.data);
    } catch (err) {
      console.error('Error loading mailbox status:', err);
    }
  };

  const generateMockMessages = (): EmailMessage[] => {
    return [
      {
        id: '1',
        subject: 'Invoice for Services - INV-2024-001',
        from: 'supplier@example.com',
        to: 'aria@vantax.co.za',
        received_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        processed: true,
        bot_triggered: 'AP Invoice Processing Bot',
        status: 'completed'
      },
      {
        id: '2',
        subject: 'Quote Request - Office Supplies',
        from: 'customer@company.co.za',
        to: 'aria@vantax.co.za',
        received_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        processed: true,
        bot_triggered: 'Quote Generation Bot',
        status: 'completed'
      },
      {
        id: '3',
        subject: 'Delivery Confirmation - DN-2024-045',
        from: 'logistics@courier.co.za',
        to: 'aria@vantax.co.za',
        received_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        processed: true,
        bot_triggered: 'Delivery Processing Bot',
        status: 'completed'
      }
    ];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} style={{ color: '#10b981' }} />;
      case 'processing':
        return <Clock size={16} style={{ color: '#f59e0b' }} />;
      case 'failed':
        return <AlertCircle size={16} style={{ color: '#ef4444' }} />;
      default:
        return <Inbox size={16} style={{ color: '#6b7280' }} />;
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Mail size={32} style={{ color: '#2563eb' }} />
          Aria Mailroom
        </h1>
        <p style={{ color: '#6b7280' }}>Monitor email-driven automation at aria@vantax.co.za</p>
      </div>

      {/* Mailbox Status */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{ 
          padding: '1.5rem', 
          background: mailboxStatus.connected ? '#d1fae5' : '#fee2e2', 
          borderRadius: '0.5rem',
          border: `2px solid ${mailboxStatus.connected ? '#10b981' : '#ef4444'}`
        }}>
          <div style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '0.5rem', fontWeight: '500' }}>
            Mailbox Status
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: mailboxStatus.connected ? '#065f46' : '#991b1b' }}>
            {mailboxStatus.connected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
        <div style={{ padding: '1.5rem', background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Last Poll</div>
          <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>
            {new Date(mailboxStatus.last_poll).toLocaleTimeString()}
          </div>
        </div>
        <div style={{ padding: '1.5rem', background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Unread Messages</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>
            {mailboxStatus.unread_count}
          </div>
        </div>
        <div style={{ padding: '1.5rem', background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Processed Today</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>
            {mailboxStatus.processed_today}
          </div>
        </div>
      </div>

      {/* Recent Messages */}
      <div style={{ 
        background: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>Recent Messages</h2>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Inbox size={48} style={{ margin: '0 auto 1rem', color: '#d1d5db' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>No messages yet</h3>
            <p style={{ color: '#6b7280' }}>
              Emails sent to aria@vantax.co.za will appear here
            </p>
          </div>
        ) : (
          <div>
            {messages.map((message) => (
              <div 
                key={message.id}
                style={{ 
                  padding: '1.5rem',
                  borderBottom: '1px solid #e5e7eb',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>{message.subject}</h3>
                      {getStatusIcon(message.status)}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      From: {message.from}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                      {new Date(message.received_at).toLocaleString()}
                    </div>
                    {message.processed && (
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        background: '#d1fae5',
                        color: '#065f46'
                      }}>
                        Processed
                      </span>
                    )}
                  </div>
                </div>
                {message.bot_triggered && (
                  <div style={{ 
                    marginTop: '0.75rem',
                    padding: '0.75rem',
                    background: '#eff6ff',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    color: '#1e40af'
                  }}>
                    <strong>Bot Triggered:</strong> {message.bot_triggered}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Configuration Info */}
      <div style={{ 
        marginTop: '2rem',
        padding: '1.5rem',
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '0.5rem'
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#1e40af' }}>
          How It Works
        </h3>
        <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#1e40af', fontSize: '0.875rem', lineHeight: '1.75' }}>
          <li>Aria polls aria@vantax.co.za every 5 minutes for new emails</li>
          <li>Natural language processing identifies the intent (invoice, quote, delivery, etc.)</li>
          <li>The appropriate bot is triggered automatically to process the request</li>
          <li>Aria sends a confirmation email with the results</li>
          <li>All activity is logged and can be audited here</li>
        </ul>
      </div>
    </div>
  );
}
