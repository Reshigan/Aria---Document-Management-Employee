'use client';

import React from 'react';
import { Card, Avatar, Typography, Space, Tag, Divider } from 'antd';
import { UserOutlined, EnvironmentOutlined, PhoneOutlined, LinkedinOutlined, TwitterOutlined, GithubOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface UserProfileCardProps {
  user: {
    id: number;
    email: string;
    full_name: string;
    bio?: string;
    location?: string;
    phone?: string;
    avatar_url?: string;
    social_links?: {
      linkedin?: string;
      twitter?: string;
      github?: string;
    };
    created_at: string;
    last_login?: string;
  };
  compact?: boolean;
}

export const UserProfileCard: React.FC<UserProfileCardProps> = ({ user, compact = false }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (compact) {
    return (
      <Card size="small" style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Avatar
            size={40}
            src={user.avatar_url}
            icon={<UserOutlined />}
          />
          <div style={{ flex: 1 }}>
            <Text strong>{user.full_name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {user.email}
            </Text>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <Avatar
          size={80}
          src={user.avatar_url}
          icon={<UserOutlined />}
          style={{ marginBottom: '12px' }}
        />
        <Title level={4} style={{ margin: 0 }}>
          {user.full_name}
        </Title>
        <Text type="secondary">{user.email}</Text>
      </div>

      {user.bio && (
        <>
          <Divider />
          <Text>{user.bio}</Text>
        </>
      )}

      <Divider />
      
      <Space direction="vertical" style={{ width: '100%' }}>
        {user.location && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <EnvironmentOutlined />
            <Text>{user.location}</Text>
          </div>
        )}
        
        {user.phone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PhoneOutlined />
            <Text>{user.phone}</Text>
          </div>
        )}
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Text type="secondary">Member since:</Text>
          <Text>{formatDate(user.created_at)}</Text>
        </div>
        
        {user.last_login && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Text type="secondary">Last login:</Text>
            <Text>{formatDate(user.last_login)}</Text>
          </div>
        )}
      </Space>

      {user.social_links && (
        <>
          <Divider />
          <Space>
            {user.social_links.linkedin && (
              <a href={user.social_links.linkedin} target="_blank" rel="noopener noreferrer">
                <Tag icon={<LinkedinOutlined />} color="blue">
                  LinkedIn
                </Tag>
              </a>
            )}
            {user.social_links.twitter && (
              <a href={user.social_links.twitter} target="_blank" rel="noopener noreferrer">
                <Tag icon={<TwitterOutlined />} color="cyan">
                  Twitter
                </Tag>
              </a>
            )}
            {user.social_links.github && (
              <a href={user.social_links.github} target="_blank" rel="noopener noreferrer">
                <Tag icon={<GithubOutlined />} color="default">
                  GitHub
                </Tag>
              </a>
            )}
          </Space>
        </>
      )}
    </Card>
  );
};

export default UserProfileCard;