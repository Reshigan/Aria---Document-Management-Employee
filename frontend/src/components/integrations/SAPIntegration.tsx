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
  Progress
} from 'antd';
import {
  DatabaseOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  TestTubeOutlined
} from '@ant-design/icons';
import { integrationService, SAPConnection } from '@/services/integrationService';

const { Title, Text } = Typography;

interface SAPIntegrationProps {
  integrationId?: number;
}

const SAPIntegration: React.FC<SAPIntegrationProps> = ({ integrationId }) => {
  const [connections, setConnections] = useState<SAPConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingConnection, setEditingConnection] = useState<SAPConnection | null>(null);
  const [testingConnection, setTestingConnection] = useState<number | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      setLoading(true);
      const data = await integrationService.getSAPConnections();
      setConnections(data);
    } catch (error) {
      message.error('Failed to load SAP connections');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingConnection(null);
    form.resetFields();
    form.setFieldsValue({
      server_port: 3300,
      connection_pool_size: 10,
      timeout: 30,
      is_active: true
    });
    setModalVisible(true);
  };

  const handleEdit = (connection: SAPConnection) => {
    setEditingConnection(connection);
    form.setFieldsValue(connection);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await integrationService.deleteSAPConnection(id);
      message.success('SAP connection deleted successfully');
      loadConnections();
    } catch (error) {
      message.error('Failed to delete SAP connection');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingConnection) {
        await integrationService.updateSAPConnection(editingConnection.id, values);
        message.success('SAP connection updated successfully');
      } else {
        await integrationService.createSAPConnection({
          ...values,
          integration_id: integrationId
        });
        message.success('SAP connection created successfully');
      }

      setModalVisible(false);
      loadConnections();
    } catch (error) {
      message.error('Failed to save SAP connection');
    }
  };

  const handleTestConnection = async (id: number) => {
    try {
      setTestingConnection(id);
      const result = await integrationService.testSAPConnection(id);
      
      if (result.success) {
        message.success('SAP connection test successful');
      } else {
        message.error(`SAP connection test failed: ${result.message}`);
      }
    } catch (error) {
      message.error('SAP connection test failed');
    } finally {
      setTestingConnection(null);
    }
  };

  const getConnectionStatus = (connection: SAPConnection) => {
    if (connection.is_active) {
      return connection.last_connected_at ? 'Connected' : 'Active';
    }
    return 'Inactive';
  };

  const getStatusColor = (connection: SAPConnection) => {
    if (connection.is_active) {
      return connection.last_connected_at ? 'success' : 'processing';
    }
    return 'default';
  };

  const columns = [
    {
      title: 'Server',
      key: 'server',
      render: (_, record: SAPConnection) => (
        <Space direction="vertical" size="small">
          <Text strong>{record.server_host}:{record.server_port}</Text>
          <Text type="secondary">Client: {record.client}</Text>
        </Space>
      ),
    },
    {
      title: 'System',
      dataIndex: 'system_number',
      key: 'system_number',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record: SAPConnection) => (
        <Tag color={getStatusColor(record)}>
          {getConnectionStatus(record)}
        </Tag>
      ),
    },
    {
      title: 'Last Connected',
      dataIndex: 'last_connected_at',
      key: 'last_connected_at',
      render: (date: string) => (
        <Text type="secondary">
          {date ? new Date(date).toLocaleString() : 'Never'}
        </Text>
      ),
    },
    {
      title: 'Pool Size',
      dataIndex: 'connection_pool_size',
      key: 'connection_pool_size',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record: SAPConnection) => (
        <Space>
          <Tooltip title="Test Connection">
            <Button
              type="text"
              icon={<TestTubeOutlined />}
              loading={testingConnection === record.id}
              onClick={() => handleTestConnection(record.id)}
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
            title="Are you sure you want to delete this connection?"
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

  const activeConnections = connections.filter(c => c.is_active).length;
  const connectedConnections = connections.filter(c => c.last_connected_at).length;

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Title level={3}>
          <DatabaseOutlined /> SAP Integration
        </Title>
        <Text type="secondary">
          Manage SAP system connections and data synchronization
        </Text>
      </div>

      {/* Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Connections"
              value={connections.length}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Active Connections"
              value={activeConnections}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Connected"
              value={connectedConnections}
              prefix={<SyncOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Connections Table */}
      <Card>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <Title level={4}>SAP Connections</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            Add Connection
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={connections}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} connections`,
          }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingConnection ? 'Edit SAP Connection' : 'Create SAP Connection'}
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
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="server_host"
                label="Server Host"
                rules={[{ required: true, message: 'Please enter server host' }]}
              >
                <Input placeholder="sap.company.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="server_port"
                label="Server Port"
                rules={[{ required: true, message: 'Please enter server port' }]}
              >
                <InputNumber
                  min={1}
                  max={65535}
                  style={{ width: '100%' }}
                  placeholder="3300"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="client"
                label="Client"
                rules={[{ required: true, message: 'Please enter client' }]}
              >
                <Input placeholder="100" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="system_number"
                label="System Number"
                rules={[{ required: true, message: 'Please enter system number' }]}
              >
                <Input placeholder="00" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Please enter username' }]}
          >
            <Input placeholder="SAP username" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: !editingConnection, message: 'Please enter password' }]}
          >
            <Input.Password placeholder="SAP password" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="connection_pool_size"
                label="Connection Pool Size"
                rules={[{ required: true, message: 'Please enter pool size' }]}
              >
                <InputNumber
                  min={1}
                  max={100}
                  style={{ width: '100%' }}
                  placeholder="10"
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
        </Form>
      </Modal>
    </div>
  );
};

export default SAPIntegration;