'use client';

import React, { useState, useEffect } from 'react';
import { 
  Row, Col, Card, Statistic, Table, Upload, Button, Typography, 
  Space, Tag, Progress, Avatar, List, Timeline, Spin, message,
  Dropdown, Menu, Badge, Tooltip
} from 'antd';
import { 
  FileTextOutlined, CloudUploadOutlined, UserOutlined, 
  BellOutlined, SettingOutlined, LogoutOutlined, 
  FolderOutlined, TagOutlined, ShareAltOutlined,
  TrophyOutlined, ClockCircleOutlined, CheckCircleOutlined,
  ExclamationCircleOutlined, InboxOutlined, EyeOutlined,
  DownloadOutlined, HeartOutlined, TeamOutlined
} from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import { analyticsAPI, documentsAPI, notificationsAPI, usersAPI } from '@/lib/api';
import { DashboardStats, Document, Notification, ActivityLog } from '@/types';
import Link from 'next/link';

const { Title, Text } = Typography;
const { Dragger } = Upload;

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentDocuments, setRecentDocuments] = useState<Document[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard stats
      const statsData = await analyticsAPI.getDashboardStats();
      setStats(statsData);
      
      // Fetch recent documents
      const docsResponse = await documentsAPI.list({ page_size: 10 });
      setRecentDocuments(docsResponse.items || []);
      
      // Fetch notifications
      const notificationsResponse = await notificationsAPI.list({ page_size: 5 });
      setNotifications(notificationsResponse.items || []);
      
      // Fetch user activity
      const activityData = await usersAPI.getActivity(10);
      setActivities(activityData);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      message.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      await documentsAPI.upload(file);
      message.success('File uploaded successfully!');
      fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error('Upload error:', error);
      message.error('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: <Link href="/profile">Profile Settings</Link>,
    },
    {
      key: 'notifications',
      icon: <BellOutlined />,
      label: <Link href="/notifications">Notifications</Link>,
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: <Link href="/settings">Settings</Link>,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: logout,
    },
  ];

  const documentColumns = [
    {
      title: 'Name',
      dataIndex: 'original_filename',
      key: 'filename',
      render: (text: string, record: Document) => (
        <Space>
          <FileTextOutlined />
          <Link href={`/documents/${record.id}`}>{text}</Link>
        </Space>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'document_type',
      key: 'type',
      render: (type: string) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors = {
          uploaded: 'orange',
          processing: 'blue',
          processed: 'green',
          error: 'red',
        };
        return <Tag color={colors[status as keyof typeof colors] || 'default'}>{status}</Tag>;
      },
    },
    {
      title: 'Size',
      dataIndex: 'file_size',
      key: 'size',
      render: (size: number) => `${Math.round(size / 1024)} KB`,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: Document) => (
        <Space>
          <Tooltip title="View">
            <Button type="text" icon={<EyeOutlined />} size="small" />
          </Tooltip>
          <Tooltip title="Download">
            <Button type="text" icon={<DownloadOutlined />} size="small" />
          </Tooltip>
          <Tooltip title="Add to Favorites">
            <Button type="text" icon={<HeartOutlined />} size="small" />
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Title level={2} className="m-0 gradient-text">
                ARIA Dashboard
              </Title>
              <Badge count={notifications.length} size="small">
                <BellOutlined className="text-xl text-gray-600" />
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              <Text className="text-gray-600">
                Welcome back, <strong>{user?.full_name || user?.username}</strong>
              </Text>
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <Avatar 
                  size="large" 
                  icon={<UserOutlined />} 
                  className="cursor-pointer bg-blue-500"
                />
              </Dropdown>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {stats && (
          <Row gutter={[24, 24]} className="mb-8">
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Total Documents"
                  value={stats.total_documents}
                  prefix={<FileTextOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Processed"
                  value={stats.processed_documents}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Pending"
                  value={stats.pending_documents}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Success Rate"
                  value={stats.success_rate}
                  suffix="%"
                  prefix={<TrophyOutlined />}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
          </Row>
        )}

        <Row gutter={[24, 24]}>
          {/* Quick Upload */}
          <Col xs={24} lg={8}>
            <Card title="Quick Upload" className="h-full">
              <Dragger
                name="file"
                multiple={false}
                beforeUpload={(file) => {
                  handleFileUpload(file);
                  return false; // Prevent default upload
                }}
                disabled={uploading}
                className="mb-4"
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">
                  Click or drag file to this area to upload
                </p>
                <p className="ant-upload-hint">
                  Support for single file upload. AI will automatically process and extract data.
                </p>
              </Dragger>
              
              <div className="space-y-2">
                <Button type="primary" block icon={<FolderOutlined />}>
                  <Link href="/documents">Browse All Documents</Link>
                </Button>
                <Button block icon={<TagOutlined />}>
                  <Link href="/tags">Manage Tags</Link>
                </Button>
                <Button block icon={<ShareAltOutlined />}>
                  <Link href="/sharing">Shared Documents</Link>
                </Button>
              </div>
            </Card>
          </Col>

          {/* Recent Activity */}
          <Col xs={24} lg={8}>
            <Card title="Recent Activity" className="h-full">
              <Timeline
                items={activities.slice(0, 5).map((activity) => ({
                  children: (
                    <div>
                      <Text strong>{activity.action}</Text>
                      <br />
                      <Text type="secondary" className="text-sm">
                        {new Date(activity.created_at).toLocaleString()}
                      </Text>
                    </div>
                  ),
                  color: activity.action.includes('upload') ? 'green' : 
                         activity.action.includes('delete') ? 'red' : 'blue',
                }))}
              />
              {activities.length === 0 && (
                <Text type="secondary">No recent activity</Text>
              )}
            </Card>
          </Col>

          {/* Notifications */}
          <Col xs={24} lg={8}>
            <Card 
              title="Recent Notifications" 
              extra={<Link href="/notifications">View All</Link>}
              className="h-full"
            >
              <List
                dataSource={notifications.slice(0, 5)}
                renderItem={(notification) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Badge dot={!notification.is_read}>
                          <Avatar 
                            icon={<BellOutlined />} 
                            size="small"
                            className={`bg-${notification.type === 'error' ? 'red' : 
                                              notification.type === 'warning' ? 'orange' : 
                                              notification.type === 'success' ? 'green' : 'blue'}-500`}
                          />
                        </Badge>
                      }
                      title={notification.title}
                      description={
                        <div>
                          <Text className="text-sm">{notification.message}</Text>
                          <br />
                          <Text type="secondary" className="text-xs">
                            {new Date(notification.created_at).toLocaleString()}
                          </Text>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
              {notifications.length === 0 && (
                <Text type="secondary">No new notifications</Text>
              )}
            </Card>
          </Col>
        </Row>

        {/* Recent Documents */}
        <Card title="Recent Documents" className="mt-8">
          <Table
            columns={documentColumns}
            dataSource={recentDocuments}
            rowKey="id"
            pagination={false}
            scroll={{ x: 800 }}
          />
          {recentDocuments.length === 0 && (
            <div className="text-center py-8">
              <FileTextOutlined className="text-4xl text-gray-400 mb-4" />
              <Text type="secondary">No documents yet. Upload your first document to get started!</Text>
            </div>
          )}
        </Card>

        {/* Quick Stats */}
        {stats && (
          <Row gutter={[24, 24]} className="mt-8">
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Total Users"
                  value={stats.total_users}
                  prefix={<TeamOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Active Workflows"
                  value={stats.active_workflows}
                  prefix={<ExclamationCircleOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Storage Used"
                  value={Math.round(stats.storage_used / (1024 * 1024))}
                  suffix="MB"
                  prefix={<CloudUploadOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Avg Processing Time"
                  value={stats.avg_processing_time}
                  suffix="s"
                  prefix={<ClockCircleOutlined />}
                />
              </Card>
            </Col>
          </Row>
        )}
      </div>
    </div>
  );
}