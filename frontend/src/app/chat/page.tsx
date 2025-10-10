'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Input, Button, List, Avatar, Typography, Space, Card, Upload, 
  message, Spin, Tag, Divider, Tooltip, Modal
} from 'antd';
import { 
  SendOutlined, RobotOutlined, UserOutlined, PaperClipOutlined,
  FileTextOutlined, HistoryOutlined, ClearOutlined, QuestionCircleOutlined,
  MessageOutlined, BulbOutlined, SearchOutlined
} from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

const { TextArea } = Input;
const { Text, Title } = Typography;

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  document_id?: number;
  document_name?: string;
  attachments?: any[];
  metadata?: any;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: Date;
  message_count: number;
}

export default function ChatPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const documentId = searchParams.get('doc');
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<any>(null);

  useEffect(() => {
    loadChatSessions();
    if (documentId) {
      // Start a new chat session with document context
      startDocumentChat(parseInt(documentId));
    } else {
      // Load or create default session
      createNewSession();
    }
  }, [documentId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatSessions = async () => {
    try {
      // Mock data for now - replace with real API call
      const mockSessions: ChatSession[] = [
        {
          id: '1',
          title: 'Document Analysis Session',
          created_at: new Date(Date.now() - 86400000),
          message_count: 12
        },
        {
          id: '2', 
          title: 'Invoice Processing Help',
          created_at: new Date(Date.now() - 172800000),
          message_count: 8
        }
      ];
      setChatSessions(mockSessions);
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    }
  };

  const createNewSession = async () => {
    const sessionId = `session_${Date.now()}`;
    setCurrentSessionId(sessionId);
    setMessages([
      {
        id: '1',
        type: 'assistant',
        content: `Hello ${user?.username || 'there'}! I'm ARIA, your AI assistant for document management. I can help you with:

• 📄 **Document Analysis** - Ask questions about your uploaded documents
• 🔍 **Search & Find** - Help you locate specific documents or information  
• 📊 **Data Extraction** - Extract specific fields or information from documents
• 🔄 **Workflow Guidance** - Guide you through document processing workflows
• 💡 **Best Practices** - Provide tips for better document management

How can I assist you today?`,
        timestamp: new Date(),
      }
    ]);
  };

  const startDocumentChat = async (docId: number) => {
    try {
      // Get document info
      const docResponse = await api.get(`/api/v1/documents/${docId}`);
      const sessionId = `doc_session_${docId}_${Date.now()}`;
      setCurrentSessionId(sessionId);
      
      setMessages([
        {
          id: '1',
          type: 'assistant',
          content: `I'm ready to help you with the document "${docResponse.filename}". I can analyze its content, extract information, or answer any questions you have about it.

What would you like to know about this document?`,
          timestamp: new Date(),
          document_id: docId,
          document_name: docResponse.filename
        }
      ]);
    } catch (error) {
      console.error('Failed to start document chat:', error);
      createNewSession();
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      // Simulate AI response - replace with real API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const aiResponse = await generateAIResponse(userMessage.content, documentId);
      
      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        type: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
        document_id: documentId ? parseInt(documentId) : undefined
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      message.error('Failed to get AI response');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const generateAIResponse = async (userInput: string, docId?: string): Promise<string> => {
    // Mock AI responses based on input patterns
    const input = userInput.toLowerCase();
    
    if (input.includes('document') && docId) {
      return `I can see you're asking about the document. Based on the document content, here's what I found:

• **Document Type**: Text file
• **Status**: Processed
• **Content Preview**: "Test document content for API testing"

Would you like me to extract specific information or perform any analysis on this document?`;
    }
    
    if (input.includes('extract') || input.includes('find')) {
      return `I can help you extract information from documents. Here are some common extraction tasks I can perform:

• **Invoice Data**: Invoice numbers, dates, amounts, vendor information
• **Contact Information**: Names, addresses, phone numbers, emails
• **Dates & Numbers**: Any dates, monetary amounts, or reference numbers
• **Custom Fields**: Specific data points you're looking for

What specific information would you like me to extract?`;
    }
    
    if (input.includes('workflow') || input.includes('process')) {
      return `Here's how the document processing workflow works in ARIA:

1. **Upload** 📤 - Documents are uploaded to the system
2. **OCR Processing** 🔍 - Text and data are extracted using AI
3. **Validation** ✅ - Extracted data is validated for accuracy
4. **SAP Integration** 🔄 - Documents can be posted to SAP automatically
5. **Archive** 📁 - Processed documents are stored and indexed

Which part of the workflow would you like to know more about?`;
    }
    
    if (input.includes('search') || input.includes('find')) {
      return `I can help you search for documents using various criteria:

• **Text Search**: Search within document content
• **Metadata Search**: Find by filename, date, type, etc.
• **Tag-based Search**: Search by assigned tags
• **Advanced Filters**: Combine multiple search criteria

What are you looking for? I can help you build the right search query.`;
    }
    
    if (input.includes('help') || input.includes('how')) {
      return `I'm here to help! Here are some things you can ask me:

• "How do I upload a document?"
• "Extract the invoice number from this document"
• "Find all documents from last month"
• "What's the status of document processing?"
• "How do I post a document to SAP?"

Feel free to ask me anything about document management, and I'll do my best to help!`;
    }
    
    // Default response
    return `I understand you're asking about "${userInput}". While I'm still learning, I can help you with:

• Document analysis and information extraction
• Workflow guidance and best practices  
• Search and document management tasks
• SAP integration questions

Could you provide more specific details about what you'd like to accomplish?`;
  };

  const clearChat = () => {
    Modal.confirm({
      title: 'Clear Chat History',
      content: 'Are you sure you want to clear all messages in this chat?',
      onOk: () => {
        setMessages([]);
        createNewSession();
      }
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'user':
        return <UserOutlined style={{ color: '#1890ff' }} />;
      case 'assistant':
        return <RobotOutlined style={{ color: '#52c41a' }} />;
      case 'system':
        return <MessageOutlined style={{ color: '#722ed1' }} />;
      default:
        return <MessageOutlined />;
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Particle Background */}
      <div className="particles">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 6}s`,
              animationDuration: `${4 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>

      <div style={{ 
        padding: '24px', 
        maxWidth: '1200px', 
        margin: '0 auto', 
        position: 'relative', 
        zIndex: 1,
        height: 'calc(100vh - 48px)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div className="futuristic-card" style={{ padding: '20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'linear-gradient(45deg, var(--accent-neon), var(--primary-cyan))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(0, 255, 136, 0.4)'
              }}>
                <RobotOutlined style={{ fontSize: '24px', color: 'white' }} />
              </div>
              <div>
                <Title level={3} className="glow-text" style={{ margin: 0 }}>
                  ARIA AI Assistant
                </Title>
                <Text style={{ color: 'var(--text-secondary)' }}>
                  {documentId ? 'Document Analysis Mode' : 'General Chat Mode'}
                </Text>
              </div>
            </div>
            
            <Space>
              <Tooltip title="Chat History">
                <Button 
                  icon={<HistoryOutlined />}
                  onClick={() => setShowHistory(!showHistory)}
                  className="neon-button-secondary"
                />
              </Tooltip>
              <Tooltip title="Clear Chat">
                <Button 
                  icon={<ClearOutlined />}
                  onClick={clearChat}
                  className="neon-button-secondary"
                />
              </Tooltip>
              <Tooltip title="Help">
                <Button 
                  icon={<QuestionCircleOutlined />}
                  className="neon-button-secondary"
                />
              </Tooltip>
            </Space>
          </div>
        </div>

        {/* Chat Messages */}
        <div 
          className="futuristic-card" 
          style={{ 
            flex: 1, 
            padding: '20px',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            paddingRight: '8px',
            marginBottom: '16px'
          }}>
            <List
              dataSource={messages}
              renderItem={(message) => (
                <List.Item style={{ border: 'none', padding: '12px 0' }}>
                  <div style={{ 
                    width: '100%',
                    display: 'flex',
                    justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start'
                  }}>
                    <div 
                      className="message-bubble"
                      style={{
                        maxWidth: '70%',
                        padding: '16px 20px',
                        borderRadius: '16px',
                        background: message.type === 'user' 
                          ? 'linear-gradient(135deg, var(--primary-cyan), var(--accent-neon))'
                          : 'rgba(26, 26, 46, 0.8)',
                        border: message.type === 'user' 
                          ? 'none'
                          : '1px solid var(--border-glow)',
                        color: message.type === 'user' ? 'white' : 'var(--text-primary)',
                        boxShadow: message.type === 'user'
                          ? '0 4px 20px rgba(0, 245, 255, 0.3)'
                          : '0 4px 20px rgba(0, 0, 0, 0.3)'
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        marginBottom: '8px'
                      }}>
                        <Avatar 
                          size="small" 
                          icon={getMessageIcon(message.type)}
                          style={{
                            background: message.type === 'user' 
                              ? 'rgba(255, 255, 255, 0.2)'
                              : 'var(--accent-neon)'
                          }}
                        />
                        <Text 
                          style={{ 
                            fontSize: '12px',
                            color: message.type === 'user' 
                              ? 'rgba(255, 255, 255, 0.8)'
                              : 'var(--text-secondary)'
                          }}
                        >
                          {message.type === 'user' ? user?.username || 'You' : 'ARIA'}
                          <span style={{ marginLeft: '8px' }}>
                            {formatTimestamp(message.timestamp)}
                          </span>
                        </Text>
                      </div>
                      
                      <div style={{ 
                        whiteSpace: 'pre-wrap',
                        lineHeight: '1.5',
                        fontSize: '14px'
                      }}>
                        {message.content}
                      </div>
                      
                      {message.document_name && (
                        <div style={{ 
                          marginTop: '12px',
                          padding: '8px 12px',
                          background: 'rgba(0, 245, 255, 0.1)',
                          borderRadius: '8px',
                          border: '1px solid rgba(0, 245, 255, 0.2)'
                        }}>
                          <Space>
                            <FileTextOutlined style={{ color: 'var(--primary-cyan)' }} />
                            <Text style={{ 
                              fontSize: '12px',
                              color: 'var(--primary-cyan)'
                            }}>
                              {message.document_name}
                            </Text>
                          </Space>
                        </div>
                      )}
                    </div>
                  </div>
                </List.Item>
              )}
            />
            
            {loading && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'flex-start',
                padding: '12px 0'
              }}>
                <div 
                  className="message-bubble"
                  style={{
                    padding: '16px 20px',
                    borderRadius: '16px',
                    background: 'rgba(26, 26, 46, 0.8)',
                    border: '1px solid var(--border-glow)',
                  }}
                >
                  <Space>
                    <Avatar 
                      size="small" 
                      icon={<RobotOutlined />}
                      style={{ background: 'var(--accent-neon)' }}
                    />
                    <Spin size="small" />
                    <Text style={{ color: 'var(--text-secondary)' }}>
                      ARIA is thinking...
                    </Text>
                  </Space>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="futuristic-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <TextArea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask ARIA anything about your documents..."
                autoSize={{ minRows: 1, maxRows: 4 }}
                style={{
                  background: 'rgba(26, 26, 46, 0.6)',
                  border: '1px solid var(--border-glow)',
                  borderRadius: '12px',
                  color: 'var(--text-primary)',
                  resize: 'none'
                }}
              />
            </div>
            
            <Space>
              <Upload
                showUploadList={false}
                beforeUpload={() => false}
                onChange={(info) => {
                  message.info('File attachment feature coming soon!');
                }}
              >
                <Button 
                  icon={<PaperClipOutlined />}
                  className="neon-button-secondary"
                  style={{ height: '40px' }}
                />
              </Upload>
              
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={sendMessage}
                loading={loading}
                disabled={!inputValue.trim()}
                className="neon-button"
                style={{ height: '40px', minWidth: '80px' }}
              >
                Send
              </Button>
            </Space>
          </div>
          
          <div style={{ 
            marginTop: '12px',
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap'
          }}>
            <Tag 
              icon={<BulbOutlined />}
              style={{ cursor: 'pointer' }}
              onClick={() => setInputValue('How do I upload a document?')}
            >
              How to upload
            </Tag>
            <Tag 
              icon={<SearchOutlined />}
              style={{ cursor: 'pointer' }}
              onClick={() => setInputValue('Help me find documents from last week')}
            >
              Search help
            </Tag>
            <Tag 
              icon={<FileTextOutlined />}
              style={{ cursor: 'pointer' }}
              onClick={() => setInputValue('Extract invoice data from my document')}
            >
              Extract data
            </Tag>
          </div>
        </div>
      </div>
    </>
  );
}