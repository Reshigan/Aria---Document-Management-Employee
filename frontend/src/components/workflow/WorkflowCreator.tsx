import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Input, 
  Select, 
  Typography,
  Row,
  Col,
  Space,
  Tag,
  message,
  Form,
  Checkbox,
  InputNumber,
  Divider
} from 'antd';
import { 
  PlusOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SaveOutlined,
  PlayCircleOutlined,
  SettingOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';

interface WorkflowStep {
  id?: number;
  step_number: number;
  name: string;
  description?: string;
  action_type: 'APPROVAL' | 'REVIEW' | 'NOTIFICATION' | 'PROCESSING' | 'VALIDATION' | 'CUSTOM';
  config?: any;
  conditions?: any;
  timeout_hours?: number;
  is_required: boolean;
  assigned_role?: string;
  assigned_user_id?: number;
}

interface WorkflowTemplate {
  name: string;
  description?: string;
  category?: string;
  is_active: boolean;
  version?: string;
  config?: any;
  trigger_conditions?: any;
  steps: WorkflowStep[];
}

interface User {
  id: number;
  username: string;
  full_name?: string;
  email: string;
}

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const WorkflowCreator: React.FC = () => {
  const [template, setTemplate] = useState<WorkflowTemplate>({
    name: '',
    description: '',
    category: '',
    is_active: true,
    version: '1.0',
    config: {},
    trigger_conditions: {},
    steps: []
  });
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const addStep = () => {
    const newStep: WorkflowStep = {
      step_number: template.steps.length + 1,
      name: `Step ${template.steps.length + 1}`,
      description: '',
      action_type: 'APPROVAL',
      config: {},
      conditions: {},
      timeout_hours: 24,
      is_required: true,
      assigned_role: '',
      assigned_user_id: undefined
    };

    setTemplate(prev => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }));
  };

  const removeStep = (index: number) => {
    setTemplate(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index).map((step, i) => ({
        ...step,
        step_number: i + 1
      }))
    }));
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...template.steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newSteps.length) {
      [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
      
      // Update step numbers
      newSteps.forEach((step, i) => {
        step.step_number = i + 1;
      });
      
      setTemplate(prev => ({ ...prev, steps: newSteps }));
    }
  };

  const updateStep = (index: number, field: keyof WorkflowStep, value: any) => {
    setTemplate(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) => 
        i === index ? { ...step, [field]: value } : step
      )
    }));
  };

  const saveTemplate = async () => {
    if (!template.name.trim()) {
      message.error('Template name is required');
      return;
    }

    if (template.steps.length === 0) {
      message.error('At least one step is required');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/workflows/templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
      });

      if (response.ok) {
        message.success('Workflow template created successfully');
        
        // Reset form
        setTemplate({
          name: '',
          description: '',
          category: '',
          is_active: true,
          version: '1.0',
          config: {},
          trigger_conditions: {},
          steps: []
        });
      } else {
        throw new Error('Failed to create template');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      message.error('Failed to create workflow template');
    } finally {
      setSaving(false);
    }
  };

  const getActionTypeIcon = (actionType: string) => {
    switch (actionType) {
      case 'APPROVAL':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'REVIEW':
        return <UserOutlined style={{ color: '#1890ff' }} />;
      case 'NOTIFICATION':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      case 'PROCESSING':
        return <SettingOutlined style={{ color: '#722ed1' }} />;
      case 'VALIDATION':
        return <CheckCircleOutlined style={{ color: '#fa8c16' }} />;
      default:
        return <SettingOutlined style={{ color: '#8c8c8c' }} />;
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Create Workflow Template</Title>
          <Text type="secondary">Design reusable workflow templates</Text>
        </div>
        <Space>
          <Button icon={<SaveOutlined />} disabled={saving}>
            Save Draft
          </Button>
          <Button 
            type="primary" 
            icon={saving ? undefined : <PlayCircleOutlined />}
            onClick={saveTemplate} 
            loading={saving}
          >
            Create Template
          </Button>
        </Space>
      </div>

      <Row gutter={[24, 24]}>
        {/* Template Configuration */}
        <Col xs={24} lg={8}>
          <Card title="Template Configuration">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <Text strong>Template Name *</Text>
                <Input
                  value={template.name}
                  onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter template name"
                  style={{ marginTop: '4px' }}
                />
              </div>

              <div>
                <Text strong>Description</Text>
                <TextArea
                  value={template.description}
                  onChange={(e) => setTemplate(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe this workflow template"
                  rows={3}
                  style={{ marginTop: '4px' }}
                />
              </div>

              <div>
                <Text strong>Category</Text>
                <Select 
                  value={template.category} 
                  onChange={(value) => setTemplate(prev => ({ ...prev, category: value }))}
                  placeholder="Select category"
                  style={{ width: '100%', marginTop: '4px' }}
                >
                  <Option value="approval">Approval</Option>
                  <Option value="review">Review</Option>
                  <Option value="processing">Processing</Option>
                  <Option value="validation">Validation</Option>
                  <Option value="custom">Custom</Option>
                </Select>
              </div>

              <div>
                <Text strong>Version</Text>
                <Input
                  value={template.version}
                  onChange={(e) => setTemplate(prev => ({ ...prev, version: e.target.value }))}
                  placeholder="1.0"
                  style={{ marginTop: '4px' }}
                />
              </div>

              <div>
                <Checkbox
                  checked={template.is_active}
                  onChange={(e) => setTemplate(prev => ({ ...prev, is_active: e.target.checked }))}
                >
                  Active Template
                </Checkbox>
              </div>
            </div>
          </Card>
        </Col>

        {/* Workflow Steps */}
        <Col xs={24} lg={16}>
          <Card 
            title="Workflow Steps"
            extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={addStep}>
                Add Step
              </Button>
            }
          >
            {template.steps.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: '#8c8c8c' }}>
                <SettingOutlined style={{ fontSize: '48px', opacity: 0.5, marginBottom: '16px' }} />
                <Title level={4} style={{ color: '#8c8c8c', marginBottom: '8px' }}>No steps defined</Title>
                <Text type="secondary">Add your first workflow step to get started</Text>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {template.steps.map((step, index) => (
                  <Card key={index} style={{ borderLeft: '4px solid #1890ff' }}>
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {getActionTypeIcon(step.action_type)}
                          <Tag>Step {step.step_number}</Tag>
                          <Tag color="blue">{step.action_type}</Tag>
                        </div>
                        
                        <Space>
                          <Button
                            size="small"
                            icon={<ArrowUpOutlined />}
                            onClick={() => moveStep(index, 'up')}
                            disabled={index === 0}
                          />
                          <Button
                            size="small"
                            icon={<ArrowDownOutlined />}
                            onClick={() => moveStep(index, 'down')}
                            disabled={index === template.steps.length - 1}
                          />
                          <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => removeStep(index)}
                          />
                        </Space>
                      </div>

                      <Row gutter={[16, 16]}>
                        <Col xs={24} md={12}>
                          <Text strong>Step Name *</Text>
                          <Input
                            value={step.name}
                            onChange={(e) => updateStep(index, 'name', e.target.value)}
                            placeholder="Enter step name"
                            style={{ marginTop: '4px' }}
                          />
                        </Col>

                        <Col xs={24} md={12}>
                          <Text strong>Action Type</Text>
                          <Select 
                            value={step.action_type} 
                            onChange={(value) => updateStep(index, 'action_type', value)}
                            style={{ width: '100%', marginTop: '4px' }}
                          >
                            <Option value="APPROVAL">Approval</Option>
                            <Option value="REVIEW">Review</Option>
                            <Option value="NOTIFICATION">Notification</Option>
                            <Option value="PROCESSING">Processing</Option>
                            <Option value="VALIDATION">Validation</Option>
                            <Option value="CUSTOM">Custom</Option>
                          </Select>
                        </Col>

                        <Col xs={24}>
                          <Text strong>Description</Text>
                          <TextArea
                            value={step.description}
                            onChange={(e) => updateStep(index, 'description', e.target.value)}
                            placeholder="Describe what happens in this step"
                            rows={2}
                            style={{ marginTop: '4px' }}
                          />
                        </Col>

                        <Col xs={24} md={12}>
                          <Text strong>Assigned Role</Text>
                          <Input
                            value={step.assigned_role}
                            onChange={(e) => updateStep(index, 'assigned_role', e.target.value)}
                            placeholder="e.g., manager, reviewer"
                            style={{ marginTop: '4px' }}
                          />
                        </Col>

                        <Col xs={24} md={12}>
                          <Text strong>Assigned User</Text>
                          <Select 
                            value={step.assigned_user_id?.toString() || ''} 
                            onChange={(value) => updateStep(index, 'assigned_user_id', value ? parseInt(value) : undefined)}
                            placeholder="Select user"
                            style={{ width: '100%', marginTop: '4px' }}
                          >
                            <Option value="">No specific user</Option>
                            {users.map((user) => (
                              <Option key={user.id} value={user.id.toString()}>
                                {user.full_name || user.username}
                              </Option>
                            ))}
                          </Select>
                        </Col>

                        <Col xs={24} md={12}>
                          <Text strong>Timeout (hours)</Text>
                          <InputNumber
                            value={step.timeout_hours}
                            onChange={(value) => updateStep(index, 'timeout_hours', value || 24)}
                            placeholder={24}
                            style={{ width: '100%', marginTop: '4px' }}
                          />
                        </Col>

                        <Col xs={24} md={12}>
                          <div style={{ marginTop: '28px' }}>
                            <Checkbox
                              checked={step.is_required}
                              onChange={(e) => updateStep(index, 'is_required', e.target.checked)}
                            >
                              Required Step
                            </Checkbox>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default WorkflowCreator;