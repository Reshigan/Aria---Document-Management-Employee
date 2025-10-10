'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Tag,
  Input,
  Select,
  DatePicker,
  message,
  Spin,
  Tooltip,
  Modal,
  Descriptions,
  Alert
} from 'antd';
import {
  FileTextOutlined,
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  FilterOutlined,
  DownloadOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { securityService, AuditLog } from '@/services/securityService';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const AuditLogs: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
    start_date: '',
    end_date: ''
  });
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [exporting, setExporting] = useState(false);

  const actionTypes = [
    'CREATE',
    'READ',
    'UPDATE',
    'DELETE',
    'LOGIN',
    'LOGOUT',
    'UPLOAD',
    'DOWNLOAD',
    'SHARE',
    'UNSHARE'
  ];

  const resourceTypes = [
    'document',
    'folder',
    'user',
    'role',
    'permission',
    'api_key',
    'session',
    'workflow',
    'notification'
  ];

  useEffect(() => {
    loadAuditLogs();
  }, [currentPage, pageSize, filters]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: pageSize,
        action: filters.action || undefined,
        resource: filters.resource || undefined,
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined
      };
      
      const data = await securityService.getAuditLogs(params);
      setAuditLogs(data.items);
      setTotal(data.total);
    } catch (error) {
      message.error('Failed to load audit logs');
      console.error('Audit logs error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setCurrentPage(1);
  };

  const handleDateRangeChange = (dates: any) => {
    if (dates && dates.length === 2) {
      setFilters(prev => ({
        ...prev,
        start_date: dates[0].toISOString(),
        end_date: dates[1].toISOString()
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        start_date: '',
        end_date: ''
      }));
    }
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      action: '',
      resource: '',
      start_date: '',
      end_date: ''
    });
    setCurrentPage(1);
  };

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setDetailVisible(true);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      // In a real app, this would call an export API endpoint
      message.success('Audit logs export started. You will receive a download link shortly.');
    } catch (error) {
      message.error('Failed to export audit logs');
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE': return 'green';
      case 'READ': return 'blue';
      case 'UPDATE': return 'orange';
      case 'DELETE': return 'red';
      case 'LOGIN': return 'cyan';
      case 'LOGOUT': return 'purple';
      case 'UPLOAD': return 'geekblue';
      case 'DOWNLOAD': return 'gold';
      case 'SHARE': return 'lime';
      case 'UNSHARE': return 'magenta';
      default: return 'default';
    }
  };

  const formatChanges = (oldValues?: Record<string, any>, newValues?: Record<string, any>) => {
    if (!oldValues && !newValues) return 'No changes recorded';
    
    const changes = [];
    
    if (oldValues && newValues) {
      // Show what changed
      Object.keys(newValues).forEach(key => {
        if (oldValues[key] !== newValues[key]) {
          changes.push(`${key}: ${oldValues[key]} → ${newValues[key]}`);
        }
      });
    } else if (newValues) {
      // New record created
      Object.keys(newValues).forEach(key => {
        changes.push(`${key}: ${newValues[key]}`);
      });
    }
    
    return changes.length > 0 ? changes.join(', ') : 'No changes recorded';
  };

  const columns: ColumnsType<AuditLog> = [
    {
      title: 'Timestamp',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (createdAt: string) => (
        <div>
          <div>{new Date(createdAt).toLocaleDateString()}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {new Date(createdAt).toLocaleTimeString()}
          </Text>
        </div>
      ),
      sorter: true,
    },
    {
      title: 'User',
      dataIndex: 'user',
      key: 'user',
      width: 120,
      render: (user: { id: number; username: string }) => (
        <div>
          <Text strong>{user.username}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            ID: {user.id}
          </Text>
        </div>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (action: string) => (
        <Tag color={getActionColor(action)}>{action}</Tag>
      ),
      filters: actionTypes.map(action => ({ text: action, value: action })),
      filterMultiple: false,
    },
    {
      title: 'Resource',
      dataIndex: 'resource',
      key: 'resource',
      width: 120,
      render: (resource: string, record: AuditLog) => (
        <div>
          <Text>{resource}</Text>
          {record.resource_id && (
            <>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                ID: {record.resource_id}
              </Text>
            </>
          )}
        </div>
      ),
      filters: resourceTypes.map(resource => ({ text: resource, value: resource })),
      filterMultiple: false,
    },
    {
      title: 'Changes',
      key: 'changes',
      render: (_, record: AuditLog) => (
        <Tooltip title={formatChanges(record.old_values, record.new_values)}>
          <Text ellipsis style={{ maxWidth: '200px', display: 'block' }}>
            {formatChanges(record.old_values, record.new_values)}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, record: AuditLog) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetails(record)}
          size="small"
        />
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2}>
            <FileTextOutlined style={{ marginRight: '8px' }} />
            Audit Logs
          </Title>
          <Text type="secondary">
            Track all user activities and system changes
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadAuditLogs} loading={loading}>
            Refresh
          </Button>
          <Button 
            icon={<DownloadOutlined />} 
            onClick={handleExport}
            loading={exporting}
          >
            Export
          </Button>
        </Space>
      </div>

      {/* Filters */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Space wrap>
          <Select
            placeholder="Filter by action"
            style={{ width: 150 }}
            value={filters.action || undefined}
            onChange={(value) => handleFilterChange('action', value)}
            allowClear
          >
            {actionTypes.map(action => (
              <Option key={action} value={action}>{action}</Option>
            ))}
          </Select>

          <Select
            placeholder="Filter by resource"
            style={{ width: 150 }}
            value={filters.resource || undefined}
            onChange={(value) => handleFilterChange('resource', value)}
            allowClear
          >
            {resourceTypes.map(resource => (
              <Option key={resource} value={resource}>{resource}</Option>
            ))}
          </Select>

          <RangePicker
            placeholder={['Start date', 'End date']}
            onChange={handleDateRangeChange}
            value={filters.start_date && filters.end_date ? [
              dayjs(filters.start_date),
              dayjs(filters.end_date)
            ] : null}
          />

          <Button onClick={clearFilters}>
            Clear Filters
          </Button>
        </Space>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>Loading audit logs...</div>
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={auditLogs}
            rowKey="id"
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} audit logs`,
              onChange: (page, size) => {
                setCurrentPage(page);
                setPageSize(size || 20);
              },
            }}
            locale={{
              emptyText: 'No audit logs found'
            }}
            scroll={{ x: 800 }}
          />
        )}
      </Card>

      {/* Detail Modal */}
      <Modal
        title="Audit Log Details"
        open={detailVisible}
        onCancel={() => {
          setDetailVisible(false);
          setSelectedLog(null);
        }}
        footer={null}
        width={800}
      >
        {selectedLog && (
          <div>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Timestamp" span={2}>
                {new Date(selectedLog.created_at).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="User">
                {selectedLog.user.username} (ID: {selectedLog.user.id})
              </Descriptions.Item>
              <Descriptions.Item label="Action">
                <Tag color={getActionColor(selectedLog.action)}>
                  {selectedLog.action}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Resource">
                {selectedLog.resource}
              </Descriptions.Item>
              <Descriptions.Item label="Resource ID">
                {selectedLog.resource_id || 'N/A'}
              </Descriptions.Item>
            </Descriptions>

            {selectedLog.old_values && (
              <div style={{ marginTop: '16px' }}>
                <Title level={5}>Previous Values</Title>
                <pre style={{ 
                  background: '#f5f5f5', 
                  padding: '12px', 
                  borderRadius: '6px',
                  fontSize: '12px',
                  overflow: 'auto'
                }}>
                  {JSON.stringify(selectedLog.old_values, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.new_values && (
              <div style={{ marginTop: '16px' }}>
                <Title level={5}>New Values</Title>
                <pre style={{ 
                  background: '#f5f5f5', 
                  padding: '12px', 
                  borderRadius: '6px',
                  fontSize: '12px',
                  overflow: 'auto'
                }}>
                  {JSON.stringify(selectedLog.new_values, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AuditLogs;