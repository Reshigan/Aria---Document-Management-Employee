'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Card, Descriptions, Tag, Button, Space, Spin, message, Progress,
  Tabs, Typography, Divider, Alert
} from 'antd';
import { 
  FileTextOutlined, DownloadOutlined, ReloadOutlined,
  CheckCircleOutlined, ClockCircleOutlined, WarningOutlined,
  SendOutlined, ArrowLeftOutlined, CommentOutlined, ShareAltOutlined
} from '@ant-design/icons';
import { documentsAPI } from '@/lib/api';
import api from '@/lib/api';
import CommentsPanel from '@/components/CommentsPanel';
import ShareDialog from '@/components/ShareDialog';

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;

interface DocumentDetail {
  id: number;
  filename: string;
  original_filename?: string;
  file_size: number;
  mime_type: string;
  status: string;
  document_type?: string;
  created_at: string;
  updated_at?: string;
  uploaded_at?: string;
  processed_at?: string;
  confidence_score?: number;
  invoice_number?: string;
  invoice_date?: string;
  vendor_name?: string;
  total_amount?: number;
  currency?: string;
  purchase_order_number?: string;
  extracted_data?: any;
  ocr_text?: string;
  error_message?: string;
  uploaded_by?: number;
  file_path?: string;
}

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;
  
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [shareDialogVisible, setShareDialogVisible] = useState(false);

  useEffect(() => {
    fetchDocument();
  }, [documentId]);

  const fetchDocument = async () => {
    try {
      const data = await documentsAPI.get(parseInt(documentId));
      setDocument(data);
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to fetch document');
    } finally {
      setLoading(false);
    }
  };

  const triggerProcessing = async () => {
    setProcessing(true);
    try {
      await documentsAPI.reprocess(parseInt(documentId));
      message.success('Document processing started');
      setTimeout(fetchDocument, 2000);
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to start processing');
    } finally {
      setProcessing(false);
    }
  };

  const postToSAP = async () => {
    try {
      const data = await api.post<any>(`/api/v1/sap/post-document`, {
        document_id: parseInt(documentId)
      });
      message.success(`Posted to SAP: ${data.sap_document_number || 'Success'}`);
      fetchDocument();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to post to SAP');
    }
  };

  const getStatusTag = (status: string) => {
    const statusConfig: any = {
      'pending': { color: 'default', icon: <ClockCircleOutlined /> },
      'processing': { color: 'processing', icon: <ClockCircleOutlined /> },
      'completed': { color: 'success', icon: <CheckCircleOutlined /> },
      'failed': { color: 'error', icon: <WarningOutlined /> },
      'pending_validation': { color: 'warning', icon: <WarningOutlined /> }
    };

    const config = statusConfig[status] || statusConfig['pending'];
    return <Tag color={config.color} icon={config.icon}>{status.toUpperCase()}</Tag>;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Loading document..." />
      </div>
    );
  }

  if (!document) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert message="Document not found" type="error" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <Button 
        icon={<ArrowLeftOutlined />} 
        onClick={() => router.push('/dashboard')}
        style={{ marginBottom: '16px' }}
      >
        Back to Dashboard
      </Button>

      <Card
        title={
          <Space>
            <FileTextOutlined style={{ fontSize: '24px' }} />
            <span>{document.filename}</span>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<DownloadOutlined />}>Download</Button>
            <Button 
              icon={<ShareAltOutlined />}
              onClick={() => setShareDialogVisible(true)}
            >
              Share
            </Button>
            {document.status !== 'completed' && (
              <Button 
                type="primary" 
                icon={<ReloadOutlined />}
                loading={processing}
                onClick={triggerProcessing}
              >
                {document.status === 'pending' ? 'Process' : 'Reprocess'}
              </Button>
            )}
            {document.status === 'completed' && document.confidence_score && document.confidence_score > 80 && (
              <Button 
                type="primary" 
                icon={<SendOutlined />}
                onClick={postToSAP}
              >
                Post to SAP
              </Button>
            )}
          </Space>
        }
      >
        <Tabs defaultActiveKey="1">
          <TabPane tab="Overview" key="1">
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Status">
                {getStatusTag(document.status)}
              </Descriptions.Item>
              <Descriptions.Item label="Document Type">
                {document.document_type || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="File Size">
                {(document.file_size / 1024).toFixed(2)} KB
              </Descriptions.Item>
              <Descriptions.Item label="MIME Type">
                {document.mime_type}
              </Descriptions.Item>
              <Descriptions.Item label="Uploaded">
                {new Date(document.created_at).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Processed">
                {document.status === 'processed' && document.updated_at ? new Date(document.updated_at).toLocaleString() : 'Not yet processed'}
              </Descriptions.Item>
            </Descriptions>

            {document.confidence_score !== undefined && (
              <div style={{ marginTop: '24px' }}>
                <Title level={5}>Extraction Confidence</Title>
                <Progress 
                  percent={document.confidence_score} 
                  status={document.confidence_score >= 80 ? 'success' : document.confidence_score >= 50 ? 'normal' : 'exception'}
                />
                <Text type="secondary">
                  {document.confidence_score >= 80 && 'High confidence - ready for posting'}
                  {document.confidence_score >= 50 && document.confidence_score < 80 && 'Medium confidence - may need validation'}
                  {document.confidence_score < 50 && 'Low confidence - manual review recommended'}
                </Text>
              </div>
            )}

            {document.error_message && (
              <Alert 
                message="Processing Error" 
                description={document.error_message}
                type="error" 
                showIcon 
                style={{ marginTop: '16px' }}
              />
            )}
          </TabPane>

          <TabPane tab="Extracted Data" key="2">
            {document.status === 'pending' || document.status === 'processing' ? (
              <Alert 
                message="Document not processed yet" 
                description="Please wait for processing to complete or trigger processing manually."
                type="info"
                showIcon
              />
            ) : (
              <>
                <Descriptions bordered column={2}>
                  <Descriptions.Item label="Invoice Number">
                    {document.invoice_number || 'N/A'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Invoice Date">
                    {document.invoice_date || 'N/A'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Vendor Name">
                    {document.vendor_name || 'N/A'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Total Amount">
                    {document.total_amount ? `${document.currency || ''} ${document.total_amount}` : 'N/A'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Purchase Order">
                    {document.purchase_order_number || 'N/A'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Currency">
                    {document.currency || 'N/A'}
                  </Descriptions.Item>
                </Descriptions>

                {document.ocr_text && (
                  <div style={{ marginTop: '24px' }}>
                    <Title level={5}>OCR Extracted Text</Title>
                    <pre style={{ 
                      backgroundColor: '#f5f5f5', 
                      padding: '16px', 
                      borderRadius: '4px',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordWrap: 'break-word'
                    }}>
                      {document.ocr_text}
                    </pre>
                  </div>
                )}

                {document.extracted_data && (
                  <div style={{ marginTop: '24px' }}>
                    <Title level={5}>Full Extracted Data</Title>
                    <pre style={{ 
                      backgroundColor: '#f5f5f5', 
                      padding: '16px', 
                      borderRadius: '4px',
                      overflow: 'auto'
                    }}>
                      {JSON.stringify(document.extracted_data, null, 2)}
                    </pre>
                  </div>
                )}
              </>
            )}
          </TabPane>

          <TabPane tab="SAP Integration" key="3">
            <Card>
              <Title level={5}>SAP Posting</Title>
              <Paragraph>
                This document can be posted to SAP automatically once processing is complete and confidence score is high.
              </Paragraph>

              {document.status !== 'completed' ? (
                <Alert 
                  message="Document not ready for SAP posting" 
                  description="Please wait for processing to complete first."
                  type="warning"
                  showIcon
                />
              ) : document.confidence_score && document.confidence_score < 80 ? (
                <Alert 
                  message="Low confidence score" 
                  description="Manual validation recommended before posting to SAP."
                  type="warning"
                  showIcon
                />
              ) : (
                <>
                  <Descriptions bordered>
                    <Descriptions.Item label="Company Code">1000</Descriptions.Item>
                    <Descriptions.Item label="Document Type">RE (Invoice)</Descriptions.Item>
                    <Descriptions.Item label="GL Account">0000100000</Descriptions.Item>
                  </Descriptions>
                  
                  <div style={{ marginTop: '16px' }}>
                    <Button 
                      type="primary" 
                      icon={<SendOutlined />}
                      onClick={postToSAP}
                      size="large"
                    >
                      Post to SAP
                    </Button>
                  </div>
                </>
              )}
            </Card>
          </TabPane>

          <TabPane tab="Actions" key="4">
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <Card title="Document Actions">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button 
                    block 
                    icon={<DownloadOutlined />}
                  >
                    Download Original File
                  </Button>
                  <Button 
                    block 
                    icon={<ReloadOutlined />}
                    loading={processing}
                    onClick={triggerProcessing}
                  >
                    Reprocess Document
                  </Button>
                  <Button 
                    block 
                    danger
                  >
                    Delete Document
                  </Button>
                </Space>
              </Card>

              <Card title="AI Actions">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button 
                    block 
                    onClick={() => router.push(`/chat?doc=${documentId}`)}
                  >
                    Ask Questions About This Document
                  </Button>
                  <Button block>
                    Generate Summary
                  </Button>
                  <Button block>
                    Extract Custom Fields
                  </Button>
                </Space>
              </Card>
            </Space>
          </TabPane>

          <TabPane tab={<span><CommentOutlined />Comments</span>} key="5">
            <CommentsPanel documentId={parseInt(documentId)} />
          </TabPane>
        </Tabs>
      </Card>

      {/* Share Dialog */}
      <ShareDialog
        visible={shareDialogVisible}
        onClose={() => setShareDialogVisible(false)}
        document={document}
      />
    </div>
  );
}
