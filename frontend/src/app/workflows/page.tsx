'use client';

import { useState, useEffect } from 'react';
import { 
  Card, Table, Button, Space, Tag, Progress, Typography, Row, Col, 
  Statistic, Modal, Form, Input, Select, DatePicker, message, Tabs,
  List, Avatar, Tooltip, Dropdown, Badge, Timeline, Drawer
} from 'antd';
import { 
  PlayCircleOutlined, PauseCircleOutlined, StopOutlined, EditOutlined,
  DeleteOutlined, PlusOutlined, EyeOutlined, UserOutlined, ClockCircleOutlined,
  CheckCircleOutlined, ExclamationCircleOutlined, SettingOutlined,
  BarChartOutlined, TeamOutlined, FileTextOutlined, BranchesOutlined,
  ThunderboltOutlined, CalendarOutlined, FilterOutlined, MoreOutlined
} from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { TextArea } = Input;

interface WorkflowTemplate {
  id: number;
  name: string;
  description: string;
  steps: WorkflowStep[];
  created_by: string;
  created_at: string;
  is_active: boolean;
  usage_count: number;
}

interface WorkflowStep {
  id: number;
  name: string;
  type: 'approval' | 'processing' | 'notification' | 'integration';
  assignee?: string;
  duration_hours?: number;
  conditions?: any;
  actions?: any;
}

