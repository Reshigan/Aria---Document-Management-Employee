import type { ThemeConfig } from 'antd';

export const ariaTheme: ThemeConfig = {
  token: {
    // Corporate Professional Colors - Navy, Slate & Teal
    colorPrimary: '#2c3e50',       // Navy Slate - Trust & Professionalism
    colorSuccess: '#27ae60',        // Corporate Green - Success & Growth
    colorWarning: '#f39c12',        // Gold - Attention & Premium
    colorError: '#e74c3c',          // Corporate Red - Critical Actions
    colorInfo: '#16a085',           // Teal - Information & Innovation
    
    // Typography - Modern & Professional
    fontSize: 14,
    fontSizeHeading1: 38,
    fontSizeHeading2: 30,
    fontSizeHeading3: 24,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    
    // Border Radius - Sleek & Modern
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    
    // Box Shadow - Elegant Depth
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    boxShadowSecondary: '0 2px 6px rgba(0, 0, 0, 0.06)',
    
    // Colors - Professional Palette
    colorBgContainer: '#ffffff',
    colorBgElevated: '#fafafa',
    colorBorder: '#e5e7eb',
    colorText: '#1f2937',
    colorTextSecondary: '#6b7280',
  },
  
  components: {
    Button: {
      controlHeight: 42,
      primaryShadow: '0 4px 12px rgba(44, 62, 80, 0.25)',
      borderRadius: 8,
    },
    Card: {
      borderRadiusLG: 12,
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
    },
    Input: {
      controlHeight: 42,
      borderRadius: 8,
    },
    Layout: {
      headerBg: '#2c3e50',
      headerColor: '#ffffff',
      siderBg: '#f8fafc',
    },
  },
};

export const gradients = {
  primary: 'linear-gradient(135deg, #1a2332 0%, #2c3e50 100%)',
  brand: 'linear-gradient(135deg, #1a2332 0%, #2c3e50 50%, #16a085 100%)',
  elegant: 'linear-gradient(135deg, #1a2332 0%, #2c3e50 50%, #16a085 100%)',
  accent: 'linear-gradient(135deg, #16a085 0%, #1abc9c 100%)',
  gold: 'linear-gradient(135deg, #f39c12 0%, #f1c40f 100%)',
};

export default ariaTheme;
