import type { ThemeConfig } from 'antd';

export const ariaTheme: ThemeConfig = {
  token: {
    // Primary Colors - Deep Blue representing trust and intelligence
    colorPrimary: '#1890ff',
    colorSuccess: '#52c41a',
    colorWarning: '#fa8c16',
    colorError: '#f5222d',
    colorInfo: '#13c2c2',
    
    // Typography
    fontSize: 14,
    fontSizeHeading1: 38,
    fontSizeHeading2: 30,
    fontSizeHeading3: 24,
    
    // Border Radius
    borderRadius: 8,
    borderRadiusLG: 12,
    
    // Box Shadow
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  },
  
  components: {
    Button: {
      controlHeight: 40,
      primaryShadow: '0 2px 8px rgba(24, 144, 255, 0.15)',
    },
    Card: {
      borderRadiusLG: 12,
    },
  },
};

export const gradients = {
  primary: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
  brand: 'linear-gradient(135deg, #1890ff 0%, #722ed1 50%, #13c2c2 100%)',
};

export default ariaTheme;
