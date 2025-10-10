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
  Divider
} from 'antd';
import {
  MailOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SendOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  TestTubeOutlined
} from '@ant-design/icons';
import { integrationService, EmailConfiguration, EmailSendRequest } from '@/services/integrationService';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface EmailIntegrationProps {
  integrationId?: number;
}

const EmailIntegration: React.FC<EmailIntegrationProps> = ({ integrationId }) => {
  const [configurations, setConfigurations] = useState<EmailConfiguration[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [editingConfiguration, setEditingConfiguration] = useState<EmailConfiguration | null>(null);
  const [testingConfiguration, setTestingConfiguration] = useState<number | null>(null);
  const [selectedConfigForTest, setSelectedConfigForTest] = useState<EmailConfiguration | null>(null);
  const [form] = Form.useForm();
  const [testForm] = Form.useForm();

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    try {
      setLoading(true);
      const data = await integrationService.getEmailConfigurations();
      setConfigurations(data);
    } catch (error) {
      message.error('Failed to load email configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingConfiguration(null);
    form.resetFields();
    form.setFieldsValue({
      smtp_port: 587,
      use_tls: true,
      use_ssl: false,
      is_active: true
    });
    setModalVisible(true);
  };

  const handleEdit = (configuration: EmailConfiguration) => {
    setEditingConfiguration(configuration);
    form.setFieldsValue(configuration);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await integrationService.deleteEmailConfiguration(id);
      message.success('Email configuration deleted successfully');
      loadConfigurations();
    } catch (error) {
      message.error('Failed to delete email configuration');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingConfiguration) {
        await integrationService.updateEmailConfiguration(editingConfiguration.id, values);
        message.success('Email configuration updated successfully');
      } else {
        await integrationService.createEmailConfiguration({
          ...values,
          integration_id: integrationId
        });
        message.success('Email configuration created successfully');
      }

      setModalVisible(false);
      loadConfigurations();
    } catch (error) {
      message.error('Failed to save email configuration');
    }
  };

  const handleTestConnection = async (id: number) => {
    try {
      setTestingConfiguration(id);
      const result = await integrationService.testEmailConfiguration(id);
      
      if (result.success) {
        message.success('Email configuration test successful');
      } else {
        message.error(`Email configuration test failed: ${result.message}`);
      }
    } catch (error) {
      message.error('Email configuration test failed');
    } finally {
      setTestingConfiguration(null);
    }
  };

  const handleSendTestEmail = (configuration: EmailConfiguration) => {
    setSelectedConfigForTest(configuration);
    testForm.resetFields();
    testForm.setFieldsValue({
      subject: 'Test Email from ARIA Document Management',
      body: 'This is a test email to verify the email configuration is working correctly.'
    });
    setTestModalVisible(true);
  };

  const handleSendEmail = async (values: any) => {
    if (!selectedConfigForTest) return;

    try {
      const emailData: EmailSendRequest = {
        to: values.to.split(',').map((email: string) => email.trim()),
        cc: values.cc ? values.cc.split(',').map((email: string) => email.trim()) : undefined,
        bcc: values.bcc ? values.bcc.split(',').map((email: string) => email.trim()) : undefined,
        subject: values.subject,
        body: values.body,
        html_body: values.html_body
      };

      await integrationService.sendEmail(selectedConfigForTest.integration_id, emailData);
      message.success('Test email sent successfully');
      setTestModalVisible(false);
    } catch (error) {
      message.error('Failed to send test email');
    }
  };

  const getConfigurationStatus = (configuration: EmailConfiguration) => {
    return configuration.is_active ? 'Active' : 'Inactive';
  };

  const getStatusColor = (configuration: EmailConfiguration) => {
    return configuration.is_active ? 'success' : 'default';
  };

  const columns = [
    {
      title: 'SMTP Server',
      key: 'server',
      render: (_, record: EmailConfiguration) => (
        <Space direction="vertical" size="small">
          <Text strong>{record.smtp_server}:{record.smtp_port}</Text>
          <Space>
            {record.use_tls && <Tag color="blue">TLS</Tag>}
            {record.use_ssl && <Tag color="green">SSL</Tag>}
          </Space>
        </Space>
      ),
    },
    {
      title: 'From Email',
      key: 'from',
      render: (_, record: EmailConfiguration) => (
        <Space direction="vertical" size="small">
          <Text>{record.from_email}</Text>
          <Text type="secondary">{record.from_name}</Text>
        </Space>
      ),
    },
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record: EmailConfiguration) => (
        <Tag color={getStatusColor(record)}>
          {getConfigurationStatus(record)}
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
      render: (_, record: EmailConfiguration) => (
        <Space>
          <Tooltip title="Test Connection">
            <Button
              type="text"
              icon={<TestTubeOutlined />}
              loading={testingConfiguration === record.id}
              onClick={() => handleTestConnection(record.id)}
            />
          </Tooltip>
          <Tooltip title="Send Test Email">
            <Button
              type="text"
              icon={<SendOutlined />}
              onClick={() => handleSendTestEmail(record)}
              disabled={!record.is_active}
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
            title="Are you sure you want to delete this configuration?"
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

  const activeConfigurations = configurations.filter(c => c.is_active).length;

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Title level={3}>
          <MailOutlined /> Email Integration
        </Title>
        <Text type="secondary">
          Manage email configurations and send notifications
        </Text>
      </div>

      {/* Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Configurations"
              value={configurations.length}
              prefix={<MailOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Active Configurations"
              value={activeConfigurations}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Success Rate"
              value={95}
              suffix="%"
              prefix={<SendOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Configurations Table */}
      <Card>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <Title level={4}>Email Configurations</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            Add Configuration
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={configurations}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} configurations`,
          }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingConfiguration ? 'Edit Email Configuration' : 'Create Email Configuration'}
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
            <Col span={16}>
              <Form.Item
                name="smtp_server"
                label="SMTP Server"
                rules={[{ required: true, message: 'Please enter SMTP server' }]}
              >
                <Input placeholder="smtp.gmail.com" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="smtp_port"
                label="Port"
                rules={[{ required: true, message: 'Please enter port' }]}
              >
                <InputNumber
                  min={1}
                  max={65535}
                  style={{ width: '100%' }}
                  placeholder="587"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Please enter username' }]}
          >
            <Input placeholder="your-email@company.com" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: !editingConfiguration, message: 'Please enter password' }]}
          >
            <Input.Password placeholder="Email password or app password" />
          </Form.Item>

          <Divider>From Address Settings</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="from_email"
                label="From Email"
                rules={[
                  { required: true, message: 'Please enter from email' },
                  { type: 'email', message: 'Please enter valid email' }
                ]}
              >
                <Input placeholder="noreply@company.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="from_name"
                label="From Name"
                rules={[{ required: true, message: 'Please enter from name' }]}
              >
                <Input placeholder="ARIA Document Management" />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Security Settings</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="use_tls"
                label="Use TLS"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="use_ssl"
                label="Use SSL"
                valuePropName="checked"
              >
                <Switch />
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

      {/* Test Email Modal */}
      <Modal
        title="Send Test Email"
        open={testModalVisible}
        onCancel={() => setTestModalVisible(false)}
        onOk={() => testForm.submit()}
        width={600}
      >
        <Form
          form={testForm}
          layout="vertical"
          onFinish={handleSendEmail}
        >
          <Form.Item
            name="to"
            label="To (comma-separated)"
            rules={[{ required: true, message: 'Please enter recipient emails' }]}
          >
            <Input placeholder="user1@company.com, user2@company.com" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="cc"
                label="CC (comma-separated)"
              >
                <Input placeholder="cc@company.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="bcc"
                label="BCC (comma-separated)"
              >
                <Input placeholder="bcc@company.com" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="subject"
            label="Subject"
            rules={[{ required: true, message: 'Please enter subject' }]}
          >
            <Input placeholder="Test Email Subject" />
          </Form.Item>

          <Form.Item
            name="body"
            label="Body (Plain Text)"
            rules={[{ required: true, message: 'Please enter email body' }]}
          >
            <TextArea
              rows={4}
              placeholder="Email body content..."
            />
          </Form.Item>

          <Form.Item
            name="html_body"
            label="HTML Body (Optional)"
          >
            <TextArea
              rows={4}
              placeholder="<p>HTML email content...</p>"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default EmailIntegration;