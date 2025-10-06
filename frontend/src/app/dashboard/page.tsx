'use client';

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Button, Upload, Table, Tag, Typography, message as antdMessage } from 'antd';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  UploadOutlined,
  MessageOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import { Document, DocumentStatus } from '@/types';

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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mb-8">
        <div className="futuristic-card p-8 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 flex items-center justify-center relative">
                <RobotOutlined className="text-3xl text-white" />
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 animate-pulse opacity-50"></div>
              </div>
              <div>
                <h1 className="text-4xl font-bold glow-text mb-2">
                  Neural Command Center
                </h1>
                <p className="text-xl text-gray-300">
                  Welcome back, <span className="text-cyan-400 font-semibold">{user?.full_name || user?.username}</span>
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="status-online text-sm">SYSTEM ONLINE</div>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-400 text-sm">
                    {new Date().toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4">
              <button 
                className="cyber-button"
                onClick={() => router.push('/chat')}
              >
                <MessageOutlined className="mr-2" />
                AI Assistant
              </button>
              <button 
                className="neon-button"
                onClick={() => router.push('/upload')}
              >
                <UploadOutlined className="mr-2" />
                Upload Document
              </button>
            </div>
          </div>
        </div>
      </div>

        {/* Statistics */}
        <Row gutter={[24, 24]} className="mb-8">
          <Col xs={24} sm={12} md={6}>
            <Card 
              className="stats-card card-hover animate-slideUp"
              style={{ borderRadius: '16px', border: '1px solid #f0f0f0' }}
              loading={loading}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="stats-icon" style={{ background: 'linear-gradient(135deg, #1890ff20, #1890ff40)', color: '#1890ff' }}>
                    <FileTextOutlined />
                  </div>
                  <Statistic
                    title="Total Documents"
                    value={stats.total}
                    valueStyle={{ color: '#1890ff', fontSize: '28px', fontWeight: '700' }}
                  />
                </div>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card 
              className="stats-card card-hover animate-slideUp"
              style={{ borderRadius: '16px', border: '1px solid #f0f0f0', animationDelay: '0.1s' }}
              loading={loading}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="stats-icon" style={{ background: 'linear-gradient(135deg, #fa8c1620, #fa8c1640)', color: '#fa8c16' }}>
                    <ClockCircleOutlined />
                  </div>
                  <Statistic
                    title="Processing"
                    value={stats.processing}
                    valueStyle={{ color: '#fa8c16', fontSize: '28px', fontWeight: '700' }}
                  />
                </div>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card 
              className="stats-card card-hover animate-slideUp"
              style={{ borderRadius: '16px', border: '1px solid #f0f0f0', animationDelay: '0.2s' }}
              loading={loading}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="stats-icon" style={{ background: 'linear-gradient(135deg, #52c41a20, #52c41a40)', color: '#52c41a' }}>
                    <CheckCircleOutlined />
                  </div>
                  <Statistic
                    title="Completed"
                    value={stats.completed}
                    valueStyle={{ color: '#52c41a', fontSize: '28px', fontWeight: '700' }}
                  />
                </div>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card 
              className="stats-card card-hover animate-slideUp"
              style={{ borderRadius: '16px', border: '1px solid #f0f0f0', animationDelay: '0.3s' }}
              loading={loading}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="stats-icon" style={{ background: 'linear-gradient(135deg, #f5222d20, #f5222d40)', color: '#f5222d' }}>
                    <WarningOutlined />
                  </div>
                  <Statistic
                    title="Failed"
                    value={stats.failed}
                    valueStyle={{ color: '#f5222d', fontSize: '28px', fontWeight: '700' }}
                  />
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Upload Section */}
        <Card 
          title={
            <div className="flex items-center gap-3">
              <div className="stats-icon" style={{ background: 'linear-gradient(135deg, #13c2c220, #13c2c240)', color: '#13c2c2' }}>
                <UploadOutlined />
              </div>
              <span>Upload Document</span>
            </div>
          }
          className="mb-8 animate-slideUp"
          style={{ borderRadius: '16px', border: '1px solid #f0f0f0', animationDelay: '0.4s' }}
          extra={
            <Button 
              type="primary" 
              icon={<UploadOutlined />}
              style={{ 
                background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
                border: 'none',
                borderRadius: '8px'
              }}
              onClick={() => router.push('/documents')}
            >
              View All Documents
            </Button>
          }
        >
          <Upload.Dragger
            name="file"
            multiple={false}
            beforeUpload={handleUpload}
            showUploadList={false}
            accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"
            style={{ 
              borderRadius: '12px',
              border: '2px dashed #d9d9d9',
              background: 'linear-gradient(135deg, #f0f2f5 0%, #ffffff 100%)'
            }}
          >
            <div className="py-8">
              <p className="ant-upload-drag-icon">
                <FileTextOutlined 
                  className="text-6xl animate-float" 
                  style={{ color: '#1890ff' }}
                />
              </p>
              <p className="ant-upload-text text-xl font-semibold mb-2">
                Click or drag file to upload
              </p>
              <p className="ant-upload-hint text-base text-gray-500">
                Support for PDF, Images, Excel, and Word documents
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <span className="file-icon file-icon-pdf">PDF</span>
                <span className="file-icon file-icon-img">IMG</span>
                <span className="file-icon file-icon-xls">XLS</span>
                <span className="file-icon file-icon-doc">DOC</span>
              </div>
            </div>
          </Upload.Dragger>
        </Card>

        {/* Recent Documents */}
        <Card 
          title={
            <div className="flex items-center gap-3">
              <div className="stats-icon" style={{ background: 'linear-gradient(135deg, #722ed120, #722ed140)', color: '#722ed1' }}>
                <FileTextOutlined />
              </div>
              <span>Recent Documents</span>
            </div>
          }
          className="animate-slideUp"
          style={{ borderRadius: '16px', border: '1px solid #f0f0f0', animationDelay: '0.5s' }}
          extra={
            <Button 
              type="text" 
              onClick={() => router.push('/documents')}
              style={{ color: '#1890ff' }}
            >
              View All →
            </Button>
          }
        >
          <Table 
            columns={columns} 
            dataSource={documents}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 5, showSizeChanger: false }}
            style={{ borderRadius: '8px' }}
          />
        </Card>
      </Content>
    </Layout>
  );
}
