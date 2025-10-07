import type { ThemeConfig } from 'antd';

export const ariaTheme: ThemeConfig = {
  token: {
    // Corporate Professional Colors - Deep Navy & Teal for Trust & Innovation
    colorPrimary: '#1a365d',       // Deep Navy Blue - Trust & Stability
    colorSuccess: '#047857',        // Emerald Green - Success & Growth
    colorWarning: '#d97706',        // Amber - Attention & Energy
    colorError: '#c81e1e',          // Deep Red - Critical Actions
    colorInfo: '#0891b2',           // Teal - Information & Clarity
    
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
      primaryShadow: '0 4px 12px rgba(26, 54, 93, 0.25)',
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
      headerBg: '#1a365d',
      headerColor: '#ffffff',
      siderBg: '#f8fafc',
    },
  },
};

export const gradients = {
  primary: 'linear-gradient(135deg, #1a365d 0%, #2563eb 100%)',
  brand: 'linear-gradient(135deg, #1a365d 0%, #2563eb 50%, #0891b2 100%)',
  elegant: 'linear-gradient(135deg, #0f172a 0%, #1e40af 50%, #0891b2 100%)',
};

export default ariaTheme;
