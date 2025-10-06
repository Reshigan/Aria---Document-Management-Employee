'use client';

import { useState, useRef, useEffect } from 'react';
import { Select, message } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined, FileTextOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

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
      const response = await api.post('/aria/chat', {
        message: input,
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.response || response.data.message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="futuristic-card" style={{ padding: '32px' }}>
          {/* Header */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '24px',
            borderBottom: '1px solid var(--border-glow)',
            paddingBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'linear-gradient(45deg, var(--primary-cyan), var(--primary-blue))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(0, 245, 255, 0.3)'
              }}>
                <RobotOutlined style={{ fontSize: '24px', color: 'white' }} />
              </div>
              <h1 className="glow-text" style={{ fontSize: '24px', fontWeight: '600', margin: 0 }}>
                AI Chat Assistant
              </h1>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Select
                style={{ width: 250 }}
                placeholder="Select document (optional)"
                allowClear
                value={selectedDoc}
                onChange={setSelectedDoc}
                showSearch
                className="holo-input"
                dropdownStyle={{
                  background: 'var(--dark-surface)',
                  border: '1px solid var(--border-glow)',
                  borderRadius: '8px'
                }}
                filterOption={(input, option) =>
                  (option?.label as string).toLowerCase().includes(input.toLowerCase())
                }
              >
                {documents.map(doc => (
                  <Option key={doc.id} value={doc.id} label={doc.filename}>
                    <FileTextOutlined /> {doc.filename}
                  </Option>
                ))}
              </Select>
              {selectedDoc && (
                <button className="neon-button" onClick={getSummary} disabled={loading}>
                  Get Summary
                </button>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div style={{ 
            height: '500px', 
            overflowY: 'auto', 
            marginBottom: '24px',
            padding: '16px',
            background: 'rgba(10, 10, 15, 0.3)',
            borderRadius: '12px',
            border: '1px solid var(--border-glow)',
            backdropFilter: 'blur(10px)'
          }}>
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`message-bubble ${msg.role === 'user' ? 'message-user' : 'message-ai'}`}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  gap: '12px'
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: msg.role === 'user' 
                    ? 'linear-gradient(45deg, var(--primary-blue), var(--primary-purple))'
                    : 'linear-gradient(45deg, var(--primary-cyan), var(--accent-neon))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: msg.role === 'user'
                    ? '0 0 15px rgba(0, 102, 255, 0.4)'
                    : '0 0 15px rgba(0, 245, 255, 0.4)',
                  flexShrink: 0
                }}>
                  {msg.role === 'user' ? 
                    <UserOutlined style={{ fontSize: '18px', color: 'white' }} /> : 
                    <RobotOutlined style={{ fontSize: '18px', color: 'white' }} />
                  }
                </div>
                <div style={{
                  flex: 1,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: 'var(--text-primary)',
                  lineHeight: '1.6'
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            
            <div ref={messagesEndRef} />
            
            {loading && (
              <div className="message-bubble message-ai" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(45deg, var(--primary-cyan), var(--accent-neon))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 15px rgba(0, 245, 255, 0.4)',
                  flexShrink: 0
                }}>
                  <RobotOutlined style={{ fontSize: '18px', color: 'white' }} />
                </div>
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <span style={{ marginLeft: '8px', color: 'var(--text-secondary)' }}>
                    ARIA is thinking...
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            alignItems: 'flex-end',
            padding: '16px',
            background: 'rgba(26, 26, 46, 0.4)',
            borderRadius: '12px',
            border: '1px solid var(--border-glow)'
          }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                selectedDoc
                  ? 'Ask a question about the selected document...'
                  : 'Type your message... (Shift+Enter for new line)'
              }
              disabled={loading}
              className="holo-input"
              style={{
                flex: 1,
                minHeight: '48px',
                maxHeight: '120px',
                resize: 'none',
                fontFamily: 'inherit'
              }}
            />
            <button
              className="neon-button"
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              style={{
                height: '48px',
                minWidth: '100px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <SendOutlined />
              Send
            </button>
          </div>

          {selectedDoc && (
            <div style={{ 
              marginTop: '16px', 
              color: 'var(--text-muted)', 
              fontSize: '12px',
              textAlign: 'center',
              padding: '8px',
              background: 'rgba(0, 245, 255, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(0, 245, 255, 0.1)'
            }}>
              💡 Tip: You can ask questions like "What is the total amount?", "Who is the vendor?", or "When is the payment due?"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}