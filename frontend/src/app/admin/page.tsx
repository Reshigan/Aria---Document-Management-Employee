'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, Row, Col, Statistic, Table, Button, Space, Tag, Progress,
  Tabs, List, Avatar, Typography, Alert, Divider, Select, DatePicker
} from 'antd';
import { 
  UserOutlined, FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined,
  WarningOutlined, DashboardOutlined, SettingOutlined, TeamOutlined,
  TrophyOutlined, LineChartOutlined, SafetyOutlined
} from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

interface AdminStats {
  users: {
    total: number;
    active: number;
    new_this_month: number;
  };
  documents: {
    total: number;
    processed_today: number;
    pending: number;
    failed: number;
    posted_to_sap: number;
  };
  processing: {
    avg_confidence: number;
    avg_processing_time: number;
    success_rate: number;
  };
  system: {
    storage_used: number;
    storage_total: number;
    uptime: string;
    version: string;
  };
}

interface RecentActivity {
  id: string;
  type: 'user_registered' | 'document_uploaded' | 'document_processed' | 'sap_posted' | 'error';
  user: string;
  description: string;
  timestamp: Date;
  status: 'success' | 'warning' | 'error' | 'info';
}

interface TopUser {
  id: number;
  username: string;
  full_name: string;
  documents_uploaded: number;
  documents_processed: number;
  success_rate: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    // Check if user is admin
    if (!user.is_superuser) {
      router.push('/dashboard');
      return;
    }
    
