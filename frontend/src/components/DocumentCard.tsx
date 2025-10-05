'use client';

import { Card, Tag, Typography, Space, Button, Dropdown } from 'antd';
import {
  FileTextOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  DownloadOutlined,
  EyeOutlined,
  MoreOutlined,
  DeleteOutlined,
  EditOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  WarningOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Text, Title } = Typography;

interface DocumentCardProps {
  id: number;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  fileSize?: string;
  extractedText?: string;
  onView?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
}

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'pdf':
      return <FilePdfOutlined className="text-3xl text-red-500" />;
    case 'doc':
    case 'docx':
      return <FileWordOutlined className="text-3xl text-blue-500" />;
    case 'xls':
    case 'xlsx':
      return <FileExcelOutlined className="text-3xl text-green-500" />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return <FileImageOutlined className="text-3xl text-purple-500" />;
    default:
      return <FileTextOutlined className="text-3xl text-gray-500" />;
  }
};

const getStatusTag = (status: string) => {
  const statusConfig: Record<string, { color: string; icon: JSX.Element; text: string }> = {
    pending: {
      color: 'default',
      icon: <ClockCircleOutlined />,
      text: 'Pending'
    },
    processing: {
      color: 'processing',
      icon: <SyncOutlined spin />,
      text: 'Processing'
    },
    completed: {
      color: 'success',
      icon: <CheckCircleOutlined />,
      text: 'Completed'
    },
    failed: {
      color: 'error',
      icon: <WarningOutlined />,
      text: 'Failed'
    }
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <Tag color={config.color} icon={config.icon} className="px-3 py-1">
      {config.text}
    </Tag>
  );
};

export default function DocumentCard({
  id,
  filename,
  status,
  createdAt,
  fileSize,
  extractedText,
  onView,
  onDownload,
  onDelete,
  onEdit
}: DocumentCardProps) {
  const menuItems: MenuProps['items'] = [
    {
      key: 'edit',
      label: 'Edit',
      icon: <EditOutlined />,
      onClick: onEdit
    },
    {
      key: 'download',
      label: 'Download',
      icon: <DownloadOutlined />,
      onClick: onDownload
    },
    {
      type: 'divider'
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: onDelete
    }
  ];

  const previewText = extractedText
    ? extractedText.substring(0, 100) + (extractedText.length > 100 ? '...' : '')
    : 'No text extracted yet';

  return (
    <Card
      className="document-card hover:shadow-xl transition-all duration-300 animate-slideUp"
      style={{ 
        borderRadius: '16px',
        overflow: 'hidden'
      }}
      bodyStyle={{ padding: 0 }}
    >
      {/* Document Header with Gradient */}
      <div 
        className="p-6 pb-4"
        style={{
          background: 'linear-gradient(135deg, #f0f9ff 0%, #f3e8ff 100%)'
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            {/* File Icon */}
            <div 
              className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ 
                background: 'white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
              }}
            >
              {getFileIcon(filename)}
            </div>
            
            {/* Document Info */}
            <div className="flex-1 min-w-0">
              <Title 
                level={5} 
                className="m-0 mb-2 truncate"
                style={{ fontSize: '16px' }}
              >
                {filename}
              </Title>
              <Space size="small" wrap>
                {getStatusTag(status)}
                {fileSize && (
                  <Text type="secondary" className="text-xs">
                    {fileSize}
                  </Text>
                )}
              </Space>
            </div>
          </div>
          
          {/* Actions Dropdown */}
          <Dropdown menu={{ items: menuItems }} trigger={['click']}>
            <Button
              type="text"
              icon={<MoreOutlined />}
              className="flex-shrink-0"
            />
          </Dropdown>
        </div>
      </div>

      {/* Document Body */}
      <div className="p-6 pt-4">
        {/* Preview Text */}
        {status === 'completed' && extractedText && (
          <div 
            className="mb-4 p-3 rounded-lg bg-gray-50 border border-gray-100"
          >
            <Text type="secondary" className="text-xs block mb-1">
              Preview:
            </Text>
            <Text className="text-sm">
              {previewText}
            </Text>
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
          <span>📅 {new Date(createdAt).toLocaleDateString()}</span>
          <span>🕐 {new Date(createdAt).toLocaleTimeString()}</span>
        </div>

        {/* Action Buttons */}
        <Space className="w-full" size="small">
          <Button
            type="primary"
            icon={<EyeOutlined />}
            onClick={onView}
            className="flex-1"
            style={{
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
              border: 'none'
            }}
          >
            View
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={onDownload}
            style={{ borderRadius: '8px' }}
          >
            Download
          </Button>
        </Space>
      </div>

      {/* Processing Indicator */}
      {status === 'processing' && (
        <div 
          className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 animate-shimmer"
          style={{
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s infinite'
          }}
        />
      )}
    </Card>
  );
}
