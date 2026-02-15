import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Paperclip, Sparkles, FileText, ShoppingCart, Users, BarChart3, Settings, RefreshCw, Zap, TrendingUp, Package, HelpCircle, ChevronRight, DollarSign, Truck, Factory, UserCheck, FileCheck, Database, Workflow, MessageSquare, X, ChevronDown, Lightbulb } from 'lucide-react';
import api from '@/lib/api';

// Simple Markdown renderer for bot responses
const renderMarkdown = (text: string): React.ReactNode => {
  if (!text) return null;
  
  // Split by lines to handle lists and paragraphs
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  
  const processInlineMarkdown = (line: string): React.ReactNode => {
    // Process bold (**text** or __text__)
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let key = 0;
    
    while (remaining.length > 0) {
      // Check for bold
      const boldMatch = remaining.match(/\*\*(.+?)\*\*|__(.+?)__/);
      if (boldMatch) {
        const index = boldMatch.index || 0;
        if (index > 0) {
          parts.push(<span key={key++}>{remaining.slice(0, index)}</span>);
        }
        parts.push(<strong key={key++} className="font-semibold">{boldMatch[1] || boldMatch[2]}</strong>);
        remaining = remaining.slice(index + boldMatch[0].length);
        continue;
      }
      
      // Check for italic (*text* or _text_)
      const italicMatch = remaining.match(/\*(.+?)\*|_(.+?)_/);
      if (italicMatch) {
        const index = italicMatch.index || 0;
        if (index > 0) {
          parts.push(<span key={key++}>{remaining.slice(0, index)}</span>);
        }
        parts.push(<em key={key++}>{italicMatch[1] || italicMatch[2]}</em>);
        remaining = remaining.slice(index + italicMatch[0].length);
        continue;
      }
      
      // Check for inline code (`code`)
      const codeMatch = remaining.match(/`(.+?)`/);
      if (codeMatch) {
        const index = codeMatch.index || 0;
        if (index > 0) {
          parts.push(<span key={key++}>{remaining.slice(0, index)}</span>);
        }
        parts.push(<code key={key++} className="bg-white/20 px-1.5 py-0.5 rounded text-sm font-mono">{codeMatch[1]}</code>);
        remaining = remaining.slice(index + codeMatch[0].length);
        continue;
      }
      
      // No more matches, add remaining text
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }
    
    return parts.length > 0 ? parts : line;
  };
  
  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const ListTag = listType;
      elements.push(
        <ListTag key={elements.length} className={`${listType === 'ol' ? 'list-decimal' : 'list-disc'} list-inside space-y-1 my-2`}>
          {listItems.map((item, i) => (
            <li key={i} className="text-white/90">{processInlineMarkdown(item)}</li>
          ))}
        </ListTag>
      );
      listItems = [];
      listType = null;
    }
  };
  
  lines.forEach((line, index) => {
    // Check for unordered list items
    const ulMatch = line.match(/^[\s]*[-*]\s+(.+)$/);
    if (ulMatch) {
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      listItems.push(ulMatch[1]);
      return;
    }
    
    // Check for ordered list items
    const olMatch = line.match(/^[\s]*\d+\.\s+(.+)$/);
    if (olMatch) {
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      listItems.push(olMatch[1]);
      return;
    }
    
    // Not a list item, flush any pending list
    flushList();
    
    // Check for headers
    const h3Match = line.match(/^###\s+(.+)$/);
    if (h3Match) {
      elements.push(<h3 key={index} className="text-lg font-semibold text-white mt-3 mb-1">{processInlineMarkdown(h3Match[1])}</h3>);
      return;
    }
    
    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      elements.push(<h2 key={index} className="text-xl font-bold text-white mt-4 mb-2">{processInlineMarkdown(h2Match[1])}</h2>);
      return;
    }
    
    const h1Match = line.match(/^#\s+(.+)$/);
    if (h1Match) {
      elements.push(<h1 key={index} className="text-2xl font-bold text-white mt-4 mb-2">{processInlineMarkdown(h1Match[1])}</h1>);
      return;
    }
    
    // Regular paragraph
    if (line.trim()) {
      elements.push(<p key={index} className="my-1">{processInlineMarkdown(line)}</p>);
    } else if (index > 0 && index < lines.length - 1) {
      // Empty line between content
      elements.push(<br key={index} />);
    }
  });
  
  // Flush any remaining list
  flushList();
  
  return <div className="space-y-1">{elements}</div>;
};

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

