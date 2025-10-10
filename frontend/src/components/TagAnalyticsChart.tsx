'use client';

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Select, DatePicker, Space, Statistic, Progress } from 'antd';
import { 
  BarChartOutlined, LineChartOutlined, PieChartOutlined,
  TrendingUpOutlined, TagOutlined
} from '@ant-design/icons';
import { enhancedTagsAPI } from '@/lib/api';
import type { EnhancedTag, TagAnalytics } from '@/types';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface TagAnalyticsChartProps {
  tags: EnhancedTag[];
}

interface UsageStats {
  total_usage: number;
  period_usage: number;
  growth_rate: number;
  top_tags: Array<{
    tag: EnhancedTag;
    usage_count: number;
    percentage: number;
  }>;
  category_distribution: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  usage_trend: Array<{
    date: string;
    count: number;
  }>;
}

const TagAnalyticsChart: React.FC<TagAnalyticsChartProps> = ({ tags }) => {
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('month');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [usageStats, setUsageStats] = useState<UsageStats>({
    total_usage: 0,
    period_usage: 0,
    growth_rate: 0,
    top_tags: [],
    category_distribution: [],
    usage_trend: []
  });

  useEffect(() => {
    loadAnalytics();
  }, [period, selectedCategory]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const stats = await enhancedTagsAPI.getUsageStats(period);
      
      // Process the data for display
      const processedStats: UsageStats = {
        total_usage: stats.total_usage || 0,
        period_usage: stats.period_usage || 0,
        growth_rate: stats.growth_rate || 0,
        top_tags: (stats.top_tags || []).map((item: any) => ({
          tag: tags.find(t => t.id === item.tag_id) || item.tag,
          usage_count: item.usage_count,
          percentage: item.percentage
        })),
        category_distribution: stats.category_distribution || [],
        usage_trend: stats.usage_trend || []
      };

      setUsageStats(processedStats);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategories = () => {
    const categories = new Set(tags.map(tag => tag.category).filter(Boolean));
    return Array.from(categories);
  };

  return (
    <div>
      {/* Controls */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Space>
          <Select
            value={period}
            onChange={setPeriod}
            style={{ width: 120 }}
          >
            <Option value="week">This Week</Option>
            <Option value="month">This Month</Option>
            <Option value="quarter">This Quarter</Option>
            <Option value="year">This Year</Option>
          </Select>
          
          <Select
            placeholder="Filter by category"
            allowClear
            value={selectedCategory}
            onChange={setSelectedCategory}
            style={{ width: 150 }}
          >
            {getCategories().map(category => (
              <Option key={category} value={category}>
                {category}
              </Option>
            ))}
          </Select>
        </Space>
      </Card>

      {/* Overview Statistics */}
      <Row gutter={16} style={{ marginBottom: '16px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Usage"
              value={usageStats.total_usage}
              prefix={<TagOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={`Usage This ${period}`}
              value={usageStats.period_usage}
              prefix={<BarChartOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Growth Rate"
              value={usageStats.growth_rate}
              precision={1}
              suffix="%"
              prefix={<TrendingUpOutlined />}
              valueStyle={{ 
                color: usageStats.growth_rate >= 0 ? '#3f8600' : '#cf1322' 
              }}
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Tags"
              value={tags.filter(t => t.is_active).length}
              suffix={`/ ${tags.length}`}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        {/* Top Tags */}
        <Col span={12}>
          <Card 
            title={
              <Space>
                <BarChartOutlined />
                Top Tags by Usage
              </Space>
            }
            loading={loading}
          >
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {usageStats.top_tags.map((item, index) => (
                <div key={item.tag?.id || index} style={{ marginBottom: '12px' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '4px'
                  }}>
                    <Space>
                      <span style={{ 
                        display: 'inline-block',
                        width: '20px',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        color: '#666'
                      }}>
                        {index + 1}
                      </span>
                      {item.tag && (
                        <span 
                          style={{ 
                            display: 'inline-block',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: item.tag.color,
                            marginRight: '4px'
                          }}
                        />
                      )}
                      <span>{item.tag?.name || 'Unknown'}</span>
                    </Space>
                    <span style={{ fontWeight: 'bold' }}>
                      {item.usage_count}
                    </span>
                  </div>
                  <Progress 
                    percent={item.percentage} 
                    size="small" 
                    showInfo={false}
                    strokeColor={item.tag?.color || '#1890ff'}
                  />
                </div>
              ))}
            </div>
            
            {usageStats.top_tags.length === 0 && (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px', 
                color: '#999' 
              }}>
                No usage data available
              </div>
            )}
          </Card>
        </Col>

        {/* Category Distribution */}
        <Col span={12}>
          <Card 
            title={
              <Space>
                <PieChartOutlined />
                Category Distribution
              </Space>
            }
            loading={loading}
          >
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {usageStats.category_distribution.map((item, index) => (
                <div key={item.category} style={{ marginBottom: '12px' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '4px'
                  }}>
                    <Space>
                      <span style={{ 
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: `hsl(${index * 60}, 70%, 50%)`,
                        marginRight: '4px'
                      }} />
                      <span>{item.category || 'Uncategorized'}</span>
                    </Space>
                    <span style={{ fontWeight: 'bold' }}>
                      {item.count} ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress 
                    percent={item.percentage} 
                    size="small" 
                    showInfo={false}
                    strokeColor={`hsl(${index * 60}, 70%, 50%)`}
                  />
                </div>
              ))}
            </div>
            
            {usageStats.category_distribution.length === 0 && (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px', 
                color: '#999' 
              }}>
                No category data available
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Usage Trend Chart Placeholder */}
      <Card 
        title={
          <Space>
            <LineChartOutlined />
            Usage Trend
          </Space>
        }
        style={{ marginTop: '16px' }}
        loading={loading}
      >
        <div style={{ 
          height: '200px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: '#fafafa',
          border: '1px dashed #d9d9d9',
          borderRadius: '6px',
          color: '#999'
        }}>
          <Space direction="vertical" align="center">
            <LineChartOutlined style={{ fontSize: '24px' }} />
            <span>Usage trend chart will be implemented here</span>
            <span style={{ fontSize: '12px' }}>
              Consider integrating with Chart.js or Recharts
            </span>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default TagAnalyticsChart;