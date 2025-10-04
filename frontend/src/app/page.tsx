'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Typography } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';

const { Title, Text } = Typography;

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <RobotOutlined className="text-8xl text-blue-600 mb-4" />
        <Title level={1}>ARIA</Title>
        <Text type="secondary" className="text-lg">
          Automated Revenue & Invoice Assistant
        </Text>
        <div className="mt-8">
          {loading ? (
            <Text>Loading...</Text>
          ) : (
            <div className="space-x-4">
              <Button type="primary" size="large" onClick={() => router.push('/login')}>
                Sign In
              </Button>
              <Button size="large" onClick={() => router.push('/register')}>
                Register
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