    loadAdminData();
  }, [user, selectedPeriod]);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      
      // Mock data - in real app, these would be API calls
      const mockStats: AdminStats = {
        users: {
          total: 156,
          active: 142,
          new_this_month: 23
        },
        documents: {
          total: 2847,
          processed_today: 45,
          pending: 12,
          failed: 3,
          posted_to_sap: 1892
        },
        processing: {
          avg_confidence: 87.5,
          avg_processing_time: 12.3,
          success_rate: 94.2
        },
        system: {
          storage_used: 15.7,
          storage_total: 100,
          uptime: '15 days, 7 hours',
          version: '2.0.0'
        }
      };

      const mockActivity: RecentActivity[] = [
        {
          id: '1',
          type: 'document_processed',
          user: 'john.doe',
          description: 'Processed invoice INV-2024-001.pdf with 95% confidence',
          timestamp: new Date(Date.now() - 300000),
          status: 'success'
        },
        {
          id: '2',
          type: 'sap_posted',
          user: 'jane.smith',
          description: 'Posted document to SAP: 1900000123',
          timestamp: new Date(Date.now() - 600000),
          status: 'success'
        },
        {
          id: '3',
          type: 'error',
          user: 'system',
          description: 'OCR processing failed for document scan_001.jpg',
          timestamp: new Date(Date.now() - 900000),
          status: 'error'
        },
        {
          id: '4',
          type: 'user_registered',
          user: 'admin',
          description: 'New user registered: mike.wilson',
          timestamp: new Date(Date.now() - 1200000),
          status: 'info'
        },
        {
          id: '5',
          type: 'document_uploaded',
          user: 'sarah.jones',
          description: 'Uploaded new document: receipt_2024_001.pdf',
          timestamp: new Date(Date.now() - 1500000),
          status: 'info'
        }
      ];

      const mockTopUsers: TopUser[] = [
        {
          id: 1,
          username: 'john.doe',
          full_name: 'John Doe',
          documents_uploaded: 234,
          documents_processed: 221,
          success_rate: 94.4
        },
        {
          id: 2,
          username: 'jane.smith',
          full_name: 'Jane Smith',
          documents_uploaded: 189,
          documents_processed: 185,
          success_rate: 97.9
        },
        {
          id: 3,
          username: 'mike.wilson',
          full_name: 'Mike Wilson',
          documents_uploaded: 156,
          documents_processed: 142,
          success_rate: 91.0
        },
        {
          id: 4,
          username: 'sarah.jones',
          full_name: 'Sarah Jones',
          documents_uploaded: 134,
          documents_processed: 128,
          success_rate: 95.5
        }
      ];

      setStats(mockStats);
      setRecentActivity(mockActivity);
      setTopUsers(mockTopUsers);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    const icons: any = {
      user_registered: <UserOutlined style={{ color: '#1890ff' }} />,
      document_uploaded: <FileTextOutlined style={{ color: '#52c41a' }} />,
      document_processed: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      sap_posted: <TrophyOutlined style={{ color: '#722ed1' }} />,
      error: <WarningOutlined style={{ color: '#ff4d4f' }} />
    };
    return icons[type] || <FileTextOutlined />;
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  if (!stats) return null;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <DashboardOutlined /> Admin Dashboard
        </Title>
        <Text type="secondary">System overview and management</Text>
      </div>

      <Tabs defaultActiveKey="overview">
        <TabPane tab="Overview" key="overview">
          {/* Key Metrics */}
          <Row gutter={16} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Total Users"
                  value={stats.users.total}
                  prefix={<UserOutlined />}
                  suffix={
                    <Text type="success" style={{ fontSize: '12px' }}>
                      +{stats.users.new_this_month} this month
                    </Text>
                  }
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Total Documents"
                  value={stats.documents.total}
                  prefix={<FileTextOutlined />}
                  suffix={
                    <Text type="success" style={{ fontSize: '12px' }}>
                      +{stats.documents.processed_today} today
                    </Text>
                  }
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Success Rate"
                  value={stats.processing.success_rate}
                  precision={1}
                  suffix="%"
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Avg Confidence"
                  value={stats.processing.avg_confidence}
                  precision={1}
                  suffix="%"
                  prefix={<TrophyOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
          </Row>

          {/* System Health */}
          <Row gutter={16} style={{ marginBottom: '24px' }}>
            <Col xs={24} md={12}>
              <Card title="System Health" extra={<Tag color="green">Healthy</Tag>}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text strong>Storage Usage</Text>
                    <Progress 
                      percent={(stats.system.storage_used / stats.system.storage_total) * 100} 
                      format={() => `${stats.system.storage_used}GB / ${stats.system.storage_total}GB`}
                    />
                  </div>
                  <div>
                    <Text strong>Uptime:</Text> <Text>{stats.system.uptime}</Text>
                  </div>
                  <div>
                    <Text strong>Version:</Text> <Text>{stats.system.version}</Text>
                  </div>
                  <div>
                    <Text strong>Active Users:</Text> <Text>{stats.users.active} / {stats.users.total}</Text>
                  </div>
                </Space>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card title="Recent Activity">
                <List
                  size="small"
                  dataSource={recentActivity.slice(0, 5)}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<Avatar icon={getActivityIcon(item.type)} />}
                        title={
                          <Space>
                            <Text strong>{item.user}</Text>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              {formatTimestamp(item.timestamp)}
                            </Text>
                          </Space>
                        }
                        description={item.description}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="Users" key="users">
          <Card title="Top Users">
            <Table
              dataSource={topUsers}
              rowKey="id"
              pagination={false}
              columns={[
                {
                  title: 'User',
                  dataIndex: 'full_name',
                  key: 'full_name',
                  render: (name: string, record: TopUser) => (
                    <Space>
                      <Avatar icon={<UserOutlined />} />
                      <div>
                        <div>{name}</div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          @{record.username}
                        </Text>
                      </div>
                    </Space>
                  ),
                },
                {
                  title: 'Documents Uploaded',
                  dataIndex: 'documents_uploaded',
                  key: 'documents_uploaded',
                  sorter: (a, b) => a.documents_uploaded - b.documents_uploaded,
                },
                {
                  title: 'Documents Processed',
                  dataIndex: 'documents_processed',
                  key: 'documents_processed',
                  sorter: (a, b) => a.documents_processed - b.documents_processed,
                },
                {
                  title: 'Success Rate',
                  dataIndex: 'success_rate',
                  key: 'success_rate',
                  render: (rate: number) => (
                    <Progress 
                      percent={rate} 
                      size="small" 
                      status={rate >= 95 ? 'success' : rate >= 85 ? 'normal' : 'exception'}
                    />
                  ),
                  sorter: (a, b) => a.success_rate - b.success_rate,
                },
              ]}
            />
          </Card>
        </TabPane>

        <TabPane tab="Settings" key="settings">
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Card title="System Configuration">
                <Alert
                  message="Configuration Management"
                  description="System configuration can be managed through environment variables and the admin panel."
                  type="info"
                  showIcon
                  style={{ marginBottom: '16px' }}
                />
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button icon={<SettingOutlined />} block>
                    Manage Environment Variables
                  </Button>
                  <Button icon={<SafetyOutlined />} block>
                    Security Settings
                  </Button>
                  <Button icon={<TeamOutlined />} block>
                    User Management
                  </Button>
                  <Button icon={<FileTextOutlined />} block>
                    Document Processing Settings
                  </Button>
                </Space>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card title="Maintenance">
                <Alert
                  message="System Maintenance"
                  description="Perform system maintenance tasks and monitoring."
                  type="warning"
                  showIcon
                  style={{ marginBottom: '16px' }}
                />
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button block>
                    Database Backup
                  </Button>
                  <Button block>
                    Clear Cache
                  </Button>
                  <Button block>
                    System Health Check
                  </Button>
                  <Button danger block>
                    Restart Services
                  </Button>
                </Space>
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
    </div>
  );
}