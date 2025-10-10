'use client';

import { useState, useMemo } from 'react';
import { 
  Badge, 
  Drawer, 
  List, 
  Avatar, 
  Button, 
  Empty, 
  Tag, 
  Checkbox, 
  Dropdown, 
  Space, 
  Spin,
  Alert,
  Tooltip,
  Typography,
  Divider
} from 'antd';
import { 
  BellOutlined, 
  CheckCircleOutlined, 
  WarningOutlined,
  InfoCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  ArchiveOutlined,
  MoreOutlined,
  ReloadOutlined,
  WifiOutlined,
  DisconnectOutlined,
  FilterOutlined,
  EyeOutlined,
  EyeInvisibleOutlined
} from '@ant-design/icons';
import { useNotifications } from '../hooks/useNotifications';
import { Notification } from '../types/notification';

const { Text } = Typography;

export default function NotificationPanel() {
  const [visible, setVisible] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [filterType, setFilterType] = useState<string | undefined>();
  const [filterPriority, setFilterPriority] = useState<string | undefined>();

  const filters = useMemo(() => ({
    is_archived: showArchived,
    type: filterType,
    priority: filterPriority,
    limit: 50
  }), [showArchived, filterType, filterPriority]);

  const { 
    notifications, 
    loading, 
    error, 
    unreadCount, 
    isConnected, 
    connectionError,
    actions 
  } = useNotifications(filters);

  const getIcon = (type: string) => {
    const iconMap: Record<string, JSX.Element> = {
      'DOCUMENT_UPLOAD': <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      'DOCUMENT_APPROVAL': <CheckCircleOutlined style={{ color: '#1890ff' }} />,
      'WORKFLOW_UPDATE': <InfoCircleOutlined style={{ color: '#722ed1' }} />,
      'SYSTEM_ALERT': <WarningOutlined style={{ color: '#faad14' }} />,
      'USER_MENTION': <InfoCircleOutlined style={{ color: '#1890ff' }} />,
      'DEADLINE_REMINDER': <WarningOutlined style={{ color: '#fa8c16' }} />,
      'SECURITY_ALERT': <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
    };
    return iconMap[type] || <InfoCircleOutlined style={{ color: '#1890ff' }} />;
  };

  const getPriorityColor = (priority: string) => {
    const colorMap: Record<string, string> = {
      'LOW': 'default',
      'MEDIUM': 'processing',
      'HIGH': 'warning',
      'URGENT': 'error'
    };
    return colorMap[priority] || 'default';
  };

  const getTypeLabel = (type: string) => {
    const labelMap: Record<string, string> = {
      'DOCUMENT_UPLOAD': 'Upload',
      'DOCUMENT_APPROVAL': 'Approval',
      'WORKFLOW_UPDATE': 'Workflow',
      'SYSTEM_ALERT': 'System',
      'USER_MENTION': 'Mention',
      'DEADLINE_REMINDER': 'Deadline',
      'SECURITY_ALERT': 'Security'
    };
    return labelMap[type] || type;
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(notifications.map(n => n.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectNotification = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    }
  };

  const handleBulkAction = async (action: 'read' | 'archive' | 'delete') => {
    if (selectedIds.length === 0) return;

    switch (action) {
      case 'read':
        await actions.bulkMarkAsRead(selectedIds);
        break;
      case 'archive':
        await actions.bulkArchive(selectedIds);
        break;
      case 'delete':
        await actions.bulkDelete(selectedIds);
        break;
    }
    setSelectedIds([]);
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const filterMenuItems = [
    {
      key: 'type',
      label: 'Filter by Type',
      children: [
        { key: 'all-types', label: 'All Types', onClick: () => setFilterType(undefined) },
        { key: 'DOCUMENT_UPLOAD', label: 'Document Upload', onClick: () => setFilterType('DOCUMENT_UPLOAD') },
        { key: 'WORKFLOW_UPDATE', label: 'Workflow Update', onClick: () => setFilterType('WORKFLOW_UPDATE') },
        { key: 'SYSTEM_ALERT', label: 'System Alert', onClick: () => setFilterType('SYSTEM_ALERT') },
        { key: 'SECURITY_ALERT', label: 'Security Alert', onClick: () => setFilterType('SECURITY_ALERT') }
      ]
    },
    {
      key: 'priority',
      label: 'Filter by Priority',
      children: [
        { key: 'all-priorities', label: 'All Priorities', onClick: () => setFilterPriority(undefined) },
        { key: 'URGENT', label: 'Urgent', onClick: () => setFilterPriority('URGENT') },
        { key: 'HIGH', label: 'High', onClick: () => setFilterPriority('HIGH') },
        { key: 'MEDIUM', label: 'Medium', onClick: () => setFilterPriority('MEDIUM') },
        { key: 'LOW', label: 'Low', onClick: () => setFilterPriority('LOW') }
      ]
    }
  ];

  const bulkActionMenuItems = [
    {
      key: 'mark-read',
      label: 'Mark as Read',
      icon: <EyeOutlined />,
      onClick: () => handleBulkAction('read'),
      disabled: selectedIds.length === 0
    },
    {
      key: 'archive',
      label: 'Archive',
      icon: <ArchiveOutlined />,
      onClick: () => handleBulkAction('archive'),
      disabled: selectedIds.length === 0
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: <DeleteOutlined />,
      onClick: () => handleBulkAction('delete'),
      disabled: selectedIds.length === 0,
      danger: true
    }
  ];

  return (
    <>
      <Badge count={unreadCount} offset={[-5, 5]}>
        <Tooltip title={isConnected ? 'Connected' : 'Disconnected'}>
          <Button
            type="text"
            icon={
              <Space>
                <BellOutlined style={{ fontSize: '20px' }} />
                {isConnected ? 
                  <WifiOutlined style={{ fontSize: '12px', color: '#52c41a' }} /> : 
                  <DisconnectOutlined style={{ fontSize: '12px', color: '#ff4d4f' }} />
                }
              </Space>
            }
            onClick={() => setVisible(true)}
          />
        </Tooltip>
      </Badge>

      <Drawer
        title={
          <Space>
            <span>Notifications</span>
            {loading && <Spin size="small" />}
          </Space>
        }
        placement="right"
        onClose={() => setVisible(false)}
        open={visible}
        width={500}
        extra={
          <Space>
            <Dropdown menu={{ items: filterMenuItems }}>
              <Button size="small" icon={<FilterOutlined />}>
                Filter
              </Button>
            </Dropdown>
            <Button 
              size="small" 
              icon={<ReloadOutlined />} 
              onClick={actions.refresh}
              loading={loading}
            >
              Refresh
            </Button>
            {selectedIds.length > 0 && (
              <Dropdown menu={{ items: bulkActionMenuItems }}>
                <Button size="small" icon={<MoreOutlined />}>
                  Actions ({selectedIds.length})
                </Button>
              </Dropdown>
            )}
          </Space>
        }
      >
        {/* Connection Status */}
        {connectionError && (
          <Alert
            message="Connection Error"
            description={connectionError}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Error Display */}
        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Controls */}
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Checkbox
              checked={selectedIds.length === notifications.length && notifications.length > 0}
              indeterminate={selectedIds.length > 0 && selectedIds.length < notifications.length}
              onChange={(e) => handleSelectAll(e.target.checked)}
            >
              Select All
            </Checkbox>
            <Button
              size="small"
              type="link"
              onClick={() => setShowArchived(!showArchived)}
              icon={showArchived ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            >
              {showArchived ? 'Hide Archived' : 'Show Archived'}
            </Button>
            {unreadCount > 0 && (
              <Button size="small" type="link" onClick={actions.markAllAsRead}>
                Mark all as read ({unreadCount})
              </Button>
            )}
          </Space>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {/* Notifications List */}
        {loading && notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
          </div>
        ) : notifications.length === 0 ? (
          <Empty description="No notifications" />
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={notifications}
            renderItem={(item) => (
              <List.Item
                style={{
                  backgroundColor: item.is_read ? 'transparent' : '#f0f5ff',
                  padding: '12px',
                  borderRadius: '4px',
                  marginBottom: '8px',
                  border: selectedIds.includes(item.id) ? '2px solid #1890ff' : '1px solid #f0f0f0'
                }}
                actions={[
                  <Checkbox
                    key="select"
                    checked={selectedIds.includes(item.id)}
                    onChange={(e) => handleSelectNotification(item.id, e.target.checked)}
                  />,
                  <Dropdown
                    key="actions"
                    menu={{
                      items: [
                        {
                          key: 'toggle-read',
                          label: item.is_read ? 'Mark as Unread' : 'Mark as Read',
                          icon: item.is_read ? <EyeInvisibleOutlined /> : <EyeOutlined />,
                          onClick: () => item.is_read ? actions.markAsUnread(item.id) : actions.markAsRead(item.id)
                        },
                        {
                          key: 'archive',
                          label: 'Archive',
                          icon: <ArchiveOutlined />,
                          onClick: () => actions.markAsArchived(item.id)
                        },
                        {
                          key: 'delete',
                          label: 'Delete',
                          icon: <DeleteOutlined />,
                          onClick: () => actions.deleteNotification(item.id),
                          danger: true
                        }
                      ]
                    }}
                  >
                    <Button type="text" size="small" icon={<MoreOutlined />} />
                  </Dropdown>
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar icon={getIcon(item.type)} />}
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: item.is_read ? 'normal' : 'bold' }}>
                        {item.title}
                      </span>
                      <Space>
                        <Tag color={getPriorityColor(item.priority)}>
                          {item.priority}
                        </Tag>
                        <Tag>
                          {getTypeLabel(item.type)}
                        </Tag>
                      </Space>
                    </div>
                  }
                  description={
                    <>
                      <div style={{ marginBottom: '8px' }}>{item.message}</div>
                      <div style={{ fontSize: '12px', color: '#999' }}>
                        <Space>
                          <Text type="secondary">{formatTimestamp(item.created_at)}</Text>
                          {item.document_id && (
                            <Text type="secondary">• Document #{item.document_id}</Text>
                          )}
                          {item.workflow_id && (
                            <Text type="secondary">• Workflow #{item.workflow_id}</Text>
                          )}
                        </Space>
                      </div>
                    </>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Drawer>
    </>
  );
}
