import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Space,
  Typography,
  List,
  Avatar,
  Popconfirm,
  message,
  Tabs,
  ColorPicker,
  Slider,
  InputNumber
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DragOutlined,
  SettingOutlined,
  EyeOutlined,
  CopyOutlined
} from '@ant-design/icons';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

interface Widget {
  id: number;
  title: string;
  type: string;
  config: {
    dataSource: string;
    chartType?: string;
    metrics: string[];
    filters?: any;
    refreshInterval: number;
    colors?: string[];
    size: { width: number; height: number };
    position: { x: number; y: number };
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface WidgetType {
  type: string;
  name: string;
  description: string;
  icon: string;
  configSchema: any;
}

const widgetTypes: WidgetType[] = [
  {
    type: 'metric_card',
    name: 'Metric Card',
    description: 'Display a single metric with trend indicator',
    icon: '📊',
    configSchema: {
      metric: { type: 'select', required: true },
      showTrend: { type: 'boolean', default: true },
      format: { type: 'select', options: ['number', 'percentage', 'currency'] }
    }
  },
  {
    type: 'line_chart',
    name: 'Line Chart',
    description: 'Time series data visualization',
    icon: '📈',
    configSchema: {
      metrics: { type: 'multiselect', required: true },
      timeRange: { type: 'select', options: ['7d', '30d', '90d', '1y'] },
      showLegend: { type: 'boolean', default: true }
    }
  },
  {
    type: 'bar_chart',
    name: 'Bar Chart',
    description: 'Categorical data comparison',
    icon: '📊',
    configSchema: {
      metric: { type: 'select', required: true },
      groupBy: { type: 'select', required: true },
      orientation: { type: 'select', options: ['horizontal', 'vertical'] }
    }
  },
  {
    type: 'pie_chart',
    name: 'Pie Chart',
    description: 'Distribution visualization',
    icon: '🥧',
    configSchema: {
      metric: { type: 'select', required: true },
      groupBy: { type: 'select', required: true },
      showLabels: { type: 'boolean', default: true }
    }
  },
  {
    type: 'table',
    name: 'Data Table',
    description: 'Tabular data display',
    icon: '📋',
    configSchema: {
      columns: { type: 'multiselect', required: true },
      sortBy: { type: 'select' },
      pageSize: { type: 'number', default: 10 }
    }
  },
  {
    type: 'progress_bar',
    name: 'Progress Bar',
    description: 'Goal tracking and progress visualization',
    icon: '📏',
    configSchema: {
      metric: { type: 'select', required: true },
      target: { type: 'number', required: true },
      showPercentage: { type: 'boolean', default: true }
    }
  }
];

const DraggableWidget: React.FC<{ widget: Widget; onEdit: (widget: Widget) => void; onDelete: (id: number) => void }> = ({
  widget,
  onEdit,
  onDelete
}) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'widget',
    item: { id: widget.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  return (
    <div ref={drag} style={{ opacity: isDragging ? 0.5 : 1 }}>
      <Card
        size="small"
        title={
          <Space>
            <DragOutlined />
            <Text>{widget.title}</Text>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => onEdit(widget)}
            />
            <Popconfirm
              title="Are you sure you want to delete this widget?"
              onConfirm={() => onDelete(widget.id)}
            >
              <Button
                icon={<DeleteOutlined />}
                size="small"
                danger
              />
            </Popconfirm>
          </Space>
        }
      >
        <div style={{ minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text type="secondary">
            {widgetTypes.find(t => t.type === widget.type)?.icon} {widget.type}
          </Text>
        </div>
      </Card>
    </div>
  );
};

const WidgetManager: React.FC = () => {
  const [form] = Form.useForm();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [selectedType, setSelectedType] = useState<string>('');

  useEffect(() => {
    fetchWidgets();
  }, []);

  const fetchWidgets = async () => {
    try {
      const response = await fetch('/api/analytics/widgets');
      if (!response.ok) throw new Error('Failed to fetch widgets');
      const data = await response.json();
      setWidgets(data);
    } catch (error) {
      console.error('Error fetching widgets:', error);
      message.error('Failed to load widgets');
    }
  };

  const handleSaveWidget = async (values: any) => {
    try {
      setLoading(true);
      const url = editingWidget 
        ? `/api/analytics/widgets/${editingWidget.id}`
        : '/api/analytics/widgets';
      
      const method = editingWidget ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });

      if (!response.ok) throw new Error('Failed to save widget');
      
      message.success(`Widget ${editingWidget ? 'updated' : 'created'} successfully`);
      setModalVisible(false);
      setEditingWidget(null);
      form.resetFields();
      fetchWidgets();
    } catch (error) {
      console.error('Error saving widget:', error);
      message.error('Failed to save widget');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWidget = async (widgetId: number) => {
    try {
      const response = await fetch(`/api/analytics/widgets/${widgetId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete widget');
      
      message.success('Widget deleted successfully');
      fetchWidgets();
    } catch (error) {
      console.error('Error deleting widget:', error);
      message.error('Failed to delete widget');
    }
  };

  const handleEditWidget = (widget: Widget) => {
    setEditingWidget(widget);
    setSelectedType(widget.type);
    form.setFieldsValue(widget);
    setModalVisible(true);
  };

  const handleDuplicateWidget = (widget: Widget) => {
    const duplicate = {
      ...widget,
      title: `${widget.title} (Copy)`,
      config: {
        ...widget.config,
        position: { x: widget.config.position.x + 50, y: widget.config.position.y + 50 }
      }
    };
    delete (duplicate as any).id;
    setEditingWidget(null);
    setSelectedType(widget.type);
    form.setFieldsValue(duplicate);
    setModalVisible(true);
  };

  const renderWidgetConfig = () => {
    if (!selectedType) return null;

    const widgetType = widgetTypes.find(t => t.type === selectedType);
    if (!widgetType) return null;

    const schema = widgetType.configSchema;

    return (
      <div>
        <Title level={4}>Widget Configuration</Title>
        
        {/* Data Source */}
        <Form.Item
          name={['config', 'dataSource']}
          label="Data Source"
          rules={[{ required: true, message: 'Please select a data source' }]}
        >
          <Select placeholder="Select data source">
            <Option value="documents">Documents</Option>
            <Option value="users">Users</Option>
            <Option value="workflows">Workflows</Option>
            <Option value="system">System Metrics</Option>
          </Select>
        </Form.Item>

        {/* Metrics */}
        {schema.metrics && (
          <Form.Item
            name={['config', 'metrics']}
            label="Metrics"
            rules={[{ required: schema.metrics.required, message: 'Please select metrics' }]}
          >
            <Select mode={schema.metrics.type === 'multiselect' ? 'multiple' : undefined}>
              <Option value="count">Count</Option>
              <Option value="sum">Sum</Option>
              <Option value="average">Average</Option>
              <Option value="min">Minimum</Option>
              <Option value="max">Maximum</Option>
            </Select>
          </Form.Item>
        )}

        {/* Refresh Interval */}
        <Form.Item
          name={['config', 'refreshInterval']}
          label="Refresh Interval (seconds)"
          initialValue={300}
        >
          <InputNumber min={30} max={3600} />
        </Form.Item>

        {/* Size Configuration */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name={['config', 'size', 'width']}
              label="Width"
              initialValue={400}
            >
              <InputNumber min={200} max={800} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name={['config', 'size', 'height']}
              label="Height"
              initialValue={300}
            >
              <InputNumber min={150} max={600} />
            </Form.Item>
          </Col>
        </Row>

        {/* Position */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name={['config', 'position', 'x']}
              label="X Position"
              initialValue={0}
            >
              <InputNumber min={0} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name={['config', 'position', 'y']}
              label="Y Position"
              initialValue={0}
            >
              <InputNumber min={0} />
            </Form.Item>
          </Col>
        </Row>

        {/* Type-specific configurations */}
        {selectedType === 'line_chart' && (
          <>
            <Form.Item
              name={['config', 'showLegend']}
              label="Show Legend"
              valuePropName="checked"
              initialValue={true}
            >
              <Switch />
            </Form.Item>
            <Form.Item
              name={['config', 'timeRange']}
              label="Time Range"
              initialValue="30d"
            >
              <Select>
                <Option value="7d">Last 7 days</Option>
                <Option value="30d">Last 30 days</Option>
                <Option value="90d">Last 90 days</Option>
                <Option value="1y">Last year</Option>
              </Select>
            </Form.Item>
          </>
        )}

        {selectedType === 'progress_bar' && (
          <>
            <Form.Item
              name={['config', 'target']}
              label="Target Value"
              rules={[{ required: true, message: 'Please enter target value' }]}
            >
              <InputNumber />
            </Form.Item>
            <Form.Item
              name={['config', 'showPercentage']}
              label="Show Percentage"
              valuePropName="checked"
              initialValue={true}
            >
              <Switch />
            </Form.Item>
          </>
        )}

        {(selectedType === 'bar_chart' || selectedType === 'pie_chart') && (
          <Form.Item
            name={['config', 'groupBy']}
            label="Group By"
            rules={[{ required: true, message: 'Please select grouping field' }]}
          >
            <Select>
              <Option value="date">Date</Option>
              <Option value="type">Type</Option>
              <Option value="user">User</Option>
              <Option value="department">Department</Option>
            </Select>
          </Form.Item>
        )}
      </div>
    );
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={2}>Widget Manager</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingWidget(null);
              setSelectedType('');
              form.resetFields();
              setModalVisible(true);
            }}
          >
            Create Widget
          </Button>
        </div>

        <Tabs defaultActiveKey="widgets">
          <TabPane tab="My Widgets" key="widgets">
            <Row gutter={[16, 16]}>
              {widgets.map(widget => (
                <Col xs={24} sm={12} lg={8} xl={6} key={widget.id}>
                  <DraggableWidget
                    widget={widget}
                    onEdit={handleEditWidget}
                    onDelete={handleDeleteWidget}
                  />
                </Col>
              ))}
            </Row>
          </TabPane>

          <TabPane tab="Widget Types" key="types">
            <Row gutter={[16, 16]}>
              {widgetTypes.map(type => (
                <Col xs={24} sm={12} lg={8} key={type.type}>
                  <Card
                    hoverable
                    onClick={() => {
                      setEditingWidget(null);
                      setSelectedType(type.type);
                      form.resetFields();
                      form.setFieldsValue({ type: type.type });
                      setModalVisible(true);
                    }}
                  >
                    <Card.Meta
                      avatar={<Avatar size={48}>{type.icon}</Avatar>}
                      title={type.name}
                      description={type.description}
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </TabPane>
        </Tabs>

        <Modal
          title={editingWidget ? 'Edit Widget' : 'Create Widget'}
          open={modalVisible}
          onCancel={() => {
            setModalVisible(false);
            setEditingWidget(null);
            setSelectedType('');
            form.resetFields();
          }}
          footer={null}
          width={800}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSaveWidget}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="title"
                  label="Widget Title"
                  rules={[{ required: true, message: 'Please enter widget title' }]}
                >
                  <Input placeholder="Enter widget title" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="type"
                  label="Widget Type"
                  rules={[{ required: true, message: 'Please select widget type' }]}
                >
                  <Select 
                    placeholder="Select widget type"
                    onChange={setSelectedType}
                    value={selectedType}
                  >
                    {widgetTypes.map(type => (
                      <Option key={type.type} value={type.type}>
                        {type.icon} {type.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="isActive"
              label="Active"
              valuePropName="checked"
              initialValue={true}
            >
              <Switch />
            </Form.Item>

            {renderWidgetConfig()}

            <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: '24px' }}>
              <Space>
                <Button onClick={() => setModalVisible(false)}>
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                  {editingWidget ? 'Update' : 'Create'} Widget
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </DndProvider>
  );
};

export default WidgetManager;