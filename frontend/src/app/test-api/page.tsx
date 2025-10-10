'use client';

import React, { useState } from 'react';
import { Button, Card, Typography, Space } from 'antd';

const { Title, Text, Paragraph } = Typography;

export default function TestAPI() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testAPI = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:12001';
      setResult(`Testing API URL: ${apiUrl}\n\n`);
      
      // Test basic connectivity
      const response = await fetch(`${apiUrl}/api/v1/analytics/dashboard`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setResult(prev => prev + `Response status: ${response.status}\n`);
      setResult(prev => prev + `Response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}\n\n`);
      
      if (response.ok) {
        const data = await response.json();
        setResult(prev => prev + `Response data: ${JSON.stringify(data, null, 2)}`);
      } else {
        const errorText = await response.text();
        setResult(prev => prev + `Error response: ${errorText}`);
      }
    } catch (error) {
      setResult(prev => prev + `Error: ${error}`);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>API Test Page</Title>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Button type="primary" onClick={testAPI} loading={loading}>
            Test Analytics API
          </Button>
        </Card>
        
        {result && (
          <Card title="API Test Result">
            <Paragraph>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                {result}
              </pre>
            </Paragraph>
          </Card>
        )}
      </Space>
    </div>
  );
}