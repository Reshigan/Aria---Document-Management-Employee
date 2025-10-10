'use client';

import React, { useState } from 'react';
import { Layout, Menu, Card, Typography } from 'antd';
import {
  ShieldCheckOutlined,
  SafetyOutlined,
  DesktopOutlined,
  KeyOutlined,
  SettingOutlined,
  FileTextOutlined,
  DashboardOutlined
} from '@ant-design/icons';
import SecurityDashboard from '@/components/security/SecurityDashboard';
import TwoFactorAuth from '@/components/security/TwoFactorAuth';
import SessionManagement from '@/components/security/SessionManagement';
import APIKeyManagement from '@/components/security/APIKeyManagement';
import SecuritySettings from '@/components/security/SecuritySettings';
import AuditLogs from '@/components/security/AuditLogs';

const { Sider, Content } = Layout;
const { Title } = Typography;

const SecurityPage: React.FC = () => {
  const [selectedKey, setSelectedKey] = useState('dashboard');

  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Security Dashboard',
    },
    {
      key: '2fa',
      icon: <SafetyOutlined />,
      label: 'Two-Factor Auth',
    },
    {
      key: 'sessions',
      icon: <DesktopOutlined />,
      label: 'Session Management',
    },
    {
      key: 'api-keys',
      icon: <KeyOutlined />,
      label: 'API Keys',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Security Settings',
    },
    {
      key: 'audit-logs',
      icon: <FileTextOutlined />,
      label: 'Audit Logs',
    },
  ];

  const renderContent = () => {
    switch (selectedKey) {
      case 'dashboard':
        return <SecurityDashboard />;
      case '2fa':
        return <TwoFactorAuth />;
      case 'sessions':
        return <SessionManagement />;
      case 'api-keys':
        return <APIKeyManagement />;
      case 'settings':
        return <SecuritySettings />;
      case 'audit-logs':
        return <AuditLogs />;
      default:
        return <SecurityDashboard />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider
          width={250}
          style={{
            background: '#fff',
            boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ padding: '24px 16px', borderBottom: '1px solid #f0f0f0' }}>
            <Title level={4} style={{ margin: 0, textAlign: 'center' }}>
              <ShieldCheckOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
              Security Center
            </Title>
          </div>
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            onClick={({ key }) => setSelectedKey(key)}
            style={{ border: 'none', paddingTop: '16px' }}
            items={menuItems}
          />
        </Sider>
        <Layout>
          <Content style={{ background: '#f0f2f5' }}>
            {renderContent()}
          </Content>
        </Layout>
      </Layout>
    </div>
  );
};

export default SecurityPage;