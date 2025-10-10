'use client';

import { useState } from 'react';
import {
  Layout,
  Menu,
  Card,
  Typography,
  Space,
  Badge,
  Button,
  Tabs,
  Statistic,
  Row,
  Col
} from 'antd';
import {
  BellOutlined,
  SettingOutlined,
  InboxOutlined,
  ArchiveOutlined,
  DeleteOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import NotificationPanel from './NotificationPanel';
import NotificationSettings from './NotificationSettings';
import { useNotifications } from '../hooks/useNotifications';

const { Title } = Typography;
const { TabPane } = Tabs;

interface NotificationCenterProps {
  userId?: number;
}

export default function NotificationCenter({ userId }: NotificationCenterProps) {
  const [activeTab, setActiveTab] = useState('inbox');
  
  // Get notification counts for different filters
  const { unreadCount } = useNotifications();
  const { notifications: archivedNotifications } = useNotifications({ is_archived: true });
  const { notifications: allNotifications } = useNotifications();

  const menuItems = [
    {
      key: 'inbox',
      icon: <InboxOutlined />,
      label: (
        <Space>
          Inbox
          {unreadCount > 0 && <Badge count={unreadCount} size="small" />}
        </Space>
      )
    },
    {
      key: 'archived',
      icon: <ArchiveOutlined />,
      label: (
        <Space>
          Archived
          <Badge count={archivedNotifications.length} size="small" showZero={false} />
        </Space>
      )
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings'
    },
    {
      key: 'analytics',
      icon: <BarChartOutlined />,
      label: 'Analytics'
    }
  ];

  const renderInbox = () => (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Notifications"
              value={allNotifications.length}
              prefix={<BellOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Unread"
              value={unreadCount}
              prefix={<InboxOutlined />}
              valueStyle={{ color: unreadCount > 0 ? '#cf1322' : '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Archived"
              value={archivedNotifications.length}
              prefix={<ArchiveOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey="all" size="small">
        <TabPane tab="All" key="all">
          <NotificationList filters={{}} />
        </TabPane>
        <TabPane tab="Unread" key="unread">
          <NotificationList filters={{ is_read: false }} />
        </TabPane>
        <TabPane tab="Document" key="document">
          <NotificationList filters={{ type: 'DOCUMENT_UPLOAD' }} />
        </TabPane>
        <TabPane tab="Workflow" key="workflow">
          <NotificationList filters={{ type: 'WORKFLOW_UPDATE' }} />
        </TabPane>
        <TabPane tab="System" key="system">
          <NotificationList filters={{ type: 'SYSTEM_ALERT' }} />
        </TabPane>
      </Tabs>
    </div>
  );

  const renderArchived = () => (
    <div>
      <Title level={4}>Archived Notifications</Title>
      <NotificationList filters={{ is_archived: true }} />
    </div>
  );

  const renderAnalytics = () => (
    <div>
      <Title level={4}>Notification Analytics</Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="Notification Types">
            <NotificationTypeChart />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Daily Activity">
            <NotificationActivityChart />
          </Card>
        </Col>
        <Col xs={24}>
          <Card title="Response Times">
            <NotificationResponseChart />
          </Card>
        </Col>
      </Row>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'inbox':
        return renderInbox();
      case 'archived':
        return renderArchived();
      case 'settings':
        return <NotificationSettings userId={userId} />;
      case 'analytics':
        return renderAnalytics();
      default:
        return renderInbox();
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Layout.Sider
        width={250}
        style={{ background: '#fff' }}
        breakpoint="lg"
        collapsedWidth="0"
      >
        <div style={{ padding: '16px' }}>
          <Title level={4} style={{ margin: 0 }}>
            <BellOutlined /> Notifications
          </Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[activeTab]}
          items={menuItems}
          onClick={({ key }) => setActiveTab(key)}
          style={{ borderRight: 0 }}
        />
      </Layout.Sider>
      
      <Layout.Content style={{ padding: '24px' }}>
        {renderContent()}
      </Layout.Content>
    </Layout>
  );
}

// Helper component for notification lists
function NotificationList({ filters }: { filters: any }) {
  const { notifications, loading, actions } = useNotifications(filters);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <InboxOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
          <div style={{ marginTop: '16px', color: '#999' }}>
            No notifications found
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div>
      {notifications.map(notification => (
        <Card
          key={notification.id}
          size="small"
          style={{
            marginBottom: 8,
            backgroundColor: notification.is_read ? '#fff' : '#f0f5ff'
          }}
          actions={[
            <Button
              key="read"
              type="text"
              size="small"
              onClick={() => 
                notification.is_read 
                  ? actions.markAsUnread(notification.id)
                  : actions.markAsRead(notification.id)
              }
            >
              {notification.is_read ? 'Mark Unread' : 'Mark Read'}
            </Button>,
            <Button
              key="archive"
              type="text"
              size="small"
              onClick={() => actions.markAsArchived(notification.id)}
            >
              Archive
            </Button>,
            <Button
              key="delete"
              type="text"
              size="small"
              danger
              onClick={() => actions.deleteNotification(notification.id)}
            >
              Delete
            </Button>
          ]}
        >
          <Card.Meta
            title={notification.title}
            description={notification.message}
          />
          <div style={{ marginTop: 8, fontSize: '12px', color: '#999' }}>
            {new Date(notification.created_at).toLocaleString()}
          </div>
        </Card>
      ))}
    </div>
  );
}

// Placeholder chart components
function NotificationTypeChart() {
  return <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    Chart placeholder - Notification types distribution
  </div>;
}

function NotificationActivityChart() {
  return <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    Chart placeholder - Daily notification activity
  </div>;
}

function NotificationResponseChart() {
  return <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    Chart placeholder - Average response times
  </div>;
}