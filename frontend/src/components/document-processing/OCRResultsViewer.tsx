import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Progress,
  Tag,
  Space,
  Divider,
  Row,
  Col,
  Button,
  Tooltip,
  Alert,
  Spin,
  Table,
  Input,
  Select
} from 'antd';
import {
  EyeOutlined,
  CopyOutlined,
  DownloadOutlined,
  SearchOutlined,
  FilterOutlined,
  ScanOutlined
} from '@ant-design/icons';
import { documentProcessingService, OCRResult } from '../../services/documentProcessingService';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface OCRResultsViewerProps {
  jobId: number;
}

const OCRResultsViewer: React.FC<OCRResultsViewerProps> = ({ jobId }) => {
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState<number>(0);

  useEffect(() => {
    loadOCRResult();
  }, [jobId]);

  const loadOCRResult = async () => {
    try {
      setLoading(true);
      const result = await documentProcessingService.getOCRResult(jobId);
      setOcrResult(result);
    } catch (error) {
      console.error('Failed to load OCR result:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = () => {
    if (ocrResult?.extracted_text) {
      navigator.clipboard.writeText(ocrResult.extracted_text);
    }
  };

  const handleDownloadText = () => {
    if (ocrResult?.extracted_text) {
      const blob = new Blob([ocrResult.extracted_text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ocr_result_${jobId}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'success';
    if (confidence >= 0.7) return 'warning';
    return 'error';
  };

  const filteredTextRegions = ocrResult?.text_regions?.filter(region => {
    const matchesSearch = !searchText || region.text.toLowerCase().includes(searchText.toLowerCase());
    const matchesConfidence = region.confidence >= confidenceFilter / 100;
    return matchesSearch && matchesConfidence;
  }) || [];

  const textRegionColumns = [
    {
      title: 'Text',
      dataIndex: 'text',
      key: 'text',
      ellipsis: true,
      render: (text: string) => (
        <Text copyable={{ text }}>{text}</Text>
      ),
    },
    {
      title: 'Confidence',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 120,
      render: (confidence: number) => (
        <Tag color={getConfidenceColor(confidence)}>
          {(confidence * 100).toFixed(1)}%
        </Tag>
      ),
      sorter: (a: any, b: any) => a.confidence - b.confidence,
    },
    {
      title: 'Position',
      dataIndex: 'bbox',
      key: 'bbox',
      width: 150,
      render: (bbox: [number, number, number, number]) => (
        <Text code>
          {bbox.map(coord => Math.round(coord)).join(', ')}
        </Text>
      ),
    },
  ];

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text>Loading OCR results...</Text>
          </div>
        </div>
      </Card>
    );
  }

  if (!ocrResult) {
    return (
      <Alert
        message="No OCR Results"
        description="OCR processing has not been completed for this job yet."
        type="info"
        showIcon
      />
    );
  }

  return (
    <div>
      {/* Summary Card */}
      <Card title={<><ScanOutlined /> OCR Results Summary</>} style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
                  {(ocrResult.confidence_score * 100).toFixed(1)}%
                </Title>
                <Text type="secondary">Overall Confidence</Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <Title level={3} style={{ margin: 0, color: '#52c41a' }}>
                  {ocrResult.language.toUpperCase()}
                </Title>
                <Text type="secondary">Detected Language</Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <Title level={3} style={{ margin: 0, color: '#722ed1' }}>
                  {ocrResult.text_regions?.length || 0}
                </Title>
                <Text type="secondary">Text Regions</Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <Title level={3} style={{ margin: 0, color: '#fa8c16' }}>
                  {ocrResult.extracted_text?.length || 0}
                </Title>
                <Text type="secondary">Characters</Text>
              </div>
            </Card>
          </Col>
        </Row>

        {ocrResult.preprocessing_applied && ocrResult.preprocessing_applied.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Text strong>Preprocessing Applied: </Text>
            <Space wrap>
              {ocrResult.preprocessing_applied.map((step, index) => (
                <Tag key={index} color="blue">{step}</Tag>
              ))}
            </Space>
          </div>
        )}
      </Card>

      {/* Extracted Text */}
      <Card 
        title="Extracted Text" 
        extra={
          <Space>
            <Tooltip title="Copy Text">
              <Button icon={<CopyOutlined />} onClick={handleCopyText} />
            </Tooltip>
            <Tooltip title="Download Text">
              <Button icon={<DownloadOutlined />} onClick={handleDownloadText} />
            </Tooltip>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <TextArea
          value={ocrResult.extracted_text}
          rows={10}
          readOnly
          style={{ fontFamily: 'monospace' }}
        />
      </Card>

      {/* Text Regions */}
      {ocrResult.text_regions && ocrResult.text_regions.length > 0 && (
        <Card title="Text Regions Analysis">
          <div style={{ marginBottom: 16 }}>
            <Row gutter={[16, 8]}>
              <Col xs={24} sm={12} md={8}>
                <Input
                  placeholder="Search text regions..."
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Select
                  placeholder="Minimum confidence"
                  style={{ width: '100%' }}
                  value={confidenceFilter}
                  onChange={setConfidenceFilter}
                >
                  <Option value={0}>All confidence levels</Option>
                  <Option value={50}>50% and above</Option>
                  <Option value={70}>70% and above</Option>
                  <Option value={90}>90% and above</Option>
                </Select>
              </Col>
              <Col xs={24} sm={24} md={8}>
                <Text type="secondary">
                  Showing {filteredTextRegions.length} of {ocrResult.text_regions.length} regions
                </Text>
              </Col>
            </Row>
          </div>

          <Table
            columns={textRegionColumns}
            dataSource={filteredTextRegions}
            rowKey={(record, index) => index || 0}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
            }}
            size="small"
          />
        </Card>
      )}

      {/* Confidence Distribution */}
      <Card title="Confidence Distribution" style={{ marginTop: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <div>
              <Text strong>High Confidence (90%+): </Text>
              <Progress
                percent={
                  ocrResult.text_regions
                    ? (ocrResult.text_regions.filter(r => r.confidence >= 0.9).length / ocrResult.text_regions.length) * 100
                    : 0
                }
                strokeColor="#52c41a"
                size="small"
              />
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div>
              <Text strong>Medium Confidence (70-90%): </Text>
              <Progress
                percent={
                  ocrResult.text_regions
                    ? (ocrResult.text_regions.filter(r => r.confidence >= 0.7 && r.confidence < 0.9).length / ocrResult.text_regions.length) * 100
                    : 0
                }
                strokeColor="#faad14"
                size="small"
              />
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div>
              <Text strong>Low Confidence (&lt;70%): </Text>
              <Progress
                percent={
                  ocrResult.text_regions
                    ? (ocrResult.text_regions.filter(r => r.confidence < 0.7).length / ocrResult.text_regions.length) * 100
                    : 0
                }
                strokeColor="#ff4d4f"
                size="small"
              />
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default OCRResultsViewer;