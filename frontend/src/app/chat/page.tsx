'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, Input, Button, List, Avatar, Space, Select, message, Spin } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined, FileTextOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

const { TextArea } = Input;
const { Option } = Select;

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Document {
  id: number;
  filename: string;
}

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m ARIA, your AI document processing assistant. How can I help you today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchDocuments = async () => {
    try {
      const response = await api.get('/documents?limit=100');
      setDocuments(response.data.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      let response;

      if (selectedDoc) {
        response = await api.post('/aria/chat', {
          message: `Document question: ${input}`,
          // question: input
        });

        const assistantMessage: Message = {
          role: 'assistant',
          content: response.data.response,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        response = await api.post('/aria/chat', {
          message: input,
          
          
        });

        const assistantMessage: Message = {
          role: 'assistant',
          content: response.data.message,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      message.error(error.response?.data?.detail || 'Failed to send message');
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

  const getSummary = async () => {
    if (!selectedDoc) {
      message.warning('Please select a document first');
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(`/chat/document/${selectedDoc}/summary?max_words=150`);
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: `📄 Document Summary:\n\n${response.data.summary}`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      message.success('Summary generated!');
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Card
        title={
          <Space>
            <RobotOutlined style={{ fontSize: '24px' }} />
            <span>AI Chat Assistant</span>
          </Space>
        }
        extra={
          <Space>
            <Select
              style={{ width: 250 }}
              placeholder="Select document (optional)"
              allowClear
              value={selectedDoc}
              onChange={setSelectedDoc}
              showSearch
              filterOption={(input, option) =>
                (option?.label as string).toLowerCase().includes(input.toLowerCase())
              }
            >
              {documents.map(doc => (
                <Option key={doc.id} value={doc.id}>
                  <FileTextOutlined /> {doc.filename}
                </Option>
              ))}
            </Select>
            {selectedDoc && (
              <Button type="primary" ghost onClick={getSummary} disabled={loading}>
                Get Summary
              </Button>
            )}
          </Space>
        }
      >
        <div style={{ 
          height: '500px', 
          overflowY: 'auto', 
          marginBottom: '16px',
          padding: '16px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px'
        }}>
          <List
            dataSource={messages}
            renderItem={(msg) => (
              <List.Item
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  border: 'none',
                  padding: '8px 0'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  maxWidth: '70%'
                }}>
                  <Avatar
                    icon={msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                    style={{
                      backgroundColor: msg.role === 'user' ? '#1890ff' : '#52c41a',
                      margin: msg.role === 'user' ? '0 0 0 8px' : '0 8px 0 0'
                    }}
                  />
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      backgroundColor: msg.role === 'user' ? '#1890ff' : '#fff',
                      color: msg.role === 'user' ? '#fff' : '#000',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              </List.Item>
            )}
          />
          <div ref={messagesEndRef} />
          {loading && (
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <Spin tip="Thinking..." />
            </div>
          )}
        </div>

        <Space.Compact style={{ width: '100%' }}>
          <TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              selectedDoc
                ? 'Ask a question about the selected document...'
                : 'Type your message... (Shift+Enter for new line)'
            }
            autoSize={{ minRows: 1, maxRows: 4 }}
            disabled={loading}
            style={{ flex: 1 }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            size="large"
          >
            Send
          </Button>
        </Space.Compact>

        {selectedDoc && (
          <div style={{ marginTop: '16px', color: '#666', fontSize: '12px' }}>
            💡 Tip: You can ask questions like "What is the total amount?", "Who is the vendor?", or "When is the payment due?"
          </div>
        )}
      </Card>
    </div>
  );
}
