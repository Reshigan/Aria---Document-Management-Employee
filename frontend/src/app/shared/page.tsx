'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Typography,
  message,
  Avatar,
  Tooltip,
  Input,
  Select,
  Row,
  Col,
  Statistic,
  Empty
} from 'antd';
import {
  ShareAltOutlined,
  UserOutlined,
  DownloadOutlined,
  EyeOutlined,
  EditOutlined,
  CalendarOutlined,
  SearchOutlined,
  FileOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { sharingAPI } from '@/lib/api';
import type { SharedDocumentsResponse } from '@/types';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

interface SharedDocument {
  id: number;
  filename: string;
  original_filename: string;
  document_type: string;
  status: string;
  file_size: number;
  created_at: string;
  shared_by: string;
  shared_at: string;
  can_edit: boolean;
  can_download: boolean;
  expires_at?: string;
  message?: string;
}

const SharedDocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<SharedDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    loadSharedDocuments();
  }, [pagination.current, pagination.pageSize]);

  const loadSharedDocuments = async () => {
    setLoading(true);
    try {
      const response: SharedDocumentsResponse = await sharingAPI.getSharedWithMe(
        pagination.current,
        pagination.pageSize
      );
      
      setDocuments(response.items);
      setPagination(prev => ({
        ...prev,
        total: response.total
      }));
    } catch (error) {
      console.error('Failed to load shared documents:', error);
      message.error('Failed to load shared documents');
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (paginationConfig: any) => {
    setPagination({
      current: paginationConfig.current,
      pageSize: paginationConfig.pageSize,
      total: pagination.total
    });
  };

  const handleDownload = async (document: SharedDocument) => {
    try {
      // This would typically trigger a download
      message.success(`Downloading ${document.original_filename}`);
    } catch (error) {
      message.error('Failed to download document');
    }
  };

  const handleView = (document: SharedDocument) => {
    // Navigate to document view
    window.open(`/documents/${document.id}`, '_blank');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDocumentTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      invoice: 'blue',
      purchase_order: 'green',
      remittance: 'orange',
      pod: 'purple',
      credit_note: 'cyan',
      debit_note: 'red',
      other: 'default'
    };
    return colors[type] || 'default';
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      uploaded: 'default',
      processing: 'processing',
      processed: 'success',
      validated: 'success',
      approved: 'success',
      rejected: 'error',
      completed: 'success',
      posted_to_sap: 'success',
      error: 'error'
    };
    return colors[status] || 'default';
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = !searchTerm || 
      doc.original_filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.shared_by.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || doc.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const columns: ColumnsType<SharedDocument> = [
    {
      title: 'Document',
      dataIndex: 'original_filename',
      key: 'original_filename',
      render: (text: string, record: SharedDocument) => (
        <Space>
          <FileOutlined />
          <div>
            <div className="font-medium">{text}</div>
            <Text type="secondary" className="text-xs">
              {formatFileSize(record.file_size)}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'document_type',
      key: 'document_type',
      render: (type: string) => (
        <Tag color={getDocumentTypeColor(type)}>
          {type.replace('_', ' ').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status.replace('_', ' ').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Shared By',
      dataIndex: 'shared_by',
      key: 'shared_by',
      render: (sharedBy: string) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} />
          {sharedBy}
        </Space>
      ),
    },
    {
      title: 'Shared Date',
      dataIndex: 'shared_at',
      key: 'shared_at',
      render: (date: string) => (
        <Tooltip title={dayjs(date).format('YYYY-MM-DD HH:mm:ss')}>
          <Space>
            <CalendarOutlined />
            {dayjs(date).fromNow()}
          </Space>
        </Tooltip>
      ),
    },
    {
      title: 'Permissions',
      key: 'permissions',
      render: (_, record: SharedDocument) => (
        <Space>
          <Tag color="blue" icon={<EyeOutlined />}>View</Tag>
          {record.can_edit && <Tag color="green" icon={<EditOutlined />}>Edit</Tag>}
          {record.can_download && <Tag color="orange" icon={<DownloadOutlined />}>Download</Tag>}
        </Space>
      ),
    },
    {
      title: 'Expires',
      dataIndex: 'expires_at',
      key: 'expires_at',
      render: (expiresAt: string) => (
        expiresAt ? (
          <Tooltip title={dayjs(expiresAt).format('YYYY-MM-DD HH:mm:ss')}>
            <Text type={dayjs(expiresAt).isBefore(dayjs()) ? 'danger' : 'secondary'}>
              {dayjs(expiresAt).fromNow()}
            </Text>
          </Tooltip>
        ) : (
          <Text type="secondary">Never</Text>
        )
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record: SharedDocument) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            View
          </Button>
          {record.can_download && (
            <Button
              type="text"
              icon={<DownloadOutlined />}
              onClick={() => handleDownload(record)}
            >
              Download
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const activeShares = documents.filter(doc => 
    !doc.expires_at || dayjs(doc.expires_at).isAfter(dayjs())
  ).length;

  const expiredShares = documents.length - activeShares;

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={2}>
          <ShareAltOutlined className="mr-2" />
          Shared with Me
        </Title>
        <Text type="secondary">
          Documents that have been shared with you by other users
        </Text>
      </div>

      {/* Statistics */}
      <Row gutter={16} className="mb-6">
        <Col span={8}>
          <Card>
            <Statistic
              title="Total Shared Documents"
              value={pagination.total}
              prefix={<FileOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Active Shares"
              value={activeShares}
              prefix={<ShareAltOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Expired Shares"
              value={expiredShares}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-4">
        <Row gutter={16}>
          <Col span={12}>
            <Search
              placeholder="Search documents or shared by user..."
              allowClear
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col span={6}>
            <Select
              placeholder="Filter by status"
              allowClear
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
            >
              <Option value="uploaded">Uploaded</Option>
              <Option value="processing">Processing</Option>
              <Option value="processed">Processed</Option>
              <Option value="validated">Validated</Option>
              <Option value="approved">Approved</Option>
              <Option value="rejected">Rejected</Option>
              <Option value="completed">Completed</Option>
              <Option value="posted_to_sap">Posted to SAP</Option>
              <Option value="error">Error</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Documents Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredDocuments}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} documents`,
          }}
          onChange={handleTableChange}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No shared documents found"
              />
            ),
          }}
        />
      </Card>
    </div>
  );
};

export default SharedDocumentsPage;