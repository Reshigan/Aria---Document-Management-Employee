'use client';

import React from 'react';
import { Layout, Menu, Typography } from 'antd';
import { usePathname, useRouter } from 'next/navigation';
import {
  DashboardOutlined,
  BarChartOutlined,
  FileTextOutlined,
  SettingOutlined,
  AppstoreOutlined
} from '@ant-design/icons';

const { Sider, Content } = Layout;
const { Title } = Typography;

interface AnalyticsLayoutProps {
  children: React.ReactNode;
}

export default function AnalyticsLayout({ children }: AnalyticsLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const menuItems = [
    {
      key: '/analytics',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/analytics/reports',
      icon: <FileTextOutlined />,
      label: 'Reports',
    },
    {
      key: '/analytics/widgets',
      icon: <AppstoreOutlined />,
      label: 'Widgets',
    }
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    router.push(key);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={250} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
          <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
            <BarChartOutlined /> Analytics
          </Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ border: 'none' }}
        />
      </Sider>
      <Layout>
        <Content style={{ background: '#f5f5f5' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}