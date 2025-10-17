/**
 * AI Chat Page - Advanced conversational interface with Aria AI
 * 
 * Features:
 * - Full-screen chat interface
 * - Document context integration
 * - Real-time WebSocket communication
 * - Advanced AI capabilities showcase
 * - Voice input/output
 * - Chat history and persistence
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, FileText, Zap, MessageSquare, Settings, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import AIChat from '@/components/ai/AIChat';

const AIChatPage: React.FC = () => {
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [chatStats, setChatStats] = useState({
    messagesExchanged: 0,
    documentsAnalyzed: 0,
    timesSaved: 0,
    accuracyRate: 95,
  });

  // Mock user ID - in real app this would come from auth
  const userId = 'user-123';

  // Mock documents for context
  const availableDocuments = [
    { id: 'doc-1', name: 'Q4 Financial Report.pdf', type: 'financial' },
    { id: 'doc-2', name: 'Employee Handbook.docx', type: 'hr' },
    { id: 'doc-3', name: 'Project Proposal.pdf', type: 'project' },
    { id: 'doc-4', name: 'Invoice INV-2024-001.pdf', type: 'invoice' },
    { id: 'doc-5', name: 'Contract Agreement.pdf', type: 'contract' },
  ];

  const handleMessageSent = (message: string) => {
    setChatStats(prev => ({
      ...prev,
      messagesExchanged: prev.messagesExchanged + 1,
    }));
  };

  const handleResponseReceived = (response: string) => {
    setChatStats(prev => ({
      ...prev,
      messagesExchanged: prev.messagesExchanged + 1,
      timesSaved: prev.timesSaved + Math.floor(Math.random() * 5) + 1, // Simulate time saved
    }));
  };

  const toggleDocumentContext = (docId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const quickPrompts = [
    "Analyze the latest financial reports",
    "Summarize all invoices from this month",
    "Find contracts expiring soon",
    "Extract key data from uploaded documents",
    "Generate a workflow automation suggestion",
    "What are the common patterns in our documents?",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Aria AI Assistant
              </h1>
              <p className="text-gray-600 mt-2">
                Your intelligent document management companion with advanced AI capabilities
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI Powered
              </Badge>
              <Badge variant="outline" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Real-time
              </Badge>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 space-y-6"
          >
            {/* Chat Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Chat Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Messages</span>
                  <span className="font-semibold">{chatStats.messagesExchanged}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Documents</span>
                  <span className="font-semibold">{chatStats.documentsAnalyzed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Time Saved</span>
                  <span className="font-semibold">{chatStats.timesSaved}min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Accuracy</span>
                  <span className="font-semibold">{chatStats.accuracyRate}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Document Context */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Document Context
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {availableDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedDocuments.includes(doc.id)
                          ? 'bg-blue-50 border-blue-200'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => toggleDocumentContext(doc.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium truncate">{doc.name}</p>
                          <p className="text-xs text-gray-500 capitalize">{doc.type}</p>
                        </div>
                        {selectedDocuments.includes(doc.id) && (
                          <Badge variant="secondary" className="text-xs">
                            Active
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <Separator className="my-4" />
                <p className="text-xs text-gray-500">
                  Select documents to provide context for AI responses
                </p>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Quick Prompts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {quickPrompts.map((prompt, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="w-full text-left justify-start text-xs h-auto py-2 px-3"
                      onClick={() => {
                        // This would trigger the chat input
                        console.log('Quick prompt:', prompt);
                      }}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Main Chat Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-3"
          >
            <Card className="h-[800px]">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-600" />
                    Intelligent Conversation
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <History className="h-4 w-4 mr-2" />
                      History
                    </Button>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Button>
                  </div>
                </div>
                {selectedDocuments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-sm text-gray-600">Context:</span>
                    {selectedDocuments.map((docId) => {
                      const doc = availableDocuments.find(d => d.id === docId);
                      return doc ? (
                        <Badge key={docId} variant="secondary" className="text-xs">
                          {doc.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </CardHeader>
              <CardContent className="h-full p-0">
                <AIChat
                  userId={userId}
                  contextDocuments={selectedDocuments}
                  className="h-full border-0 shadow-none"
                  onMessageSent={handleMessageSent}
                  onResponseReceived={handleResponseReceived}
                />
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Features Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12"
        >
          <Card>
            <CardHeader>
              <CardTitle>AI Capabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="analysis" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="analysis">Document Analysis</TabsTrigger>
                  <TabsTrigger value="extraction">Data Extraction</TabsTrigger>
                  <TabsTrigger value="workflow">Workflow AI</TabsTrigger>
                  <TabsTrigger value="insights">Smart Insights</TabsTrigger>
                </TabsList>
                
                <TabsContent value="analysis" className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                      <h3 className="font-semibold mb-2">Intelligent OCR</h3>
                      <p className="text-sm text-gray-600">Advanced text recognition with context understanding</p>
                    </div>
                    <div className="text-center p-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <Brain className="h-6 w-6 text-green-600" />
                      </div>
                      <h3 className="font-semibold mb-2">Content Analysis</h3>
                      <p className="text-sm text-gray-600">Deep understanding of document content and structure</p>
                    </div>
                    <div className="text-center p-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <Zap className="h-6 w-6 text-purple-600" />
                      </div>
                      <h3 className="font-semibold mb-2">Real-time Processing</h3>
                      <p className="text-sm text-gray-600">Instant analysis and feedback on document uploads</p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="extraction" className="mt-6">
                  <div className="text-center py-8">
                    <h3 className="text-lg font-semibold mb-4">Advanced Data Extraction</h3>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                      Extract structured data from any document type with high accuracy. 
                      Our AI understands context, relationships, and can handle complex layouts.
                    </p>
                  </div>
                </TabsContent>
                
                <TabsContent value="workflow" className="mt-6">
                  <div className="text-center py-8">
                    <h3 className="text-lg font-semibold mb-4">Workflow Automation</h3>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                      Intelligent workflow suggestions based on document patterns and business rules. 
                      Automate repetitive tasks and optimize your document processing pipeline.
                    </p>
                  </div>
                </TabsContent>
                
                <TabsContent value="insights" className="mt-6">
                  <div className="text-center py-8">
                    <h3 className="text-lg font-semibold mb-4">Smart Insights & Analytics</h3>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                      Discover patterns, anomalies, and trends in your document data. 
                      Get actionable insights to improve efficiency and compliance.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default AIChatPage;