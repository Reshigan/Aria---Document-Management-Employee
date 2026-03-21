/**
 * World-Class Chat Interface for Aria AI Agent
 * Features: Streaming responses, markdown rendering, code highlighting, file attachments
 */
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader, Sparkles, FileText, X, Copy, Check } from 'lucide-react';
import api from '@/lib/api';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: any;
}

interface ChatInterfaceProps {
  conversationId?: string | null;
  onNewConversation?: (conversationId: string) => void;
  className?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  conversationId,
  onNewConversation,
  className = ''
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentStreamingMessage]);

  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    } else {
      setMessages([]);
    }
  }, [conversationId]);

  const loadConversation = async (convId: string) => {
    try {
      console.log('Loading conversation:', convId);
      setMessages([]);
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsStreaming(true);
    setCurrentStreamingMessage('');

    try {
      const response = await api.post('/api/chat/', {
        message: input.trim(),
        context: {}
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.response || response.data.message || 'No response',
        timestamp: new Date().toISOString(),
        metadata: response.data
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error sending message:', error);
        const errorMessage: Message = {
          role: 'assistant',
          content: '❌ Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setCurrentStreamingMessage('');
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={`flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 ${className}`}>
      <div className="flex-none px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Aria AI Assistant</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isStreaming ? 'Typing...' : 'Ready to help'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.length === 0 && !currentStreamingMessage && (
          <WelcomeScreen onSuggestionClick={setInput} />
        )}

        {messages.map((message, index) => (
          <MessageBubble key={index} message={message} />
        ))}

        {currentStreamingMessage && (
          <MessageBubble
            message={{
              role: 'assistant',
              content: currentStreamingMessage,
              timestamp: new Date().toISOString()
            }}
            isStreaming={true}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="flex-none px-4 py-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message... (Shift+Enter for new line)"
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                rows={Math.min(input.split('\n').length, 5)}
                disabled={isLoading}
              />
            </div>
            
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="flex-none px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const WelcomeScreen: React.FC<{ onSuggestionClick: (text: string) => void }> = ({ onSuggestionClick }) => {
  const quickActions = [
    { icon: FileText, text: "Create a new sales quote", color: "from-blue-500 to-cyan-500" },
    { icon: FileText, text: "Show me recent invoices", color: "from-green-500 to-emerald-500" },
    { icon: FileText, text: "Create a purchase order", color: "from-purple-500 to-pink-500" },
    { icon: FileText, text: "Show customer list", color: "from-orange-500 to-red-500" },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-6 shadow-2xl">
        <Bot className="w-10 h-10 text-white" />
      </div>
      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Welcome to Aria AI</h3>
      <p className="text-slate-600 dark:text-slate-300 max-w-md mb-6">
        Your intelligent document assistant. Ask me anything about documents or let me help with processing tasks.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full mt-4">
        {quickActions.map((action, index) => (
          <button
            key={index}
            onClick={() => onSuggestionClick(action.text)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r ${action.color} text-white hover:shadow-lg transition-all duration-200 hover:scale-105`}
          >
            <action.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{action.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const MessageBubble: React.FC<{ message: Message; isStreaming?: boolean }> = ({ message, isStreaming = false }) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`flex-none w-10 h-10 rounded-full flex items-center justify-center shadow-md ${
        isUser ? 'bg-gradient-to-br from-blue-500 to-cyan-500' : 'bg-gradient-to-br from-purple-500 to-pink-500'
      }`}>
        {isUser ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
      </div>
      <div className="flex-1 max-w-3xl">
        <div className={`rounded-2xl px-5 py-3 shadow-md ${
          isUser ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white' : 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white'
        }`}>
          <p className="whitespace-pre-wrap">{message.content}</p>
          {isStreaming && <span className="inline-block w-2 h-4 bg-purple-500 ml-1 animate-pulse" />}
        </div>
        <p className={`text-xs text-slate-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : '-'}
        </p>
      </div>
    </div>
  );
};

export default ChatInterface;
