'use client';

import React, { useState } from 'react';
import { 
  Card, 
  Form, 
  Switch, 
  Select, 
  Button, 
  message, 
  Typography, 
  Divider,
  Space,
  Row,
  Col
} from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { api } from '@/lib/api';

const { Title } = Typography;
const { Option } = Select;

interface UserPreferences {
  notification_preferences?: {
    email_notifications?: boolean;
    push_notifications?: boolean;
    document_updates?: boolean;
    comment_notifications?: boolean;
    workflow_notifications?: boolean;
    security_alerts?: boolean;
  };
  ui_preferences?: {
    theme?: string;
    language?: string;
    timezone?: string;
    items_per_page?: number;
    default_view?: string;
  };
  privacy_settings?: {
    profile_visibility?: string;
    activity_visibility?: string;
    email_visibility?: boolean;
    phone_visibility?: boolean;
  };
}

interface UserSettingsProps {
  preferences: UserPreferences;
  onUpdate: (preferences: UserPreferences) => void;
}

export const UserSettings: React.FC<UserSettingsProps> = ({ preferences, onUpdate }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleSave = async (values: any) => {
    setSaving(true);
    try {
      const response = await api.put('/users/me/preferences', values);
      onUpdate(response.data);
      message.success('Settings updated successfully');
    } catch (error) {
      console.error('Error updating settings:', error);
      message.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Form
        form={form}
        layout="vertical"
        initialValues={preferences}
        onFinish={handleSave}
      >
        <Card title="Notification Preferences" style={{ marginBottom: '24px' }}>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item
                name={['notification_preferences', 'email_notifications']}
                valuePropName="checked"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Email Notifications</span>
                  <Switch />
                </div>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name={['notification_preferences', 'push_notifications']}
                valuePropName="checked"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Push Notifications</span>
                  <Switch />
                </div>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name={['notification_preferences', 'document_updates']}
                valuePropName="checked"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Document Updates</span>
                  <Switch />
                </div>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name={['notification_preferences', 'comment_notifications']}
                valuePropName="checked"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Comment Notifications</span>
                  <Switch />
                </div>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name={['notification_preferences', 'workflow_notifications']}
                valuePropName="checked"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Workflow Notifications</span>
                  <Switch />
                </div>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name={['notification_preferences', 'security_alerts']}
                valuePropName="checked"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Security Alerts</span>
                  <Switch />
                </div>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Interface Preferences" style={{ marginBottom: '24px' }}>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item
                label="Theme"
                name={['ui_preferences', 'theme']}
              >
                <Select placeholder="Select theme">
                  <Option value="light">Light</Option>
                  <Option value="dark">Dark</Option>
                  <Option value="auto">Auto</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Language"
                name={['ui_preferences', 'language']}
              >
                <Select placeholder="Select language">
                  <Option value="en">English</Option>
                  <Option value="es">Spanish</Option>
                  <Option value="fr">French</Option>
                  <Option value="de">German</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Timezone"
                name={['ui_preferences', 'timezone']}
              >
                <Select placeholder="Select timezone">
                  <Option value="UTC">UTC</Option>
                  <Option value="America/New_York">Eastern Time</Option>
                  <Option value="America/Chicago">Central Time</Option>
                  <Option value="America/Denver">Mountain Time</Option>
                  <Option value="America/Los_Angeles">Pacific Time</Option>
                  <Option value="Europe/London">London</Option>
                  <Option value="Europe/Paris">Paris</Option>
                  <Option value="Asia/Tokyo">Tokyo</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Items per Page"
                name={['ui_preferences', 'items_per_page']}
              >
                <Select placeholder="Select items per page">
                  <Option value={10}>10</Option>
                  <Option value={25}>25</Option>
                  <Option value={50}>50</Option>
                  <Option value={100}>100</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Default View"
                name={['ui_preferences', 'default_view']}
              >
                <Select placeholder="Select default view">
                  <Option value="grid">Grid View</Option>
                  <Option value="list">List View</Option>
                  <Option value="table">Table View</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Privacy Settings" style={{ marginBottom: '24px' }}>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item
                label="Profile Visibility"
                name={['privacy_settings', 'profile_visibility']}
              >
                <Select placeholder="Select profile visibility">
                  <Option value="public">Public</Option>
                  <Option value="team">Team Only</Option>
                  <Option value="private">Private</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Activity Visibility"
                name={['privacy_settings', 'activity_visibility']}
              >
                <Select placeholder="Select activity visibility">
                  <Option value="public">Public</Option>
                  <Option value="team">Team Only</Option>
                  <Option value="private">Private</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name={['privacy_settings', 'email_visibility']}
                valuePropName="checked"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Show Email to Others</span>
                  <Switch />
                </div>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name={['privacy_settings', 'phone_visibility']}
                valuePropName="checked"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Show Phone to Others</span>
                  <Switch />
                </div>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <div style={{ textAlign: 'center' }}>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={saving}
            size="large"
          >
            Save Settings
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default UserSettings;