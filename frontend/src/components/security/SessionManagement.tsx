'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Tag,
  Tooltip,
  Modal,
  message,
  Popconfirm,
  Alert,
  Spin,
  Badge
} from 'antd';
import {
  DesktopOutlined,
  MobileOutlined,
  TabletOutlined,
  GlobalOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { securityService, UserSession } from '@/services/securityService';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

const SessionManagement: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [terminatingSession, setTerminatingSession] = useState<number | null>(null);
  const [terminatingAll, setTerminatingAll] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await securityService.getSessions();
      setSessions(data);
    } catch (error) {
      message.error('Failed to load sessions');
      console.error('Sessions error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId: number) => {
    try {
      setTerminatingSession(sessionId);
      await securityService.terminateSession(sessionId);
      message.success('Session terminated successfully');
      await loadSessions();
    } catch (error) {
      message.error('Failed to terminate session');
      console.error('Terminate session error:', error);
    } finally {
      setTerminatingSession(null);
    }
  };

  const handleTerminateAllSessions = async () => {
    try {
      setTerminatingAll(true);
      await securityService.terminateAllSessions();
      message.success('All other sessions terminated successfully');
      await loadSessions();
    } catch (error) {
      message.error('Failed to terminate all sessions');
      console.error('Terminate all sessions error:', error);
    } finally {
      setTerminatingAll(false);
    }
  };

  const getDeviceIcon = (deviceInfo: string) => {
    const device = deviceInfo.toLowerCase();
    if (device.includes('mobile') || device.includes('android') || device.includes('iphone')) {
      return <MobileOutlined />;
    } else if (device.includes('tablet') || device.includes('ipad')) {
      return <TabletOutlined />;
    } else {
      return <DesktopOutlined />;
    }
  };

  const getDeviceType = (deviceInfo: string) => {
    const device = deviceInfo.toLowerCase();
    if (device.includes('mobile') || device.includes('android') || device.includes('iphone')) {
      return 'Mobile';
    } else if (device.includes('tablet') || device.includes('ipad')) {
      return 'Tablet';
    } else {
      return 'Desktop';
    }
  };

  const getBrowserInfo = (deviceInfo: string) => {
    // Extract browser information from user agent
    if (deviceInfo.includes('Chrome')) return 'Chrome';
    if (deviceInfo.includes('Firefox')) return 'Firefox';
    if (deviceInfo.includes('Safari')) return 'Safari';
    if (deviceInfo.includes('Edge')) return 'Edge';
    return 'Unknown Browser';
  };

  const getLocationInfo = (ipAddress: string) => {
    // In a real app, you'd use a geolocation service
    // For now, just show the IP
    return ipAddress;
  };

  const isSessionExpiringSoon = (expiresAt: string) => {
    const expiryTime = new Date(expiresAt).getTime();
    const now = new Date().getTime();
    const hoursUntilExpiry = (expiryTime - now) / (1000 * 60 * 60);
    return hoursUntilExpiry < 24; // Less than 24 hours
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };

  const columns: ColumnsType<UserSession> = [
    {
      title: 'Device',
      dataIndex: 'device_info',
      key: 'device',
      render: (deviceInfo: string, record: UserSession) => (
        <Space>
          {getDeviceIcon(deviceInfo)}
          <div>
            <div>
              <Text strong>{getDeviceType(deviceInfo)}</Text>
              {record.is_current && (
                <Badge 
                  status="success" 
                  text="Current" 
                  style={{ marginLeft: '8px' }}
                />
              )}
            </div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {getBrowserInfo(deviceInfo)}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Location',
      dataIndex: 'ip_address',
      key: 'location',
      render: (ipAddress: string) => (
        <Space>
          <GlobalOutlined />
          <div>
            <div>{getLocationInfo(ipAddress)}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {ipAddress}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Last Activity',
      dataIndex: 'last_activity',
      key: 'last_activity',
      render: (lastActivity: string) => (
        <div>
          <div>{formatTimeAgo(lastActivity)}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {new Date(lastActivity).toLocaleString()}
          </Text>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'expires_at',
      key: 'status',
      render: (expiresAt: string, record: UserSession) => {
        const isExpiring = isSessionExpiringSoon(expiresAt);
        const isExpired = new Date(expiresAt) < new Date();
        
        if (isExpired) {
          return <Tag color="red" icon={<ClockCircleOutlined />}>Expired</Tag>;
        } else if (isExpiring) {
          return <Tag color="orange" icon={<ClockCircleOutlined />}>Expiring Soon</Tag>;
        } else {
          return <Tag color="green" icon={<CheckCircleOutlined />}>Active</Tag>;
        }
      },
    },
    {
      title: 'Expires',
      dataIndex: 'expires_at',
      key: 'expires_at',
      render: (expiresAt: string) => (
        <div>
          <div>{new Date(expiresAt).toLocaleDateString()}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {new Date(expiresAt).toLocaleTimeString()}
          </Text>
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record: UserSession) => (
        <Space>
          {!record.is_current && (
            <Popconfirm
              title="Terminate Session"
              description="Are you sure you want to terminate this session?"
              onConfirm={() => handleTerminateSession(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                loading={terminatingSession === record.id}
                size="small"
              >
                Terminate
              </Button>
            </Popconfirm>
          )}
          {record.is_current && (
            <Tooltip title="This is your current session">
              <Tag color="blue">Current Session</Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const activeSessions = sessions.filter(session => new Date(session.expires_at) > new Date());
  const expiredSessions = sessions.filter(session => new Date(session.expires_at) <= new Date());

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2}>
            <DesktopOutlined style={{ marginRight: '8px' }} />
            Session Management
          </Title>
          <Text type="secondary">
            Manage your active sessions and see where you're signed in
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadSessions} loading={loading}>
            Refresh
          </Button>
          {activeSessions.length > 1 && (
            <Popconfirm
              title="Terminate All Other Sessions"
              description="This will sign you out of all other devices. You'll stay signed in on this device."
              onConfirm={handleTerminateAllSessions}
              okText="Yes, Terminate All"
              cancelText="Cancel"
              okType="danger"
            >
              <Button danger loading={terminatingAll}>
                Terminate All Other Sessions
              </Button>
            </Popconfirm>
          )}
        </Space>
      </div>

      {/* Session Statistics */}
      <div style={{ marginBottom: '24px' }}>
        <Space size="large">
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                {activeSessions.length}
              </div>
              <div style={{ color: '#666' }}>Active Sessions</div>
            </div>
          </Card>
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                {sessions.filter(s => s.is_current).length}
              </div>
              <div style={{ color: '#666' }}>Current Session</div>
            </div>
          </Card>
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#faad14' }}>
                {sessions.filter(s => isSessionExpiringSoon(s.expires_at)).length}
              </div>
              <div style={{ color: '#666' }}>Expiring Soon</div>
            </div>
          </Card>
        </Space>
      </div>

      {/* Security Alert */}
      {activeSessions.length > 3 && (
        <Alert
          message="Multiple Active Sessions Detected"
          description={`You have ${activeSessions.length} active sessions. If you don't recognize some of these sessions, terminate them immediately and change your password.`}
          type="warning"
          showIcon
          style={{ marginBottom: '16px' }}
          action={
            <Button size="small" type="primary" onClick={handleTerminateAllSessions}>
              Secure Account
            </Button>
          }
        />
      )}

      {/* Active Sessions */}
      <Card title="Active Sessions" style={{ marginBottom: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>Loading sessions...</div>
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={activeSessions}
            rowKey="id"
            pagination={false}
            locale={{
              emptyText: 'No active sessions found'
            }}
          />
        )}
      </Card>

      {/* Expired Sessions */}
      {expiredSessions.length > 0 && (
        <Card title="Recent Expired Sessions" size="small">
          <Table
            columns={columns.filter(col => col.key !== 'actions')}
            dataSource={expiredSessions.slice(0, 5)}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </Card>
      )}
    </div>
  );
};

export default SessionManagement;