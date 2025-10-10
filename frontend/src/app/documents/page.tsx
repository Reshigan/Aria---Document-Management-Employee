'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, Table, Button, Space, Tag, Input, Select, DatePicker, 
  message, Tooltip, Progress, Dropdown, Menu, Modal, Upload
} from 'antd';
import { 
  FileTextOutlined, SearchOutlined, FilterOutlined, UploadOutlined,
  EyeOutlined, DownloadOutlined, DeleteOutlined, ReloadOutlined,
  SendOutlined, MoreOutlined, PlusOutlined
} from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import { documentsAPI } from '@/lib/api';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface Document {
  id: number;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  document_type: string;
  status: string;
  confidence_score?: number;
  invoice_number?: string;
  vendor_name?: string;
  total_amount?: number;
  currency?: string;
  uploaded_by: number;
  created_at: string;
  updated_at: string;
  posted_to_sap: boolean;
}

interface DocumentListResponse {
  items: Document[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export default function DocumentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchDocuments();
  }, [user, currentPage, pageSize, searchText, statusFilter, typeFilter, dateRange]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        page_size: pageSize,
      };

      if (searchText) params.search = searchText;
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.document_type = typeFilter;
      if (dateRange && dateRange.length === 2) {
        params.date_from = dateRange[0].format('YYYY-MM-DD');
        params.date_to = dateRange[1].format('YYYY-MM-DD');
      }

      const data = await documentsAPI.list(params);
      
      setDocuments(data.items || []);
      setTotal(data.total || 0);
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    try {
      message.loading('Uploading document...', 0);
      await documentsAPI.upload(file);
      
      message.destroy();
      message.success('Document uploaded successfully!');
      setUploadModalVisible(false);
      fetchDocuments();
    } catch (error: any) {
      message.destroy();
      message.error(error.response?.data?.detail || 'Upload failed');
    }
    return false;
  };

  const handleDelete = async (documentId: number) => {
    try {
      await documentsAPI.delete(documentId);
      message.success('Document deleted successfully');
      fetchDocuments();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to delete document');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRowKeys.length === 0) return;
    
    Modal.confirm({
      title: 'Delete Documents',
      content: `Are you sure you want to delete ${selectedRowKeys.length} document(s)?`,
      onOk: async () => {
        try {
          await Promise.all(
            selectedRowKeys.map(id => documentsAPI.delete(id))
          );
          message.success('Documents deleted successfully');
          setSelectedRowKeys([]);
          fetchDocuments();
        } catch (error: any) {
          message.error('Failed to delete some documents');
        }
      }
    });
  };

  const getStatusTag = (status: string) => {
    const statusConfig: any = {
      'uploaded': { color: 'default', text: 'Uploaded' },
      'processing': { color: 'processing', text: 'Processing' },
      'processed': { color: 'success', text: 'Processed' },
      'validated': { color: 'success', text: 'Validated' },
      'approved': { color: 'success', text: 'Approved' },
      'rejected': { color: 'error', text: 'Rejected' },
      'posted_to_sap': { color: 'purple', text: 'Posted to SAP' },
      'error': { color: 'error', text: 'Error' }
    };

    const config = statusConfig[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getTypeTag = (type: string) => {
    const typeConfig: any = {
      'invoice': { color: 'blue', text: 'Invoice' },
      'receipt': { color: 'green', text: 'Receipt' },
      'contract': { color: 'orange', text: 'Contract' },
      'purchase_order': { color: 'purple', text: 'Purchase Order' },
      'delivery_note': { color: 'cyan', text: 'Delivery Note' },
      'credit_note': { color: 'magenta', text: 'Credit Note' },
      'statement': { color: 'gold', text: 'Statement' },
      'other': { color: 'default', text: 'Other' }
    };

    const config = typeConfig[type] || { color: 'default', text: type };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getActionMenu = (record: Document) => (
    <Menu>
      <Menu.Item 
        key="view" 
        icon={<EyeOutlined />}
        onClick={() => router.push(`/documents/${record.id}`)}
      >
        View Details
      </Menu.Item>
      <Menu.Item key="download" icon={<DownloadOutlined />}>
        Download
      </Menu.Item>
      <Menu.Item key="reprocess" icon={<ReloadOutlined />}>
        Reprocess
      </Menu.Item>
      {record.status === 'approved' && !record.posted_to_sap && (
        <Menu.Item key="post-sap" icon={<SendOutlined />}>
          Post to SAP
        </Menu.Item>
      )}
      <Menu.Divider />
      <Menu.Item 
        key="delete" 
        icon={<DeleteOutlined />} 
        danger
        onClick={() => {
          Modal.confirm({
            title: 'Delete Document',
            content: 'Are you sure you want to delete this document?',
            onOk: () => handleDelete(record.id)
          });
        }}
      >
        Delete
      </Menu.Item>
    </Menu>
  );

  const columns = [
    {
      title: 'Filename',
      dataIndex: 'filename',
      key: 'filename',
      ellipsis: true,
      render: (text: string, record: Document) => (
        <Button 
          type="link" 
          onClick={() => router.push(`/documents/${record.id}`)}
          style={{ padding: 0, height: 'auto' }}
        >
          <FileTextOutlined /> {text}
        </Button>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'document_type',
      key: 'document_type',
      width: 120,
      render: (type: string) => getTypeTag(type),
      filters: [
        { text: 'Invoice', value: 'invoice' },
        { text: 'Receipt', value: 'receipt' },
        { text: 'Contract', value: 'contract' },
        { text: 'Purchase Order', value: 'purchase_order' },
        { text: 'Other', value: 'other' },
      ],
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => getStatusTag(status),
      filters: [
        { text: 'Uploaded', value: 'uploaded' },
        { text: 'Processing', value: 'processing' },
        { text: 'Processed', value: 'processed' },
        { text: 'Approved', value: 'approved' },
        { text: 'Posted to SAP', value: 'posted_to_sap' },
        { text: 'Error', value: 'error' },
      ],
    },
    {
      title: 'Confidence',
      dataIndex: 'confidence_score',
      key: 'confidence_score',
      width: 120,
      render: (score: number) => {
        if (!score) return '-';
        return (
          <Tooltip title={`${score}% confidence`}>
            <Progress 
              percent={score} 
              size="small" 
              status={score >= 80 ? 'success' : score >= 50 ? 'normal' : 'exception'}
              showInfo={false}
            />
          </Tooltip>
        );
      },
    },
    {
      title: 'Vendor',
      dataIndex: 'vendor_name',
      key: 'vendor_name',
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: 'Amount',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 120,
      render: (amount: number, record: Document) => {
        if (!amount) return '-';
        return `${record.currency || ''} ${amount.toLocaleString()}`;
      },
    },
    {
      title: 'Size',
      dataIndex: 'file_size',
      key: 'file_size',
      width: 100,
      render: (size: number) => formatFileSize(size),
    },
    {
      title: 'Uploaded',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => new Date(date).toLocaleDateString(),
      sorter: true,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_: any, record: Document) => (
        <Dropdown overlay={getActionMenu(record)} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: any[]) => setSelectedRowKeys(keys),
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <Space>
            <FileTextOutlined />
            <span>Documents</span>
          </Space>
        }
        extra={
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setUploadModalVisible(true)}
            >
              Upload Document
            </Button>
          </Space>
        }
      >
        {/* Filters */}
        <div style={{ marginBottom: '16px' }}>
          <Space wrap>
            <Input
              placeholder="Search documents..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <Select
              placeholder="Filter by status"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 150 }}
              allowClear
            >
              <Option value="uploaded">Uploaded</Option>
              <Option value="processing">Processing</Option>
              <Option value="processed">Processed</Option>
              <Option value="approved">Approved</Option>
              <Option value="posted_to_sap">Posted to SAP</Option>
              <Option value="error">Error</Option>
            </Select>
            <Select
              placeholder="Filter by type"
              value={typeFilter}
              onChange={setTypeFilter}
              style={{ width: 150 }}
              allowClear
            >
              <Option value="invoice">Invoice</Option>
              <Option value="receipt">Receipt</Option>
              <Option value="contract">Contract</Option>
              <Option value="purchase_order">Purchase Order</Option>
              <Option value="other">Other</Option>
            </Select>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder={['Start Date', 'End Date']}
            />
            <Button icon={<FilterOutlined />} onClick={fetchDocuments}>
              Apply Filters
            </Button>
          </Space>
        </div>

        {/* Bulk Actions */}
        {selectedRowKeys.length > 0 && (
          <div style={{ marginBottom: '16px', padding: '8px', backgroundColor: '#f0f5ff', borderRadius: '4px' }}>
            <Space>
              <span>{selectedRowKeys.length} document(s) selected</span>
              <Button size="small" onClick={handleBulkDelete} danger>
                Delete Selected
              </Button>
              <Button size="small" onClick={() => setSelectedRowKeys([])}>
                Clear Selection
              </Button>
            </Space>
          </div>
        )}

        {/* Documents Table */}
        <Table
          columns={columns}
          dataSource={documents}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} documents`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size || 20);
            },
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Upload Modal */}
      <Modal
        title="Upload Document"
        open={uploadModalVisible}
        onCancel={() => setUploadModalVisible(false)}
        footer={null}
        width={600}
      >
        <Upload.Dragger
          name="file"
          multiple={false}
          beforeUpload={handleUpload}
          showUploadList={false}
          accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
          </p>
          <p className="ant-upload-text">Click or drag file to upload</p>
          <p className="ant-upload-hint">
            Support for PDF, Images, Excel, and Word documents
          </p>
        </Upload.Dragger>
      </Modal>
    </div>
  );
}