'use client';

import React from 'react';
import { Timeline, Typography, Tag, Empty, Card } from 'antd';
import { 
  FileTextOutlined, 
  EyeOutlined, 
  ShareAltOutlined, 
  CommentOutlined,
  UserOutlined,
  FolderOutlined,
  UploadOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  LockOutlined,
  UnlockOutlined
} from '@ant-design/icons';

const { Text } = Typography;

interface Activity {
  id: number;
  activity_type: string;
  description: string;
  resource_type?: string;
  resource_id?: number;
  metadata?: any;
  created_at: string;
}

interface ActivityTimelineProps {
  activities: Activity[];
  loading?: boolean;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ activities, loading = false }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'document_created':
        return <FileTextOutlined style={{ color: '#52c41a' }} />;
      case 'document_updated':
        return <EditOutlined style={{ color: '#1890ff' }} />;
      case 'document_viewed':
        return <EyeOutlined style={{ color: '#722ed1' }} />;
      case 'document_shared':
        return <ShareAltOutlined style={{ color: '#fa8c16' }} />;
      case 'document_downloaded':
        return <DownloadOutlined style={{ color: '#13c2c2' }} />;
      case 'document_deleted':
        return <DeleteOutlined style={{ color: '#ff4d4f' }} />;
      case 'document_uploaded':
        return <UploadOutlined style={{ color: '#52c41a' }} />;
      case 'comment_created':
        return <CommentOutlined style={{ color: '#eb2f96' }} />;
      case 'folder_created':
        return <FolderOutlined style={{ color: '#faad14' }} />;
      case 'user_login':
        return <UserOutlined style={{ color: '#1890ff' }} />;
      case 'permission_granted':
        return <UnlockOutlined style={{ color: '#52c41a' }} />;
      case 'permission_revoked':
        return <LockOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <UserOutlined style={{ color: '#8c8c8c' }} />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'document_created':
      case 'document_uploaded':
      case 'permission_granted':
        return 'green';
      case 'document_updated':
      case 'user_login':
        return 'blue';
      case 'document_viewed':
        return 'purple';
      case 'document_shared':
        return 'orange';
      case 'document_downloaded':
        return 'cyan';
      case 'document_deleted':
      case 'permission_revoked':
        return 'red';
      case 'comment_created':
        return 'magenta';
      case 'folder_created':
        return 'gold';
      default:
        return 'default';
    }
  };

  const formatActivityType = (type: string) => {
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 168) { // 7 days
      const days = Math.floor(diffInHours / 24);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getResourceLink = (activity: Activity) => {
    if (activity.resource_type === 'document' && activity.resource_id) {
      return `/documents/${activity.resource_id}`;
    }
    if (activity.resource_type === 'folder' && activity.resource_id) {
      return `/folders/${activity.resource_id}`;
    }
    return null;
  };

  if (activities.length === 0 && !loading) {
    return (
      <Card>
        <Empty
          description="No recent activity"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <Card title="Recent Activity" loading={loading}>
      <Timeline>
        {activities.map((activity) => {
          const resourceLink = getResourceLink(activity);
          
          return (
            <Timeline.Item
              key={activity.id}
              dot={getActivityIcon(activity.activity_type)}
            >
              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Tag color={getActivityColor(activity.activity_type)} size="small">
                    {formatActivityType(activity.activity_type)}
                  </Tag>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {formatDate(activity.created_at)}
                  </Text>
                </div>
                
                <div>
                  {resourceLink ? (
                    <a href={resourceLink} style={{ color: 'inherit' }}>
                      <Text>{activity.description}</Text>
                    </a>
                  ) : (
                    <Text>{activity.description}</Text>
                  )}
                </div>

                {activity.metadata && (
                  <div style={{ marginTop: '4px' }}>
                    {activity.metadata.file_name && (
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        File: {activity.metadata.file_name}
                      </Text>
                    )}
                    {activity.metadata.file_size && (
                      <Text type="secondary" style={{ fontSize: '12px', marginLeft: '8px' }}>
                        Size: {(activity.metadata.file_size / 1024 / 1024).toFixed(2)} MB
                      </Text>
                    )}
                    {activity.metadata.shared_with && (
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Shared with: {activity.metadata.shared_with}
                      </Text>
                    )}
                  </div>
                )}
              </div>
            </Timeline.Item>
          );
        })}
      </Timeline>
    </Card>
  );
};

export default ActivityTimeline;