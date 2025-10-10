'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Table,
  Button,
  Space,
  Tag,
  Progress,
  Modal,
  Form,
  Select,
  Input,
  Upload,
  message,
  Statistic,
  Row,
  Col,
  Typography,
  Tooltip,
  Popconfirm,
  Badge,
  Spin,
  Alert
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined,
  FileTextOutlined,
  RobotOutlined,
  ScanOutlined,
  SwapOutlined,
  BranchesOutlined,
  SettingOutlined,
  PlusOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { documentProcessingService, ProcessingJob, ProcessingStatistics } from '../../services/documentProcessingService';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

const DocumentProcessingPage: React.FC = () => {
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [statistics, setStatistics] = useState<ProcessingStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<ProcessingJob | null>(null);
  const [createJobModalVisible, setCreateJobModalVisible] = useState(false);
  const [viewResultModalVisible, setViewResultModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('jobs');
  const [form] = Form.useForm();

  useEffect(() => {
    loadJobs();
    loadStatistics();
    // Set up polling for job updates
    const interval = setInterval(() => {
      loadJobs();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadJobs = async () => {
    try {
      const jobsData = await documentProcessingService.getProcessingJobs();
      setJobs(jobsData);
    } catch (error) {
      console.error('Failed to load processing jobs:', error);
      message.error('Failed to load processing jobs');
    }
  };

  const loadStatistics = async () => {
    try {
      const statsData = await documentProcessingService.getProcessingStatistics();
      setStatistics(statsData);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const handleCreateJob = async (values: any) => {
    try {
      setLoading(true);
      await documentProcessingService.createProcessingJob(values);
      message.success('Processing job created successfully');
      setCreateJobModalVisible(false);
      form.resetFields();
      loadJobs();
    } catch (error) {
      console.error('Failed to create processing job:', error);
      message.error('Failed to create processing job');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelJob = async (jobId: number) => {
    try {
      await documentProcessingService.cancelProcessingJob(jobId);
      message.success('Job cancelled successfully');
      loadJobs();
    } catch (error) {
      console.error('Failed to cancel job:', error);
      message.error('Failed to cancel job');
    }
  };

  const handleRetryJob = async (jobId: number) => {
    try {
      await documentProcessingService.retryProcessingJob(jobId);
      message.success('Job retried successfully');
      loadJobs();
    } catch (error) {
      console.error('Failed to retry job:', error);
      message.error('Failed to retry job');
    }
  };

  const handleDeleteJob = async (jobId: number) => {
    try {
      await documentProcessingService.deleteProcessingJob(jobId);
      message.success('Job deleted successfully');
      loadJobs();
    } catch (error) {
      console.error('Failed to delete job:', error);
      message.error('Failed to delete job');
    }
  };

  const handleViewResult = async (job: ProcessingJob) => {
    setSelectedJob(job);
    setViewResultModalVisible(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'FAILED': return 'error';
      case 'IN_PROGRESS': return 'processing';
      case 'PENDING': return 'default';
      default: return 'default';
    }
  };

  const getProcessingTypeIcon = (type: string) => {
    switch (type) {
      case 'OCR': return <ScanOutlined />;
      case 'CLASSIFICATION': return <BranchesOutlined />;
      case 'CONTENT_EXTRACTION': return <FileTextOutlined />;
      case 'CONVERSION': return <SwapOutlined />;
      case 'AI_ANALYSIS': return <RobotOutlined />;
      default: return <SettingOutlined />;
    }
  };

  const jobColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Document',
      dataIndex: ['document', 'filename'],
      key: 'document',
      render: (filename: string, record: ProcessingJob) => (
        <div>
          <Text strong>{filename}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            ID: {record.document_id}
          </Text>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'processing_type',
      key: 'processing_type',
      render: (type: string) => (
        <Tag icon={getProcessingTypeIcon(type)} color="blue">
          {type.replace('_', ' ')}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Progress',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress: number, record: ProcessingJob) => (
        <div style={{ width: 120 }}>
          <Progress 
            percent={progress} 
            size="small" 
            status={record.status === 'FAILED' ? 'exception' : 'active'}
          />
        </div>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record: ProcessingJob) => (
        <Space>
          {record.status === 'COMPLETED' && (
            <Tooltip title="View Results">
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={() => handleViewResult(record)}
              />
            </Tooltip>
          )}
          {record.status === 'IN_PROGRESS' && (
            <Tooltip title="Cancel Job">
              <Button
                type="text"
                icon={<PauseCircleOutlined />}
                onClick={() => handleCancelJob(record.id)}
              />
            </Tooltip>
          )}
          {record.status === 'FAILED' && (
            <Tooltip title="Retry Job">
              <Button
                type="text"
                icon={<ReloadOutlined />}
                onClick={() => handleRetryJob(record.id)}
              />
            </Tooltip>
          )}
          <Popconfirm
            title="Are you sure you want to delete this job?"
            onConfirm={() => handleDeleteJob(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete Job">
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

  const renderStatistics = () => {
    if (!statistics) return <Spin />;

    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Jobs"
              value={statistics.total_jobs}
              prefix={<SettingOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Completed"
              value={statistics.completed_jobs}
              prefix={<PlayCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Failed"
              value={statistics.failed_jobs}
              prefix={<DeleteOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Success Rate"
              value={statistics.success_rate}
              suffix="%"
              prefix={<BarChartOutlined />}
              precision={1}
              valueStyle={{ color: statistics.success_rate > 80 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Jobs by Type">
            {Object.entries(statistics.jobs_by_type).map(([type, count]) => (
              <div key={type} style={{ marginBottom: 8 }}>
                <Tag icon={getProcessingTypeIcon(type)} color="blue">
                  {type.replace('_', ' ')}: {count}
                </Tag>
              </div>
            ))}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Processing Time by Type">
            {Object.entries(statistics.processing_time_by_type).map(([type, time]) => (
              <div key={type} style={{ marginBottom: 8 }}>
                <Text>{type.replace('_', ' ')}: </Text>
                <Text strong>{Math.round(time)}s avg</Text>
              </div>
            ))}
          </Card>
        </Col>
      </Row>
    );
  };

  const renderJobResults = () => {
    if (!selectedJob) return null;

    return (
      <div>
        <Alert
          message={`Processing Results for ${selectedJob.processing_type}`}
          description={`Job ID: ${selectedJob.id} | Document: ${selectedJob.document?.filename}`}
          type="info"
          style={{ marginBottom: 16 }}
        />
        
        {selectedJob.processing_type === 'OCR' && (
          <Card title="OCR Results" size="small">
            <Text>OCR results would be displayed here with extracted text, confidence scores, and text regions.</Text>
          </Card>
        )}
        
        {selectedJob.processing_type === 'CLASSIFICATION' && (
          <Card title="Classification Results" size="small">
            <Text>Classification results would be displayed here with predicted categories and confidence scores.</Text>
          </Card>
        )}
        
        {selectedJob.processing_type === 'CONTENT_EXTRACTION' && (
          <Card title="Content Extraction Results" size="small">
            <Text>Content extraction results would be displayed here with entities, key phrases, and summaries.</Text>
          </Card>
        )}
        
        {selectedJob.processing_type === 'CONVERSION' && (
          <Card title="Conversion Results" size="small">
            <Text>Conversion results would be displayed here with download links and quality metrics.</Text>
          </Card>
        )}
        
        {selectedJob.processing_type === 'AI_ANALYSIS' && (
          <Card title="AI Analysis Results" size="small">
            <Text>AI analysis results would be displayed here with insights and recommendations.</Text>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <RobotOutlined /> Document Processing
        </Title>
        <Text type="secondary">
          Manage document processing jobs including OCR, classification, content extraction, conversion, and AI analysis.
        </Text>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <Tabs.TabPane tab="Processing Jobs" key="jobs">
          <Card>
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateJobModalVisible(true)}
                >
                  Create Job
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={loadJobs}
                >
                  Refresh
                </Button>
              </Space>
            </div>
            
            <Table
              columns={jobColumns}
              dataSource={jobs}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} jobs`,
              }}
            />
          </Card>
        </Tabs.TabPane>

        <Tabs.TabPane tab="Statistics" key="statistics">
          <Card title="Processing Statistics">
            {renderStatistics()}
          </Card>
        </Tabs.TabPane>

        <Tabs.TabPane tab="Templates" key="templates">
          <Card title="Processing Templates">
            <Alert
              message="Processing Templates"
              description="Template management functionality would be implemented here for saving and reusing processing configurations."
              type="info"
            />
          </Card>
        </Tabs.TabPane>

        <Tabs.TabPane tab="Queue Management" key="queue">
          <Card title="Processing Queue">
            <Alert
              message="Queue Management"
              description="Queue management functionality would be implemented here for monitoring and controlling the processing queue."
              type="info"
            />
          </Card>
        </Tabs.TabPane>
      </Tabs>

      {/* Create Job Modal */}
      <Modal
        title="Create Processing Job"
        open={createJobModalVisible}
        onCancel={() => setCreateJobModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateJob}
        >
          <Form.Item
            name="document_id"
            label="Document ID"
            rules={[{ required: true, message: 'Please enter document ID' }]}
          >
            <Input placeholder="Enter document ID" type="number" />
          </Form.Item>

          <Form.Item
            name="processing_type"
            label="Processing Type"
            rules={[{ required: true, message: 'Please select processing type' }]}
          >
            <Select placeholder="Select processing type">
              <Option value="OCR">
                <ScanOutlined /> OCR (Optical Character Recognition)
              </Option>
              <Option value="CLASSIFICATION">
                <BranchesOutlined /> Document Classification
              </Option>
              <Option value="CONTENT_EXTRACTION">
                <FileTextOutlined /> Content Extraction
              </Option>
              <Option value="CONVERSION">
                <SwapOutlined /> Document Conversion
              </Option>
              <Option value="AI_ANALYSIS">
                <RobotOutlined /> AI Analysis
              </Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="configuration"
            label="Configuration (JSON)"
          >
            <Input.TextArea
              rows={4}
              placeholder='{"language": "en", "confidence_threshold": 0.8}'
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                Create Job
              </Button>
              <Button onClick={() => setCreateJobModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Results Modal */}
      <Modal
        title="Processing Results"
        open={viewResultModalVisible}
        onCancel={() => setViewResultModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewResultModalVisible(false)}>
            Close
          </Button>
        ]}
        width={800}
      >
        {renderJobResults()}
      </Modal>
    </div>
  );
};

export default DocumentProcessingPage;