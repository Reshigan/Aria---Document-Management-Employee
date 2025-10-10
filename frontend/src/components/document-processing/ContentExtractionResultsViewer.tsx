import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
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
  Collapse,
  Input,
  Select,
  Divider
} from 'antd';
import {
  FileTextOutlined,
  TagsOutlined,
  BulbOutlined,
  SearchOutlined,
  CopyOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  KeyOutlined
} from '@ant-design/icons';
import { documentProcessingService, ContentExtractionResult } from '../../services/documentProcessingService';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Panel } = Collapse;

interface ContentExtractionResultsViewerProps {
  jobId: number;
}

const ContentExtractionResultsViewer: React.FC<ContentExtractionResultsViewerProps> = ({ jobId }) => {
  const [extractionResult, setExtractionResult] = useState<ContentExtractionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState<string>('');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadExtractionResult();
  }, [jobId]);

  const loadExtractionResult = async () => {
    try {
      setLoading(true);
      const result = await documentProcessingService.getContentExtractionResult(jobId);
      setExtractionResult(result);
    } catch (error) {
      console.error('Failed to load content extraction result:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleDownloadContent = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getEntityColor = (label: string) => {
    const colors: { [key: string]: string } = {
      'PERSON': 'blue',
      'ORGANIZATION': 'green',
      'LOCATION': 'orange',
      'DATE': 'purple',
      'MONEY': 'gold',
      'EMAIL': 'cyan',
      'PHONE': 'magenta',
      'URL': 'lime',
      'MISC': 'default'
    };
    return colors[label.toUpperCase()] || 'default';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return '#52c41a';
    if (confidence >= 0.7) return '#faad14';
    return '#ff4d4f';
  };

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text>Loading content extraction results...</Text>
          </div>
        </div>
      </Card>
    );
  }

  if (!extractionResult) {
    return (
      <Alert
        message="No Content Extraction Results"
        description="Content extraction has not been completed for this job yet."
        type="info"
        showIcon
      />
    );
  }

  const filteredEntities = extractionResult.entities?.filter(entity => {
    const matchesSearch = !searchText || entity.text.toLowerCase().includes(searchText.toLowerCase());
    const matchesFilter = !entityFilter || entity.label === entityFilter;
    return matchesSearch && matchesFilter;
  }) || [];

  const entityColumns = [
    {
      title: 'Text',
      dataIndex: 'text',
      key: 'text',
      render: (text: string) => (
        <Text copyable={{ text }} strong>{text}</Text>
      ),
    },
    {
      title: 'Label',
      dataIndex: 'label',
      key: 'label',
      width: 120,
      render: (label: string) => (
        <Tag color={getEntityColor(label)}>{label}</Tag>
      ),
    },
    {
      title: 'Position',
      key: 'position',
      width: 100,
      render: (record: any) => (
        <Text code>{record.start}-{record.end}</Text>
      ),
    },
    {
      title: 'Confidence',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 120,
      render: (confidence: number) => (
        <div>
          <div style={{ 
            width: '60px', 
            height: '6px', 
            backgroundColor: '#f0f0f0', 
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${confidence * 100}%`,
              height: '100%',
              backgroundColor: getConfidenceColor(confidence),
              transition: 'width 0.3s'
            }} />
          </div>
          <Text style={{ fontSize: '12px' }}>{(confidence * 100).toFixed(0)}%</Text>
        </div>
      ),
      sorter: (a: any, b: any) => b.confidence - a.confidence,
    },
  ];

  const uniqueEntityLabels = [...new Set(extractionResult.entities?.map(e => e.label) || [])];

  return (
    <div>
      {/* Summary Card */}
      <Card title={<><FileTextOutlined /> Content Extraction Summary</>} style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Entities Found"
                value={extractionResult.entities?.length || 0}
                prefix={<TagsOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Key Phrases"
                value={extractionResult.key_phrases?.length || 0}
                prefix={<KeyOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Summary Length"
                value={extractionResult.summary?.length || 0}
                suffix="chars"
                prefix={<BulbOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Metadata Fields"
                value={Object.keys(extractionResult.metadata || {}).length}
                prefix={<InfoCircleOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Summary */}
      {extractionResult.summary && (
        <Card 
          title="Document Summary" 
          extra={
            <Space>
              <Tooltip title="Copy Summary">
                <Button 
                  icon={<CopyOutlined />} 
                  onClick={() => handleCopyContent(extractionResult.summary)}
                />
              </Tooltip>
              <Tooltip title="Download Summary">
                <Button 
                  icon={<DownloadOutlined />} 
                  onClick={() => handleDownloadContent(extractionResult.summary, `summary_${jobId}.txt`)}
                />
              </Tooltip>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Paragraph>{extractionResult.summary}</Paragraph>
        </Card>
      )}

      {/* Entities */}
      {extractionResult.entities && extractionResult.entities.length > 0 && (
        <Card title="Named Entities" style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <Row gutter={[16, 8]}>
              <Col xs={24} sm={12} md={8}>
                <Input
                  placeholder="Search entities..."
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Select
                  placeholder="Filter by entity type"
                  style={{ width: '100%' }}
                  value={entityFilter}
                  onChange={setEntityFilter}
                  allowClear
                >
                  {uniqueEntityLabels.map(label => (
                    <Option key={label} value={label}>
                      <Tag color={getEntityColor(label)}>{label}</Tag>
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col xs={24} sm={24} md={8}>
                <Text type="secondary">
                  Showing {filteredEntities.length} of {extractionResult.entities.length} entities
                </Text>
              </Col>
            </Row>
          </div>

          <Table
            columns={entityColumns}
            dataSource={filteredEntities}
            rowKey={(record, index) => `${record.text}-${index}`}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
            }}
            size="small"
          />
        </Card>
      )}

      {/* Key Phrases */}
      {extractionResult.key_phrases && extractionResult.key_phrases.length > 0 && (
        <Card title="Key Phrases" style={{ marginBottom: 16 }}>
          <Space wrap>
            {extractionResult.key_phrases.map((phrase, index) => (
              <Tag key={index} color="blue" style={{ marginBottom: 8 }}>
                {phrase}
              </Tag>
            ))}
          </Space>
        </Card>
      )}

      {/* Extracted Content */}
      {extractionResult.extracted_content && Object.keys(extractionResult.extracted_content).length > 0 && (
        <Card title="Extracted Content" style={{ marginBottom: 16 }}>
          <Collapse>
            {Object.entries(extractionResult.extracted_content).map(([key, value]) => (
              <Panel header={key.replace(/_/g, ' ').toUpperCase()} key={key}>
                <pre style={{ 
                  whiteSpace: 'pre-wrap', 
                  backgroundColor: '#f5f5f5', 
                  padding: '12px',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}>
                  {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                </pre>
              </Panel>
            ))}
          </Collapse>
        </Card>
      )}

      {/* Metadata */}
      {extractionResult.metadata && Object.keys(extractionResult.metadata).length > 0 && (
        <Card title="Metadata">
          <Row gutter={[16, 16]}>
            {Object.entries(extractionResult.metadata).map(([key, value]) => (
              <Col xs={24} sm={12} md={8} key={key}>
                <Card size="small">
                  <Statistic
                    title={key.replace(/_/g, ' ').toUpperCase()}
                    value={String(value)}
                    valueStyle={{ fontSize: '14px' }}
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Entity Distribution */}
      <Card title="Entity Distribution" style={{ marginTop: 16 }}>
        <Row gutter={[16, 16]}>
          {uniqueEntityLabels.map(label => {
            const count = extractionResult.entities?.filter(e => e.label === label).length || 0;
            const percentage = extractionResult.entities ? (count / extractionResult.entities.length) * 100 : 0;
            
            return (
              <Col xs={24} sm={12} md={8} key={label}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Tag color={getEntityColor(label)}>{label}</Tag>
                    <Text>{count} ({percentage.toFixed(1)}%)</Text>
                  </div>
                  <div style={{ 
                    width: '100%', 
                    height: '8px', 
                    backgroundColor: '#f0f0f0', 
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${percentage}%`,
                      height: '100%',
                      backgroundColor: getEntityColor(label) === 'default' ? '#1890ff' : undefined,
                      transition: 'width 0.3s'
                    }} />
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>
      </Card>
    </div>
  );
};

export default ContentExtractionResultsViewer;