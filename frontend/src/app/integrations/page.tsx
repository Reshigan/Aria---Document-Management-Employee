'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Button, 
  Table, 
  Tag, 
  Space, 
  Modal, 
  Form, 
  Input, 
  Select, 
  message, 
  Tabs,
  Statistic,
  Progress,
  Tooltip,
  Popconfirm,
  Badge,
  Typography,
  Alert
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SyncOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  SettingOutlined,
  ApiOutlined,
  MailOutlined,
  SlackOutlined,
  CloudOutlined,
  DatabaseOutlined,
  LinkOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined
} from '@ant-design/icons';
import { integrationService, Integration, IntegrationCreate, IntegrationUpdate } from '@/services/integrationService';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const IntegrationsPage: React.FC = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [form] = Form.useForm();
  const [stats, setStats] = useState<any>({});
  const [health, setHealth] = useState<any>({});

  useEffect(() => {
    loadIntegrations();
    loadStats();
    loadHealth();
  }, []);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const data = await integrationService.getIntegrations();
      setIntegrations(data);
    } catch (error) {
      message.error('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await integrationService.getIntegrationStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load integration stats:', error);
    }
  };

  const loadHealth = async () => {
    try {
      const data = await integrationService.getIntegrationHealth();
      setHealth(data);
    } catch (error) {
      console.error('Failed to load integration health:', error);
    }
  };

  const handleCreate = () => {
    setEditingIntegration(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (integration: Integration) => {
    setEditingIntegration(integration);
    form.setFieldsValue({
      name: integration.name,
      type: integration.type,
      configuration: JSON.stringify(integration.configuration, null, 2)
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await integrationService.deleteIntegration(id);
      message.success('Integration deleted successfully');
      loadIntegrations();
    } catch (error) {
      message.error('Failed to delete integration');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const configData = {
        name: values.name,
        type: values.type,
        configuration: JSON.parse(values.configuration || '{}')
      };

      if (editingIntegration) {
        await integrationService.updateIntegration(editingIntegration.id, configData);
        message.success('Integration updated successfully');
      } else {
        await integrationService.createIntegration(configData as IntegrationCreate);
        message.success('Integration created successfully');
      }

      setModalVisible(false);
      loadIntegrations();
      loadStats();
      loadHealth();
    } catch (error) {
      message.error('Failed to save integration');
    }
  };

  const handleSync = async (integration: Integration) => {
    try {
      await integrationService.triggerSync(integration.id, { sync_type: 'full' });
      message.success('Sync triggered successfully');
      loadIntegrations();
    } catch (error) {
      message.error('Failed to trigger sync');
    }
  };

  const handleTestConnection = async (integration: Integration) => {
    try {
      const result = await integrationService.testConnection({
        type: integration.type,
        configuration: integration.configuration
      });
      
      if (result.success) {
        message.success('Connection test successful');
      } else {
        message.error(`Connection test failed: ${result.message}`);
      }
    } catch (error) {
      message.error('Connection test failed');
    }
  };

  const getIntegrationIcon = (type: string) => {
    switch (type) {
      case 'sap': return <DatabaseOutlined />;
      case 'email': return <MailOutlined />;
      case 'slack': return <SlackOutlined />;
      case 'teams': return <SlackOutlined />;
      case 'cloud_storage': return <CloudOutlined />;
      case 'webhook': return <LinkOutlined />;
      default: return <ApiOutlined />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'error': return 'error';
      case 'pending': return 'processing';
      default: return 'default';
    }
  };

  const getSyncStatusColor = (status?: string) => {
    switch (status) {
      case 'success': return 'success';
      case 'failed': return 'error';
      case 'in_progress': return 'processing';
      default: return 'default';
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Integration) => (
        <Space>
          {getIntegrationIcon(record.type)}
          <strong>{text}</strong>
        </Space>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color="blue">{type.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Last Sync',
      dataIndex: 'last_sync_at',
      key: 'last_sync_at',
      render: (date: string, record: Integration) => (
        <Space direction="vertical" size="small">
          <Text type="secondary">
            {date ? new Date(date).toLocaleString() : 'Never'}
          </Text>
          {record.sync_status && (
            <Tag color={getSyncStatusColor(record.sync_status)} size="small">
              {record.sync_status}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record: Integration) => (
        <Space>
          <Tooltip title="Test Connection">
            <Button 
              type="text" 
              icon={<CheckCircleOutlined />} 
              onClick={() => handleTestConnection(record)}
            />
          </Tooltip>
          <Tooltip title="Trigger Sync">
            <Button 
              type="text" 
              icon={<SyncOutlined />} 
              onClick={() => handleSync(record)}
              disabled={record.status !== 'active'}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Are you sure you want to delete this integration?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>Integrations</Title>
        <Text type="secondary">
          Manage external system integrations and data synchronization
        </Text>
      </div>

      {/* Statistics Cards */}
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

      {/* Health Status */}
      {health.overall_status && (
        <Alert
          message={`System Health: ${health.overall_status.toUpperCase()}`}
          description={health.message}
          type={health.overall_status === 'healthy' ? 'success' : 'warning'}
          showIcon
          style={{ marginBottom: '24px' }}
        />
      )}

      {/* Main Content */}
      <Card>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <Title level={4}>Integration List</Title>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleCreate}
          >
            Add Integration
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={integrations}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} integrations`,
          }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingIntegration ? 'Edit Integration' : 'Create Integration'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Integration Name"
            rules={[{ required: true, message: 'Please enter integration name' }]}
          >
            <Input placeholder="Enter integration name" />
          </Form.Item>

          <Form.Item
            name="type"
            label="Integration Type"
            rules={[{ required: true, message: 'Please select integration type' }]}
          >
            <Select placeholder="Select integration type">
              <Select.Option value="sap">SAP</Select.Option>
              <Select.Option value="email">Email</Select.Option>
              <Select.Option value="slack">Slack</Select.Option>
              <Select.Option value="teams">Microsoft Teams</Select.Option>
              <Select.Option value="cloud_storage">Cloud Storage</Select.Option>
              <Select.Option value="webhook">Webhook</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="configuration"
            label="Configuration (JSON)"
            rules={[
              { required: true, message: 'Please enter configuration' },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  try {
                    JSON.parse(value);
                    return Promise.resolve();
                  } catch {
                    return Promise.reject(new Error('Invalid JSON format'));
                  }
                }
              }
            ]}
          >
            <Input.TextArea
              rows={8}
              placeholder='{"key": "value"}'
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default IntegrationsPage;