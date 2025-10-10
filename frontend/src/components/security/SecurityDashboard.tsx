'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Button,
  Space,
  Alert,
  Typography,
  Spin,
  message,
  Modal,
  List,
  Avatar,
  Badge,
  Tooltip,
  Progress
} from 'antd';
import {
  ShieldCheckOutlined,
  UserOutlined,
  LockOutlined,
  EyeOutlined,
  SafetyOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { securityService, SecurityDashboard as SecurityDashboardType, SecurityEvent } from '@/services/securityService';

const { Title, Text } = Typography;

const SecurityDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<SecurityDashboardType | null>(null);
  const [eventsVisible, setEventsVisible] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await securityService.getSecurityDashboard();
      setDashboard(data);
    } catch (error) {
      message.error('Failed to load security dashboard');
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSecurityScore = () => {
    if (!dashboard) return 0;
    
    let score = 50; // Base score
    
    // Two-factor authentication
    if (dashboard.two_factor_enabled) score += 25;
    
    // Recent password change (within 90 days)
    const passwordAge = new Date().getTime() - new Date(dashboard.password_last_changed).getTime();
    const daysOld = passwordAge / (1000 * 60 * 60 * 24);
    if (daysOld <= 90) score += 15;
    else if (daysOld <= 180) score += 10;
    
    // No recent failed attempts
    if (dashboard.failed_attempts === 0) score += 10;
    else if (dashboard.failed_attempts <= 3) score += 5;
    
    return Math.min(100, score);
  };

  const getSecurityScoreColor = (score: number) => {
    if (score >= 80) return '#52c41a';
    if (score >= 60) return '#faad14';
    return '#ff4d4f';
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case 'login_success': return 'green';
      case 'login_failed': return 'red';
      case 'password_changed': return 'blue';
      case '2fa_enabled': return 'cyan';
      case '2fa_disabled': return 'orange';
      case 'session_terminated': return 'purple';
      case 'api_key_created': return 'geekblue';
      case 'suspicious_activity': return 'red';
      default: return 'default';
    }
  };

  const formatEventType = (eventType: string) => {
    return eventType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>Loading security dashboard...</div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <Alert
        message="Failed to load security dashboard"
        type="error"
        showIcon
        action={
          <Button size="small" onClick={loadDashboard}>
            Retry
          </Button>
        }
      />
    );
  }

  const securityScore = getSecurityScore();

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}>
          <ShieldCheckOutlined style={{ marginRight: '8px' }} />
          Security Dashboard
        </Title>
        <Button icon={<ReloadOutlined />} onClick={loadDashboard}>
          Refresh
        </Button>
      </div>

      {/* Security Score */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col span={24}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Title level={3}>Security Score</Title>
              <Progress
                type="circle"
                percent={securityScore}
                strokeColor={getSecurityScoreColor(securityScore)}
                size={120}
                format={(percent) => `${percent}%`}
              />
              <div style={{ marginTop: '16px' }}>
                <Text type="secondary">
                  {securityScore >= 80 ? 'Excellent security posture' :
                   securityScore >= 60 ? 'Good security, room for improvement' :
                   'Security needs attention'}
                </Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Security Alerts */}
      {dashboard.account_locked && (
        <Alert
          message="Account Locked"
          description="Your account has been locked due to security concerns. Please contact an administrator."
          type="error"
          showIcon
          icon={<LockOutlined />}
          style={{ marginBottom: '16px' }}
        />
      )}

      {!dashboard.two_factor_enabled && (
        <Alert
          message="Two-Factor Authentication Disabled"
          description="Enable 2FA to significantly improve your account security."
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: '16px' }}
          action={
            <Button size="small" type="primary">
              Enable 2FA
            </Button>
          }
        />
      )}

      {/* Security Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Active Sessions"
              value={dashboard.active_sessions}
              prefix={<UserOutlined />}
              valueStyle={{ color: dashboard.active_sessions > 5 ? '#ff4d4f' : '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Recent Logins"
              value={dashboard.recent_logins}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Failed Attempts"
              value={dashboard.failed_attempts}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: dashboard.failed_attempts > 0 ? '#ff4d4f' : '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Security Events"
              value={dashboard.security_events}
              prefix={<EyeOutlined />}
              valueStyle={{ color: dashboard.security_events > 10 ? '#faad14' : '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Security Status */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <Card title="Security Features" extra={<SafetyOutlined />}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>Two-Factor Authentication</Text>
                <Badge
                  status={dashboard.two_factor_enabled ? 'success' : 'error'}
                  text={dashboard.two_factor_enabled ? 'Enabled' : 'Disabled'}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>Account Status</Text>
                <Badge
                  status={dashboard.account_locked ? 'error' : 'success'}
                  text={dashboard.account_locked ? 'Locked' : 'Active'}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>Password Last Changed</Text>
                <Text type="secondary">
                  {new Date(dashboard.password_last_changed).toLocaleDateString()}
                </Text>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            title="Recent Security Events" 
            extra={
              <Button 
                type="link" 
                onClick={() => setEventsVisible(true)}
                icon={<EyeOutlined />}
              >
                View All
              </Button>
            }
          >
            <List
              size="small"
              dataSource={dashboard.recent_events.slice(0, 5)}
              renderItem={(event: SecurityEvent) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        size="small" 
                        style={{ 
                          backgroundColor: getEventTypeColor(event.event_type) === 'red' ? '#ff4d4f' : '#1890ff' 
                        }}
                      >
                        {event.event_type.charAt(0).toUpperCase()}
                      </Avatar>
                    }
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>{formatEventType(event.event_type)}</Text>
                        <Tag color={getEventTypeColor(event.event_type)} size="small">
                          {new Date(event.created_at).toLocaleTimeString()}
                        </Tag>
                      </div>
                    }
                    description={
                      <Tooltip title={`IP: ${event.ip_address}`}>
                        <Text type="secondary" ellipsis style={{ maxWidth: '200px' }}>
                          {event.description}
                        </Text>
                      </Tooltip>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* Security Events Modal */}
      <Modal
        title="Recent Security Events"
        open={eventsVisible}
        onCancel={() => setEventsVisible(false)}
        footer={null}
        width={800}
      >
        <List
          dataSource={dashboard.recent_events}
          renderItem={(event: SecurityEvent) => (
            <List.Item>
              <List.Item.Meta
                avatar={
                  <Avatar 
                    style={{ 
                      backgroundColor: getEventTypeColor(event.event_type) === 'red' ? '#ff4d4f' : '#1890ff' 
                    }}
                  >
                    {event.event_type.charAt(0).toUpperCase()}
                  </Avatar>
                }
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>{formatEventType(event.event_type)}</Text>
                    <Tag color={getEventTypeColor(event.event_type)}>
                      {new Date(event.created_at).toLocaleString()}
                    </Tag>
                  </div>
                }
                description={
                  <div>
                    <div>{event.description}</div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      IP: {event.ip_address} | User Agent: {event.user_agent}
                    </Text>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
};

export default SecurityDashboard;