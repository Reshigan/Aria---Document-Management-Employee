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
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';

const { Title, Text, Paragraph } = Typography;

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const features = [
    {
      icon: <FileTextOutlined className="text-4xl" />,
      title: 'Smart OCR',
      description: 'Extract text from any document with industry-leading accuracy',
      color: '#1890ff',
    },
    {
      icon: <RobotOutlined className="text-4xl" />,
      title: 'AI Assistant',
      description: 'Chat with your documents and get instant answers',
      color: '#722ed1',
    },
    {
      icon: <ThunderboltOutlined className="text-4xl" />,
      title: 'Lightning Fast',
      description: 'Process thousands of documents in seconds',
      color: '#fa8c16',
    },
    {
      icon: <SafetyOutlined className="text-4xl" />,
      title: 'Enterprise Security',
      description: 'Bank-level encryption and compliance',
      color: '#52c41a',
    },
    {
      icon: <CloudUploadOutlined className="text-4xl" />,
      title: 'Cloud Storage',
      description: 'Secure, scalable, and accessible anywhere',
      color: '#13c2c2',
    },
    {
      icon: <MessageOutlined className="text-4xl" />,
      title: 'Smart Notifications',
      description: 'Email, Slack, and Teams integrations',
      color: '#eb2f96',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">
          <Image src="/aria-avatar.svg" alt="ARIA" width={100} height={100} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-cyan-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 bg-blue-200 rounded-full blur-3xl opacity-20 -top-48 -left-48 animate-float"></div>
          <div className="absolute w-96 h-96 bg-purple-200 rounded-full blur-3xl opacity-20 top-1/3 -right-48 animate-float" style={{ animationDelay: '1s' }}></div>
          <div className="absolute w-96 h-96 bg-cyan-200 rounded-full blur-3xl opacity-20 bottom-0 left-1/3 animate-float" style={{ animationDelay: '2s' }}></div>
        </div>

        {/* Content */}
        <div className="relative container mx-auto px-6 py-20">
          {/* Header */}
          <div className="flex justify-between items-center mb-20">
            <div className="flex items-center gap-3 animate-slideInLeft">
              <Image src="/aria-avatar.svg" alt="ARIA Logo" width={60} height={60} className="animate-float" />
              <div>
                <Title level={3} className="m-0 gradient-text" style={{ fontSize: '32px' }}>ARIA</Title>
                <Text type="secondary" className="text-sm">AI Document Intelligence</Text>
              </div>
            </div>
            <div className="flex gap-3 animate-slideInRight">
              <Button size="large" onClick={() => router.push('/login')}>
                Sign In
              </Button>
              <Button type="primary" size="large" icon={<RocketOutlined />} onClick={() => router.push('/register')}>
                Get Started Free
              </Button>
            </div>
          </div>

          {/* Hero Content */}
          <div className="text-center max-w-4xl mx-auto mb-20">
            <div className="animate-slideDown">
              <Title level={1} className="mb-6" style={{ fontSize: '56px', fontWeight: '800' }}>
                Transform Your Documents with{' '}
                <span className="gradient-text">AI Intelligence</span>
              </Title>
              <Paragraph className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                ARIA uses cutting-edge AI to extract, analyze, and understand your documents.
                Upload, process, and chat with your files in seconds.
              </Paragraph>
              <div className="flex gap-4 justify-center items-center flex-wrap">
                <Button 
                  type="primary" 
                  size="large" 
                  icon={<RocketOutlined />}
                  className="h-14 px-8 text-lg"
                  style={{ 
                    background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
                    border: 'none'
                  }}
                  onClick={() => router.push('/register')}
                >
                  Start Processing Documents
                </Button>
                <Button 
                  size="large" 
                  icon={<MessageOutlined />}
                  className="h-14 px-8 text-lg"
                  onClick={() => router.push('/chat')}
                >
                  Try AI Chat
                </Button>
              </div>
              <div className="mt-6 flex items-center justify-center gap-2 text-yellow-600">
                <StarFilled />
                <StarFilled />
                <StarFilled />
                <StarFilled />
                <StarFilled />
                <Text className="ml-2">Trusted by 1000+ organizations</Text>
              </div>
            </div>
          </div>

          {/* Hero Image */}
          <div className="max-w-5xl mx-auto animate-scaleIn">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl blur-2xl opacity-20 animate-pulse"></div>
              <Card 
                className="relative shadow-2xl"
                style={{ borderRadius: '24px', overflow: 'hidden' }}
              >
                <div className="bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 p-12 text-center">
                  <Image 
                    src="/aria-avatar.svg" 
                    alt="ARIA Assistant" 
                    width={200} 
                    height={200}
                    className="mx-auto animate-float"
                  />
                  <Title level={3} className="text-white mt-6 mb-2">
                    Meet ARIA
                  </Title>
                  <Text className="text-white text-lg opacity-90">
                    Your AI-Powered Document Intelligence Assistant
                  </Text>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-16 animate-slideUp">
          <Title level={2} className="mb-4">
            Everything You Need for
            <span className="gradient-text"> Document Intelligence</span>
          </Title>
          <Paragraph className="text-xl text-gray-600">
            Powerful features to transform how you handle documents
          </Paragraph>
        </div>

        <Row gutter={[32, 32]}>
          {features.map((feature, index) => (
            <Col xs={24} sm={12} lg={8} key={index}>
              <Card 
                className="h-full card-hover animate-slideUp"
                style={{ 
                  animationDelay: `${index * 0.1}s`,
                  borderRadius: '16px',
                  border: '1px solid #f0f0f0'
                }}
              >
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ 
                    background: `linear-gradient(135deg, ${feature.color}20, ${feature.color}40)`,
                    color: feature.color
                  }}
                >
                  {feature.icon}
                </div>
                <Title level={4} className="mb-3">
                  {feature.title}
                </Title>
                <Text type="secondary" className="text-base">
                  {feature.description}
                </Text>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-6 py-20">
        <Card 
          className="animate-scaleIn"
          style={{
            background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 50%, #13c2c2 100%)',
            borderRadius: '24px',
            border: 'none'
          }}
        >
          <div className="text-center py-12">
            <Title level={2} className="text-white mb-4">
              Ready to Transform Your Documents?
            </Title>
            <Paragraph className="text-white text-xl mb-8 opacity-90">
              Join thousands of organizations using ARIA to automate their document workflows
            </Paragraph>
            <Button 
              size="large" 
              className="h-14 px-10 text-lg font-semibold"
              icon={<RocketOutlined />}
              onClick={() => router.push('/register')}
            >
              Get Started Free - No Credit Card Required
            </Button>
          </div>
        </Card>
      </div>

      {/* Footer */}
      <div className="container mx-auto px-6 py-12 text-center border-t border-gray-200">
        <Text type="secondary">
          © 2025 ARIA - AI Document Intelligence. All rights reserved.
        </Text>
      </div>
    </div>
  );
}
