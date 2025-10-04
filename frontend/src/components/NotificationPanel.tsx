'use client';

import { useState, useEffect } from 'react';
import { Badge, Drawer, List, Avatar, Button, Empty, Tag } from 'antd';
import { 
  BellOutlined, 
  CheckCircleOutlined, 
  WarningOutlined,
  InfoCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  documentId?: number;
}

export default function NotificationPanel() {
  const [visible, setVisible] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'success',
      title: 'Document Processed',
      message: 'Invoice INV-2024-001.pdf has been successfully processed with 95% confidence.',
      timestamp: new Date(Date.now() - 3600000),
      read: false,
      documentId: 1
    },
    {
      id: '2',
      type: 'warning',
      title: 'Low Confidence Score',
      message: 'Document PO-2024-045.pdf processed with 45% confidence. Manual review recommended.',
      timestamp: new Date(Date.now() - 7200000),
      read: false,
      documentId: 2
    },
    {
      id: '3',
      type: 'info',
      title: 'SAP Posting Successful',
      message: 'Document INV-2024-001.pdf posted to SAP. Document number: 1900000123',
      timestamp: new Date(Date.now() - 10800000),
      read: true,
      documentId: 1
    },
    {
      id: '4',
      type: 'error',
      title: 'Processing Failed',
      message: 'Failed to process document invoice_scan.jpg. Error: OCR extraction failed.',
      timestamp: new Date(Date.now() - 14400000),
      read: true,
      documentId: 3
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    const icons: any = {
      success: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      warning: <WarningOutlined style={{ color: '#faad14' }} />,
      info: <InfoCircleOutlined style={{ color: '#1890ff' }} />,
      error: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
    };
    return icons[type] || icons.info;
  };

  const getTypeColor = (type: string) => {
    const colors: any = {
      success: 'success',
      warning: 'warning',
      info: 'processing',
      error: 'error'
    };
    return colors[type] || 'default';
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  return (
    <>
      <Badge count={unreadCount} offset={[-5, 5]}>
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: '20px' }} />}
          onClick={() => setVisible(true)}
        />
      </Badge>

      <Drawer
        title="Notifications"
        placement="right"
        onClose={() => setVisible(false)}
        open={visible}
        width={400}
        extra={
          <div>
            {unreadCount > 0 && (
              <Button size="small" type="link" onClick={markAllAsRead}>
                Mark all as read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button size="small" type="link" danger onClick={clearAll}>
                Clear all
              </Button>
            )}
          </div>
        }
      >
        {notifications.length === 0 ? (
          <Empty description="No notifications" />
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={notifications}
            renderItem={(item) => (
              <List.Item
                style={{
                  backgroundColor: item.read ? 'transparent' : '#f0f5ff',
                  padding: '12px',
                  borderRadius: '4px',
                  marginBottom: '8px',
                  cursor: 'pointer'
                }}
                onClick={() => markAsRead(item.id)}
              >
                <List.Item.Meta
                  avatar={<Avatar icon={getIcon(item.type)} />}
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: item.read ? 'normal' : 'bold' }}>
                        {item.title}
                      </span>
                      <Tag color={getTypeColor(item.type)} style={{ marginLeft: '8px' }}>
                        {item.type.toUpperCase()}
                      </Tag>
                    </div>
                  }
                  description={
                    <>
                      <div style={{ marginBottom: '8px' }}>{item.message}</div>
                      <div style={{ fontSize: '12px', color: '#999' }}>
                        {formatTimestamp(item.timestamp)}
                      </div>
                    </>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Drawer>
    </>
  );
}
