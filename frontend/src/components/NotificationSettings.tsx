'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Switch,
  Select,
  TimePicker,
  Button,
  Space,
  Divider,
  Typography,
  message,
  Spin,
  Alert,
  Row,
  Col,
  Tag
} from 'antd';
import {
  BellOutlined,
  MailOutlined,
  MobileOutlined,
  MessageOutlined,
  SettingOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { NotificationPreference } from '../types/notification';
import NotificationService from '../services/notificationService';

const { Title, Text } = Typography;
const { Option } = Select;

interface NotificationSettingsProps {
  userId?: number;
}

export default function NotificationSettings({ userId }: NotificationSettingsProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [error, setError] = useState<string | null>(null);

  const notificationTypes = [
    { key: 'DOCUMENT_UPLOAD', label: 'Document Upload', description: 'When documents are uploaded' },
    { key: 'DOCUMENT_APPROVAL', label: 'Document Approval', description: 'When documents need approval' },
    { key: 'WORKFLOW_UPDATE', label: 'Workflow Update', description: 'When workflows are updated' },
    { key: 'SYSTEM_ALERT', label: 'System Alert', description: 'System maintenance and alerts' },
    { key: 'USER_MENTION', label: 'User Mention', description: 'When you are mentioned' },
    { key: 'DEADLINE_REMINDER', label: 'Deadline Reminder', description: 'Upcoming deadlines' },
    { key: 'SECURITY_ALERT', label: 'Security Alert', description: 'Security-related notifications' }
  ];

  const frequencyOptions = [
    { value: 'IMMEDIATE', label: 'Immediate' },
    { value: 'HOURLY', label: 'Hourly Digest' },
    { value: 'DAILY', label: 'Daily Digest' },
    { value: 'WEEKLY', label: 'Weekly Digest' }
  ];

  useEffect(() => {
    fetchPreferences();
  }, [userId]);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await NotificationService.getNotificationPreferences();
      setPreferences(data);
      
      // Set form values
      const formValues: any = {};
      data.forEach(pref => {
        formValues[`${pref.notification_type}_email`] = pref.email_enabled;
        formValues[`${pref.notification_type}_push`] = pref.push_enabled;
        formValues[`${pref.notification_type}_in_app`] = pref.in_app_enabled;
        formValues[`${pref.notification_type}_sms`] = pref.sms_enabled;
        formValues[`${pref.notification_type}_frequency`] = pref.frequency;
        formValues[`${pref.notification_type}_quiet_hours`] = pref.quiet_hours_enabled;
        
        if (pref.quiet_hours_start) {
          formValues[`${pref.notification_type}_quiet_start`] = dayjs(pref.quiet_hours_start, 'HH:mm');
        }
        if (pref.quiet_hours_end) {
          formValues[`${pref.notification_type}_quiet_end`] = dayjs(pref.quiet_hours_end, 'HH:mm');
        }
      });
      
      form.setFieldsValue(formValues);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch preferences';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values: any) => {
    try {
      setSaving(true);
      setError(null);

      // Group values by notification type
      const preferenceUpdates: Record<string, any> = {};
      
      Object.entries(values).forEach(([key, value]) => {
        const [type, setting] = key.split('_');
        if (!preferenceUpdates[type]) {
          preferenceUpdates[type] = { notification_type: type };
        }
        
        switch (setting) {
          case 'email':
            preferenceUpdates[type].email_enabled = value;
            break;
          case 'push':
            preferenceUpdates[type].push_enabled = value;
            break;
          case 'in':
            if (key.endsWith('_in_app')) {
              preferenceUpdates[type].in_app_enabled = value;
            }
            break;
          case 'sms':
            preferenceUpdates[type].sms_enabled = value;
            break;
          case 'frequency':
            preferenceUpdates[type].frequency = value;
            break;
          case 'quiet':
            if (key.endsWith('_quiet_hours')) {
              preferenceUpdates[type].quiet_hours_enabled = value;
            }
            break;
          case 'quiet_start':
            preferenceUpdates[type].quiet_hours_start = value ? value.format('HH:mm') : null;
            break;
          case 'quiet_end':
            preferenceUpdates[type].quiet_hours_end = value ? value.format('HH:mm') : null;
            break;
        }
      });

      // Update or create preferences
      const updatePromises = Object.values(preferenceUpdates).map(async (prefData: any) => {
        const existingPref = preferences.find(p => p.notification_type === prefData.notification_type);
        
        if (existingPref) {
          return NotificationService.updateNotificationPreference(existingPref.id, prefData);
        } else {
          return NotificationService.createNotificationPreference({
            ...prefData,
            user_id: userId || 1 // Default user ID if not provided
          });
        }
      });

      await Promise.all(updatePromises);
      await fetchPreferences(); // Refresh data
      message.success('Notification preferences saved successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save preferences';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    fetchPreferences();
  };

  const handleTestNotification = async (type: string) => {
    try {
      await NotificationService.testNotification({
        title: `Test ${type} Notification`,
        message: `This is a test notification for ${type} type.`,
        type,
        priority: 'MEDIUM',
        recipient_id: userId || 1
      });
      message.success('Test notification sent');
    } catch (err) {
      message.error('Failed to send test notification');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
      <Title level={2}>
        <SettingOutlined /> Notification Settings
      </Title>
      <Text type="secondary">
        Configure how and when you receive notifications
      </Text>

      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ margin: '16px 0' }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        style={{ marginTop: 24 }}
      >
        {notificationTypes.map((type) => (
          <Card
            key={type.key}
            title={
              <Space>
                <BellOutlined />
                {type.label}
                <Button
                  size="small"
                  type="link"
                  onClick={() => handleTestNotification(type.key)}
                >
                  Test
                </Button>
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              {type.description}
            </Text>

            <Row gutter={[16, 16]}>
              {/* Delivery Methods */}
              <Col xs={24} sm={12} md={6}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Text strong>Delivery Methods</Text>
                  
                  <Form.Item
                    name={`${type.key}_in_app`}
                    valuePropName="checked"
                    style={{ marginBottom: 8 }}
                  >
                    <Switch
                      checkedChildren={<BellOutlined />}
                      unCheckedChildren={<BellOutlined />}
                      size="small"
                    />
                    <Text style={{ marginLeft: 8 }}>In-App</Text>
                  </Form.Item>

                  <Form.Item
                    name={`${type.key}_email`}
                    valuePropName="checked"
                    style={{ marginBottom: 8 }}
                  >
                    <Switch
                      checkedChildren={<MailOutlined />}
                      unCheckedChildren={<MailOutlined />}
                      size="small"
                    />
                    <Text style={{ marginLeft: 8 }}>Email</Text>
                  </Form.Item>

                  <Form.Item
                    name={`${type.key}_push`}
                    valuePropName="checked"
                    style={{ marginBottom: 8 }}
                  >
                    <Switch
                      checkedChildren={<MobileOutlined />}
                      unCheckedChildren={<MobileOutlined />}
                      size="small"
                    />
                    <Text style={{ marginLeft: 8 }}>Push</Text>
                  </Form.Item>

                  <Form.Item
                    name={`${type.key}_sms`}
                    valuePropName="checked"
                    style={{ marginBottom: 0 }}
                  >
                    <Switch
                      checkedChildren={<MessageOutlined />}
                      unCheckedChildren={<MessageOutlined />}
                      size="small"
                    />
                    <Text style={{ marginLeft: 8 }}>SMS</Text>
                  </Form.Item>
                </Space>
              </Col>

              {/* Frequency */}
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  label="Frequency"
                  name={`${type.key}_frequency`}
                  initialValue="IMMEDIATE"
                >
                  <Select size="small">
                    {frequencyOptions.map(option => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              {/* Quiet Hours */}
              <Col xs={24} sm={24} md={12}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Form.Item
                    name={`${type.key}_quiet_hours`}
                    valuePropName="checked"
                    style={{ marginBottom: 8 }}
                  >
                    <Switch size="small" />
                    <Text style={{ marginLeft: 8 }}>Enable Quiet Hours</Text>
                  </Form.Item>

                  <Form.Item noStyle shouldUpdate>
                    {({ getFieldValue }) => {
                      const quietHoursEnabled = getFieldValue(`${type.key}_quiet_hours`);
                      return quietHoursEnabled ? (
                        <Space>
                          <Form.Item
                            name={`${type.key}_quiet_start`}
                            label="From"
                            style={{ marginBottom: 0 }}
                          >
                            <TimePicker
                              size="small"
                              format="HH:mm"
                              placeholder="Start time"
                            />
                          </Form.Item>
                          <Form.Item
                            name={`${type.key}_quiet_end`}
                            label="To"
                            style={{ marginBottom: 0 }}
                          >
                            <TimePicker
                              size="small"
                              format="HH:mm"
                              placeholder="End time"
                            />
                          </Form.Item>
                        </Space>
                      ) : null;
                    }}
                  </Form.Item>
                </Space>
              </Col>
            </Row>
          </Card>
        ))}

        <Divider />

        <Space>
          <Button
            type="primary"
            htmlType="submit"
            loading={saving}
            size="large"
          >
            Save Settings
          </Button>
          <Button
            onClick={handleReset}
            disabled={saving}
            size="large"
          >
            Reset
          </Button>
        </Space>
      </Form>
    </div>
  );
}