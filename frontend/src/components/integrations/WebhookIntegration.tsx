'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Button,
  Switch,
  Space,
  message,
  Table,
  Tag,
  Modal,
  Tooltip,
  Popconfirm,
  Typography,
  Row,
  Col,
  Statistic,
  Select,
  Divider,
  Alert,
  Checkbox
} from 'antd';
import {
  LinkOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SendOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  TestTubeOutlined,
  HistoryOutlined,
  KeyOutlined
} from '@ant-design/icons';
import { integrationService, WebhookEndpoint } from '@/services/integrationService';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface WebhookIntegrationProps {
  integrationId?: number;
}

const WebhookIntegration: React.FC<WebhookIntegrationProps> = ({ integrationId }) => {
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookEndpoint | null>(null);
  const [testingWebhook, setTestingWebhook] = useState<number | null>(null);
  const [form] = Form.useForm();

  const availableEvents = [
    'document.created',
    'document.updated',
    'document.deleted',
    'document.shared',
    'user.created',
    'user.updated',
    'user.login',
    'workflow.started',
    'workflow.completed',
    'notification.sent',
    'integration.sync_completed',
    'system.backup_completed'
  ];

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    try {
      setLoading(true);
      const data = await integrationService.getWebhookEndpoints();
      setWebhooks(data);
    } catch (error) {
      message.error('Failed to load webhook endpoints');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingWebhook(null);
    form.resetFields();
    form.setFieldsValue({
      method: 'POST',
      retry_count: 3,
      timeout: 30,
      is_active: true,
      headers: '{\n  "Content-Type": "application/json"\n}',
      events: []
    });
    setModalVisible(true);
  };

  const handleEdit = (webhook: WebhookEndpoint) => {
    setEditingWebhook(webhook);
    form.setFieldsValue({
      ...webhook,
      headers: JSON.stringify(webhook.headers, null, 2)
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await integrationService.deleteWebhookEndpoint(id);
      message.success('Webhook endpoint deleted successfully');
      loadWebhooks();
    } catch (error) {
      message.error('Failed to delete webhook endpoint');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const webhookData = {
        ...values,
        headers: JSON.parse(values.headers || '{}'),
        integration_id: integrationId
      };

      if (editingWebhook) {
        await integrationService.updateWebhookEndpoint(editingWebhook.id, webhookData);
        message.success('Webhook endpoint updated successfully');
      } else {
        await integrationService.createWebhookEndpoint(webhookData);
        message.success('Webhook endpoint created successfully');
      }

      setModalVisible(false);
      loadWebhooks();
    } catch (error) {
      message.error('Failed to save webhook endpoint');
    }
  };

  const handleTestWebhook = async (id: number) => {
    try {
      setTestingWebhook(id);
      const result = await integrationService.testWebhookEndpoint(id);
      
      if (result.success) {
        message.success('Webhook test successful');
      } else {
        message.error(`Webhook test failed: ${result.message}`);
      }
    } catch (error) {
      message.error('Webhook test failed');
    } finally {
      setTestingWebhook(null);
    }
  };

  const generateSecretKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    form.setFieldsValue({ secret_key: result });
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'blue';
      case 'POST': return 'green';
      case 'PUT': return 'orange';
      case 'DELETE': return 'red';
      default: return 'default';
    }
  };

  const getStatusColor = (webhook: WebhookEndpoint) => {
    return webhook.is_active ? 'success' : 'default';
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      render: (url: string) => (
        <Text code style={{ fontSize: '12px' }}>
          {url.length > 50 ? `${url.substring(0, 50)}...` : url}
        </Text>
      ),
    },
    {
      title: 'Method',
      dataIndex: 'method',
      key: 'method',
      render: (method: string) => (
        <Tag color={getMethodColor(method)}>{method}</Tag>
      ),
    },
    {
      title: 'Events',
      dataIndex: 'events',
      key: 'events',
      render: (events: string[]) => (
        <Space wrap>
          {events.slice(0, 2).map(event => (
            <Tag key={event} size="small">{event}</Tag>
          ))}
          {events.length > 2 && (
            <Tag size="small">+{events.length - 2} more</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record: WebhookEndpoint) => (
        <Tag color={getStatusColor(record)}>
          {record.is_active ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Retry Count',
      dataIndex: 'retry_count',
      key: 'retry_count',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record: WebhookEndpoint) => (
        <Space>
          <Tooltip title="Test Webhook">
            <Button
              type="text"
              icon={<TestTubeOutlined />}
              loading={testingWebhook === record.id}
              onClick={() => handleTestWebhook(record.id)}
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
            title="Are you sure you want to delete this webhook?"
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

  const activeWebhooks = webhooks.filter(w => w.is_active).length;
  const totalEvents = webhooks.reduce((sum, w) => sum + w.events.length, 0);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Title level={3}>
          <LinkOutlined /> Webhook Integration
        </Title>
        <Text type="secondary">
          Manage webhook endpoints for real-time event notifications
        </Text>
      </div>

      {/* Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Webhooks"
              value={webhooks.length}
              prefix={<LinkOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Active Webhooks"
              value={activeWebhooks}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Events"
              value={totalEvents}
              prefix={<SendOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Success Rate"
              value={98}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Webhooks Table */}
      <Card>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <Title level={4}>Webhook Endpoints</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            Add Webhook
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={webhooks}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} webhooks`,
          }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingWebhook ? 'Edit Webhook Endpoint' : 'Create Webhook Endpoint'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Webhook Name"
            rules={[{ required: true, message: 'Please enter webhook name' }]}
          >
            <Input placeholder="My Webhook Endpoint" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="url"
                label="Webhook URL"
                rules={[
                  { required: true, message: 'Please enter webhook URL' },
                  { type: 'url', message: 'Please enter a valid URL' }
                ]}
              >
                <Input placeholder="https://api.example.com/webhooks/aria" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="method"
                label="HTTP Method"
                rules={[{ required: true, message: 'Please select HTTP method' }]}
              >
                <Select placeholder="Select method">
                  <Option value="GET">GET</Option>
                  <Option value="POST">POST</Option>
                  <Option value="PUT">PUT</Option>
                  <Option value="DELETE">DELETE</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="events"
            label="Events to Subscribe"
            rules={[{ required: true, message: 'Please select at least one event' }]}
          >
            <Checkbox.Group>
              <Row>
                {availableEvents.map(event => (
                  <Col span={12} key={event} style={{ marginBottom: '8px' }}>
                    <Checkbox value={event}>{event}</Checkbox>
                  </Col>
                ))}
              </Row>
            </Checkbox.Group>
          </Form.Item>

          <Divider>Security Settings</Divider>

          <Form.Item
            name="secret_key"
            label="Secret Key (Optional)"
            extra="Used to sign webhook payloads for verification"
          >
            <Input.Password
              placeholder="Enter secret key or generate one"
              addonAfter={
                <Button
                  type="text"
                  icon={<KeyOutlined />}
                  onClick={generateSecretKey}
                  size="small"
                >
                  Generate
                </Button>
              }
            />
          </Form.Item>

          <Divider>Request Configuration</Divider>

          <Form.Item
            name="headers"
            label="HTTP Headers (JSON)"
            rules={[
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
            <TextArea
              rows={4}
              placeholder='{\n  "Content-Type": "application/json",\n  "Authorization": "Bearer token"\n}'
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="retry_count"
                label="Retry Count"
                rules={[{ required: true, message: 'Please enter retry count' }]}
              >
                <InputNumber
                  min={0}
                  max={10}
                  style={{ width: '100%' }}
                  placeholder="3"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="timeout"
                label="Timeout (seconds)"
                rules={[{ required: true, message: 'Please enter timeout' }]}
              >
                <InputNumber
                  min={1}
                  max={300}
                  style={{ width: '100%' }}
                  placeholder="30"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="is_active"
            label="Active"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Alert
            message="Webhook Security"
            description="Webhooks will include a signature header for payload verification when a secret key is provided. The signature is generated using HMAC-SHA256."
            type="info"
            showIcon
            style={{ marginTop: '16px' }}
          />
        </Form>
      </Modal>
    </div>
  );
};

export default WebhookIntegration;