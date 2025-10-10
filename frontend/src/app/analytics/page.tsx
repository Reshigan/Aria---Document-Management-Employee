'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Progress, 
  DatePicker, 
  Button,
  Spin,
  Alert,
  Typography,
  Space,
  Tag,
  Empty
} from 'antd';
import {
  BarChartOutlined,
  RiseOutlined,
  FileTextOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  ReloadOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { analyticsAPI } from '@/lib/api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface AnalyticsData {
  period_days: number;
  documents: {
    total: number;
    recent: number;
    by_status: {
      processed: number;
      uploaded: number;
      [key: string]: number;
    };
    by_type: {
      [key: string]: number;
    };
    total_storage_bytes: number;
    total_storage_mb: number;
  };
  workflows: {
    total: number;
    active: number;
    completed: number;
    completion_rate: number;
  };
  activity: {
    recent_actions: number;
  };
  total_users: number;
  active_users: number;
  activity_rate: number;
}

const AnalyticsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'days'),
    dayjs()
  ]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalyticsData = async () => {
    try {
      setError(null);
      
      // Fetch data from the real analytics API endpoint
      const response = await analyticsAPI.getDashboardStats();
      
      setData(response);
    } catch (err) {
      console.error('Failed to fetch analytics data:', err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };



  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalyticsData();
  };

  const exportData = () => {
    if (!data) return;
    
    const exportData = {
      generatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      dateRange: [dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')],
      ...data
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aria-analytics-${dayjs().format('YYYY-MM-DD')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" />
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

  if (!data) {
    return <Empty description="No analytics data available" />;
  }



  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2}>
            <BarChartOutlined /> Analytics Dashboard
          </Title>
          <Text type="secondary">Real-time insights and performance metrics</Text>
        </div>
        <Space>
          <RangePicker
            value={dateRange}
            onChange={(dates) => dates && setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
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
            type="primary" 
            icon={<DownloadOutlined />} 
            onClick={exportData}
          >
            Export
          </Button>
        </Space>
      </div>

      {/* Key Metrics */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Documents"
              value={data.documents.total}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Processing Rate"
              value={Math.round((data.documents.by_status.processed / data.documents.total) * 100)}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Users"
              value={data.active_users}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Workflows"
              value={data.workflows.active}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* System Overview */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <Card title="System Activity" extra={<Tag color="green">ONLINE</Tag>}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="Total Users"
                  value={data.total_users}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Activity Rate"
                  value={data.activity_rate}
                  suffix="%"
                  prefix={<RiseOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
            </Row>
            <div style={{ marginTop: '16px' }}>
              <Statistic
                title="Recent Actions"
                value={data.activity.recent_actions}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Document Status">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="Processed"
                  value={data.documents.by_status.processed}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Uploaded"
                  value={data.documents.by_status.uploaded}
                  valueStyle={{ color: '#fa8c16' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Storage Used"
                  value={data.documents.total_storage_mb}
                  suffix="MB"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Workflow Rate"
                  value={data.workflows.completion_rate}
                  suffix="%"
                  valueStyle={{ color: '#722ed1' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Document Types Distribution */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <Card title="Document Types">
            {Object.keys(data.documents.by_type).length > 0 ? (
              <div>
                {Object.entries(data.documents.by_type).map(([type, count]) => (
                  <div key={type} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <Text>{type}</Text>
                      <Text strong>{count}</Text>
                    </div>
                    <Progress 
                      percent={Math.round((count / data.documents.total) * 100)} 
                      size="small"
                      showInfo={false}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <Empty description="No document type data" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Document Status Distribution">
            {Object.keys(data.documents.by_status).length > 0 ? (
              <div>
                {Object.entries(data.documents.by_status).map(([status, count]) => (
                  <div key={status} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <Text>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
                      <Text strong>{count}</Text>
                    </div>
                    <Progress 
                      percent={Math.round((count / data.documents.total) * 100)} 
                      size="small"
                      showInfo={false}
                      strokeColor={status === 'processed' ? '#52c41a' : '#fa8c16'}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <Empty description="No document status data" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Summary Information */}
      <Card title="System Summary" extra={<CalendarOutlined />}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Statistic
              title="Analysis Period"
              value={data.period_days}
              suffix="days"
              prefix={<CalendarOutlined />}
            />
          </Col>
          <Col xs={24} md={8}>
            <Statistic
              title="Total Workflows"
              value={data.workflows.total}
              prefix={<RiseOutlined />}
            />
          </Col>
          <Col xs={24} md={8}>
            <Statistic
              title="Completed Workflows"
              value={data.workflows.completed}
              prefix={<CheckCircleOutlined />}
            />
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default AnalyticsPage;