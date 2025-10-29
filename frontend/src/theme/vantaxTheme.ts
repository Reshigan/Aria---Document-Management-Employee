/**
 * Vanta X Theme Configuration for Aria Dashboard
 * Matches the professional, corporate design of vantax.co.za
 */

export const vantaxTheme = {
  colors: {
    // Primary Colors (Navy Blue - from Vanta X)
    primary: {
      50: '#e8eaf6',
      100: '#c5cae9',
      200: '#9fa8da',
      300: '#7986cb',
      400: '#5c6bc0',
      500: '#3f51b5',
      600: '#3949ab',
      700: '#303f9f',
      800: '#283593',
      900: '#1a237e',
      main: '#1a1f3a', // Dark navy - main brand color
      dark: '#0f1220',
      light: '#2a3154',
    },
    
    // Secondary/Accent Colors (Gold/Yellow - from Vanta X)
    accent: {
      50: '#fff9e6',
      100: '#fff3cc',
      200: '#ffe799',
      300: '#ffdb66',
      400: '#ffcf33',
      500: '#f5b800', // Main gold accent
      600: '#cc9900',
      700: '#a37a00',
      800: '#7a5c00',
      900: '#523d00',
      main: '#f5b800',
      light: '#ffc933',
      dark: '#cc9900',
    },
    
    // Background Colors
    background: {
      default: '#f8f9fa', // Light gray background
      paper: '#ffffff',
      dark: '#1a1f3a',
      darker: '#0f1220',
    },
    
    // Text Colors
    text: {
      primary: '#1a1f3a',
      secondary: '#6c757d',
      disabled: '#adb5bd',
      inverse: '#ffffff',
    },
    
    // Status Colors
    status: {
      success: '#28a745',
      warning: '#ffc107',
      error: '#dc3545',
      info: '#17a2b8',
    },
    
    // Sidebar Colors
    sidebar: {
      background: '#1a1f3a',
      hover: '#2a3154',
      active: '#f5b800',
      text: '#ffffff',
      textMuted: '#a0a6b8',
    },
    
    // Card Colors
    card: {
      background: '#ffffff',
      border: '#e9ecef',
      shadow: 'rgba(0, 0, 0, 0.1)',
    },
  },
  
  shadows: {
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  
  spacing: {
    xs: '0.25rem',  // 4px
    sm: '0.5rem',   // 8px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
    '2xl': '3rem',  // 48px
  },
  
  transitions: {
    fast: '150ms ease-in-out',
    normal: '250ms ease-in-out',
    slow: '350ms ease-in-out',
  },
};

export type VantaxTheme = typeof vantaxTheme;
