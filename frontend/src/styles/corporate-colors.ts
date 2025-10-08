/**
 * Corporate Color Palette - Professional & Elegant
 * 
 * This color scheme provides a sophisticated, corporate look and feel
 * suitable for enterprise document management systems.
 */

export const corporateColors = {
  // Primary Colors - Navy & Slate
  primary: {
    darker: '#1a2332',    // Deep Navy - Headers, important elements
    dark: '#2c3e50',      // Navy - Primary buttons, main elements
    base: '#34495e',      // Slate Blue - Default state
    light: '#546e7a',     // Light Slate - Hover states
    lighter: '#78909c',   // Lighter - Disabled states
  },
  
  // Accent Colors - Teal (Professional & Modern)
  accent: {
    darker: '#138d75',    // Deep Teal - Active states
    dark: '#16a085',      // Teal - Links, highlights
    base: '#1abc9c',      // Light Teal - Success, completion
    light: '#48c9b0',     // Lighter - Hover states
    lighter: '#76d7c4',   // Lightest - Backgrounds
  },
  
  // Premium Accent - Gold (Trust & Quality)
  gold: {
    darker: '#d68910',    // Deep Gold
    dark: '#f39c12',      // Gold - Premium features, badges
    base: '#f1c40f',      // Bright Gold - Highlights
    light: '#f4d03f',     // Light Gold - Hover
    lighter: '#f9e79f',   // Lightest - Backgrounds
  },
  
  // Neutral Colors - Professional Grays
  neutral: {
    darkest: '#212121',   // Almost Black - Text
    darker: '#424242',    // Dark Gray - Subtext
    dark: '#616161',      // Medium Gray - Borders
    base: '#757575',      // Gray - Placeholders
    light: '#9e9e9e',     // Light Gray - Disabled
    lighter: '#e0e0e0',   // Lighter - Dividers
    lightest: '#f5f5f5',  // Off White - Backgrounds
  },
  
  // Semantic Colors - Status & Feedback
  semantic: {
    success: '#27ae60',   // Green - Success states
    warning: '#f39c12',   // Orange - Warnings
    error: '#e74c3c',     // Red - Errors
    info: '#3498db',      // Blue - Information
  },
  
  // Background Colors - Layered Depth
  background: {
    primary: '#ffffff',   // White - Main content
    secondary: '#fafafa', // Off White - Cards
    tertiary: '#f5f5f5',  // Light Gray - Sections
    dark: '#1a2332',      // Navy - Dark mode
    overlay: 'rgba(26, 35, 50, 0.95)', // Dark overlay
  },
  
  // Gradients - Modern & Professional
  gradients: {
    primary: 'linear-gradient(135deg, #1a2332 0%, #2c3e50 50%, #34495e 100%)',
    accent: 'linear-gradient(135deg, #16a085 0%, #1abc9c 100%)',
    gold: 'linear-gradient(135deg, #f39c12 0%, #f1c40f 100%)',
    subtle: 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)',
    hero: 'linear-gradient(135deg, #1a2332 0%, #2c3e50 50%, #16a085 100%)',
  },
};

// CSS Variables for easy theme switching
export const corporateColorsCSSVars = `
  :root {
    --color-primary-darker: ${corporateColors.primary.darker};
    --color-primary-dark: ${corporateColors.primary.dark};
    --color-primary: ${corporateColors.primary.base};
    --color-primary-light: ${corporateColors.primary.light};
    
    --color-accent-darker: ${corporateColors.accent.darker};
    --color-accent-dark: ${corporateColors.accent.dark};
    --color-accent: ${corporateColors.accent.base};
    --color-accent-light: ${corporateColors.accent.light};
    
    --color-gold-dark: ${corporateColors.gold.dark};
    --color-gold: ${corporateColors.gold.base};
    
    --gradient-primary: ${corporateColors.gradients.primary};
    --gradient-accent: ${corporateColors.gradients.accent};
    --gradient-hero: ${corporateColors.gradients.hero};
  }
`;

export default corporateColors;