interface WorkflowInstance {
  id: number;
  template_id: number;
  template_name: string;
  document_id: number;
  document_name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  current_step: number;
  total_steps: number;
  started_at: string;
  completed_at?: string;
  assigned_to?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export default function WorkflowsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('instances');
  const [workflowInstances, setWorkflowInstances] = useState<WorkflowInstance[]>([]);
  const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowInstance | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadWorkflowData();
  }, [activeTab]);

  const loadWorkflowData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'instances') {
        await loadWorkflowInstances();
      } else if (activeTab === 'templates') {
        await loadWorkflowTemplates();
      }
    } catch (error) {
      console.error('Failed to load workflow data:', error);
      message.error('Failed to load workflow data');
    } finally {
      setLoading(false);
    }
  };

  const loadWorkflowInstances = async () => {
    try {
      // Mock data for now - replace with real API call
      const mockInstances: WorkflowInstance[] = [
        {
          id: 1,
          template_id: 1,
          template_name: 'Invoice Approval Process',
          document_id: 1,
          document_name: 'test_document.txt',
          status: 'in_progress',
          current_step: 2,
          total_steps: 4,
          started_at: new Date(Date.now() - 3600000).toISOString(),
          assigned_to: 'john.doe@company.com',
          priority: 'high'
        },
        {
          id: 2,
          template_id: 2,
          template_name: 'Document Review Workflow',
          document_id: 2,
          document_name: 'contract_draft.pdf',
          status: 'pending',
          current_step: 1,
          total_steps: 3,
          started_at: new Date(Date.now() - 1800000).toISOString(),
          assigned_to: 'jane.smith@company.com',
          priority: 'medium'
        },
        {
          id: 3,
          template_id: 1,
          template_name: 'Invoice Approval Process',
          document_id: 3,
          document_name: 'expense_report.xlsx',
          status: 'completed',
          current_step: 4,
          total_steps: 4,
          started_at: new Date(Date.now() - 86400000).toISOString(),
          completed_at: new Date(Date.now() - 3600000).toISOString(),
          assigned_to: 'admin@company.com',
          priority: 'low'
        }
      ];
      setWorkflowInstances(mockInstances);
    } catch (error) {
      console.error('Failed to load workflow instances:', error);
    }
  };

  const loadWorkflowTemplates = async () => {
    try {
      // Mock data for now - replace with real API call
      const mockTemplates: WorkflowTemplate[] = [
        {
          id: 1,
          name: 'Invoice Approval Process',
          description: 'Standard invoice approval workflow with manager and finance approval',
          steps: [
            { id: 1, name: 'Document Upload', type: 'processing' },
            { id: 2, name: 'Manager Approval', type: 'approval', assignee: 'manager@company.com', duration_hours: 24 },
            { id: 3, name: 'Finance Review', type: 'approval', assignee: 'finance@company.com', duration_hours: 48 },
            { id: 4, name: 'SAP Posting', type: 'integration', duration_hours: 1 }
          ],
          created_by: 'admin@company.com',
          created_at: new Date(Date.now() - 604800000).toISOString(),
          is_active: true,
          usage_count: 45
        },
        {
          id: 2,
          name: 'Document Review Workflow',
          description: 'General document review and approval process',
          steps: [
            { id: 1, name: 'Initial Review', type: 'approval', assignee: 'reviewer@company.com', duration_hours: 12 },
            { id: 2, name: 'Content Validation', type: 'processing', duration_hours: 2 },
            { id: 3, name: 'Final Approval', type: 'approval', assignee: 'approver@company.com', duration_hours: 24 }
          ],
          created_by: 'admin@company.com',
          created_at: new Date(Date.now() - 1209600000).toISOString(),
          is_active: true,
          usage_count: 23
        }
      ];
      setWorkflowTemplates(mockTemplates);
    } catch (error) {
      console.error('Failed to load workflow templates:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'processing';
      case 'pending': return 'warning';
      case 'failed': return 'error';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'blue';
      case 'low': return 'green';
      default: return 'default';
    }
  };

  const getStepTypeIcon = (type: string) => {
    switch (type) {
      case 'approval': return <UserOutlined />;
      case 'processing': return <ThunderboltOutlined />;
      case 'notification': return <ExclamationCircleOutlined />;
      case 'integration': return <BranchesOutlined />;
      default: return <SettingOutlined />;
    }
  };

  const handleWorkflowAction = async (action: string, workflowId: number) => {
    try {
      setLoading(true);
      // Mock API call - replace with real implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      message.success(`Workflow ${action} successfully`);
      loadWorkflowInstances();
    } catch (error) {
      console.error(`Failed to ${action} workflow:`, error);
      message.error(`Failed to ${action} workflow`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkflow = async (values: any) => {
    try {
      setLoading(true);
      // Mock API call - replace with real implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      message.success('Workflow template created successfully');
      setShowCreateModal(false);
      form.resetFields();
      loadWorkflowTemplates();
    } catch (error) {
      console.error('Failed to create workflow:', error);
      message.error('Failed to create workflow template');
    } finally {
      setLoading(false);
    }
  };

  const workflowInstanceColumns = [
    {
      title: 'Workflow',
      dataIndex: 'template_name',
      key: 'template_name',
      render: (text: string, record: WorkflowInstance) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.document_name}
          </Text>
        </div>
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
      title: 'Progress',
      key: 'progress',
      render: (record: WorkflowInstance) => (
        <div style={{ width: '120px' }}>
          <Progress 
            percent={Math.round((record.current_step / record.total_steps) * 100)}
            size="small"
            status={record.status === 'failed' ? 'exception' : 'active'}
          />
          <Text style={{ fontSize: '12px' }}>
            {record.current_step}/{record.total_steps} steps
          </Text>
        </div>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => (
        <Tag color={getPriorityColor(priority)}>
          {priority.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Assigned To',
      dataIndex: 'assigned_to',
      key: 'assigned_to',
      render: (assignee: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Avatar size="small" icon={<UserOutlined />} />
          <Text style={{ fontSize: '12px' }}>{assignee}</Text>
        </div>
      ),
    },
    {
      title: 'Started',
      dataIndex: 'started_at',
      key: 'started_at',
      render: (date: string) => (
        <Text style={{ fontSize: '12px' }}>
          {new Date(date).toLocaleString()}
        </Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: WorkflowInstance) => (
        <Space>
          <Tooltip title="View Details">
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedWorkflow(record);
                setShowDetailDrawer(true);
              }}
            />
          </Tooltip>
          {record.status === 'in_progress' && (
            <Tooltip title="Pause">
              <Button 
                size="small" 
                icon={<PauseCircleOutlined />}
                onClick={() => handleWorkflowAction('pause', record.id)}
              />
            </Tooltip>
          )}
          {record.status === 'pending' && (
            <Tooltip title="Start">
              <Button 
                size="small" 
                icon={<PlayCircleOutlined />}
                onClick={() => handleWorkflowAction('start', record.id)}
              />
            </Tooltip>
          )}
          <Dropdown
            menu={{
              items: [
                { key: 'edit', label: 'Edit', icon: <EditOutlined /> },
                { key: 'cancel', label: 'Cancel', icon: <StopOutlined /> },
                { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true }
              ],
              onClick: ({ key }) => handleWorkflowAction(key, record.id)
            }}
          >
            <Button size="small" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ];

  const workflowTemplateColumns = [
    {
      title: 'Template Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: WorkflowTemplate) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.description}
          </Text>
        </div>
      ),
    },
    {
      title: 'Steps',
      dataIndex: 'steps',
      key: 'steps',
      render: (steps: WorkflowStep[]) => (
        <div>
          <Text>{steps.length} steps</Text>
          <div style={{ marginTop: '4px' }}>
            {steps.slice(0, 3).map((step, index) => (
              <Tag key={index} size="small" icon={getStepTypeIcon(step.type)}>
                {step.name}
              </Tag>
            ))}
            {steps.length > 3 && <Text type="secondary">+{steps.length - 3} more</Text>}
          </div>
        </div>
      ),
    },
    {
      title: 'Usage',
      dataIndex: 'usage_count',
      key: 'usage_count',
      render: (count: number) => (
        <Statistic value={count} suffix="times" />
      ),
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? 'ACTIVE' : 'INACTIVE'}
        </Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => (
        <Text style={{ fontSize: '12px' }}>
          {new Date(date).toLocaleDateString()}
        </Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: WorkflowTemplate) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />}>View</Button>
          <Button size="small" icon={<EditOutlined />}>Edit</Button>
          <Button size="small" icon={<DeleteOutlined />} danger>Delete</Button>
        </Space>
      ),
    },
  ];

  const getWorkflowStats = () => {
    const total = workflowInstances.length;
    const completed = workflowInstances.filter(w => w.status === 'completed').length;
    const inProgress = workflowInstances.filter(w => w.status === 'in_progress').length;
    const pending = workflowInstances.filter(w => w.status === 'pending').length;
    
    return { total, completed, inProgress, pending };
  };

  const stats = getWorkflowStats();

  return (
    <>
      {/* Particle Background */}
      <div className="particles">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 6}s`,
              animationDuration: `${4 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>

      <div style={{ 
        padding: '24px', 
        maxWidth: '1400px', 
        margin: '0 auto', 
        position: 'relative', 
        zIndex: 1 
      }}>
        {/* Header */}
        <div className="futuristic-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={2} className="glow-text" style={{ margin: 0 }}>
                <BranchesOutlined style={{ marginRight: '12px' }} />
                Workflow Management
              </Title>
              <Text style={{ color: 'var(--text-secondary)' }}>
                Manage document processing workflows and automation
              </Text>
            </div>
            <Space>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => setShowCreateModal(true)}
                className="neon-button"
              >
                Create Workflow
              </Button>
              <Button 
                icon={<BarChartOutlined />}
                className="neon-button-secondary"
              >
                Analytics
              </Button>
            </Space>
          </div>
        </div>

        {/* Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} md={6}>
            <Card className="futuristic-card">
              <Statistic
                title="Total Workflows"
                value={stats.total}
                prefix={<BranchesOutlined style={{ color: 'var(--primary-cyan)' }} />}
                valueStyle={{ color: 'var(--primary-cyan)' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="futuristic-card">
              <Statistic
                title="In Progress"
                value={stats.inProgress}
                prefix={<PlayCircleOutlined style={{ color: 'var(--accent-neon)' }} />}
                valueStyle={{ color: 'var(--accent-neon)' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="futuristic-card">
              <Statistic
                title="Pending"
                value={stats.pending}
                prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="futuristic-card">
              <Statistic
                title="Completed"
                value={stats.completed}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Main Content */}
        <div className="futuristic-card" style={{ padding: '24px' }}>
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            items={[
              {
                key: 'instances',
                label: (
                  <span>
                    <PlayCircleOutlined />
                    Workflow Instances
                  </span>
                ),
                children: (
                  <Table
                    columns={workflowInstanceColumns}
                    dataSource={workflowInstances}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) => 
                        `${range[0]}-${range[1]} of ${total} workflows`
                    }}
                    scroll={{ x: 1200 }}
                  />
                )
              },
              {
                key: 'templates',
                label: (
                  <span>
                    <SettingOutlined />
                    Workflow Templates
                  </span>
                ),
                children: (
                  <Table
                    columns={workflowTemplateColumns}
                    dataSource={workflowTemplates}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) => 
                        `${range[0]}-${range[1]} of ${total} templates`
                    }}
                    scroll={{ x: 1200 }}
                  />
                )
              }
            ]}
          />
        </div>

        {/* Create Workflow Modal */}
        <Modal
          title="Create Workflow Template"
          open={showCreateModal}
          onCancel={() => setShowCreateModal(false)}
          footer={null}
          width={800}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreateWorkflow}
          >
            <Form.Item
              name="name"
              label="Workflow Name"
              rules={[{ required: true, message: 'Please enter workflow name' }]}
            >
              <Input placeholder="Enter workflow name" />
            </Form.Item>
            
            <Form.Item
              name="description"
              label="Description"
              rules={[{ required: true, message: 'Please enter description' }]}
            >
              <TextArea rows={3} placeholder="Describe the workflow purpose" />
            </Form.Item>
            
            <Form.Item
              name="category"
              label="Category"
              rules={[{ required: true, message: 'Please select category' }]}
            >
              <Select placeholder="Select workflow category">
                <Option value="approval">Approval Process</Option>
                <Option value="review">Document Review</Option>
                <Option value="processing">Data Processing</Option>
                <Option value="integration">System Integration</Option>
              </Select>
            </Form.Item>
            
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={loading}>
                  Create Template
                </Button>
                <Button onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Workflow Detail Drawer */}
        <Drawer
          title="Workflow Details"
          placement="right"
          width={600}
          open={showDetailDrawer}
          onClose={() => setShowDetailDrawer(false)}
        >
          {selectedWorkflow && (
            <div>
              <Card style={{ marginBottom: '16px' }}>
                <Title level={4}>{selectedWorkflow.template_name}</Title>
                <Text type="secondary">Document: {selectedWorkflow.document_name}</Text>
                <div style={{ marginTop: '16px' }}>
                  <Space>
                    <Tag color={getStatusColor(selectedWorkflow.status)}>
                      {selectedWorkflow.status.toUpperCase()}
                    </Tag>
                    <Tag color={getPriorityColor(selectedWorkflow.priority)}>
                      {selectedWorkflow.priority.toUpperCase()}
                    </Tag>
                  </Space>
                </div>
              </Card>

              <Card title="Progress" style={{ marginBottom: '16px' }}>
                <Progress 
                  percent={Math.round((selectedWorkflow.current_step / selectedWorkflow.total_steps) * 100)}
                  status={selectedWorkflow.status === 'failed' ? 'exception' : 'active'}
                />
                <Text>
                  Step {selectedWorkflow.current_step} of {selectedWorkflow.total_steps}
                </Text>
              </Card>

              <Card title="Timeline">
                <Timeline>
                  <Timeline.Item color="green">
                    <Text strong>Workflow Started</Text>
                    <br />
                    <Text type="secondary">
                      {new Date(selectedWorkflow.started_at).toLocaleString()}
                    </Text>
                  </Timeline.Item>
                  <Timeline.Item color="blue">
                    <Text strong>Currently Processing</Text>
                    <br />
                    <Text type="secondary">Step {selectedWorkflow.current_step}</Text>
                  </Timeline.Item>
                  {selectedWorkflow.completed_at && (
                    <Timeline.Item color="green">
                      <Text strong>Completed</Text>
                      <br />
                      <Text type="secondary">
                        {new Date(selectedWorkflow.completed_at).toLocaleString()}
                      </Text>
                    </Timeline.Item>
                  )}
                </Timeline>
              </Card>
            </div>
          )}
        </Drawer>
      </div>
    </>
  );
}