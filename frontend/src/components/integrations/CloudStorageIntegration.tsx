'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
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
  Alert
} from 'antd';
import {
  CloudOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  TestTubeOutlined,
  AmazonOutlined,
  GoogleOutlined,
  WindowsOutlined,
  DropboxOutlined
} from '@ant-design/icons';
import { integrationService, CloudStorageConnection } from '@/services/integrationService';

const { Title, Text } = Typography;
const { Option } = Select;

interface CloudStorageIntegrationProps {
  integrationId?: number;
}

const CloudStorageIntegration: React.FC<CloudStorageIntegrationProps> = ({ integrationId }) => {
  const [connections, setConnections] = useState<CloudStorageConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingConnection, setEditingConnection] = useState<CloudStorageConnection | null>(null);
  const [testingConnection, setTestingConnection] = useState<number | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [form] = Form.useForm();

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      setLoading(true);
      const data = await integrationService.getCloudStorageConnections();
      setConnections(data);
    } catch (error) {
      message.error('Failed to load cloud storage connections');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingConnection(null);
    form.resetFields();
    form.setFieldsValue({
      is_active: true
    });
    setSelectedProvider('');
    setModalVisible(true);
  };

  const handleEdit = (connection: CloudStorageConnection) => {
    setEditingConnection(connection);
    form.setFieldsValue(connection);
    setSelectedProvider(connection.provider);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await integrationService.deleteCloudStorageConnection(id);
      message.success('Cloud storage connection deleted successfully');
      loadConnections();
    } catch (error) {
      message.error('Failed to delete cloud storage connection');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingConnection) {
        await integrationService.updateCloudStorageConnection(editingConnection.id, values);
        message.success('Cloud storage connection updated successfully');
      } else {
        await integrationService.createCloudStorageConnection({
          ...values,
          integration_id: integrationId
        });
        message.success('Cloud storage connection created successfully');
      }

      setModalVisible(false);
      loadConnections();
    } catch (error) {
      message.error('Failed to save cloud storage connection');
    }
  };

  const handleTestConnection = async (id: number) => {
    try {
      setTestingConnection(id);
      const result = await integrationService.testCloudStorageConnection(id);
      
      if (result.success) {
        message.success('Cloud storage connection test successful');
      } else {
        message.error(`Cloud storage connection test failed: ${result.message}`);
      }
    } catch (error) {
      message.error('Cloud storage connection test failed');
    } finally {
      setTestingConnection(null);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'aws_s3': return <AmazonOutlined />;
      case 'google_drive': return <GoogleOutlined />;
      case 'onedrive': return <WindowsOutlined />;
      case 'dropbox': return <DropboxOutlined />;
      default: return <CloudOutlined />;
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'aws_s3': return 'AWS S3';
      case 'google_drive': return 'Google Drive';
      case 'onedrive': return 'OneDrive';
      case 'dropbox': return 'Dropbox';
      default: return provider;
    }
  };

  const getConnectionStatus = (connection: CloudStorageConnection) => {
    return connection.is_active ? 'Active' : 'Inactive';
  };

  const getStatusColor = (connection: CloudStorageConnection) => {
    return connection.is_active ? 'success' : 'default';
  };

  const renderProviderFields = () => {
    switch (selectedProvider) {
      case 'aws_s3':
        return (
          <>
            <Form.Item
              name="access_key_id"
              label="Access Key ID"
              rules={[{ required: true, message: 'Please enter access key ID' }]}
            >
              <Input placeholder="AKIAIOSFODNN7EXAMPLE" />
            </Form.Item>
            <Form.Item
              name="secret_access_key"
              label="Secret Access Key"
              rules={[{ required: !editingConnection, message: 'Please enter secret access key' }]}
            >
              <Input.Password placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="bucket_name"
                  label="Bucket Name"
                  rules={[{ required: true, message: 'Please enter bucket name' }]}
                >
                  <Input placeholder="my-document-bucket" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="region"
                  label="Region"
                  rules={[{ required: true, message: 'Please enter region' }]}
                >
                  <Select placeholder="Select region">
                    <Option value="us-east-1">US East (N. Virginia)</Option>
                    <Option value="us-west-2">US West (Oregon)</Option>
                    <Option value="eu-west-1">Europe (Ireland)</Option>
                    <Option value="ap-southeast-1">Asia Pacific (Singapore)</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </>
        );
      case 'google_drive':
        return (
          <>
            <Form.Item
              name="client_id"
              label="Client ID"
              rules={[{ required: true, message: 'Please enter client ID' }]}
            >
              <Input placeholder="123456789-abcdefghijklmnop.apps.googleusercontent.com" />
            </Form.Item>
            <Form.Item
              name="client_secret"
              label="Client Secret"
              rules={[{ required: !editingConnection, message: 'Please enter client secret' }]}
            >
              <Input.Password placeholder="GOCSPX-abcdefghijklmnopqrstuvwxyz" />
            </Form.Item>
            <Form.Item
              name="folder_id"
              label="Folder ID (Optional)"
            >
              <Input placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" />
            </Form.Item>
          </>
        );
      case 'onedrive':
        return (
          <>
            <Form.Item
              name="client_id"
              label="Application ID"
              rules={[{ required: true, message: 'Please enter application ID' }]}
            >
              <Input placeholder="12345678-1234-1234-1234-123456789012" />
            </Form.Item>
            <Form.Item
              name="client_secret"
              label="Client Secret"
              rules={[{ required: !editingConnection, message: 'Please enter client secret' }]}
            >
              <Input.Password placeholder="abcdefghijklmnopqrstuvwxyz123456" />
            </Form.Item>
            <Form.Item
              name="tenant_id"
              label="Tenant ID"
              rules={[{ required: true, message: 'Please enter tenant ID' }]}
            >
              <Input placeholder="87654321-4321-4321-4321-210987654321" />
            </Form.Item>
          </>
        );
      case 'dropbox':
        return (
          <>
            <Form.Item
              name="app_key"
              label="App Key"
              rules={[{ required: true, message: 'Please enter app key' }]}
            >
              <Input placeholder="abcdefghijklmnop" />
            </Form.Item>
            <Form.Item
              name="app_secret"
              label="App Secret"
              rules={[{ required: !editingConnection, message: 'Please enter app secret' }]}
            >
              <Input.Password placeholder="1234567890abcdef" />
            </Form.Item>
            <Form.Item
              name="access_token"
              label="Access Token"
              rules={[{ required: !editingConnection, message: 'Please enter access token' }]}
            >
              <Input.Password placeholder="sl.BwABCDEFGHIJKLMNOPQRSTUVWXYZ" />
            </Form.Item>
          </>
        );
      default:
        return null;
    }
  };

  const columns = [
    {
      title: 'Provider',
      key: 'provider',
      render: (_, record: CloudStorageConnection) => (
        <Space>
          {getProviderIcon(record.provider)}
          <Text strong>{getProviderName(record.provider)}</Text>
        </Space>
      ),
    },
    {
      title: 'Configuration',
      key: 'configuration',
      render: (_, record: CloudStorageConnection) => (
        <Space direction="vertical" size="small">
          {record.bucket_name && <Text>Bucket: {record.bucket_name}</Text>}
          {record.region && <Text type="secondary">Region: {record.region}</Text>}
          {record.folder_id && <Text type="secondary">Folder: {record.folder_id}</Text>}
        </Space>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record: CloudStorageConnection) => (
        <Tag color={getStatusColor(record)}>
          {getConnectionStatus(record)}
        </Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => (
        <Text type="secondary">
          {new Date(date).toLocaleDateString()}
        </Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record: CloudStorageConnection) => (
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
  const providerCounts = connections.reduce((acc, conn) => {
    acc[conn.provider] = (acc[conn.provider] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Title level={3}>
          <CloudOutlined /> Cloud Storage Integration
        </Title>
        <Text type="secondary">
          Manage cloud storage connections for document synchronization
        </Text>
      </div>

      {/* Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Connections"
              value={connections.length}
              prefix={<CloudOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Active Connections"
              value={activeConnections}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="AWS S3"
              value={providerCounts.aws_s3 || 0}
              prefix={<AmazonOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Google Drive"
              value={providerCounts.google_drive || 0}
              prefix={<GoogleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Connections Table */}
      <Card>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <Title level={4}>Cloud Storage Connections</Title>
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
        title={editingConnection ? 'Edit Cloud Storage Connection' : 'Create Cloud Storage Connection'}
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
            name="provider"
            label="Cloud Storage Provider"
            rules={[{ required: true, message: 'Please select a provider' }]}
          >
            <Select 
              placeholder="Select cloud storage provider"
              onChange={setSelectedProvider}
            >
              <Option value="aws_s3">
                <Space>
                  <AmazonOutlined />
                  AWS S3
                </Space>
              </Option>
              <Option value="google_drive">
                <Space>
                  <GoogleOutlined />
                  Google Drive
                </Space>
              </Option>
              <Option value="onedrive">
                <Space>
                  <WindowsOutlined />
                  Microsoft OneDrive
                </Space>
              </Option>
              <Option value="dropbox">
                <Space>
                  <DropboxOutlined />
                  Dropbox
                </Space>
              </Option>
            </Select>
          </Form.Item>

          {selectedProvider && (
            <>
              <Divider>Provider Configuration</Divider>
              {renderProviderFields()}
            </>
          )}

          <Divider>General Settings</Divider>

          <Form.Item
            name="is_active"
            label="Active"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          {selectedProvider && (
            <Alert
              message="Security Notice"
              description="Credentials are encrypted and stored securely. Test the connection after saving to ensure proper configuration."
              type="info"
              showIcon
              style={{ marginTop: '16px' }}
            />
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default CloudStorageIntegration;