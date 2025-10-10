'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Popconfirm,
  Alert,
  Spin,
  Tooltip,
  Badge,
  InputNumber
} from 'antd';
import {
  KeyOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { securityService, APIKeyResponse, APIKeyWithSecret, APIKeyCreate } from '@/services/securityService';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const APIKeyManagement: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState<APIKeyResponse[]>([]);
  const [createVisible, setCreateVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [editingKey, setEditingKey] = useState<APIKeyResponse | null>(null);
  const [newKeyVisible, setNewKeyVisible] = useState(false);
  const [newKeyData, setNewKeyData] = useState<APIKeyWithSecret | null>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<number>>(new Set());

  const availablePermissions = [
    { value: 'documents:read', label: 'Read Documents' },
    { value: 'documents:write', label: 'Write Documents' },
    { value: 'documents:delete', label: 'Delete Documents' },
    { value: 'folders:read', label: 'Read Folders' },
    { value: 'folders:write', label: 'Write Folders' },
    { value: 'folders:delete', label: 'Delete Folders' },
    { value: 'users:read', label: 'Read Users' },
    { value: 'users:write', label: 'Write Users' },
    { value: 'analytics:read', label: 'Read Analytics' },
    { value: 'workflows:read', label: 'Read Workflows' },
    { value: 'workflows:write', label: 'Write Workflows' },
    { value: 'admin:all', label: 'Admin Access' }
  ];

  useEffect(() => {
    loadAPIKeys();
  }, []);

  const loadAPIKeys = async () => {
    try {
      setLoading(true);
      const data = await securityService.getAPIKeys();
      setApiKeys(data);
    } catch (error) {
      message.error('Failed to load API keys');
      console.error('API keys error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (values: any) => {
    try {
      setCreating(true);
      const createData: APIKeyCreate = {
        name: values.name,
        permissions: values.permissions,
        rate_limit: values.rate_limit,
        expires_at: values.expires_at ? values.expires_at.toISOString() : undefined
      };
      
      const newKey = await securityService.createAPIKey(createData);
      setNewKeyData(newKey);
      setNewKeyVisible(true);
      setCreateVisible(false);
      createForm.resetFields();
      await loadAPIKeys();
      message.success('API key created successfully');
    } catch (error) {
      message.error('Failed to create API key');
      console.error('Create API key error:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async (values: any) => {
    if (!editingKey) return;
    
    try {
      setUpdating(true);
      const updateData: Partial<APIKeyCreate> = {
        name: values.name,
        permissions: values.permissions,
        rate_limit: values.rate_limit,
        expires_at: values.expires_at ? values.expires_at.toISOString() : undefined
      };
      
      await securityService.updateAPIKey(editingKey.id, updateData);
      setEditVisible(false);
      setEditingKey(null);
      editForm.resetFields();
      await loadAPIKeys();
      message.success('API key updated successfully');
    } catch (error) {
      message.error('Failed to update API key');
      console.error('Update API key error:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (keyId: number) => {
    try {
      setDeleting(keyId);
      await securityService.deleteAPIKey(keyId);
      await loadAPIKeys();
      message.success('API key deleted successfully');
    } catch (error) {
      message.error('Failed to delete API key');
      console.error('Delete API key error:', error);
    } finally {
      setDeleting(null);
    }
  };

  const handleEditClick = (key: APIKeyResponse) => {
    setEditingKey(key);
    editForm.setFieldsValue({
      name: key.name,
      permissions: key.permissions,
      rate_limit: key.rate_limit,
      expires_at: key.expires_at ? dayjs(key.expires_at) : null
    });
    setEditVisible(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('API key copied to clipboard');
  };

  const toggleKeyVisibility = (keyId: number) => {
    const newVisibleKeys = new Set(visibleKeys);
    if (newVisibleKeys.has(keyId)) {
      newVisibleKeys.delete(keyId);
    } else {
      newVisibleKeys.add(keyId);
    }
    setVisibleKeys(newVisibleKeys);
  };

  const isKeyExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const isKeyExpiringSoon = (expiresAt?: string) => {
    if (!expiresAt) return false;
    const expiryTime = new Date(expiresAt).getTime();
    const now = new Date().getTime();
    const daysUntilExpiry = (expiryTime - now) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  };

  const getKeyStatus = (key: APIKeyResponse) => {
    if (isKeyExpired(key.expires_at)) {
      return <Tag color="red">Expired</Tag>;
    } else if (isKeyExpiringSoon(key.expires_at)) {
      return <Tag color="orange">Expiring Soon</Tag>;
    } else {
      return <Tag color="green">Active</Tag>;
    }
  };

  const columns: ColumnsType<APIKeyResponse> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: APIKeyResponse) => (
        <div>
          <Text strong>{name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            ID: {record.id}
          </Text>
        </div>
      ),
    },
    {
      title: 'Permissions',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (permissions: string[]) => (
        <div>
          {permissions.slice(0, 2).map(permission => (
            <Tag key={permission} size="small">
              {permission}
            </Tag>
          ))}
          {permissions.length > 2 && (
            <Tag size="small">+{permissions.length - 2} more</Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Rate Limit',
      dataIndex: 'rate_limit',
      key: 'rate_limit',
      render: (rateLimit: number) => (
        <Text>{rateLimit} req/min</Text>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record: APIKeyResponse) => getKeyStatus(record),
    },
    {
      title: 'Last Used',
      dataIndex: 'last_used_at',
      key: 'last_used_at',
      render: (lastUsedAt?: string) => (
        <Text type="secondary">
          {lastUsedAt ? new Date(lastUsedAt).toLocaleDateString() : 'Never'}
        </Text>
      ),
    },
    {
      title: 'Expires',
      dataIndex: 'expires_at',
      key: 'expires_at',
      render: (expiresAt?: string) => (
        <Text type="secondary">
          {expiresAt ? new Date(expiresAt).toLocaleDateString() : 'Never'}
        </Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record: APIKeyResponse) => (
        <Space>
          <Tooltip title="Edit API key">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditClick(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title="Delete API Key"
            description="Are you sure you want to delete this API key? This action cannot be undone."
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
            okType="danger"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              loading={deleting === record.id}
              size="small"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const expiredKeys = apiKeys.filter(key => isKeyExpired(key.expires_at));
  const expiringSoonKeys = apiKeys.filter(key => isKeyExpiringSoon(key.expires_at));

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2}>
            <KeyOutlined style={{ marginRight: '8px' }} />
            API Key Management
          </Title>
          <Text type="secondary">
            Create and manage API keys for programmatic access to your account
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadAPIKeys} loading={loading}>
            Refresh
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateVisible(true)}>
            Create API Key
          </Button>
        </Space>
      </div>

      {/* Alerts */}
      {expiredKeys.length > 0 && (
        <Alert
          message={`${expiredKeys.length} API key(s) have expired`}
          description="Expired API keys will not work. Please delete them or create new ones."
          type="error"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      {expiringSoonKeys.length > 0 && (
        <Alert
          message={`${expiringSoonKeys.length} API key(s) expiring soon`}
          description="These API keys will expire within 7 days. Consider renewing them."
          type="warning"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* API Keys Table */}
      <Card>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>Loading API keys...</div>
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={apiKeys}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
            }}
            locale={{
              emptyText: 'No API keys found. Create your first API key to get started.'
            }}
          />
        )}
      </Card>

      {/* Create API Key Modal */}
      <Modal
        title="Create API Key"
        open={createVisible}
        onCancel={() => {
          setCreateVisible(false);
          createForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={createForm}
          onFinish={handleCreate}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="API Key Name"
            rules={[
              { required: true, message: 'Please enter a name for the API key' },
              { min: 3, message: 'Name must be at least 3 characters' },
              { max: 50, message: 'Name must be less than 50 characters' }
            ]}
          >
            <Input placeholder="e.g., Mobile App Integration" />
          </Form.Item>

          <Form.Item
            name="permissions"
            label="Permissions"
            rules={[{ required: true, message: 'Please select at least one permission' }]}
          >
            <Select
              mode="multiple"
              placeholder="Select permissions"
              options={availablePermissions}
            />
          </Form.Item>

          <Form.Item
            name="rate_limit"
            label="Rate Limit (requests per minute)"
            rules={[{ required: true, message: 'Please set a rate limit' }]}
            initialValue={100}
          >
            <InputNumber min={1} max={10000} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="expires_at"
            label="Expiration Date (optional)"
          >
            <DatePicker
              style={{ width: '100%' }}
              disabledDate={(current) => current && current < dayjs().endOf('day')}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={creating}
              >
                Create API Key
              </Button>
              <Button onClick={() => setCreateVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit API Key Modal */}
      <Modal
        title="Edit API Key"
        open={editVisible}
        onCancel={() => {
          setEditVisible(false);
          setEditingKey(null);
          editForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={editForm}
          onFinish={handleEdit}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="API Key Name"
            rules={[
              { required: true, message: 'Please enter a name for the API key' },
              { min: 3, message: 'Name must be at least 3 characters' },
              { max: 50, message: 'Name must be less than 50 characters' }
            ]}
          >
            <Input placeholder="e.g., Mobile App Integration" />
          </Form.Item>

          <Form.Item
            name="permissions"
            label="Permissions"
            rules={[{ required: true, message: 'Please select at least one permission' }]}
          >
            <Select
              mode="multiple"
              placeholder="Select permissions"
              options={availablePermissions}
            />
          </Form.Item>

          <Form.Item
            name="rate_limit"
            label="Rate Limit (requests per minute)"
            rules={[{ required: true, message: 'Please set a rate limit' }]}
          >
            <InputNumber min={1} max={10000} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="expires_at"
            label="Expiration Date (optional)"
          >
            <DatePicker
              style={{ width: '100%' }}
              disabledDate={(current) => current && current < dayjs().endOf('day')}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={updating}
              >
                Update API Key
              </Button>
              <Button onClick={() => setEditVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* New API Key Modal */}
      <Modal
        title="API Key Created Successfully"
        open={newKeyVisible}
        onCancel={() => {
          setNewKeyVisible(false);
          setNewKeyData(null);
        }}
        footer={[
          <Button key="close" onClick={() => setNewKeyVisible(false)}>
            Close
          </Button>
        ]}
        width={600}
      >
        {newKeyData && (
          <div>
            <Alert
              message="Important: Save your API key"
              description="This is the only time you'll see the full API key. Make sure to copy it and store it securely."
              type="warning"
              showIcon
              style={{ marginBottom: '16px' }}
            />
            
            <div style={{ marginBottom: '16px' }}>
              <Text strong>API Key Name:</Text>
              <br />
              <Text>{newKeyData.name}</Text>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <Text strong>API Key:</Text>
              <br />
              <div style={{ 
                background: '#f5f5f5', 
                padding: '12px', 
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <Text code style={{ fontSize: '14px', wordBreak: 'break-all' }}>
                  {newKeyData.key}
                </Text>
                <Button
                  type="link"
                  icon={<CopyOutlined />}
                  onClick={() => copyToClipboard(newKeyData.key)}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <Text strong>Permissions:</Text>
              <br />
              <div style={{ marginTop: '8px' }}>
                {newKeyData.permissions.map(permission => (
                  <Tag key={permission}>{permission}</Tag>
                ))}
              </div>
            </div>

            <div>
              <Text strong>Rate Limit:</Text> {newKeyData.rate_limit} requests per minute
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default APIKeyManagement;