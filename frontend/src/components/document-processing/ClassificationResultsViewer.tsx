import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Progress,
  Tag,
  Space,
  Row,
  Col,
  Button,
  Tooltip,
  Alert,
  Spin,
  Table,
  Statistic,
  List,
  Badge
} from 'antd';
import {
  BranchesOutlined,
  TrophyOutlined,
  BarChartOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { documentProcessingService, ClassificationResult } from '../../services/documentProcessingService';

const { Title, Text } = Typography;

interface ClassificationResultsViewerProps {
  jobId: number;
}

const ClassificationResultsViewer: React.FC<ClassificationResultsViewerProps> = ({ jobId }) => {
  const [classificationResult, setClassificationResult] = useState<ClassificationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClassificationResult();
  }, [jobId]);

  const loadClassificationResult = async () => {
    try {
      setLoading(true);
      const result = await documentProcessingService.getClassificationResult(jobId);
      setClassificationResult(result);
    } catch (error) {
      console.error('Failed to load classification result:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return '#52c41a';
    if (confidence >= 0.7) return '#faad14';
    if (confidence >= 0.5) return '#fa8c16';
    return '#ff4d4f';
  };

  const getConfidenceStatus = (confidence: number) => {
    if (confidence >= 0.9) return 'success';
    if (confidence >= 0.7) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text>Loading classification results...</Text>
          </div>
        </div>
      </Card>
    );
  }

  if (!classificationResult) {
    return (
      <Alert
        message="No Classification Results"
        description="Document classification has not been completed for this job yet."
        type="info"
        showIcon
      />
    );
  }

  const predictionColumns = [
    {
      title: 'Rank',
      key: 'rank',
      width: 60,
      render: (_: any, __: any, index: number) => (
        <Badge count={index + 1} style={{ backgroundColor: index === 0 ? '#52c41a' : '#1890ff' }} />
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category: string, record: any, index: number) => (
        <Space>
          {index === 0 && <TrophyOutlined style={{ color: '#faad14' }} />}
          <Text strong={index === 0}>{category}</Text>
        </Space>
      ),
    },
    {
      title: 'Confidence',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 200,
      render: (confidence: number) => (
        <div>
          <Progress
            percent={confidence * 100}
            size="small"
            strokeColor={getConfidenceColor(confidence)}
            format={(percent) => `${percent?.toFixed(1)}%`}
          />
        </div>
      ),
      sorter: (a: any, b: any) => b.confidence - a.confidence,
    },
    {
      title: 'Status',
      dataIndex: 'confidence',
      key: 'status',
      width: 100,
      render: (confidence: number) => (
        <Tag color={getConfidenceStatus(confidence)}>
          {confidence >= 0.9 ? 'High' : confidence >= 0.7 ? 'Medium' : 'Low'}
        </Tag>
      ),
    },
  ];

  return (
    <div>
      {/* Summary Card */}
      <Card title={<><BranchesOutlined /> Classification Results Summary</>} style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Predicted Category"
                value={classificationResult.predicted_category}
                prefix={<TrophyOutlined />}
                valueStyle={{ color: '#1890ff', fontSize: '18px' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Confidence Score"
                value={(classificationResult.confidence_score * 100).toFixed(1)}
                suffix="%"
                prefix={<BarChartOutlined />}
                valueStyle={{ 
                  color: getConfidenceColor(classificationResult.confidence_score),
                  fontSize: '18px'
                }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Model Version"
                value={classificationResult.model_version}
                prefix={<InfoCircleOutlined />}
                valueStyle={{ fontSize: '18px' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Total Predictions"
                value={classificationResult.all_predictions?.length || 0}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ fontSize: '18px' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Confidence Level Alert */}
        <div style={{ marginTop: 16 }}>
          {classificationResult.confidence_score >= 0.9 ? (
            <Alert
              message="High Confidence Classification"
              description="The model is very confident about this classification result."
              type="success"
              showIcon
            />
          ) : classificationResult.confidence_score >= 0.7 ? (
            <Alert
              message="Medium Confidence Classification"
              description="The model has moderate confidence in this classification result. Consider reviewing manually."
              type="warning"
              showIcon
            />
          ) : (
            <Alert
              message="Low Confidence Classification"
              description="The model has low confidence in this classification result. Manual review is recommended."
              type="error"
              showIcon
            />
          )}
        </div>
      </Card>

      {/* All Predictions */}
      {classificationResult.all_predictions && classificationResult.all_predictions.length > 0 && (
        <Card title="All Predictions" style={{ marginBottom: 16 }}>
          <Table
            columns={predictionColumns}
            dataSource={classificationResult.all_predictions}
            rowKey="category"
            pagination={false}
            size="small"
          />
        </Card>
      )}

      {/* Features Used */}
      {classificationResult.features_used && classificationResult.features_used.length > 0 && (
        <Card title="Features Used in Classification" style={{ marginBottom: 16 }}>
          <Space wrap>
            {classificationResult.features_used.map((feature, index) => (
              <Tag key={index} color="blue">
                {feature}
              </Tag>
            ))}
          </Space>
        </Card>
      )}

      {/* Confidence Distribution Chart */}
      <Card title="Confidence Distribution">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <div style={{ marginBottom: 16 }}>
              <Text strong>High Confidence Predictions (90%+)</Text>
              <Progress
                percent={
                  classificationResult.all_predictions
                    ? (classificationResult.all_predictions.filter(p => p.confidence >= 0.9).length / classificationResult.all_predictions.length) * 100
                    : 0
                }
                strokeColor="#52c41a"
                size="small"
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>Medium Confidence Predictions (70-90%)</Text>
              <Progress
                percent={
                  classificationResult.all_predictions
                    ? (classificationResult.all_predictions.filter(p => p.confidence >= 0.7 && p.confidence < 0.9).length / classificationResult.all_predictions.length) * 100
                    : 0
                }
                strokeColor="#faad14"
                size="small"
              />
            </div>
            <div>
              <Text strong>Low Confidence Predictions (&lt;70%)</Text>
              <Progress
                percent={
                  classificationResult.all_predictions
                    ? (classificationResult.all_predictions.filter(p => p.confidence < 0.7).length / classificationResult.all_predictions.length) * 100
                    : 0
                }
                strokeColor="#ff4d4f"
                size="small"
              />
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div style={{ padding: '20px', backgroundColor: '#fafafa', borderRadius: '6px' }}>
              <Title level={4}>Classification Insights</Title>
              <List size="small">
                <List.Item>
                  <Text>
                    <strong>Top Category:</strong> {classificationResult.predicted_category}
                  </Text>
                </List.Item>
                <List.Item>
                  <Text>
                    <strong>Confidence Level:</strong> {
                      classificationResult.confidence_score >= 0.9 ? 'High' :
                      classificationResult.confidence_score >= 0.7 ? 'Medium' : 'Low'
                    }
                  </Text>
                </List.Item>
                <List.Item>
                  <Text>
                    <strong>Alternative Categories:</strong> {
                      classificationResult.all_predictions
                        ? classificationResult.all_predictions.slice(1, 3).map(p => p.category).join(', ')
                        : 'None'
                    }
                  </Text>
                </List.Item>
                <List.Item>
                  <Text>
                    <strong>Processing Date:</strong> {new Date(classificationResult.created_at).toLocaleString()}
                  </Text>
                </List.Item>
              </List>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default ClassificationResultsViewer;