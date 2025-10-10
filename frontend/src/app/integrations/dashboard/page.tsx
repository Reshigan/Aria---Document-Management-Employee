'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Tabs,
  Typography,
  Space,
  Statistic,
  Progress,
  Alert,
  Button,
  Table,
  Tag,
  Timeline,
  message
} from 'antd';
import {
  ApiOutlined,
  DatabaseOutlined,
  MailOutlined,
  CloudOutlined,
  LinkOutlined,
  SlackOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  HistoryOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { integrationService, SyncLog } from '@/services/integrationService';
import SAPIntegration from '@/components/integrations/SAPIntegration';
import EmailIntegration from '@/components/integrations/EmailIntegration';
import CloudStorageIntegration from '@/components/integrations/CloudStorageIntegration';
import WebhookIntegration from '@/components/integrations/WebhookIntegration';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const IntegrationsDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>({});
  const [health, setHealth] = useState<any>({});
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, healthData, logsData] = await Promise.all([
        integrationService.getIntegrationStats(),
        integrationService.getIntegrationHealth(),
        integrationService.getSyncLogs(undefined, 10)
      ]);
      
      setStats(statsData);
      setHealth(healthData);
      setSyncLogs(logsData);
    } catch (error) {
      message.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'warning': return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      case 'critical': return <CloseCircleOutlined style={{ color: '#f5222d' }} />;
      default: return <ExclamationCircleOutlined style={{ color: '#d9d9d9' }} />;
    }
  };

  const getSyncStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'success';
      case 'failed': return 'error';
      case 'in_progress': return 'processing';
      default: return 'default';
    }
  };

  const syncLogColumns = [
    {
      title: 'Integration',
      dataIndex: 'integration_id',
      key: 'integration_id',
      render: (id: number) => `Integration ${id}`,
    },
    {
      title: 'Sync Type',
      dataIndex: 'sync_type',
      key: 'sync_type',
      render: (type: string) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getSyncStatusColor(status)}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Records',
      key: 'records',
      render: (_, record: SyncLog) => (
        <Space direction="vertical" size="small">
          <Text>Processed: {record.records_processed}</Text>
          <Text type="success">Success: {record.records_successful}</Text>
          {record.records_failed > 0 && (
            <Text type="danger">Failed: {record.records_failed}</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration: number) => (
        <Text>{duration ? `${duration}s` : 'N/A'}</Text>
      ),
    },
    {
      title: 'Started At',
      dataIndex: 'started_at',
      key: 'started_at',
      render: (date: string) => (
        <Text type="secondary">
          {new Date(date).toLocaleString()}
        </Text>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <ApiOutlined /> Integrations Dashboard
        </Title>
        <Text type="secondary">
          Monitor and manage all system integrations from a centralized dashboard
        </Text>
      </div>

      {/* Health Status Alert */}
      {health.overall_status && (
        <Alert
          message={
            <Space>
              {getHealthStatusIcon(health.overall_status)}
              <Text strong>System Health: {health.overall_status.toUpperCase()}</Text>
            </Space>
          }
          description={health.message}
          type={health.overall_status === 'healthy' ? 'success' : 
                health.overall_status === 'warning' ? 'warning' : 'error'}
          showIcon={false}
          style={{ marginBottom: '24px' }}
          action={
            <Button size="small" onClick={loadDashboardData}>
              Refresh
            </Button>
          }
        />
      )}

      {/* Overview Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Integrations"
              value={stats.total_integrations || 0}
              prefix={<ApiOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Active Integrations"
              value={stats.active_integrations || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Failed Integrations"
              value={stats.failed_integrations || 0}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Sync Success Rate"
              value={stats.sync_success_rate || 0}
              suffix="%"
              prefix={<SyncOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Integration Type Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="SAP Connections"
              value={stats.sap_connections || 0}
              prefix={<DatabaseOutlined />}
            />
            <Progress 
              percent={((stats.active_sap_connections || 0) / Math.max(stats.sap_connections || 1, 1)) * 100} 
              size="small" 
              showInfo={false}
              strokeColor="#52c41a"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Email Configs"
              value={stats.email_configurations || 0}
              prefix={<MailOutlined />}
            />
            <Progress 
              percent={((stats.active_email_configurations || 0) / Math.max(stats.email_configurations || 1, 1)) * 100} 
              size="small" 
              showInfo={false}
              strokeColor="#1890ff"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Cloud Storage"
              value={stats.cloud_storage_connections || 0}
              prefix={<CloudOutlined />}
            />
            <Progress 
              percent={((stats.active_cloud_storage_connections || 0) / Math.max(stats.cloud_storage_connections || 1, 1)) * 100} 
              size="small" 
              showInfo={false}
              strokeColor="#722ed1"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Webhooks"
              value={stats.webhook_endpoints || 0}
              prefix={<LinkOutlined />}
            />
            <Progress 
              percent={((stats.active_webhook_endpoints || 0) / Math.max(stats.webhook_endpoints || 1, 1)) * 100} 
              size="small" 
              showInfo={false}
              strokeColor="#fa8c16"
            />
          </Card>
        </Col>
      </Row>

      {/* Recent Sync Logs */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <HistoryOutlined />
                Recent Sync Activity
              </Space>
            }
            extra={
              <Button size="small" onClick={loadDashboardData}>
                Refresh
              </Button>
            }
          >
            <Table
              columns={syncLogColumns}
              dataSource={syncLogs}
              rowKey="id"
              loading={loading}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <CheckCircleOutlined />
                System Status
              </Space>
            }
          >
            <Timeline>
              <Timeline.Item 
                color={health.overall_status === 'healthy' ? 'green' : 'red'}
                dot={getHealthStatusIcon(health.overall_status)}
              >
                <Text strong>Overall System</Text>
                <br />
                <Text type="secondary">{health.message}</Text>
              </Timeline.Item>
              <Timeline.Item color="blue">
                <Text strong>Database Connection</Text>
                <br />
                <Text type="secondary">Connected and responsive</Text>
              </Timeline.Item>
              <Timeline.Item color="green">
                <Text strong>API Services</Text>
                <br />
                <Text type="secondary">All services operational</Text>
              </Timeline.Item>
              <Timeline.Item color="orange">
                <Text strong>Background Jobs</Text>
                <br />
                <Text type="secondary">Processing normally</Text>
              </Timeline.Item>
            </Timeline>
          </Card>
        </Col>
      </Row>

      {/* Integration Management Tabs */}
      <Card>
        <Tabs defaultActiveKey="overview" size="large">
          <TabPane
            tab={
              <Space>
                <ApiOutlined />
                Overview
              </Space>
            }
            key="overview"
          >
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Title level={3}>Integration Management</Title>
              <Text type="secondary">
                Select a tab above to manage specific integration types, or use the main Integrations page for general management.
              </Text>
            </div>
          </TabPane>
          
          <TabPane
            tab={
              <Space>
                <DatabaseOutlined />
                SAP Integration
              </Space>
            }
            key="sap"
          >
            <SAPIntegration />
          </TabPane>
          
          <TabPane
            tab={
              <Space>
                <MailOutlined />
                Email Integration
              </Space>
            }
            key="email"
          >
            <EmailIntegration />
          </TabPane>
          
          <TabPane
            tab={
              <Space>
                <CloudOutlined />
                Cloud Storage
              </Space>
            }
            key="cloud"
          >
            <CloudStorageIntegration />
          </TabPane>
          
          <TabPane
            tab={
              <Space>
                <LinkOutlined />
                Webhooks
              </Space>
            }
            key="webhooks"
          >
            <WebhookIntegration />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default IntegrationsDashboard;