import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { 
  ChatBubbleLeftRightIcon, 
  DocumentMagnifyingGlassIcon,
  CogIcon,
  ChartBarIcon,
  SparklesIcon,
  RocketLaunchIcon,
  LightBulbIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
  UserIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline';

const AiBotPage = () => {
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [botCapabilities, setBotCapabilities] = useState([]);
  const [documentAnalysis, setDocumentAnalysis] = useState(null);
  const [workflowSuggestions, setWorkflowSuggestions] = useState(null);
  const [predictiveInsights, setPredictiveInsights] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchBotCapabilities();
    // Add welcome message
    setMessages([{
      id: 1,
      type: 'bot',
      content: 'Hello! I\'m Aria, your intelligent document management assistant. I can help you with document analysis, workflow automation, predictive insights, and much more. How can I assist you today?',
      timestamp: new Date().toISOString(),
      suggestions: ['Analyze a document', 'Get workflow suggestions', 'View predictive insights', 'Help with document management']
    }]);
  }, []);

  const fetchBotCapabilities = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/proxy/bot/capabilities', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setBotCapabilities(data.capabilities || []);
      }
    } catch (error) {
      console.error('Error fetching bot capabilities:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/proxy/bot/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: inputMessage,
          context: { user_role: 'admin' }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const botMessage = {
          id: Date.now() + 1,
          type: 'bot',
          content: data.message,
          timestamp: data.timestamp,
          suggestions: data.suggested_actions,
          confidence: data.confidence,
          sources: data.sources
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeDocument = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/proxy/bot/analyze-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          document_id: 'sample-doc-123',
          content: 'This is a sample contract for software development services with payment terms and deliverables.',
          metadata: { type: 'contract', department: 'legal' }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setDocumentAnalysis(data);
      }
    } catch (error) {
      console.error('Error analyzing document:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWorkflowSuggestions = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/proxy/bot/workflow-suggestions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setWorkflowSuggestions(data);
      }
    } catch (error) {
      console.error('Error fetching workflow suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPredictiveInsights = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/proxy/bot/predictive-insights', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPredictiveInsights(data);
      }
    } catch (error) {
      console.error('Error fetching predictive insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const tabs = [
    { id: 'chat', name: 'AI Chat', icon: ChatBubbleLeftRightIcon },
    { id: 'analysis', name: 'Document Analysis', icon: DocumentMagnifyingGlassIcon },
    { id: 'workflows', name: 'Workflow Automation', icon: CogIcon },
    { id: 'insights', name: 'Predictive Insights', icon: ChartBarIcon }
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                  <SparklesIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Aria AI Bot</h1>
                  <p className="text-sm text-gray-500">Intelligent Document Management Assistant</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Capabilities Overview */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { icon: RocketLaunchIcon, title: 'Smart Automation', desc: 'Intelligent workflow suggestions', color: 'blue' },
              { icon: LightBulbIcon, title: 'AI Insights', desc: 'Predictive analytics & trends', color: 'yellow' },
              { icon: ShieldCheckIcon, title: 'Compliance Check', desc: 'Automated compliance monitoring', color: 'green' },
              { icon: DocumentMagnifyingGlassIcon, title: 'Document Analysis', desc: 'Deep content understanding', color: 'purple' }
            ].map((capability, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                <div className={`inline-flex p-3 rounded-lg bg-${capability.color}-100 mb-4`}>
                  <capability.icon className={`h-6 w-6 text-${capability.color}-600`} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{capability.title}</h3>
                <p className="text-sm text-gray-600">{capability.desc}</p>
              </div>
            ))}
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6" aria-label="Tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                  >
                    <tab.icon className="h-5 w-5" />
                    <span>{tab.name}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'chat' && (
                <div className="space-y-6">
                  {/* Chat Messages */}
                  <div className="bg-gray-50 rounded-lg p-4 h-96 overflow-y-auto">
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.type === 'user' 
                              ? 'bg-blue-500 text-white' 
                              : message.isError 
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : 'bg-white text-gray-800 border border-gray-200'
                          }`}>
                            <div className="flex items-start space-x-2">
                              {message.type === 'bot' && (
                                <ComputerDesktopIcon className="h-5 w-5 mt-0.5 text-blue-500" />
                              )}
                              {message.type === 'user' && (
                                <UserIcon className="h-5 w-5 mt-0.5 text-white" />
                              )}
                              <div className="flex-1">
                                <p className="text-sm">{message.content}</p>
                                {message.suggestions && (
                                  <div className="mt-2 space-y-1">
                                    {message.suggestions.map((suggestion, index) => (
                                      <button
                                        key={index}
                                        onClick={() => setInputMessage(suggestion)}
                                        className="block w-full text-left text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                                      >
                                        {suggestion}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {message.confidence && (
                                  <div className="mt-1 text-xs text-gray-500">
                                    Confidence: {Math.round(message.confidence * 100)}%
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="bg-white text-gray-800 border border-gray-200 px-4 py-2 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <ArrowPathIcon className="h-4 w-4 animate-spin text-blue-500" />
                              <span className="text-sm">Aria is thinking...</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Chat Input */}
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask Aria anything about document management..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isLoading}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={isLoading || !inputMessage.trim()}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      <PaperAirplaneIcon className="h-4 w-4" />
                      <span>Send</span>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'analysis' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Document Analysis</h3>
                    <button
                      onClick={analyzeDocument}
                      disabled={isLoading}
                      className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 flex items-center space-x-2"
                    >
                      {isLoading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <DocumentMagnifyingGlassIcon className="h-4 w-4" />}
                      <span>Analyze Sample Document</span>
                    </button>
                  </div>

                  {documentAnalysis && (
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
                      <h4 className="font-semibold text-gray-900 mb-4">Analysis Results</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h5 className="font-medium text-gray-700 mb-2">Insights</h5>
                          <ul className="space-y-1">
                            {documentAnalysis.insights.map((insight, index) => (
                              <li key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                                <span className="text-purple-500">•</span>
                                <span>{insight}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-700 mb-2">Categories</h5>
                          <div className="flex flex-wrap gap-2">
                            {documentAnalysis.categories.map((category, index) => (
                              <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                                {category}
                              </span>
                            ))}
                          </div>
                          <div className="mt-4">
                            <span className="text-sm text-gray-600">
                              Confidence: <span className="font-medium">{Math.round(documentAnalysis.confidence_score * 100)}%</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'workflows' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Workflow Automation</h3>
                    <button
                      onClick={fetchWorkflowSuggestions}
                      disabled={isLoading}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center space-x-2"
                    >
                      {isLoading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CogIcon className="h-4 w-4" />}
                      <span>Get Suggestions</span>
                    </button>
                  </div>

                  {workflowSuggestions && (
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border border-green-200">
                      <h4 className="font-semibold text-gray-900 mb-4">Automation Suggestions</h4>
                      <div className="space-y-4">
                        {workflowSuggestions.suggestions.map((suggestion, index) => (
                          <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="flex justify-between items-start mb-2">
                              <h5 className="font-medium text-gray-900">{suggestion.type.replace('_', ' ').toUpperCase()}</h5>
                              <span className="text-sm text-green-600 font-medium">
                                {Math.round(suggestion.confidence * 100)}% confidence
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{suggestion.description}</p>
                            <div className="text-xs text-blue-600">
                              Potential time saved: {suggestion.potential_time_saved}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Total potential time saved:</strong> {workflowSuggestions.potential_time_saved}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'insights' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Predictive Insights</h3>
                    <button
                      onClick={fetchPredictiveInsights}
                      disabled={isLoading}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center space-x-2"
                    >
                      {isLoading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <ChartBarIcon className="h-4 w-4" />}
                      <span>Generate Insights</span>
                    </button>
                  </div>

                  {predictiveInsights && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-6 border border-blue-200">
                          <h4 className="font-semibold text-gray-900 mb-3">Document Trends</h4>
                          <div className="space-y-2 text-sm">
                            <p><strong>Upload Patterns:</strong> {predictiveInsights.insights.document_trends.upload_patterns}</p>
                            <p><strong>Processing Time:</strong> {predictiveInsights.insights.document_trends.processing_times}</p>
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                          <h4 className="font-semibold text-gray-900 mb-3">User Behavior</h4>
                          <div className="space-y-2 text-sm">
                            <p><strong>Active Hours:</strong> {predictiveInsights.insights.user_behavior.active_hours}</p>
                            <p><strong>Feature Usage:</strong> {predictiveInsights.insights.user_behavior.feature_usage}</p>
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-6 border border-orange-200">
                          <h4 className="font-semibold text-gray-900 mb-3">System Performance</h4>
                          <div className="space-y-2 text-sm">
                            <p><strong>Expected Load:</strong> {predictiveInsights.insights.system_performance.expected_load}</p>
                            <p><strong>Resource Usage:</strong> {predictiveInsights.insights.system_performance.resource_utilization}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
                        <h4 className="font-semibold text-gray-900 mb-4">AI Recommendations</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {predictiveInsights.recommendations.map((recommendation, index) => (
                            <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                              <p className="text-sm text-gray-700">{recommendation}</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 text-center">
                          <span className="text-sm text-purple-600 font-medium">
                            Confidence: {Math.round(predictiveInsights.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AiBotPage;