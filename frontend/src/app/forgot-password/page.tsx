'use client';

import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Row, Col, Alert } from 'antd';
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const { Title, Text, Paragraph } = Typography;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resetLink, setResetLink] = useState('');
  const router = useRouter();

  const onFinish = async (values: { email: string }) => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitted(true);
        // In development, show the reset link
        if (data.reset_url) {
          setResetLink(data.reset_url);
        }
        message.success('Password reset instructions sent to your email');
      } else {
        message.error(data.detail || 'Failed to send reset email');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      message.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <MailOutlined className="text-3xl text-green-600" />
            </div>
            <Title level={2} className="mb-2">
              Check Your Email
            </Title>
            <Paragraph className="text-gray-600">
              If an account exists with that email, we've sent password reset instructions.
            </Paragraph>
          </div>

          {resetLink && (
            <Alert
              type="info"
              message="Development Mode"
              description={
                <div>
                  <p className="mb-2">In production, this link would be emailed to you.</p>
                  <a href={resetLink.replace('http://localhost:3000', '')} className="text-blue-600 break-all">
                    {resetLink.replace('http://localhost:3000', window.location.origin)}
                  </a>
                </div>
              }
              className="mb-4"
            />
          )}

          <div className="space-y-3">
            <Button
              type="primary"
              block
              onClick={() => router.push('/login')}
              icon={<ArrowLeftOutlined />}
            >
              Back to Login
            </Button>
            
            <Button
              block
              onClick={() => {
                setSubmitted(false);
                setResetLink('');
              }}
            >
              Try Another Email
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-50 to-blue-50">
      <Row className="w-full">
        {/* Left Side - Branding */}
        <Col xs={0} lg={12} className="relative overflow-hidden">
          <div className="h-full bg-gradient-to-br from-[#003d82] via-[#0059b3] to-[#0288d1] flex flex-col justify-center items-center p-12 text-white">
            {/* Animated Background */}
            <div className="absolute inset-0">
              <div className="absolute w-96 h-96 bg-white rounded-full blur-3xl opacity-5 -top-48 -left-48"></div>
              <div className="absolute w-96 h-96 bg-white rounded-full blur-3xl opacity-5 bottom-0 -right-48"></div>
            </div>
            
            <div className="relative z-10 text-center">
              <Image 
                src="/aria-avatar.svg" 
                alt="ARIA" 
                width={200} 
                height={200}
                className="mx-auto mb-8"
              />
              <Title level={1} className="text-white mb-4">
                Reset Your Password
              </Title>
              <Paragraph className="text-xl text-white opacity-90">
                We'll send you instructions to reset your password
              </Paragraph>
            </div>
          </div>
        </Col>

        {/* Right Side - Form */}
        <Col xs={24} lg={12} className="flex items-center justify-center p-8">
          <Card className="w-full max-w-md shadow-xl">
            <div className="text-center mb-8">
              <Title level={2}>Forgot Password?</Title>
              <Paragraph className="text-gray-600">
                Enter your email address and we'll send you instructions to reset your password
              </Paragraph>
            </div>

            <Form
              name="forgot-password"
              onFinish={onFinish}
              layout="vertical"
              size="large"
            >
              <Form.Item
                name="email"
                label="Email Address"
                rules={[
                  { required: true, message: 'Please enter your email' },
                  { type: 'email', message: 'Please enter a valid email' }
                ]}
              >
                <Input 
                  prefix={<MailOutlined />}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  className="bg-[#003d82] hover:bg-[#0059b3] h-12 text-lg font-semibold"
                >
                  Send Reset Instructions
                </Button>
              </Form.Item>

              <div className="text-center space-y-2">
                <Link href="/login" className="text-[#003d82] hover:text-[#0059b3] flex items-center justify-center gap-2">
                  <ArrowLeftOutlined />
                  Back to Login
                </Link>
                
                <div className="mt-4 pt-4 border-t">
                  <Text className="text-gray-600">
                    Don't have an account?{' '}
                    <Link href="/register" className="text-[#003d82] hover:text-[#0059b3] font-semibold">
                      Sign up
                    </Link>
                  </Text>
                </div>
              </div>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
