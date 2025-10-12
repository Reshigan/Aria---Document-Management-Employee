import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import {
  HomeIcon,
  DocumentIcon,
  CloudArrowUpIcon,
  MagnifyingGlassIcon,
  CogIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  UsersIcon,
  ChartBarIcon,
  BellIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import VantaXHeader from './VantaXHeader'
import VantaXFooter from './VantaXFooter'

export default function Layout({ children, user }) {
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('token')
    delete axios.defaults.headers.common['Authorization']
    router.push('/')
  }

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/documents',
      icon: <FileOutlined />,
      label: 'Documents',
      children: [
        {
          key: '/documents',
          label: 'Browse All',
        },
        {
          key: '/documents/upload',
          label: 'Upload New',
        },
      ],
    },
    {
      key: '/search',
      icon: <SearchOutlined />,
      label: 'Search',
    },
    ...(user?.role === 'admin' ? [
      {
        key: '/admin',
        icon: <TeamOutlined />,
        label: 'Admin',
        children: [
          {
            key: '/admin',
            label: 'Dashboard',
          },
          {
            key: '/admin/users',
            label: 'Users',
          },
          {
            key: '/admin/settings',
            label: 'Settings',
          },
        ],
      },
    ] : []),
  ]

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
      onClick: () => router.push('/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => router.push('/settings'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
    },
  ]

  const handleMenuClick = ({ key }) => {
    router.push(key)
  }

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        style={{
          background: 'linear-gradient(135deg, #1a2332 0%, #2c3e50 100%)',
        }}
      >
        <div className="logo">
          <div className="logo-content">
            {!collapsed ? (
              <>
                <div className="vx-logo">VX</div>
                <div className="logo-text">
                  <div className="logo-title">ARIA</div>
                  <div className="logo-subtitle">Document AI</div>
                </div>
              </>
            ) : (
              <div className="vx-logo">VX</div>
            )}
          </div>
        </div>
        
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[router.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ 
            background: 'transparent',
            border: 'none'
          }}
        />
      </Sider>
      
      <AntLayout>
        <Header 
          style={{ 
            padding: '0 24px', 
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />
          
          <Space>
            <span style={{ color: '#666' }}>Welcome, {user?.username}</span>
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              arrow
            >
              <Button type="text" style={{ height: 'auto', padding: '4px 8px' }}>
                <Avatar 
                  size="small" 
                  icon={<UserOutlined />} 
                  style={{ 
                    backgroundColor: '#1890ff',
                    marginRight: '8px'
                  }} 
                />
                {user?.username}
              </Button>
            </Dropdown>
          </Space>
        </Header>
        
        <Content
          style={{
            margin: '0',
            padding: '0',
            minHeight: 280,
            background: '#f0f2f5',
          }}
        >
          {children}
        </Content>
        
        <VantaXFooter />
      </AntLayout>

      <style jsx>{`
        .logo {
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 16px;
        }
        .logo-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .vx-logo {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #16a085 0%, #f39c12 100%);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          color: white;
          box-shadow: 0 4px 12px rgba(22, 160, 133, 0.3);
        }
        .logo-text {
          color: white;
        }
        .logo-title {
          font-size: 18px;
          font-weight: bold;
          background: linear-gradient(135deg, #16a085 0%, #f39c12 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1;
        }
        .logo-subtitle {
          font-size: 11px;
          opacity: 0.8;
          line-height: 1;
          margin-top: 2px;
        }
      `}</style>
    </AntLayout>
  )
}