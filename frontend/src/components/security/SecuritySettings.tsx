'use client';

import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Typography,
  Alert,
  message,
  Divider,
  Row,
  Col
} from 'antd';
import {
  LockOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  SafetyOutlined
} from '@ant-design/icons';
import { securityService } from '@/services/securityService';

const { Title, Text } = Typography;

const SecuritySettings: React.FC = () => {
  const [passwordForm] = Form.useForm();
  const [changingPassword, setChangingPassword] = useState(false);

  const handlePasswordChange = async (values: any) => {
    try {
      setChangingPassword(true);
      await securityService.changePassword({
        current_password: values.current_password,
        new_password: values.new_password
      });
      message.success('Password changed successfully');
      passwordForm.resetFields();
    } catch (error) {
      message.error('Failed to change password. Please check your current password.');
      console.error('Password change error:', error);
    } finally {
      setChangingPassword(false);
    }
  };

  const validatePassword = (_: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error('Please enter your new password'));
    }
    
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumbers = /\d/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
    
    if (value.length < minLength) {
      return Promise.reject(new Error(`Password must be at least ${minLength} characters long`));
    }
    
    if (!hasUpperCase) {
      return Promise.reject(new Error('Password must contain at least one uppercase letter'));
    }
    
    if (!hasLowerCase) {
      return Promise.reject(new Error('Password must contain at least one lowercase letter'));
    }
    
    if (!hasNumbers) {
      return Promise.reject(new Error('Password must contain at least one number'));
    }
    
    if (!hasSpecialChar) {
      return Promise.reject(new Error('Password must contain at least one special character'));
    }
    
    return Promise.resolve();
  };

  const validateConfirmPassword = (_: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error('Please confirm your new password'));
    }
    
    const newPassword = passwordForm.getFieldValue('new_password');
    if (value !== newPassword) {
      return Promise.reject(new Error('Passwords do not match'));
    }
    
    return Promise.resolve();
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <SafetyOutlined style={{ marginRight: '8px' }} />
          Security Settings
        </Title>
        <Text type="secondary">
          Manage your account security settings and password
        </Text>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          {/* Change Password */}
          <Card title="Change Password" extra={<LockOutlined />}>
            <Alert
              message="Password Requirements"
              description={
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  <li>At least 8 characters long</li>
                  <li>Contains uppercase and lowercase letters</li>
                  <li>Contains at least one number</li>
                  <li>Contains at least one special character</li>
                </ul>
              }
              type="info"
              showIcon
              style={{ marginBottom: '24px' }}
            />

            <Form
              form={passwordForm}
              onFinish={handlePasswordChange}
              layout="vertical"
              autoComplete="off"
            >
              <Form.Item
                name="current_password"
                label="Current Password"
                rules={[
                  { required: true, message: 'Please enter your current password' }
                ]}
              >
                <Input.Password
                  placeholder="Enter your current password"
                  iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                />
              </Form.Item>

              <Form.Item
                name="new_password"
                label="New Password"
                rules={[
                  { validator: validatePassword }
                ]}
              >
                <Input.Password
                  placeholder="Enter your new password"
                  iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                />
              </Form.Item>

              <Form.Item
                name="confirm_password"
                label="Confirm New Password"
                rules={[
                  { validator: validateConfirmPassword }
                ]}
              >
                <Input.Password
                  placeholder="Confirm your new password"
                  iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={changingPassword}
                  block
                >
                  Change Password
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          {/* Security Tips */}
          <Card title="Security Tips" extra={<SafetyOutlined />}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text strong>Use a Strong Password</Text>
                <br />
                <Text type="secondary">
                  Create a unique password that's hard to guess. Avoid using personal information.
                </Text>
              </div>

              <Divider />

              <div>
                <Text strong>Enable Two-Factor Authentication</Text>
                <br />
                <Text type="secondary">
                  Add an extra layer of security by enabling 2FA in your security settings.
                </Text>
              </div>

              <Divider />

              <div>
                <Text strong>Monitor Your Sessions</Text>
                <br />
                <Text type="secondary">
                  Regularly check your active sessions and terminate any suspicious activity.
                </Text>
              </div>

              <Divider />

              <div>
                <Text strong>Keep Your API Keys Secure</Text>
                <br />
                <Text type="secondary">
                  Never share your API keys and rotate them regularly for better security.
                </Text>
              </div>

              <Divider />

              <div>
                <Text strong>Review Security Events</Text>
                <br />
                <Text type="secondary">
                  Check your security dashboard regularly for any unusual activity.
                </Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SecuritySettings;