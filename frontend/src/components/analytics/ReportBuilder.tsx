import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Checkbox,
  Radio,
  Divider,
  Table,
  message,
  Modal,
  List,
  Tag,
  Popconfirm
} from 'antd';
import {
  PlusOutlined,
  SaveOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  CopyOutlined,
  DownloadOutlined,
  ScheduleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { TextArea } = Input;

interface ReportTemplate {
  id: number;
  name: string;
  description: string;
  type: string;
  config: {
    metrics: string[];
    filters: any;
    groupBy: string[];
    dateRange: string;
    format: string;
  };
  schedule?: {
    frequency: string;
    time: string;
    recipients: string[];
  };
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface GeneratedReport {
  id: number;
  templateId: number;
  templateName: string;
  status: string;
  generatedAt: string;
  fileUrl?: string;
  error?: string;
}

const ReportBuilder: React.FC = () => {
  const [form] = Form.useForm();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const reportTypes = [
    { value: 'document_analytics', label: 'Document Analytics' },
    { value: 'user_activity', label: 'User Activity' },
    { value: 'system_metrics', label: 'System Metrics' },
    { value: 'workflow_analytics', label: 'Workflow Analytics' },
    { value: 'custom', label: 'Custom Report' }
  ];

  const availableMetrics = {
    document_analytics: [
      'total_documents',
      'documents_created',
      'documents_modified',
      'documents_deleted',
      'document_views',
      'document_downloads',
      'document_shares',
      'storage_usage',
      'file_types_distribution'
    ],
    user_activity: [
      'active_users',
      'new_users',
      'user_sessions',
      'session_duration',
      'login_frequency',
      'feature_usage',
      'user_engagement'
    ],
    system_metrics: [
      'api_calls',
      'response_times',
      'error_rates',
      'uptime',
      'resource_usage',
      'performance_metrics'
    ],
    workflow_analytics: [
      'workflow_executions',
      'completion_rates',
      'execution_times',
      'error_rates',
      'step_performance',
      'workflow_efficiency'
    ]
  };

  const groupByOptions = [
    'date',
    'week',
    'month',
    'quarter',
    'year',
    'user',
    'department',
    'document_type',
    'workflow_type'
  ];

  useEffect(() => {
    fetchTemplates();
    fetchReports();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/analytics/report-templates');
      if (!response.ok) throw new Error('Failed to fetch templates');
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
      message.error('Failed to load report templates');
    }
  };

  const fetchReports = async () => {
    try {
      const response = await fetch('/api/analytics/generated-reports');
      if (!response.ok) throw new Error('Failed to fetch reports');
      const data = await response.json();
      setReports(data);
    } catch (error) {
      console.error('Error fetching reports:', error);
      message.error('Failed to load generated reports');
    }
  };

  const handleSaveTemplate = async (values: any) => {
    try {
      setLoading(true);
      const url = editingTemplate 
        ? `/api/analytics/report-templates/${editingTemplate.id}`
        : '/api/analytics/report-templates';
      
      const method = editingTemplate ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });

      if (!response.ok) throw new Error('Failed to save template');
      
      message.success(`Template ${editingTemplate ? 'updated' : 'created'} successfully`);
      setModalVisible(false);
      setEditingTemplate(null);
      form.resetFields();
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      message.error('Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (templateId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/generate-report/${templateId}`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to generate report');
      
      message.success('Report generation started');
      fetchReports();
    } catch (error) {
      console.error('Error generating report:', error);
      message.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewReport = async (template: ReportTemplate) => {
    try {
      setPreviewLoading(true);
      const response = await fetch(`/api/analytics/preview-report/${template.id}`);
      if (!response.ok) throw new Error('Failed to preview report');
      const data = await response.json();
      setPreviewData(data);
    } catch (error) {
      console.error('Error previewing report:', error);
      message.error('Failed to preview report');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    try {
      const response = await fetch(`/api/analytics/report-templates/${templateId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete template');
      
      message.success('Template deleted successfully');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      message.error('Failed to delete template');
    }
  };

  const handleDownloadReport = async (report: GeneratedReport) => {
    try {
      if (!report.fileUrl) return;
      
      const response = await fetch(report.fileUrl);
      if (!response.ok) throw new Error('Failed to download report');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.templateName}-${dayjs(report.generatedAt).format('YYYY-MM-DD')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading report:', error);
      message.error('Failed to download report');
    }
  };

  const templateColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: ReportTemplate) => (
        <div>
          <Text strong>{name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.description}
          </Text>
        </div>
      )
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color="blue">
          {reportTypes.find(t => t.value === type)?.label || type}
        </Tag>
      )
    },
    {
      title: 'Metrics',
      dataIndex: ['config', 'metrics'],
      key: 'metrics',
      render: (metrics: string[]) => (
        <div>
          {metrics?.slice(0, 3).map(metric => (
            <Tag key={metric} size="small">{metric}</Tag>
          ))}
          {metrics?.length > 3 && (
            <Tag size="small">+{metrics.length - 3} more</Tag>
          )}
        </div>
      )
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('MMM DD, YYYY')
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: ReportTemplate) => (
        <Space>
          <Button
            icon={<PlayCircleOutlined />}
            onClick={() => handleGenerateReport(record.id)}
            size="small"
          >
            Generate
          </Button>
          <Button
            icon={<EditOutlined />}
            onClick={() => {
              setEditingTemplate(record);
              form.setFieldsValue(record);
              setModalVisible(true);
            }}
            size="small"
          />
          <Button
            icon={<CopyOutlined />}
            onClick={() => {
              const copy = { ...record, name: `${record.name} (Copy)` };
              delete (copy as any).id;
              setEditingTemplate(null);
              form.setFieldsValue(copy);
              setModalVisible(true);
            }}
            size="small"
          />
          <Popconfirm
            title="Are you sure you want to delete this template?"
            onConfirm={() => handleDeleteTemplate(record.id)}
          >
            <Button
              icon={<DeleteOutlined />}
              danger
              size="small"
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  const reportColumns = [
    {
      title: 'Template',
      dataIndex: 'templateName',
      key: 'templateName'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors = {
          pending: 'orange',
          processing: 'blue',
          completed: 'green',
          failed: 'red'
        };
        return <Tag color={colors[status as keyof typeof colors]}>{status}</Tag>;
      }
    },
    {
      title: 'Generated',
      dataIndex: 'generatedAt',
      key: 'generatedAt',
      render: (date: string) => dayjs(date).format('MMM DD, YYYY HH:mm')
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: GeneratedReport) => (
        <Space>
          {record.status === 'completed' && record.fileUrl && (
            <Button
              icon={<DownloadOutlined />}
              onClick={() => handleDownloadReport(record)}
              size="small"
            >
              Download
            </Button>
          )}
          {record.status === 'failed' && record.error && (
            <Button
              type="link"
              size="small"
              onClick={() => message.error(record.error)}
            >
              View Error
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}>Report Builder</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingTemplate(null);
            form.resetFields();
            setModalVisible(true);
          }}
        >
          New Template
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="Report Templates">
            <Table
              columns={templateColumns}
              dataSource={templates}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </Col>
        
        <Col xs={24} lg={10}>
          <Card title="Generated Reports">
            <Table
              columns={reportColumns}
              dataSource={reports}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title={editingTemplate ? 'Edit Report Template' : 'Create Report Template'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingTemplate(null);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveTemplate}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Template Name"
                rules={[{ required: true, message: 'Please enter template name' }]}
              >
                <Input placeholder="Enter template name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="type"
                label="Report Type"
                rules={[{ required: true, message: 'Please select report type' }]}
              >
                <Select placeholder="Select report type">
                  {reportTypes.map(type => (
                    <Option key={type.value} value={type.value}>
                      {type.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea rows={2} placeholder="Enter template description" />
          </Form.Item>

          <Form.Item
            name={['config', 'metrics']}
            label="Metrics"
            rules={[{ required: true, message: 'Please select at least one metric' }]}
          >
            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.type !== curr.type}>
              {({ getFieldValue }) => {
                const selectedType = getFieldValue('type');
                const metrics = availableMetrics[selectedType as keyof typeof availableMetrics] || [];
                return (
                  <Checkbox.Group>
                    <Row>
                      {metrics.map(metric => (
                        <Col span={8} key={metric}>
                          <Checkbox value={metric}>
                            {metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Checkbox>
                        </Col>
                      ))}
                    </Row>
                  </Checkbox.Group>
                );
              }}
            </Form.Item>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name={['config', 'groupBy']}
                label="Group By"
              >
                <Select mode="multiple" placeholder="Select grouping options">
                  {groupByOptions.map(option => (
                    <Option key={option} value={option}>
                      {option.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name={['config', 'format']}
                label="Output Format"
                initialValue="csv"
              >
                <Radio.Group>
                  <Radio value="csv">CSV</Radio>
                  <Radio value="excel">Excel</Radio>
                  <Radio value="pdf">PDF</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name={['config', 'dateRange']}
            label="Default Date Range"
            initialValue="last_30_days"
          >
            <Select>
              <Option value="last_7_days">Last 7 Days</Option>
              <Option value="last_30_days">Last 30 Days</Option>
              <Option value="last_90_days">Last 90 Days</Option>
              <Option value="last_year">Last Year</Option>
              <Option value="custom">Custom Range</Option>
            </Select>
          </Form.Item>

          <Divider>Scheduling (Optional)</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name={['schedule', 'frequency']}
                label="Frequency"
              >
                <Select placeholder="Select frequency">
                  <Option value="daily">Daily</Option>
                  <Option value="weekly">Weekly</Option>
                  <Option value="monthly">Monthly</Option>
                  <Option value="quarterly">Quarterly</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={['schedule', 'time']}
                label="Time"
              >
                <Input placeholder="e.g., 09:00" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={['schedule', 'recipients']}
                label="Recipients"
              >
                <Select mode="tags" placeholder="Enter email addresses">
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                <SaveOutlined /> Save Template
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ReportBuilder;