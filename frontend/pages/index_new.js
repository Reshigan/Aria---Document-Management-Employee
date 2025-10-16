import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { 
  DashboardIcon, 
  DocumentIcon, 
  AIIcon, 
  AnalyticsIcon, 
  IntegrationIcon, 
  SettingsIcon,
  UploadIcon,
  ChatIcon,
  MenuIcon,
  CloseIcon,
  LogoutIcon,
  ProcessingIcon,
  SuccessIcon,
  ErrorIcon,
  SearchIcon,
  FilterIcon,
  ViewIcon,
  EditIcon,
  DeleteIcon,
  ARIALogoIcon
} from '../components/icons/ModernIcons';
import Button from '../components/ui/Button';

export default function ModernARIA() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [chatMessages, setChatMessages] = useState([
    { type: 'assistant', content: 'Hello! I\'m ARIA, your AI document assistant. How can I help you today?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    checkAuth();
    fetchDocuments();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/login');
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      if (response.ok) {
        const docs = await response.json();
        setDocuments(docs);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    
    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file', files[0]);

    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setDocuments(prev => [result, ...prev]);
        setChatMessages(prev => [...prev, {
          type: 'assistant',
          content: `✅ Successfully processed "${files[0].name}"! I've extracted the key information and classified the document.`
        }]);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: `❌ Sorry, there was an error processing "${files[0].name}". Please try again.`
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const sendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { type: 'user', content: userMessage }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });

      if (response.ok) {
        const result = await response.json();
        setChatMessages(prev => [...prev, { type: 'assistant', content: result.response }]);
      }
    } catch (error) {
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>ARIA - AI Document Management</title>
        <meta name="description" content="Advanced AI-powered document management system" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`}>
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <ARIALogoIcon className="w-10 h-10" />
              <div>
                <h1 className="text-xl font-bold gradient-text">ARIA</h1>
                <p className="text-sm text-gray-400">AI Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>

          <nav className="p-6 space-y-2">
            <a href="#" className="nav-item active">
              <DashboardIcon className="w-5 h-5" />
              <span>Dashboard</span>
            </a>
            <a href="#" className="nav-item">
              <DocumentIcon className="w-5 h-5" />
              <span>Documents</span>
            </a>
            <a href="#" className="nav-item">
              <AIIcon className="w-5 h-5" />
              <span>AI Classification</span>
            </a>
            <a href="#" className="nav-item">
              <AnalyticsIcon className="w-5 h-5" />
              <span>Analytics</span>
            </a>
            <a href="#" className="nav-item">
              <IntegrationIcon className="w-5 h-5" />
              <span>Integrations</span>
            </a>
            <a href="#" className="nav-item">
              <SettingsIcon className="w-5 h-5" />
              <span>Settings</span>
            </a>
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-white/10">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center text-sm font-bold">
                {user.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.email}</p>
                <p className="text-xs text-gray-400">Online</p>
              </div>
            </div>
            <Button
              onClick={logout}
              variant="danger"
              size="sm"
              className="w-full"
              leftIcon={<LogoutIcon className="w-4 h-4" />}
            >
              Logout
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className={`${sidebarOpen ? 'lg:ml-64' : ''} transition-all duration-300`}>
          {/* Header */}
          <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <MenuIcon className="w-6 h-6" />
                </button>
                <div>
                  <h2 className="text-2xl font-bold">Welcome back!</h2>
                  <p className="text-gray-400">Ready to process some documents?</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm">AI Online</span>
                </div>
              </div>
            </div>
          </header>

          {/* Main Grid */}
          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upload Section */}
            <div className="lg:col-span-2">
              <div
                className={`relative border-2 border-solid border-purple-300 rounded-2xl p-8 text-center transition-all duration-300 ${
                  dragActive 
                    ? 'border-purple-400 bg-purple-500/10 scale-105' 
                    : 'border-gray-600 hover:border-purple-500 hover:bg-purple-500/5'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                />
                
                {isProcessing ? (
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <ProcessingIcon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold">Processing Document...</h3>
                    <p className="text-gray-400">AI is analyzing your document</p>
                    <div className="w-64 mx-auto bg-gray-700 rounded-full h-2">
                      <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <UploadIcon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold">Drop files here or click to upload</h3>
                    <p className="text-gray-400">Supports PDF, DOC, DOCX, TXT, JPG, PNG</p>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="primary"
                      size="lg"
                      leftIcon={<UploadIcon className="w-5 h-5" />}
                    >
                      Choose Files
                    </Button>
                  </div>
                )}
              </div>

              {/* Documents Grid */}
              <div className="mt-6">
                <h3 className="text-xl font-semibold mb-4">Recent Documents ({documents.length})</h3>
                {documents.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <DocumentIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                    <p>No documents yet. Upload your first document to get started!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {documents.slice(0, 6).map((doc, index) => (
                      <div key={index} className="document-card">
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                            <DocumentIcon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold truncate">{doc.filename || `Document ${index + 1}`}</h4>
                            <p className="text-sm text-gray-400 truncate">{doc.classification || 'Processing...'}</p>
                            <div className="flex items-center justify-between mt-3">
                              <div className="flex items-center space-x-2">
                                <span className="status-online text-xs">
                                  <SuccessIcon className="w-3 h-3" />
                                  <span>Processed</span>
                                </span>
                                <span className="text-xs text-gray-500">{new Date().toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <button className="p-1 rounded hover:bg-white/10 transition-colors">
                                  <ViewIcon className="w-4 h-4" />
                                </button>
                                <button className="p-1 rounded hover:bg-white/10 transition-colors">
                                  <EditIcon className="w-4 h-4" />
                                </button>
                                <button className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors">
                                  <DeleteIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Chat Section */}
            <div className="glass rounded-2xl flex flex-col h-[600px]">
              <div className="p-4 border-b border-white/10">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <AIIcon className="w-6 h-6 text-purple-400" />
                  <span>ARIA Assistant</span>
                </h3>
                <p className="text-sm text-gray-400">Ask me anything about your documents</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((message, index) => (
                  <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`chat-bubble ${message.type}`}>
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 border-t border-white/10">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Ask ARIA about your documents..."
                    className="input flex-1"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!chatInput.trim()}
                    variant="primary"
                    leftIcon={<ChatIcon className="w-4 h-4" />}
                  >
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}