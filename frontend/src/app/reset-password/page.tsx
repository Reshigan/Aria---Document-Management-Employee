'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Form, Input, Button, Card, Typography, message, Row, Col, Alert } from 'antd';
import { LockOutlined, CheckCircleOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

const { Title, Text, Paragraph } = Typography;

function ResetPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      message.error('Invalid or missing reset token');
      setTimeout(() => router.push('/forgot-password'), 2000);
    }
  }, [searchParams, router]);

  const onFinish = async (values: { new_password: string; confirm_password: string }) => {
    if (values.new_password !== values.confirm_password) {
      message.error('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          new_password: values.new_password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        message.success('Password reset successfully!');
        setTimeout(() => router.push('/login'), 3000);
      } else {
        message.error(data.detail || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      message.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <CheckCircleOutlined className="text-3xl text-green-600" />
            </div>
            <Title level={2} className="mb-2">
              Password Reset Successful!
            </Title>
            <Paragraph className="text-gray-600 mb-6">
              Your password has been changed successfully. You can now login with your new password.
            </Paragraph>
            <Button
              type="primary"
              size="large"
              onClick={() => router.push('/login')}
              className="bg-[#2c3e50] hover:bg-[#16a085]"
            >
              Go to Login
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
          <div className="h-full bg-gradient-to-br from-[#1a2332] via-[#2c3e50] to-[#16a085] flex flex-col justify-center items-center p-12 text-white">
            {/* Animated Background */}
            <div className="absolute inset-0">
              <div className="absolute w-96 h-96 bg-white rounded-full blur-3xl opacity-5 -top-48 -left-48"></div>
              <div className="absolute w-96 h-96 bg-white rounded-full blur-3xl opacity-5 bottom-0 -right-48"></div>
            </div>
            
            <div className="relative z-10 text-center">
              <Image 
                src="/aria-corporate-icon.svg" 
                alt="ARIA" 
                width={200} 
                height={200}
                className="mx-auto mb-8"
              />
              <Title level={1} className="text-white mb-4">
                Create New Password
              </Title>
              <Paragraph className="text-xl text-white opacity-90">
                Enter your new password below
              </Paragraph>
            </div>
          </div>
        </Col>

        {/* Right Side - Form */}
        <Col xs={24} lg={12} className="flex items-center justify-center p-8">
          <Card className="w-full max-w-md shadow-xl">
            <div className="text-center mb-8">
              <Title level={2}>Reset Password</Title>
              <Paragraph className="text-gray-600">
                Please enter your new password
              </Paragraph>
            </div>

            {!token && (
              <Alert
                type="warning"
                message="Invalid or missing reset token"
                description="You will be redirected to the forgot password page."
                className="mb-4"
              />
            )}

            <Form
              name="reset-password"
              onFinish={onFinish}
              layout="vertical"
              size="large"
              disabled={!token}
            >
              <Form.Item
                name="new_password"
                label="New Password"
                rules={[
                  { required: true, message: 'Please enter your new password' },
                  { min: 8, message: 'Password must be at least 8 characters' },
                  {
                    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                    message: 'Password must contain uppercase, lowercase, and numbers'
                  }
                ]}
                hasFeedback
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                />
              </Form.Item>

              <Form.Item
                name="confirm_password"
                label="Confirm Password"
                dependencies={['new_password']}
                hasFeedback
                rules={[
                  { required: true, message: 'Please confirm your password' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('new_password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Passwords do not match'));
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
              </Form.Item>

              <Alert
                type="info"
                message="Password Requirements"
                description={
                  <ul className="list-disc pl-4 mt-2 space-y-1 text-sm">
                    <li>At least 8 characters long</li>
                    <li>Contains uppercase letters (A-Z)</li>
                    <li>Contains lowercase letters (a-z)</li>
                    <li>Contains numbers (0-9)</li>
                  </ul>
                }
                className="mb-4"
              />

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  className="bg-[#2c3e50] hover:bg-[#16a085] h-12 text-lg font-semibold"
                >
                  Reset Password
                </Button>
              </Form.Item>

              <div className="text-center">
                <Text className="text-gray-600">
                  Remember your password?{' '}
                  <Link href="/login" className="text-[#2c3e50] hover:text-[#16a085] font-semibold">
                    Back to Login
                  </Link>
                </Text>
              </div>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2c3e50] mx-auto mb-4"></div>
          <Text>Loading...</Text>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
