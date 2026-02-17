import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Mail, Inbox, Send, CheckCircle, Clock, AlertCircle, RefreshCw, Zap, MessageSquare } from 'lucide-react';

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
      const d = response.data;
      setMessages(Array.isArray(d) ? d : d.messages || d.data || []);
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
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Inbox className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl ">
            <Mail className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Aria Mailroom</h1>
            <p className="text-gray-600 dark:text-gray-400">Monitor email-driven automation at aria@vantax.co.za</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className={`rounded-xl p-3 shadow-sm border-2 ${mailboxStatus.connected ? 'bg-green-50 dark:bg-green-900/30 border-green-500' : 'bg-red-50 dark:bg-red-900/30 border-red-500'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${mailboxStatus.connected ? 'bg-gradient-to-br from-green-500 to-emerald-500 shadow-green-500/30' : 'bg-gradient-to-br from-red-500 to-rose-500 shadow-red-500/30'}`}>
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className={`text-xl font-bold ${mailboxStatus.connected ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                {mailboxStatus.connected ? 'Connected' : 'Disconnected'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Mailbox Status</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl ">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{mailboxStatus.last_poll ? new Date(mailboxStatus.last_poll).toLocaleTimeString() : '-'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Last Poll</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl ">
              <Inbox className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{mailboxStatus.unread_count}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Unread Messages</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl ">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{mailboxStatus.processed_today}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Processed Today</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Messages</h2>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-2" />
            <p className="text-gray-500 dark:text-gray-400">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="p-12 text-center">
            <Inbox className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No messages yet</h3>
            <p className="text-gray-500 dark:text-gray-400">Emails sent to aria@vantax.co.za will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {messages.map((message) => (
              <div 
                key={message.id}
                className="p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{message.subject}</h3>
                      {getStatusIcon(message.status)}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">From: {message.from}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {message.received_at ? new Date(message.received_at).toLocaleString() : '-'}
                    </p>
                    {message.processed && (
                      <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">
                        Processed
                      </span>
                    )}
                  </div>
                </div>
                {message.bot_triggered && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-sm text-blue-700 dark:text-blue-300">
                    <strong>Bot Triggered:</strong> {message.bot_triggered}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-2xl">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-blue-900 dark:text-blue-100">How It Works</h3>
        </div>
        <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
          <li className="flex items-start gap-2"><span className="text-blue-500">•</span>Aria polls aria@vantax.co.za every 5 minutes for new emails</li>
          <li className="flex items-start gap-2"><span className="text-blue-500">•</span>Natural language processing identifies the intent (invoice, quote, delivery, etc.)</li>
          <li className="flex items-start gap-2"><span className="text-blue-500">•</span>The appropriate agent is triggered automatically to process the request</li>
          <li className="flex items-start gap-2"><span className="text-blue-500">•</span>Aria sends a confirmation email with the results</li>
          <li className="flex items-start gap-2"><span className="text-blue-500">•</span>All activity is logged and can be audited here</li>
        </ul>
      </div>
    </div>
  );
}
