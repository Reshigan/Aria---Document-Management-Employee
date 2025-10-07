import type { ThemeConfig } from 'antd';

export const ariaTheme: ThemeConfig = {
  token: {
    // Corporate Professional Colors - Navy Blue representing trust, stability, and professionalism
    colorPrimary: '#003d82',
    colorSuccess: '#2e7d32',
    colorWarning: '#ed6c02',
    colorError: '#d32f2f',
    colorInfo: '#0288d1',
    
    // Typography
    fontSize: 14,
    fontSizeHeading1: 38,
    fontSizeHeading2: 30,
    fontSizeHeading3: 24,
    
    // Border Radius
    borderRadius: 6,
    borderRadiusLG: 8,
    
    // Box Shadow
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
  },
  
  components: {
    Button: {
      controlHeight: 40,
      primaryShadow: '0 2px 8px rgba(0, 61, 130, 0.20)',
    },
    Card: {
      borderRadiusLG: 8,
    },
  },
};

export const gradients = {
  primary: 'linear-gradient(135deg, #003d82 0%, #0059b3 100%)',
  brand: 'linear-gradient(135deg, #003d82 0%, #0059b3 50%, #0288d1 100%)',
};

export default ariaTheme;
