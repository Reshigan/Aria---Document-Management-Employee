'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, Input, Button, Avatar, Space, Select, message, Spin, Typography, Divider } from 'antd';
import { 
  SendOutlined, 
  RobotOutlined, 
  UserOutlined, 
  FileTextOutlined,
  ThunderboltOutlined,
  BulbOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import Image from 'next/image';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text, Paragraph } = Typography;

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Document {
  id: number;
  filename: string;
}

interface ARIAChatProps {
  documents: Document[];
  onSendMessage: (message: string, documentId?: number) => Promise<string>;
}

export default function ARIAChat({ documents, onSendMessage }: ARIAChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '👋 Hello! I\'m ARIA, your AI-Powered Document Intelligence Assistant. I can help you:\n\n• Extract information from documents\n• Answer questions about your files\n• Process invoices and receipts\n• Analyze document content\n\nWhat can I help you with today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const quickPrompts = [
    { icon: <FileTextOutlined />, text: 'Summarize this document', color: '#1890ff' },
    { icon: <ThunderboltOutlined />, text: 'Extract key information', color: '#722ed1' },
    { icon: <BulbOutlined />, text: 'What is this document about?', color: '#13c2c2' },
    { icon: <QuestionCircleOutlined />, text: 'Find invoice details', color: '#52c41a' },
  ];

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
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
      const response = await onSendMessage(input, selectedDoc || undefined);
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      message.error('Failed to send message');
      const errorMessage: Message = {
        role: 'assistant',
        content: '❌ I apologize, but I encountered an error processing your request. Please try again or contact support if the issue persists.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
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

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 p-6 rounded-t-2xl">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Image 
              src="/aria-avatar.svg" 
              alt="ARIA" 
              width={60} 
              height={60}
              className="animate-float"
            />
            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
          </div>
          <div>
            <Title level={3} className="text-white m-0">
              ARIA
            </Title>
            <Text className="text-white opacity-90">
              AI Document Intelligence • Online
            </Text>
          </div>
        </div>
        
        {documents.length > 0 && (
          <div className="mt-4">
            <Text className="text-white text-sm mb-2 block">
              Ask me about a specific document:
            </Text>
            <Select
              style={{ width: '100%' }}
              placeholder="Select a document (optional)"
              value={selectedDoc}
              onChange={setSelectedDoc}
              allowClear
              size="large"
            >
              {documents.map(doc => (
                <Option key={doc.id} value={doc.id}>
                  <FileTextOutlined className="mr-2" />
                  {doc.filename}
                </Option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-blue-50 via-purple-50 to-cyan-50">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slideUp`}
            >
              {msg.role === 'assistant' && (
                <Avatar 
                  size={40}
                  src="/aria-avatar.svg"
                  className="flex-shrink-0"
                />
              )}
              
              <div className={`max-w-[70%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                <div
                  className={`p-4 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 rounded-bl-sm shadow-md'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">
                    {msg.content}
                  </div>
                </div>
                <Text type="secondary" className="text-xs mt-1 block">
                  {msg.timestamp.toLocaleTimeString()}
                </Text>
              </div>
              
              {msg.role === 'user' && (
                <Avatar 
                  size={40}
                  icon={<UserOutlined />}
                  className="flex-shrink-0 bg-gradient-to-r from-blue-500 to-purple-500"
                />
              )}
            </div>
          ))}
          
          {loading && (
            <div className="flex gap-3 justify-start animate-slideUp">
              <Avatar 
                size={40}
                src="/aria-avatar.svg"
              />
              <div className="bg-white p-4 rounded-2xl rounded-bl-sm shadow-md">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Prompts */}
      {messages.length <= 1 && !loading && (
        <div className="px-6 py-3 bg-white border-t border-gray-100">
          <Text type="secondary" className="text-sm block mb-2">
            💡 Try these quick prompts:
          </Text>
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt, index) => (
              <Button
                key={index}
                size="small"
                icon={prompt.icon}
                onClick={() => handleQuickPrompt(prompt.text)}
                style={{ 
                  borderColor: prompt.color,
                  color: prompt.color
                }}
                className="hover:shadow-md transition-all"
              >
                {prompt.text}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200 rounded-b-2xl">
        <div className="max-w-4xl mx-auto">
          <Space.Compact style={{ width: '100%' }} size="large">
            <TextArea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask ARIA anything about your documents..."
              autoSize={{ minRows: 1, maxRows: 4 }}
              disabled={loading}
              className="text-base"
              style={{ 
                borderRadius: '12px 0 0 12px',
                resize: 'none'
              }}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={sendMessage}
              loading={loading}
              disabled={!input.trim()}
              size="large"
              style={{ 
                height: 'auto',
                borderRadius: '0 12px 12px 0',
                background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
                border: 'none'
              }}
            >
              Send
            </Button>
          </Space.Compact>
          <Text type="secondary" className="text-xs mt-2 block text-center">
            ARIA uses advanced AI to understand your documents. Responses may vary.
          </Text>
        </div>
      </div>
    </div>
  );
}