// Bot categories with their capabilities
const botCategories = [
  { 
    id: 'financial', 
    name: 'Financial', 
    icon: DollarSign, 
    color: 'from-emerald-500 to-emerald-600',
    bots: ['Invoice Reconciliation', 'Bank Reconciliation', 'AR Collections', 'AP Processing', 'Financial Close', 'Tax Calculation'],
    prompts: ['Run invoice reconciliation', 'Reconcile bank statements', 'Show overdue invoices', 'Process accounts payable']
  },
  { 
    id: 'sales', 
    name: 'Sales', 
    icon: TrendingUp, 
    color: 'from-blue-500 to-blue-600',
    bots: ['Quote Generation', 'Lead Management', 'Opportunity Tracking', 'Contract Renewal', 'Sales Analytics'],
    prompts: ['Create a sales quote', 'Show my leads', 'Track sales opportunities', 'Generate sales report']
  },
  { 
    id: 'purchasing', 
    name: 'Purchasing', 
    icon: ShoppingCart, 
    color: 'from-purple-500 to-purple-600',
    bots: ['Purchase Orders', 'RFQ Management', 'Goods Receipt', 'Supplier Management', 'Procurement Analytics'],
    prompts: ['Create purchase order', 'Request for quotation', 'Record goods receipt', 'Show supplier list']
  },
  { 
    id: 'inventory', 
    name: 'Inventory', 
    icon: Package, 
    color: 'from-amber-500 to-amber-600',
    bots: ['Stock Reorder', 'Inventory Optimization', 'Stock Valuation', 'Warehouse Management', 'Cycle Counting'],
    prompts: ['Check stock levels', 'Reorder low stock items', 'Show inventory valuation', 'Run cycle count']
  },
  { 
    id: 'hr', 
    name: 'HR & People', 
    icon: UserCheck, 
    color: 'from-pink-500 to-pink-600',
    bots: ['Payroll Processing', 'Leave Management', 'Employee Onboarding', 'Performance Reviews', 'Training Management'],
    prompts: ['Process payroll', 'Check leave balances', 'Onboard new employee', 'Schedule performance review']
  },
  { 
    id: 'manufacturing', 
    name: 'Manufacturing', 
    icon: Factory, 
    color: 'from-orange-500 to-orange-600',
    bots: ['Production Planning', 'OEE Calculation', 'Quality Control', 'BOM Management', 'Work Orders'],
    prompts: ['Create production order', 'Calculate OEE', 'Run quality check', 'Show BOM for product']
  },
  { 
    id: 'compliance', 
    name: 'Compliance', 
    icon: FileCheck, 
    color: 'from-red-500 to-red-600',
    bots: ['Audit Trail', 'Document Compliance', 'Risk Assessment', 'Policy Management', 'Regulatory Reporting'],
    prompts: ['Show audit trail', 'Check compliance status', 'Run risk assessment', 'Generate compliance report']
  },
  { 
    id: 'analytics', 
    name: 'Analytics', 
    icon: BarChart3, 
    color: 'from-cyan-500 to-cyan-600',
    bots: ['Sales Analytics', 'Financial Analytics', 'Operational Analytics', 'Predictive Analytics', 'Custom Reports'],
    prompts: ['Show sales dashboard', 'Generate financial report', 'Analyze trends', 'Create custom report']
  },
];

// Contextual suggested prompts that appear below the input
const suggestedPrompts = [
  'List all available bots',
  'Run sales-to-invoice reconciliation',
  'Show me today\'s transactions',
  'What can you help me with?',
  'Create a new invoice',
  'Check inventory levels',
];

