'use client';

import React from 'react';
import { Layout, Card, Row, Col, Statistic, Button, Upload, Table, Tag } from 'antd';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  UploadOutlined,
  MessageOutlined
} from '@ant-design/icons';

const { Header, Content } = Layout;

export default function Home() {
  const stats = {
    total: 245,
    processing: 12,
    completed: 220,
    failed: 3
  };

  const recentDocuments = [
    {
      key: '1',
      filename: 'invoice_2024_001.pdf',
      type: 'Invoice',
      status: 'completed',
      uploadedAt: '2024-01-15 10:30'
    },
    {
      key: '2',
      filename: 'po_2024_045.xlsx',
      type: 'Purchase Order',
      status: 'processing',
      uploadedAt: '2024-01-15 10:25'
    },
    {
      key: '3',
      filename: 'remittance_jan.pdf',
      type: 'Remittance',
      status: 'completed',
      uploadedAt: '2024-01-15 10:20'
    }
  ];

  const columns = [
    {
      title: 'Filename',
      dataIndex: 'filename',
      key: 'filename',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'completed' ? 'success' : status === 'processing' ? 'processing' : 'error';
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Uploaded At',
      dataIndex: 'uploadedAt',
      key: 'uploadedAt',
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        background: '#1890ff', 
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>
          ARIA - Document Management
        </div>
        <Button type="primary" icon={<MessageOutlined />}>
          Chat with ARIA
        </Button>
      </Header>
      
      <Content style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1>Dashboard</h1>
          <p style={{ fontSize: '16px', color: '#666' }}>
            Welcome to ARIA - Your AI-powered document processing assistant
          </p>
        </div>

        {/* Statistics */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Documents"
                value={stats.total}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Processing"
                value={stats.processing}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Completed"
                value={stats.completed}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Failed"
                value={stats.failed}
                prefix={<WarningOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Upload Section */}
        <Card 
          title="Upload Document" 
          style={{ marginBottom: '24px' }}
          extra={<Button type="primary" icon={<UploadOutlined />}>Quick Upload</Button>}
        >
          <Upload.Dragger
            name="file"
            multiple={false}
            action="/api/v1/documents/upload"
            onChange={(info) => {
              const { status } = info.file;
              if (status === 'done') {
                console.log(`${info.file.name} file uploaded successfully.`);
              } else if (status === 'error') {
                console.error(`${info.file.name} file upload failed.`);
              }
            }}
          >
            <p className="ant-upload-drag-icon">
              <FileTextOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
            </p>
            <p className="ant-upload-text">Click or drag file to upload</p>
            <p className="ant-upload-hint">
              Support for PDF, Images, Excel, and Word documents
            </p>
          </Upload.Dragger>
        </Card>

        {/* Recent Documents */}
        <Card title="Recent Documents">
          <Table 
            columns={columns} 
            dataSource={recentDocuments}
            pagination={false}
          />
        </Card>
      </Content>
    </Layout>
  );
}
