'use client';

import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Row, Col } from 'antd';
import { UserOutlined, LockOutlined, ThunderboltFilled, SafetyOutlined, RocketOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LoginCredentials } from '@/types';
import Image from 'next/image';

const { Title, Text, Paragraph } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const onFinish = async (values: LoginCredentials) => {
    try {
      setLoading(true);
      await login(values);
    } catch (error) {
      // Error is already handled in AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 via-purple-50 to-cyan-50">
      <Row className="w-full">
        {/* Left Side - Branding */}
        <Col xs={0} lg={12} className="relative overflow-hidden">
          <div className="h-full bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 flex flex-col justify-center items-center p-12 text-white">
            {/* Animated Background */}
            <div className="absolute inset-0">
              <div className="absolute w-96 h-96 bg-white rounded-full blur-3xl opacity-10 -top-48 -left-48 animate-float"></div>
              <div className="absolute w-96 h-96 bg-white rounded-full blur-3xl opacity-10 bottom-0 -right-48 animate-float" style={{ animationDelay: '2s' }}></div>
            </div>
            
            <div className="relative z-10 text-center">
              <Image 
                src="/aria-avatar.svg" 
                alt="ARIA" 
                width={200} 
                height={200}
                className="mx-auto mb-8 animate-float"
              />
              <Title level={1} className="text-white mb-4">
                Welcome to ARIA
              </Title>
              <Paragraph className="text-xl text-white opacity-90 mb-8">
                AI-Powered Document Intelligence Platform
              </Paragraph>
              
              <div className="space-y-4 text-left max-w-md mx-auto">
                <div className="flex items-start gap-3 bg-white/10 backdrop-blur-sm p-4 rounded-xl">
                  <ThunderboltFilled className="text-2xl text-yellow-300 mt-1" />
                  <div>
                    <Title level={5} className="text-white m-0 mb-1">Lightning Fast Processing</Title>
                    <Text className="text-white opacity-80">
                      Process thousands of documents in seconds with AI
                    </Text>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 bg-white/10 backdrop-blur-sm p-4 rounded-xl">
                  <SafetyOutlined className="text-2xl text-green-300 mt-1" />
                  <div>
                    <Title level={5} className="text-white m-0 mb-1">Enterprise Security</Title>
                    <Text className="text-white opacity-80">
                      Bank-level encryption and compliance
                    </Text>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 bg-white/10 backdrop-blur-sm p-4 rounded-xl">
                  <RocketOutlined className="text-2xl text-cyan-300 mt-1" />
                  <div>
                    <Title level={5} className="text-white m-0 mb-1">AI Intelligence</Title>
                    <Text className="text-white opacity-80">
                      Chat with your documents and get instant answers
                    </Text>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Col>
        
        {/* Right Side - Login Form */}
        <Col xs={24} lg={12} className="flex items-center justify-center p-8">
          <Card className="w-full max-w-md shadow-2xl animate-slideUp" style={{ borderRadius: '20px' }}>
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <Image 
                  src="/aria-avatar.svg" 
                  alt="ARIA Logo" 
                  width={80} 
                  height={80}
                  className="animate-float"
                />
              </div>
              <Title level={2} className="mb-2 gradient-text">
                Sign In to ARIA
              </Title>
              <Text type="secondary" className="text-base">
                Access your AI document workspace
              </Text>
            </div>

            <Form
              name="login"
              onFinish={onFinish}
              layout="vertical"
              size="large"
            >
              <Form.Item
                name="username"
                label="Username or Email"
                rules={[
                  { required: true, message: 'Please input your username or email!' },
                ]}
              >
                <Input
                  prefix={<UserOutlined className="text-gray-400" />}
                  placeholder="Enter your username or email"
                  autoComplete="username"
                  style={{ borderRadius: '10px' }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="Password"
                rules={[
                  { required: true, message: 'Please input your password!' },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined className="text-gray-400" />}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  style={{ borderRadius: '10px' }}
                />
              </Form.Item>

              <Form.Item>
                <div className="flex justify-between items-center">
                  <Link href="/forgot-password" className="text-blue-500 hover:text-purple-500 transition-colors">
                    Forgot password?
                  </Link>
                </div>
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  className="w-full h-12"
                  loading={loading}
                  size="large"
                  style={{ 
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
                    border: 'none',
                    fontWeight: 600
                  }}
                >
                  Sign In to ARIA
                </Button>
              </Form.Item>

              <div className="text-center">
                <Text type="secondary">
                  Don't have an account?{' '}
                  <Link href="/register" className="text-blue-500 hover:text-purple-500 font-semibold transition-colors">
                    Create one now
                  </Link>
                </Text>
              </div>
            </Form>

            <div className="mt-6 pt-6 border-t text-center">
              <Text type="secondary" className="text-xs">
                🔒 Secure Login • ARIA v2.0 - AI Document Intelligence
              </Text>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
