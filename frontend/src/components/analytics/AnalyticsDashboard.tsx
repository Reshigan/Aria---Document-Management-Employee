import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Select,
  DatePicker,
  Button,
  Table,
  Progress,
  Tag,
  Space,
  Typography,
  Spin,
  Alert,
  Tabs,
  List,
  Avatar,
  Tooltip,
  Badge
} from 'antd';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import {
  FileTextOutlined,
  UserOutlined,
  ClockCircleOutlined,
  TrendingUpOutlined,
  DownloadOutlined,
  EyeOutlined,
  ShareAltOutlined,
  AlertOutlined,
  ReloadOutlined,
  FilterOutlined,
  ExportOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;
const { Option } = Select;

interface AnalyticsData {
  documentStats: {
    totalDocuments: number;
    documentsThisMonth: number;
    documentsGrowth: number;
    averageSize: number;
  };
  userActivity: {
    activeUsers: number;
    totalSessions: number;
    averageSessionTime: number;
    userGrowth: number;
  };
  systemMetrics: {
    storageUsed: number;
    storageLimit: number;
    apiCalls: number;
    responseTime: number;
  };
  workflowStats: {
    activeWorkflows: number;
    completedWorkflows: number;
    averageCompletionTime: number;
    workflowEfficiency: number;
  };
}

interface ChartData {
  documentActivity: Array<{
    date: string;
    uploads: number;
    downloads: number;
    views: number;
  }>;
  userActivity: Array<{
    date: string;
    activeUsers: number;
    newUsers: number;
    sessions: number;
  }>;
  documentTypes: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  topDocuments: Array<{
    id: number;
    title: string;
    views: number;
    downloads: number;
    lastAccessed: string;
  }>;
  recentActivity: Array<{
    id: number;
    user: string;
    action: string;
    document: string;
    timestamp: string;
    avatar?: string;
  }>;
}

interface DashboardWidget {
  id: number;
  title: string;
  type: string;
  config: any;
  position: { x: number; y: number; w: number; h: number };
}

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2'];

const AnalyticsDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'day'),
    dayjs()
  ]);
  const [selectedMetric, setSelectedMetric] = useState('documents');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalyticsData();
    fetchDashboardWidgets();
  }, [dateRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [startDate, endDate] = dateRange;
      const params = new URLSearchParams({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      });

      // Fetch analytics summary
      const summaryResponse = await fetch(`/api/analytics/summary?${params}`);
      if (!summaryResponse.ok) throw new Error('Failed to fetch analytics summary');
      const summary = await summaryResponse.json();

      // Fetch chart data
      const chartResponse = await fetch(`/api/analytics/charts?${params}`);
      if (!chartResponse.ok) throw new Error('Failed to fetch chart data');
      const charts = await chartResponse.json();

      setAnalyticsData(summary);
      setChartData(charts);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardWidgets = async () => {
    try {
      const response = await fetch('/api/analytics/widgets');
      if (!response.ok) throw new Error('Failed to fetch dashboard widgets');
      const widgetsData = await response.json();
      setWidgets(widgetsData);
    } catch (error) {
      console.error('Error fetching dashboard widgets:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalyticsData();
    setRefreshing(false);
  };

  const handleExport = async () => {
    try {
      const [startDate, endDate] = dateRange;
      const params = new URLSearchParams({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        format: 'csv'
      });

      const response = await fetch(`/api/analytics/export?${params}`);
      if (!response.ok) throw new Error('Failed to export data');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${startDate.format('YYYY-MM-DD')}-${endDate.format('YYYY-MM-DD')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const renderOverviewCards = () => {
    if (!analyticsData) return null;

    const cards = [
      {
        title: 'Total Documents',
        value: analyticsData.documentStats.totalDocuments,
        suffix: '',
        prefix: <FileTextOutlined />,
        growth: analyticsData.documentStats.documentsGrowth,
        color: '#1890ff'
      },
      {
        title: 'Active Users',
        value: analyticsData.userActivity.activeUsers,
        suffix: '',
        prefix: <UserOutlined />,
        growth: analyticsData.userActivity.userGrowth,
        color: '#52c41a'
      },
      {
        title: 'Storage Used',
        value: (analyticsData.systemMetrics.storageUsed / 1024 / 1024 / 1024).toFixed(1),
        suffix: 'GB',
        prefix: <ClockCircleOutlined />,
        growth: 0,
        color: '#faad14'
      },
      {
        title: 'Active Workflows',
        value: analyticsData.workflowStats.activeWorkflows,
        suffix: '',
        prefix: <TrendingUpOutlined />,
        growth: analyticsData.workflowStats.workflowEfficiency,
        color: '#722ed1'
      }
    ];

    return (
      <Row gutter={[16, 16]}>
        {cards.map((card, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <Card>
              <Statistic
                title={card.title}
                value={card.value}
                suffix={card.suffix}
                prefix={card.prefix}
                valueStyle={{ color: card.color }}
              />
              {card.growth !== 0 && (
                <div style={{ marginTop: 8 }}>
                  <Text type={card.growth > 0 ? 'success' : 'danger'}>
                    {card.growth > 0 ? '+' : ''}{card.growth.toFixed(1)}%
                  </Text>
                  <Text type="secondary"> vs last period</Text>
                </div>
              )}
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  const renderDocumentActivityChart = () => {
    if (!chartData?.documentActivity) return null;

    return (
      <Card title="Document Activity" extra={
        <Select value={selectedMetric} onChange={setSelectedMetric} style={{ width: 120 }}>
          <Option value="uploads">Uploads</Option>
          <Option value="downloads">Downloads</Option>
          <Option value="views">Views</Option>
        </Select>
      }>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData.documentActivity}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <RechartsTooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey={selectedMetric}
              stroke="#1890ff"
              fill="#1890ff"
              fillOpacity={0.3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    );
  };

  const renderUserActivityChart = () => {
    if (!chartData?.userActivity) return null;

    return (
      <Card title="User Activity">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData.userActivity}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <RechartsTooltip />
            <Legend />
            <Line type="monotone" dataKey="activeUsers" stroke="#1890ff" name="Active Users" />
            <Line type="monotone" dataKey="newUsers" stroke="#52c41a" name="New Users" />
            <Line type="monotone" dataKey="sessions" stroke="#faad14" name="Sessions" />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    );
  };

  const renderDocumentTypesChart = () => {
    if (!chartData?.documentTypes) return null;

    return (
      <Card title="Document Types Distribution">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData.documentTypes}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ type, percentage }) => `${type} (${percentage}%)`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="count"
            >
              {chartData.documentTypes.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <RechartsTooltip />
          </PieChart>
        </ResponsiveContainer>
      </Card>
    );
  };

  const renderTopDocuments = () => {
    if (!chartData?.topDocuments) return null;

    const columns = [
      {
        title: 'Document',
        dataIndex: 'title',
        key: 'title',
        ellipsis: true
      },
      {
        title: 'Views',
        dataIndex: 'views',
        key: 'views',
        sorter: (a: any, b: any) => a.views - b.views,
        render: (views: number) => (
          <Badge count={views} style={{ backgroundColor: '#1890ff' }} />
        )
      },
      {
        title: 'Downloads',
        dataIndex: 'downloads',
        key: 'downloads',
        sorter: (a: any, b: any) => a.downloads - b.downloads,
        render: (downloads: number) => (
          <Badge count={downloads} style={{ backgroundColor: '#52c41a' }} />
        )
      },
      {
        title: 'Last Accessed',
        dataIndex: 'lastAccessed',
        key: 'lastAccessed',
        render: (date: string) => dayjs(date).format('MMM DD, YYYY')
      }
    ];

    return (
      <Card title="Top Documents">
        <Table
          columns={columns}
          dataSource={chartData.topDocuments}
          pagination={{ pageSize: 5 }}
          size="small"
        />
      </Card>
    );
  };

  const renderRecentActivity = () => {
    if (!chartData?.recentActivity) return null;

    return (
      <Card title="Recent Activity">
        <List
          itemLayout="horizontal"
          dataSource={chartData.recentActivity}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar src={item.avatar} icon={<UserOutlined />} />}
                title={
                  <Space>
                    <Text strong>{item.user}</Text>
                    <Tag color="blue">{item.action}</Tag>
                  </Space>
                }
                description={
                  <Space direction="vertical" size={0}>
                    <Text ellipsis>{item.document}</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {dayjs(item.timestamp).fromNow()}
                    </Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    );
  };

  const renderSystemHealth = () => {
    if (!analyticsData) return null;

    const storagePercentage = (analyticsData.systemMetrics.storageUsed / analyticsData.systemMetrics.storageLimit) * 100;

    return (
      <Card title="System Health">
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text>Storage Usage</Text>
            <Progress
              percent={storagePercentage}
              status={storagePercentage > 80 ? 'exception' : 'normal'}
              format={() => `${storagePercentage.toFixed(1)}%`}
            />
          </div>
          <Row gutter={16}>
            <Col span={12}>
              <Statistic
                title="API Calls (24h)"
                value={analyticsData.systemMetrics.apiCalls}
                prefix={<TrendingUpOutlined />}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title="Avg Response Time"
                value={analyticsData.systemMetrics.responseTime}
                suffix="ms"
                prefix={<ClockCircleOutlined />}
              />
            </Col>
          </Row>
        </Space>
      </Card>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>Loading analytics data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error Loading Analytics"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={fetchAnalyticsData}>
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}>Analytics Dashboard</Title>
        <Space>
          <RangePicker
            value={dateRange}
            onChange={(dates) => dates && setDateRange(dates)}
            format="YYYY-MM-DD"
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={refreshing}
          >
            Refresh
          </Button>
          <Button
            icon={<ExportOutlined />}
            onClick={handleExport}
            type="primary"
          >
            Export
          </Button>
        </Space>
      </div>

      <Tabs defaultActiveKey="overview">
        <TabPane tab="Overview" key="overview">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {renderOverviewCards()}
            
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={16}>
                {renderDocumentActivityChart()}
              </Col>
              <Col xs={24} lg={8}>
                {renderSystemHealth()}
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                {renderUserActivityChart()}
              </Col>
              <Col xs={24} lg={12}>
                {renderDocumentTypesChart()}
              </Col>
            </Row>
          </Space>
        </TabPane>

        <TabPane tab="Documents" key="documents">
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
              {renderTopDocuments()}
            </Col>
            <Col xs={24} lg={8}>
              {renderRecentActivity()}
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="Users" key="users">
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              {renderUserActivityChart()}
            </Col>
            <Col xs={24} lg={12}>
              {renderRecentActivity()}
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="System" key="system">
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={8}>
              {renderSystemHealth()}
            </Col>
            <Col xs={24} lg={16}>
              <Card title="System Alerts">
                <Alert
                  message="Storage Warning"
                  description="Storage usage is above 80%. Consider archiving old documents."
                  type="warning"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
                <Alert
                  message="High API Usage"
                  description="API calls have increased by 150% this week."
                  type="info"
                  showIcon
                />
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;