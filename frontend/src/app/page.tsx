'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Typography, Row, Col, Card } from 'antd';
import {
  RobotOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  CloudUploadOutlined,
  MessageOutlined,
  RocketOutlined,
  StarFilled
} from '@ant-design/icons';
import Image from 'next/image';

const { Title, Text, Paragraph } = Typography;

export default function Home() {
  const router = useRouter();

  // Skip authentication and go directly to chat
  useEffect(() => {
    router.push('/chat');
  }, [router]);

  return (
    <div className="min-h-screen" style={{ position: 'relative', zIndex: 1 }}>
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-center items-center mb-6">
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: 'linear-gradient(45deg, var(--primary-cyan), var(--primary-blue))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 40px rgba(0, 245, 255, 0.4)',
                marginRight: '24px'
              }}>
                <RobotOutlined style={{ fontSize: '60px', color: 'white' }} />
              </div>
              <div>
                <h1 className="glow-text" style={{ 
                  fontSize: '4rem', 
                  fontWeight: '700', 
                  margin: '0 0 8px 0',
                  background: 'linear-gradient(45deg, var(--primary-cyan), var(--accent-neon))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  ARIA
                </h1>
                <p style={{ 
                  fontSize: '1.5rem', 
                  color: 'var(--text-secondary)',
                  margin: 0
                }}>
                  AI Document Intelligence Platform
                </p>
              </div>
            </div>
            <p style={{ 
              fontSize: '1.25rem', 
              color: 'var(--text-primary)', 
              maxWidth: '800px', 
              margin: '0 auto',
              lineHeight: '1.6'
            }}>
              Intelligent document processing with AI-powered analysis, OCR, and automated workflows.
              Transform your document management with cutting-edge artificial intelligence.
            </p>
          </div>

        {/* Features Grid */}
        <Row gutter={[24, 24]} className="mb-12">
          <Col xs={24} sm={12} lg={8}>
            <Card 
              className="h-full hover:shadow-lg transition-shadow duration-300 border-0 shadow-md"
              bodyStyle={{ padding: '32px' }}
            >
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <RobotOutlined className="text-3xl text-blue-600" />
                </div>
                <Title level={4} className="mb-3">AI-Powered Analysis</Title>
                <Text className="text-gray-600">
                  Advanced machine learning algorithms analyze and extract insights from your documents automatically.
                </Text>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Card 
              className="h-full hover:shadow-lg transition-shadow duration-300 border-0 shadow-md"
              bodyStyle={{ padding: '32px' }}
            >
              <div className="text-center">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileTextOutlined className="text-3xl text-green-600" />
                </div>
                <Title level={4} className="mb-3">Smart OCR</Title>
                <Text className="text-gray-600">
                  Extract text and data from scanned documents, images, and PDFs with industry-leading accuracy.
                </Text>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Card 
              className="h-full hover:shadow-lg transition-shadow duration-300 border-0 shadow-md"
              bodyStyle={{ padding: '32px' }}
            >
              <div className="text-center">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ThunderboltOutlined className="text-3xl text-purple-600" />
                </div>
                <Title level={4} className="mb-3">Lightning Fast</Title>
                <Text className="text-gray-600">
                  Process thousands of documents in minutes with optimized AI models and cloud infrastructure.
                </Text>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Card 
              className="h-full hover:shadow-lg transition-shadow duration-300 border-0 shadow-md"
              bodyStyle={{ padding: '32px' }}
            >
              <div className="text-center">
                <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <SafetyOutlined className="text-3xl text-orange-600" />
                </div>
                <Title level={4} className="mb-3">Enterprise Security</Title>
                <Text className="text-gray-600">
                  Bank-level encryption and compliance with industry standards ensure your data stays secure.
                </Text>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Card 
              className="h-full hover:shadow-lg transition-shadow duration-300 border-0 shadow-md"
              bodyStyle={{ padding: '32px' }}
            >
              <div className="text-center">
                <div className="bg-cyan-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CloudUploadOutlined className="text-3xl text-cyan-600" />
                </div>
                <Title level={4} className="mb-3">Cloud Integration</Title>
                <Text className="text-gray-600">
                  Seamlessly integrate with your existing cloud storage and enterprise systems.
                </Text>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Card 
              className="h-full hover:shadow-lg transition-shadow duration-300 border-0 shadow-md"
              bodyStyle={{ padding: '32px' }}
            >
              <div className="text-center">
                <div className="bg-pink-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageOutlined className="text-3xl text-pink-600" />
                </div>
                <Title level={4} className="mb-3">Interactive Chat</Title>
                <Text className="text-gray-600">
                  Chat with ARIA to get instant insights and answers about your documents.
                </Text>
              </div>
            </Card>
          </Col>
        </Row>

        {/* CTA Section */}
        <div className="text-center bg-white rounded-2xl p-8 shadow-lg">
          <div className="flex justify-center mb-4">
            <StarFilled className="text-yellow-400 text-2xl mx-1" />
            <StarFilled className="text-yellow-400 text-2xl mx-1" />
            <StarFilled className="text-yellow-400 text-2xl mx-1" />
            <StarFilled className="text-yellow-400 text-2xl mx-1" />
            <StarFilled className="text-yellow-400 text-2xl mx-1" />
          </div>
          <Title level={2} className="mb-4">Ready to Transform Your Document Workflow?</Title>
          <Paragraph className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
            Join thousands of organizations already using ARIA to streamline their document processing 
            and unlock valuable insights from their data.
          </Paragraph>
          <div className="space-x-4">
            <Button 
              type="primary" 
              size="large" 
              icon={<MessageOutlined />}
              onClick={() => router.push('/chat')}
              className="bg-gradient-to-r from-blue-500 to-purple-600 border-0 h-12 px-8 text-lg"
            >
              Start Chatting with ARIA
            </Button>
            <Button 
              size="large" 
              icon={<RocketOutlined />}
              onClick={() => router.push('/dashboard')}
              className="h-12 px-8 text-lg"
            >
              View Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
    </React.Fragment>
  );
}