const AskAriaChat: React.FC = () => {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [showBotPanel, setShowBotPanel] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
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
            if (line.startsWith('data:')) {
              const data = line.startsWith('data: ') ? line.slice(6) : line.slice(5);
              
              if (data === '[DONE]') {
                break;
              }
              
              if (data.startsWith('[ERROR]')) {
                throw new Error(data.slice(8));
              }

              // Parse JSON response from backend - v2
              try {
                const jsonData = JSON.parse(data);
                accumulatedContent = jsonData.content || data;
              } catch {
                accumulatedContent = data;
              }
              
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
      <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
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
    <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      {/* Modern Header */}
      <div className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center ">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Ask Aria
                <Sparkles className="w-5 h-5 text-purple-400" />
              </h1>
              <p className="text-purple-300 text-sm">Your intelligent ERP assistant - 67 AI bots ready</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBotPanel(!showBotPanel)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 border ${showBotPanel ? 'bg-purple-500/20 border-purple-500/50 text-purple-300' : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'}`}
            >
              <Zap className="w-4 h-4" />
              Bots
            </button>
            <button
              onClick={() => setShowHelp(!showHelp)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 border ${showHelp ? 'bg-purple-500/20 border-purple-500/50 text-purple-300' : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'}`}
            >
              <HelpCircle className="w-4 h-4" />
              Help
            </button>
            <button
              onClick={startNewSession}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all duration-200 border border-white/10"
            >
              <RefreshCw className="w-4 h-4" />
              New Chat
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area with Optional Side Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Bot Categories Panel */}
        {showBotPanel && (
          <div className="w-80 bg-black/30 backdrop-blur-xl border-r border-white/10 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-400" />
                  Bot Categories
                </h2>
                <button onClick={() => setShowBotPanel(false)} className="text-purple-300 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                {botCategories.map((category) => (
                  <div key={category.id} className="rounded-xl overflow-hidden">
                    <button
                      onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
                      className={`w-full flex items-center justify-between p-3 transition-all duration-200 ${selectedCategory === category.id ? 'bg-white/10' : 'bg-white/5 hover:bg-white/10'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center`}>
                          <category.icon className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-white text-sm font-medium">{category.name}</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-purple-300 transition-transform ${selectedCategory === category.id ? 'rotate-180' : ''}`} />
                    </button>
                    {selectedCategory === category.id && (
                      <div className="bg-white/5 p-3 space-y-2">
                        <p className="text-purple-300 text-xs mb-2">Quick prompts:</p>
                        {category.prompts.map((prompt, idx) => (
                          <button
                            key={idx}
                            onClick={() => { handleQuickAction(prompt); setShowBotPanel(false); }}
                            className="w-full text-left text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-lg px-3 py-2 transition-all flex items-center gap-2"
                          >
                            <ChevronRight className="w-3 h-3 text-purple-400" />
                            {prompt}
                          </button>
                        ))}
                        <div className="border-t border-white/10 pt-2 mt-2">
                          <p className="text-purple-400 text-xs">Available bots:</p>
                          <p className="text-white/60 text-xs mt-1">{category.bots.join(', ')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Help Panel */}
        {showHelp && (
          <div className="w-80 bg-black/30 backdrop-blur-xl border-r border-white/10 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-purple-400" />
                  How to Use Aria
                </h2>
                <button onClick={() => setShowHelp(false)} className="text-purple-300 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="bg-white/5 rounded-xl p-4">
                  <h3 className="text-white font-medium text-sm mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-purple-400" />
                    Natural Language
                  </h3>
                  <p className="text-purple-300/80 text-xs">Just type what you want to do in plain English. Aria understands context and can help with any business task.</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <h3 className="text-white font-medium text-sm mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-400" />
                    67 AI Bots
                  </h3>
                  <p className="text-purple-300/80 text-xs">Aria has access to 67 specialized bots for financial, sales, HR, inventory, manufacturing, and more.</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <h3 className="text-white font-medium text-sm mb-2 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-purple-400" />
                    Example Commands
                  </h3>
                  <ul className="text-purple-300/80 text-xs space-y-1">
                    <li>"List all available bots"</li>
                    <li>"Run invoice reconciliation"</li>
                    <li>"Create a sales quote"</li>
                    <li>"Show overdue invoices"</li>
                    <li>"Check inventory levels"</li>
                    <li>"Process payroll"</li>
                  </ul>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <h3 className="text-white font-medium text-sm mb-2 flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-purple-400" />
                    Upload Documents
                  </h3>
                  <p className="text-purple-300/80 text-xs">Click the paperclip icon to upload invoices, receipts, or other documents for automatic processing.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-auto px-6 py-8">
          <div className="max-w-4xl mx-auto space-y-3">
            {/* Quick Actions - Show only at start */}
            {messages.length === 1 && !loading && (
              <div className="mb-8">
                <p className="text-purple-300 text-sm mb-4 text-center font-medium">Quick Actions</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickAction(action.prompt)}
                      className="group relative overflow-hidden rounded-xl p-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-300 text-left hover:scale-[1.02] hover:shadow-xl"
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
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''} animate-fadeIn`}
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
                                    <div className={`inline-block rounded-2xl px-4 py-2 shadow-lg ${
                                      message.role === 'user'
                                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                                        : 'bg-white/10 backdrop-blur-sm text-white border border-white/10'
                                    }`}>
                                      {message.role === 'assistant' ? (
                                        <div className="leading-relaxed">{renderMarkdown(message.content)}</div>
                                      ) : (
                                        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                                      )}
                                    </div>
                  <p className="text-purple-400/60 text-xs mt-2 px-2">
                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && messages[messages.length - 1]?.content === '' && (
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-4 border border-white/10">
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
      </div>

      {/* Modern Input Area with Suggested Prompts */}
      <div className="bg-black/30 backdrop-blur-xl border-t border-white/10 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          {/* Suggested Prompts - Always visible */}
          <div className="flex flex-wrap gap-2 mb-3">
            {suggestedPrompts.slice(0, 4).map((prompt, index) => (
              <button
                key={index}
                onClick={() => handleQuickAction(prompt)}
                disabled={loading}
                className="text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-purple-300 hover:text-white border border-white/10 hover:border-purple-500/30 transition-all duration-200 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
          
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
              className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-purple-300 hover:text-white transition-all duration-200 disabled:opacity-50 hover:scale-105"
              title="Upload document"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <div className="flex-1 relative">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
                placeholder="Ask Aria anything... Try 'List available bots' or 'Run reconciliation'"
                rows={1}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 resize-none transition-all duration-200 text-base"
                style={{ minHeight: '52px', maxHeight: '120px' }}
              />
            </div>
            <button
              onClick={() => sendMessage()}
              disabled={!inputMessage.trim() || loading}
              className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 flex items-center justify-center text-white  transition-all duration-200 disabled:opacity-50 disabled:shadow-none hover:scale-105 disabled:hover:scale-100"
              title="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-purple-400/40 text-xs mt-2 text-center">
            Press Enter to send | Click Bots to see all 67 AI automation bots | Click Help for tips
          </p>
        </div>
      </div>
    </div>
  );
};

export default AskAriaChat;
