import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Paperclip, Sparkles, FileText, ShoppingCart, Users, BarChart3, Settings, RefreshCw, Zap, TrendingUp, Package } from 'lucide-react';
import api from '@/lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

const quickActions = [
  { icon: FileText, label: 'Create Sales Quote', prompt: 'Create a new sales quote', color: 'from-blue-500 to-blue-600', description: 'Generate a professional quote' },
  { icon: FileText, label: 'View Invoices', prompt: 'Show me recent invoices', color: 'from-emerald-500 to-emerald-600', description: 'Check invoice status' },
  { icon: ShoppingCart, label: 'Create PO', prompt: 'Create a purchase order', color: 'from-purple-500 to-purple-600', description: 'Order from suppliers' },
  { icon: Users, label: 'Customer List', prompt: 'Show customer list', color: 'from-orange-500 to-orange-600', description: 'View all customers' },
  { icon: BarChart3, label: 'Sales Report', prompt: 'Generate sales report for this month', color: 'from-pink-500 to-pink-600', description: 'Monthly analytics' },
  { icon: TrendingUp, label: 'Dashboard', prompt: 'Show me the executive dashboard', color: 'from-cyan-500 to-cyan-600', description: 'Business overview' },
  { icon: Package, label: 'Inventory', prompt: 'Check inventory levels', color: 'from-amber-500 to-amber-600', description: 'Stock management' },
  { icon: Settings, label: 'System Status', prompt: 'Show system status and bot activity', color: 'from-slate-500 to-slate-600', description: 'Bot monitoring' },
];

const AskAriaChat: React.FC = () => {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    startNewSession();
  }, []);

  const startNewSession = async () => {
    try {
      setInitializing(true);
      const response = await api.post('/ask-aria/session', {
        intent: null,
      });

      setConversationId(response.data.conversation_id);
      
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: response.data.message,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Failed to start session:', error);
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: 'Sorry, I encountered an error starting the session. Please refresh the page.',
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setInitializing(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !conversationId || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageToSend = inputMessage;
    setInputMessage('');
    setLoading(true);

    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const response = await fetch(`${api.defaults.baseURL}/ask-aria/message/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': api.defaults.headers.common['Authorization'] || '',
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          message: messageToSend,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                break;
              }
              
              if (data.startsWith('[ERROR]')) {
                throw new Error(data.slice(8));
              }

              accumulatedContent += data;
              
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: accumulatedContent }
                    : msg
                )
              );
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId ? errorMessage : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await api.post('/ask-aria/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const documentId = uploadResponse.data.document_id;

      const classifyResponse = await api.post(`/ask-aria/classify/${documentId}`);

      const message = `I've uploaded and classified your document "${file.name}" as a ${classifyResponse.data.document_class} with ${(classifyResponse.data.confidence * 100).toFixed(0)}% confidence. How would you like to proceed?`;

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: message,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to upload document:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error uploading your document. Please try again.',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (prompt: string) => {
    setInputMessage(prompt);
    setTimeout(() => {
      const fakeEvent = { key: 'Enter', shiftKey: false, preventDefault: () => {} } as React.KeyboardEvent;
      handleKeyPress(fakeEvent);
    }, 100);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (initializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse mx-auto mb-4 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <div className="absolute inset-0 w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-ping opacity-20 mx-auto" />
          </div>
          <p className="text-white text-lg font-medium">Initializing Aria...</p>
          <p className="text-purple-300 text-sm mt-1">Your AI assistant is waking up</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      {/* Modern Header */}
      <div className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Ask Aria
                <Sparkles className="w-5 h-5 text-purple-400" />
              </h1>
              <p className="text-purple-300 text-sm">Your intelligent ERP assistant</p>
            </div>
          </div>
          <button
            onClick={startNewSession}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-800/10 hover:bg-white/20 text-white transition-all duration-200 border border-white/10"
          >
            <RefreshCw className="w-4 h-4" />
            New Chat
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-auto px-6 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Quick Actions - Show only at start */}
          {messages.length === 1 && !loading && (
            <div className="mb-8">
              <p className="text-purple-300 text-sm mb-4 text-center font-medium">Quick Actions</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickAction(action.prompt)}
                    className="group relative overflow-hidden rounded-2xl p-4 bg-white dark:bg-gray-800/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-300 text-left hover:scale-[1.02] hover:shadow-xl"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <action.icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-white font-medium text-sm">{action.label}</p>
                    <p className="text-purple-300/70 text-xs mt-1">{action.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''} animate-fadeIn`}
            >
              <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
                message.role === 'user'
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                  : 'bg-gradient-to-br from-purple-500 to-pink-500'
              }`}>
                {message.role === 'user' ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  <Bot className="w-5 h-5 text-white" />
                )}
              </div>
              <div className={`flex-1 max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}>
                <div className={`inline-block rounded-2xl px-5 py-3 shadow-lg ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                    : 'bg-white/10 backdrop-blur-sm text-white border border-white/10'
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>
                <p className="text-purple-400/60 text-xs mt-2 px-2">
                  {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && messages[messages.length - 1]?.content === '' && (
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white dark:bg-gray-800/10 backdrop-blur-sm rounded-2xl px-5 py-4 border border-white/10">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Modern Input Area */}
      <div className="bg-black/30 backdrop-blur-xl border-t border-white/10 px-6 py-5">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="flex-shrink-0 w-12 h-12 rounded-xl bg-white dark:bg-gray-800/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-purple-300 hover:text-white transition-all duration-200 disabled:opacity-50 hover:scale-105"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <div className="flex-1 relative">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
                placeholder="Ask Aria anything about your business..."
                rows={1}
                className="w-full px-5 py-3.5 rounded-xl bg-white dark:bg-gray-800/10 border border-white/10 text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 resize-none transition-all duration-200 text-base"
                style={{ minHeight: '52px', maxHeight: '120px' }}
              />
            </div>
            <button
              onClick={() => sendMessage()}
              disabled={!inputMessage.trim() || loading}
              className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/30 transition-all duration-200 disabled:opacity-50 disabled:shadow-none hover:scale-105 disabled:hover:scale-100"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-purple-400/40 text-xs mt-3 text-center">
            Aria can help with quotes, invoices, reports, inventory, and more. Press Enter to send.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AskAriaChat;
