'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Alert,
  Modal,
  Form,
  Input,
  Steps,
  QRCode,
  List,
  Tag,
  message,
  Spin,
  Divider,
  Tooltip,
  Popconfirm
} from 'antd';
import {
  SafetyOutlined,
  QrcodeOutlined,
  KeyOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { securityService, TwoFactorSetupResponse, TwoFactorStatus } from '@/services/securityService';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

const TwoFactorAuth: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [setupVisible, setSetupVisible] = useState(false);
  const [disableVisible, setDisableVisible] = useState(false);
  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [disableForm] = Form.useForm();
  const [setupLoading, setSetupLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [disableLoading, setDisableLoading] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const data = await securityService.get2FAStatus();
      setStatus(data);
    } catch (error) {
      message.error('Failed to load 2FA status');
      console.error('2FA status error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async () => {
    try {
      setSetupLoading(true);
      const data = await securityService.setup2FA();
      setSetupData(data);
      setSetupVisible(true);
      setCurrentStep(0);
    } catch (error) {
      message.error('Failed to setup 2FA');
      console.error('2FA setup error:', error);
    } finally {
      setSetupLoading(false);
    }
  };

  const handleVerifySetup = async (values: { code: string }) => {
    try {
      setVerifyLoading(true);
      await securityService.verify2FA({ code: values.code });
      message.success('Two-factor authentication enabled successfully!');
      setSetupVisible(false);
      setSetupData(null);
      form.resetFields();
      await loadStatus();
    } catch (error) {
      message.error('Invalid verification code. Please try again.');
      console.error('2FA verify error:', error);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleDisable = async (values: { code: string }) => {
    try {
      setDisableLoading(true);
      await securityService.disable2FA({ code: values.code });
      message.success('Two-factor authentication disabled successfully');
      setDisableVisible(false);
      disableForm.resetFields();
      await loadStatus();
    } catch (error) {
      message.error('Invalid verification code. Please try again.');
      console.error('2FA disable error:', error);
    } finally {
      setDisableLoading(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    try {
      const backupCodes = await securityService.regenerateBackupCodes();
      Modal.info({
        title: 'New Backup Codes Generated',
        width: 600,
        content: (
          <div>
            <Alert
              message="Important: Save these backup codes in a secure location"
              description="These codes can be used to access your account if you lose your authenticator device. Each code can only be used once."
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <List
              size="small"
              bordered
              dataSource={backupCodes}
              renderItem={(code, index) => (
                <List.Item>
                  <Text code>{code}</Text>
                  <Button
                    type="link"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => {
                      navigator.clipboard.writeText(code);
                      message.success('Backup code copied to clipboard');
                    }}
                  />
                </List.Item>
              )}
            />
          </div>
        ),
      });
      await loadStatus();
    } catch (error) {
      message.error('Failed to regenerate backup codes');
      console.error('Backup codes error:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('Copied to clipboard');
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>Loading 2FA settings...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <SafetyOutlined style={{ marginRight: '8px' }} />
          Two-Factor Authentication
        </Title>
        <Paragraph type="secondary">
          Add an extra layer of security to your account by requiring a verification code from your mobile device.
        </Paragraph>
      </div>

      <Card>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <SafetyOutlined 
            style={{ 
              fontSize: '48px', 
              color: status?.is_enabled ? '#52c41a' : '#faad14',
              marginBottom: '16px'
            }} 
          />
          <Title level={3}>
            Two-Factor Authentication is {status?.is_enabled ? 'Enabled' : 'Disabled'}
          </Title>
          <Text type="secondary">
            {status?.is_enabled 
              ? 'Your account is protected with two-factor authentication'
              : 'Enable 2FA to secure your account with an additional verification step'
            }
          </Text>
        </div>

        {status?.is_enabled ? (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Alert
              message="Two-Factor Authentication Active"
              description="Your account is protected with 2FA. You'll need your authenticator app to sign in."
              type="success"
              showIcon
            />
            
            <div style={{ textAlign: 'center' }}>
              <Space size="large">
                <div>
                  <Text strong>Backup Codes Available</Text>
                  <br />
                  <Text type="secondary">{status.backup_codes_count} remaining</Text>
                </div>
              </Space>
            </div>

            <div style={{ textAlign: 'center' }}>
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleRegenerateBackupCodes}
                >
                  Regenerate Backup Codes
                </Button>
                <Popconfirm
                  title="Disable Two-Factor Authentication"
                  description="Are you sure you want to disable 2FA? This will make your account less secure."
                  onConfirm={() => setDisableVisible(true)}
                  okText="Yes, Disable"
                  cancelText="Cancel"
                  okType="danger"
                >
                  <Button danger icon={<DeleteOutlined />}>
                    Disable 2FA
                  </Button>
                </Popconfirm>
              </Space>
            </div>
          </Space>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <Alert
              message="Two-Factor Authentication Disabled"
              description="Your account is not protected with 2FA. Enable it now to improve security."
              type="warning"
              showIcon
              style={{ marginBottom: '24px' }}
            />
            <Button
              type="primary"
              size="large"
              icon={<SafetyOutlined />}
              loading={setupLoading}
              onClick={handleSetup}
            >
              Enable Two-Factor Authentication
            </Button>
          </div>
        )}
      </Card>

      {/* Setup Modal */}
      <Modal
        title="Setup Two-Factor Authentication"
        open={setupVisible}
        onCancel={() => {
          setSetupVisible(false);
          setSetupData(null);
          setCurrentStep(0);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Steps current={currentStep} style={{ marginBottom: '24px' }}>
          <Step title="Install App" icon={<QrcodeOutlined />} />
          <Step title="Scan QR Code" icon={<QrcodeOutlined />} />
          <Step title="Verify Code" icon={<KeyOutlined />} />
        </Steps>

        {setupData && (
          <>
            {currentStep === 0 && (
              <div style={{ textAlign: 'center' }}>
                <Title level={4}>Step 1: Install Authenticator App</Title>
                <Paragraph>
                  Install an authenticator app on your mobile device. We recommend:
                </Paragraph>
                <List
                  size="small"
                  dataSource={[
                    'Google Authenticator',
                    'Microsoft Authenticator',
                    'Authy',
                    'LastPass Authenticator'
                  ]}
                  renderItem={item => (
                    <List.Item>
                      <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                      {item}
                    </List.Item>
                  )}
                />
                <Button type="primary" onClick={() => setCurrentStep(1)}>
                  Next: Scan QR Code
                </Button>
              </div>
            )}

            {currentStep === 1 && (
              <div style={{ textAlign: 'center' }}>
                <Title level={4}>Step 2: Scan QR Code</Title>
                <Paragraph>
                  Open your authenticator app and scan this QR code:
                </Paragraph>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                  <QRCode value={setupData.qr_code} size={200} />
                </div>
                <Paragraph>
                  Can't scan? Enter this code manually:
                </Paragraph>
                <div style={{ 
                  background: '#f5f5f5', 
                  padding: '12px', 
                  borderRadius: '6px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Text code style={{ fontSize: '16px' }}>{setupData.secret_key}</Text>
                  <Tooltip title="Copy to clipboard">
                    <Button
                      type="link"
                      icon={<CopyOutlined />}
                      onClick={() => copyToClipboard(setupData.secret_key)}
                    />
                  </Tooltip>
                </div>
                <Button type="primary" onClick={() => setCurrentStep(2)}>
                  Next: Verify Code
                </Button>
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <Title level={4} style={{ textAlign: 'center' }}>Step 3: Verify Setup</Title>
                <Paragraph style={{ textAlign: 'center' }}>
                  Enter the 6-digit code from your authenticator app:
                </Paragraph>
                <Form
                  form={form}
                  onFinish={handleVerifySetup}
                  layout="vertical"
                >
                  <Form.Item
                    name="code"
                    rules={[
                      { required: true, message: 'Please enter the verification code' },
                      { len: 6, message: 'Code must be 6 digits' },
                      { pattern: /^\d+$/, message: 'Code must contain only numbers' }
                    ]}
                  >
                    <Input
                      placeholder="Enter 6-digit code"
                      size="large"
                      style={{ textAlign: 'center', fontSize: '18px', letterSpacing: '4px' }}
                      maxLength={6}
                    />
                  </Form.Item>
                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={verifyLoading}
                      block
                      size="large"
                    >
                      Verify and Enable 2FA
                    </Button>
                  </Form.Item>
                </Form>

                {/* Backup Codes */}
                <Divider />
                <Alert
                  message="Save Your Backup Codes"
                  description="These backup codes can be used to access your account if you lose your authenticator device. Save them in a secure location."
                  type="info"
                  showIcon
                  style={{ marginBottom: '16px' }}
                />
                <List
                  size="small"
                  bordered
                  dataSource={setupData.backup_codes}
                  renderItem={(code, index) => (
                    <List.Item>
                      <Text code>{code}</Text>
                      <Button
                        type="link"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => copyToClipboard(code)}
                      />
                    </List.Item>
                  )}
                />
              </div>
            )}
          </>
        )}
      </Modal>

      {/* Disable Modal */}
      <Modal
        title="Disable Two-Factor Authentication"
        open={disableVisible}
        onCancel={() => {
          setDisableVisible(false);
          disableForm.resetFields();
        }}
        footer={null}
        width={400}
      >
        <Alert
          message="Warning"
          description="Disabling 2FA will make your account less secure. You'll only need your password to sign in."
          type="warning"
          showIcon
          style={{ marginBottom: '24px' }}
        />
        <Form
          form={disableForm}
          onFinish={handleDisable}
          layout="vertical"
        >
          <Form.Item
            name="code"
            label="Enter verification code from your authenticator app"
            rules={[
              { required: true, message: 'Please enter the verification code' },
              { len: 6, message: 'Code must be 6 digits' },
              { pattern: /^\d+$/, message: 'Code must contain only numbers' }
            ]}
          >
            <Input
              placeholder="Enter 6-digit code"
              size="large"
              style={{ textAlign: 'center', fontSize: '18px', letterSpacing: '4px' }}
              maxLength={6}
            />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              danger
              htmlType="submit"
              loading={disableLoading}
              block
              size="large"
            >
              Disable Two-Factor Authentication
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TwoFactorAuth;