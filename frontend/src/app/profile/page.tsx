'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Tabs, 
  Avatar, 
  Button, 
  Form, 
  Input, 
  Upload, 
  message, 
  Spin,
  Typography,
  Row,
  Col,
  Divider,
  Space,
  Tag,
  Timeline,
  Statistic
} from 'antd';
import { 
  UserOutlined, 
  UploadOutlined, 
  EditOutlined, 
  SaveOutlined,
  SettingOutlined,
  HistoryOutlined,
  FileTextOutlined,
  EyeOutlined,
  ShareAltOutlined
} from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import UserSettings from '@/components/UserSettings';
import ActivityTimeline from '@/components/ActivityTimeline';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;

interface UserProfile {
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
  preferences?: {
    notification_preferences?: {
      email_notifications?: boolean;
      push_notifications?: boolean;
      document_updates?: boolean;
      comment_notifications?: boolean;
    };
    ui_preferences?: {
      theme?: string;
      language?: string;
      timezone?: string;
    };
    privacy_settings?: {
      profile_visibility?: string;
      activity_visibility?: string;
    };
  };
  created_at: string;
  last_login?: string;
}

interface UserActivity {
  id: number;
  activity_type: string;
  description: string;
  resource_type?: string;
  resource_id?: number;
  metadata?: any;
  created_at: string;
}

interface UserStats {
  total_documents: number;
  documents_created: number;
  documents_shared: number;
  total_views: number;
  total_comments: number;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (user) {
      loadProfile();
      loadActivities();
      loadStats();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const response = await api.get('/users/me/profile');
      setProfile(response.data);
      form.setFieldsValue(response.data);
    } catch (error) {
      console.error('Error loading profile:', error);
      message.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async () => {
    try {
      const response = await api.get('/users/me/activity?limit=10');
      setActivities(response.data);
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/users/me/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSaveProfile = async (values: any) => {
    setSaving(true);
    try {
      const response = await api.put('/users/me/profile', values);
      setProfile(response.data);
      setEditMode(false);
      message.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      message.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
      const response = await api.post('/users/me/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setProfile(prev => prev ? { ...prev, avatar_url: response.data.avatar_url } : null);
      message.success('Avatar updated successfully');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      message.error('Failed to upload avatar');
    }
  };



  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!profile) {
    return <div>Profile not found</div>;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>User Profile</Title>
      
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={8}>
          <Card>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <Avatar
                size={120}
                src={profile.avatar_url}
                icon={<UserOutlined />}
                style={{ marginBottom: '16px' }}
              />
              <div>
                <Upload
                  accept="image/*"
                  showUploadList={false}
                  beforeUpload={(file) => {
                    handleAvatarUpload(file);
                    return false;
                  }}
                >
                  <Button icon={<UploadOutlined />} size="small">
                    Change Avatar
                  </Button>
                </Upload>
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <Title level={4}>{profile.full_name}</Title>
              <Text type="secondary">{profile.email}</Text>
              {profile.location && (
                <div style={{ marginTop: '8px' }}>
                  <Text type="secondary">{profile.location}</Text>
                </div>
              )}
            </div>

            {stats && (
              <>
                <Divider />
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title="Documents"
                      value={stats.total_documents}
                      prefix={<FileTextOutlined />}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Views"
                      value={stats.total_views}
                      prefix={<EyeOutlined />}
                    />
                  </Col>
                </Row>
                <Row gutter={16} style={{ marginTop: '16px' }}>
                  <Col span={12}>
                    <Statistic
                      title="Shared"
                      value={stats.documents_shared}
                      prefix={<ShareAltOutlined />}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Comments"
                      value={stats.total_comments}
                    />
                  </Col>
                </Row>
              </>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card>
            <Tabs defaultActiveKey="profile">
              <TabPane tab="Profile Information" key="profile">
                <div style={{ marginBottom: '16px' }}>
                  <Space>
                    <Button
                      type={editMode ? "default" : "primary"}
                      icon={editMode ? <SaveOutlined /> : <EditOutlined />}
                      onClick={() => {
                        if (editMode) {
                          form.submit();
                        } else {
                          setEditMode(true);
                        }
                      }}
                      loading={saving}
                    >
                      {editMode ? 'Save Changes' : 'Edit Profile'}
                    </Button>
                    {editMode && (
                      <Button onClick={() => {
                        setEditMode(false);
                        form.setFieldsValue(profile);
                      }}>
                        Cancel
                      </Button>
                    )}
                  </Space>
                </div>

                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleSaveProfile}
                  disabled={!editMode}
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        label="Full Name"
                        name="full_name"
                        rules={[{ required: true, message: 'Please enter your full name' }]}
                      >
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        label="Email"
                        name="email"
                      >
                        <Input disabled />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        label="Phone"
                        name="phone"
                      >
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        label="Location"
                        name="location"
                      >
                        <Input />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item
                    label="Bio"
                    name="bio"
                  >
                    <TextArea rows={4} placeholder="Tell us about yourself..." />
                  </Form.Item>

                  <Title level={5}>Social Links</Title>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item
                        label="LinkedIn"
                        name={['social_links', 'linkedin']}
                      >
                        <Input placeholder="https://linkedin.com/in/..." />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        label="Twitter"
                        name={['social_links', 'twitter']}
                      >
                        <Input placeholder="https://twitter.com/..." />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        label="GitHub"
                        name={['social_links', 'github']}
                      >
                        <Input placeholder="https://github.com/..." />
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              </TabPane>

              <TabPane tab="Settings" key="settings" icon={<SettingOutlined />}>
                <UserSettings 
                  preferences={profile.preferences || {}}
                  onUpdate={(updatedPreferences) => {
                    setProfile(prev => prev ? { ...prev, preferences: updatedPreferences } : null);
                  }}
                />
              </TabPane>

              <TabPane tab="Activity History" key="activity" icon={<HistoryOutlined />}>
                <ActivityTimeline activities={activities} loading={loading} />
              </TabPane>
            </Tabs>
          </Card>
        </Col>
      </Row>
    </div>
  );
}