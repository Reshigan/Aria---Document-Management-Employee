'use client';

import React, { useState, useEffect } from 'react';
import { Layout, Card, Row, Col, Statistic, Button, Upload, Table, Tag, Typography, Space, message as antdMessage } from 'antd';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  UploadOutlined,
  MessageOutlined,
  LogoutOutlined,
  UserOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import { Document, DocumentStatus } from '@/types';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadDashboardData();
  }, [user, router]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const docsData = await apiClient.getDocuments({ page: 1, page_size: 10 });
      const documentsList = docsData.documents || docsData.items || [];
      setDocuments(documentsList);
      
      // Calculate stats from documents
      const total = docsData.total || 0;
      const processing = documentsList?.filter((d: any) => 
        d.status === 'processing' || d.status === DocumentStatus.PROCESSING
      ).length || 0;
      const completed = documentsList?.filter((d: any) => 
        d.status === 'completed' || d.status === DocumentStatus.COMPLETED || d.status === DocumentStatus.POSTED_TO_SAP
      ).length || 0;
      const failed = documentsList?.filter((d: any) => 
        d.status === 'failed' || d.status === DocumentStatus.ERROR || d.status === DocumentStatus.REJECTED
      ).length || 0;

      setStats({ total, processing, completed, failed });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      antdMessage.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    try {
      antdMessage.loading('Uploading document...', 0);
      await apiClient.uploadDocument(file);
      antdMessage.destroy();
      antdMessage.success('Document uploaded successfully!');
      loadDashboardData();
    } catch (error: any) {
      antdMessage.destroy();
      antdMessage.error(error.response?.data?.detail || 'Upload failed');
    }
    return false; // Prevent default upload behavior
  };

  const getStatusColor = (status: DocumentStatus): string => {
    switch (status) {
      case DocumentStatus.COMPLETED:
      case DocumentStatus.POSTED_TO_SAP:
      case DocumentStatus.APPROVED:
        return 'success';
      case DocumentStatus.PROCESSING:
        return 'processing';
      case DocumentStatus.ERROR:
      case DocumentStatus.REJECTED:
        return 'error';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      title: 'Filename',
      dataIndex: 'filename',
      key: 'filename',
      ellipsis: true,
    },
    {
      title: 'Type',
      dataIndex: 'document_type',
      key: 'type',
      render: (type: string) => type?.toUpperCase() || 'N/A',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status as DocumentStatus)}>{status?.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Uploaded',
      dataIndex: 'uploaded_at',
      key: 'uploaded_at',
      render: (date: string) => date ? new Date(date).toLocaleString() : 'N/A',
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header className="flex items-center justify-between px-6 bg-blue-600">
        <div className="flex items-center space-x-4">
          <DashboardOutlined className="text-3xl text-white" />
          <span className="text-white text-xl font-bold">ARIA Dashboard</span>
        </div>
        <Space>
          <Text className="text-white">
            <UserOutlined /> {user?.full_name || user?.username}
          </Text>
          <Button 
            type="primary" 
            danger 
            icon={<LogoutOutlined />}
            onClick={logout}
          >
            Logout
          </Button>
        </Space>
      </Header>

      <Content className="p-6">
        <div className="mb-6">
          <Title level={2}>Welcome to ARIA</Title>
          <Text type="secondary" className="text-lg">
            Your AI-powered document processing assistant
          </Text>
        </div>

        {/* Statistics */}
        <Row gutter={16} className="mb-6">
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Documents"
                value={stats.total}
                prefix={<FileTextOutlined />}
                loading={loading}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Processing"
                value={stats.processing}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#1890ff' }}
                loading={loading}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Completed"
                value={stats.completed}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
                loading={loading}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Failed"
                value={stats.failed}
                prefix={<WarningOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
                loading={loading}
              />
            </Card>
          </Col>
        </Row>

        {/* Upload Section */}
        <Card 
          title="Upload Document" 
          className="mb-6"
          extra={<Button type="primary" icon={<UploadOutlined />}>Quick Upload</Button>}
        >
          <Upload.Dragger
            name="file"
            multiple={false}
            beforeUpload={handleUpload}
            showUploadList={false}
            accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"
          >
            <p className="ant-upload-drag-icon">
              <FileTextOutlined className="text-6xl text-blue-500" />
            </p>
            <p className="ant-upload-text text-lg">Click or drag file to upload</p>
            <p className="ant-upload-hint">
              Support for PDF, Images, Excel, and Word documents
            </p>
          </Upload.Dragger>
        </Card>

        {/* Recent Documents */}
        <Card title="Recent Documents">
          <Table 
            columns={columns} 
            dataSource={documents}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </Card>
      </Content>
    </Layout>
  );
}
