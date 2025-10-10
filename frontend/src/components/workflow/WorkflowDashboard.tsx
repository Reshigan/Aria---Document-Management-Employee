import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Badge, 
  Progress, 
  Tabs, 
  Input, 
  Select, 
  Typography,
  Row,
  Col,
  Space,
  Tag,
  message,
  Tooltip,
  Dropdown
} from 'antd';
import { 
  PlayCircleOutlined,
  PauseCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  MoreOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';

interface Workflow {
  id: number;
  name: string;
  description?: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'ERROR';
  template_id?: number;
  document_id: number;
  current_step: number;
  progress_percentage: number;
  created_by: number;
  assigned_to?: number;
  started_at?: string;
  completed_at?: string;
  due_date?: string;
  created_at: string;
  updated_at?: string;
  workflow_data?: any;
}

interface WorkflowTemplate {
  id: number;
  name: string;
  description?: string;
  category?: string;
  is_active: boolean;
  is_system: boolean;
  version?: string;
  config?: any;
  trigger_conditions?: any;
  created_by: number;
  created_at: string;
  updated_at?: string;
}

interface WorkflowStats {
  total_workflows: number;
  active_workflows: number;
  completed_workflows: number;
  pending_tasks: number;
  overdue_tasks: number;
  completion_rate: number;
  avg_completion_time: number;
}

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

const WorkflowDashboard: React.FC = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('workflows');

  useEffect(() => {
    loadWorkflows();
    loadTemplates();
    loadStats();
  }, []);

  const loadWorkflows = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/workflows', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWorkflows(data.workflows || []);
      } else {
        throw new Error('Failed to load workflows');
      }
    } catch (error) {
      console.error('Error loading workflows:', error);
      message.error('Failed to load workflows');
    }
  };

  const loadTemplates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/workflows/templates', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      } else {
        throw new Error('Failed to load templates');
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      message.error('Failed to load workflow templates');
    }
  };

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/workflows/analytics/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        throw new Error('Failed to load stats');
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const startWorkflow = async (workflowId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/workflows/${workflowId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        message.success('Workflow started successfully');
        loadWorkflows();
      } else {
        throw new Error('Failed to start workflow');
      }
    } catch (error) {
      console.error('Error starting workflow:', error);
      message.error('Failed to start workflow');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <PlayCircleOutlined style={{ color: '#1890ff' }} />;
      case 'PAUSED':
        return <PauseCircleOutlined style={{ color: '#faad14' }} />;
      case 'COMPLETED':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'ERROR':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <ClockCircleOutlined style={{ color: '#8c8c8c' }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'processing';
      case 'PAUSED':
        return 'warning';
      case 'COMPLETED':
        return 'success';
      case 'ERROR':
        return 'error';
      case 'CANCELLED':
        return 'default';
      default:
        return 'default';
    }
  };

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (workflow.description && workflow.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || workflow.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <Text>Loading workflows...</Text>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Workflow Management</Title>
          <Text type="secondary">Manage and monitor document workflows</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />}>
          Create Workflow
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ padding: '8px', backgroundColor: '#e6f7ff', borderRadius: '8px', marginRight: '16px' }}>
                  <PlayCircleOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Total Workflows</Text>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.total_workflows}</div>
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ padding: '8px', backgroundColor: '#f6ffed', borderRadius: '8px', marginRight: '16px' }}>
                  <CheckCircleOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Active</Text>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.active_workflows}</div>
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ padding: '8px', backgroundColor: '#fffbe6', borderRadius: '8px', marginRight: '16px' }}>
                  <ClockCircleOutlined style={{ fontSize: '24px', color: '#faad14' }} />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Pending Tasks</Text>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.pending_tasks}</div>
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ padding: '8px', backgroundColor: '#f9f0ff', borderRadius: '8px', marginRight: '16px' }}>
                  <ExclamationCircleOutlined style={{ fontSize: '24px', color: '#722ed1' }} />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Completion Rate</Text>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.completion_rate}%</div>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* Main Content */}
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="Workflows" key="workflows">
          {/* Filters */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <Input
              placeholder="Search workflows..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              prefix={<SearchOutlined />}
              style={{ flex: 1 }}
            />
            <Select 
              value={statusFilter} 
              onChange={setStatusFilter}
              style={{ width: 200 }}
              placeholder="Filter by status"
            >
              <Option value="all">All Status</Option>
              <Option value="DRAFT">Draft</Option>
              <Option value="ACTIVE">Active</Option>
              <Option value="PAUSED">Paused</Option>
              <Option value="COMPLETED">Completed</Option>
              <Option value="CANCELLED">Cancelled</Option>
              <Option value="ERROR">Error</Option>
            </Select>
          </div>

          {/* Workflows List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredWorkflows.map((workflow) => (
              <Card key={workflow.id}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {getStatusIcon(workflow.status)}
                    <div>
                      <Title level={4} style={{ margin: 0 }}>{workflow.name}</Title>
                      {workflow.description && (
                        <Text type="secondary" style={{ fontSize: '12px' }}>{workflow.description}</Text>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
                        <Tag color={getStatusColor(workflow.status)}>
                          {workflow.status}
                        </Tag>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Step {workflow.current_step}
                        </Text>
                        {workflow.due_date && (
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Due: {new Date(workflow.due_date).toLocaleDateString()}
                          </Text>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <Text style={{ fontSize: '12px', fontWeight: 500 }}>
                        {workflow.progress_percentage}% Complete
                      </Text>
                      <Progress 
                        percent={workflow.progress_percentage} 
                        size="small"
                        style={{ width: '100px', marginTop: '4px' }}
                      />
                    </div>
                    
                    <Space>
                      {workflow.status === 'DRAFT' && (
                        <Button
                          size="small"
                          type="primary"
                          icon={<PlayCircleOutlined />}
                          onClick={() => startWorkflow(workflow.id)}
                        />
                      )}
                      <Button size="small" icon={<EyeOutlined />} />
                      <Button size="small" icon={<EditOutlined />} />
                      <Dropdown
                        menu={{
                          items: [
                            { key: 'details', label: 'View Details', icon: <EyeOutlined /> },
                            { key: 'edit', label: 'Edit', icon: <EditOutlined /> },
                            { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true }
                          ]
                        }}
                      >
                        <Button size="small" icon={<MoreOutlined />} />
                      </Dropdown>
                    </Space>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {filteredWorkflows.length === 0 && (
            <Card>
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <div style={{ color: '#8c8c8c' }}>
                  <PlayCircleOutlined style={{ fontSize: '48px', opacity: 0.5, marginBottom: '16px' }} />
                  <Title level={4} style={{ color: '#8c8c8c', marginBottom: '8px' }}>No workflows found</Title>
                  <Text type="secondary">Create your first workflow to get started</Text>
                </div>
              </div>
            </Card>
          )}
        </TabPane>

        <TabPane tab="Templates" key="templates">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {templates.map((template) => (
              <Card key={template.id}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <Title level={4} style={{ margin: 0 }}>{template.name}</Title>
                    {template.description && (
                      <Text type="secondary" style={{ fontSize: '12px' }}>{template.description}</Text>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
                      {template.category && (
                        <Tag>{template.category}</Tag>
                      )}
                      {template.is_system && (
                        <Tag color="blue">System</Tag>
                      )}
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        v{template.version || '1.0'}
                      </Text>
                    </div>
                  </div>
                  
                  <Space>
                    <Button type="primary" size="small">
                      Use Template
                    </Button>
                    <Button size="small" icon={<EyeOutlined />} />
                    {!template.is_system && (
                      <Button size="small" icon={<EditOutlined />} />
                    )}
                  </Space>
                </div>
              </Card>
            ))}
          </div>
        </TabPane>

        <TabPane tab="My Tasks" key="tasks">
          <Card>
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <div style={{ color: '#8c8c8c' }}>
                <ClockCircleOutlined style={{ fontSize: '48px', opacity: 0.5, marginBottom: '16px' }} />
                <Title level={4} style={{ color: '#8c8c8c', marginBottom: '8px' }}>My Tasks</Title>
                <Text type="secondary">Your assigned workflow tasks will appear here</Text>
              </div>
            </div>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default WorkflowDashboard;