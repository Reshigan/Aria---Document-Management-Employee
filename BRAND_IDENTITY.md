# 🎨 ARIA Brand Identity Guide

## Overview

**ARIA** - AI-Powered Responsive Intelligent Assistant for Document Intelligence

This guide defines the visual identity, personality, and design principles for the ARIA platform.

---

## 🎭 Brand Personality

### Core Attributes
- **Intelligent**: Cutting-edge AI technology
- **Trustworthy**: Enterprise-grade security and reliability
- **Efficient**: Lightning-fast document processing
- **Friendly**: Approachable and helpful AI assistant
- **Modern**: Contemporary design and innovation
- **Professional**: Business-ready solution

### Voice & Tone
- Professional yet conversational
- Helpful and supportive
- Clear and concise
- Technically accurate without jargon
- Positive and encouraging

---

## 🎨 Visual Identity

### Logo & Avatar

#### ARIA Avatar (`/public/aria-avatar.svg`)
- **Design**: Friendly AI assistant representation
- **Colors**: Blue, purple, cyan gradient
- **Features**:
  - Glowing digital eyes (trustworthy and intelligent)
  - Friendly smile (approachable)
  - Digital lines and neural network patterns (AI technology)
  - Floating particles (innovation and movement)
  - Golden sparkles (excellence and quality)

#### Favicon (`/public/favicon.svg`)
- **Design**: Document with AI network overlay
- **Usage**: Browser tabs, bookmarks, PWA icon
- **Format**: SVG (scalable), with fallback

#### Logo (`/public/logo.svg`)
- **Design**: ARIA avatar + text + tagline
- **Tagline**: "AI Document Intelligence"
- **Usage**: Headers, marketing materials, documentation

---

## 🎨 Color Palette

### Primary Colors

#### Trust Blue
```
Primary:    #1890ff (Main brand color)
Light:      #40a9ff
Lighter:    #69c0ff
Dark:       #096dd9
Darkest:    #0050b3
```
**Usage**: Primary buttons, links, headers, key UI elements

#### Innovation Purple
```
Secondary:  #722ed1
Light:      #9254de
Lighter:    #b37feb
Dark:       #531dab
Darkest:    #391085
```
**Usage**: Secondary elements, gradients, accents

#### Energy Cyan
```
Accent:     #13c2c2
Light:      #36cfc9
Lighter:    #5cdbd3
Dark:       #08979c
Darkest:    #006d75
```
**Usage**: Highlights, active states, AI features

### Status Colors

#### Success (Green)
```
Main:       #52c41a
Light:      #95de64
Dark:       #389e0d
```
**Usage**: Completed documents, success messages

#### Warning (Orange)
```
Main:       #fa8c16
Light:      #ffc53d
Dark:       #d46b08
```
**Usage**: Processing status, warnings

#### Error (Red)
```
Main:       #f5222d
Light:      #ff7875
Dark:       #cf1322
```
**Usage**: Failed uploads, errors, delete actions

### Neutral Colors
```
White:      #ffffff
Gray 50:    #fafafa
Gray 100:   #f5f5f5
Gray 200:   #e8e8e8
Gray 400:   #bfbfbf
Gray 600:   #595959
Gray 800:   #262626
Black:      #000000
```

---

## 🎨 Gradients

### Brand Gradients

```css
/* Primary Gradient */
background: linear-gradient(135deg, #1890ff 0%, #722ed1 100%);

/* Full Brand Gradient */
background: linear-gradient(135deg, #1890ff 0%, #722ed1 50%, #13c2c2 100%);

/* Subtle Background */
background: linear-gradient(135deg, #f0f2f5 0%, #ffffff 100%);

/* Hero Background */
background: linear-gradient(135deg, #e6f7ff 0%, #f9f0ff 50%, #e6fffb 100%);
```

### Gradient Usage
- **Headers**: Brand gradient for hero sections
- **Buttons**: Primary gradient for CTAs
- **Cards**: Subtle gradients for depth
- **Backgrounds**: Light gradients for visual interest

---

## 📐 Typography

### Font Family
```
Primary: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
         'Helvetica Neue', Arial, sans-serif
```

### Font Sizes
```
Display:    56px (Bold) - Hero headlines
H1:         38px (Bold) - Page titles
H2:         30px (Bold) - Section headers
H3:         24px (Bold) - Subsections
H4:         20px (Semibold) - Card titles
H5:         16px (Semibold) - Labels
Body:       14px (Regular) - Main content
Small:      12px (Regular) - Captions
```

### Font Weights
- **Bold**: 700 - Headlines, emphasis
- **Semibold**: 600 - Subheadings, buttons
- **Medium**: 500 - Navigation, tabs
- **Regular**: 400 - Body text

---

## 🎬 Animations

### Animation Types

#### Entrance Animations
```css
/* Fade In */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
Duration: 0.5s

/* Slide Up */
@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
Duration: 0.5s

/* Scale In */
@keyframes scaleIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
Duration: 0.4s
```

#### Continuous Animations
```css
/* Float */
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
}
Duration: 3s (infinite)

/* Pulse */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
Duration: 2s (infinite)

/* Glow */
@keyframes glow {
  0%, 100% { box-shadow: 0 0 20px rgba(24, 144, 255, 0.4); }
  50% { box-shadow: 0 0 40px rgba(24, 144, 255, 0.8); }
}
Duration: 2s (infinite)
```

### Animation Timing
- **Fast**: 0.15s - Micro-interactions
- **Base**: 0.2s - Standard transitions
- **Slow**: 0.3s - Complex transitions
- **Entrance**: 0.5s - Page/component load
- **Float**: 3s - Ambient motion

---

## 📦 Components

### Buttons

#### Primary Button
- **Background**: Linear gradient (blue to purple)
- **Border Radius**: 10px
- **Height**: 40px (base), 48px (large)
- **Shadow**: 0 2px 8px rgba(24, 144, 255, 0.15)
- **Hover**: Scale(1.02) + enhanced shadow

#### Secondary Button
- **Background**: White
- **Border**: 1px solid primary color
- **Border Radius**: 10px
- **Hover**: Border color darkens

### Cards

#### Standard Card
- **Background**: White
- **Border Radius**: 16px
- **Border**: 1px solid #f0f0f0
- **Shadow**: 0 2px 8px rgba(0, 0, 0, 0.08)
- **Hover**: 
  - Transform: translateY(-4px)
  - Shadow: 0 8px 24px rgba(0, 0, 0, 0.12)
  - Border color: primary

#### Document Card
- **Header**: Gradient background (blue-purple tint)
- **Icon**: Large file type icon
- **Status**: Colored tag with icon
- **Actions**: Primary view + secondary download
- **Processing**: Animated gradient border

### Status Badges
```html
<!-- Processing -->
<div class="status-processing">
  • Processing (animated pulse)
</div>

<!-- Completed -->
<div class="status-success">
  ✓ Completed
</div>

<!-- Failed -->
<div class="status-error">
  ✗ Failed
</div>
```

---

## 🎯 Layout Principles

### Spacing System
```
xs:  8px   - Tight spacing
sm:  12px  - Compact spacing
md:  16px  - Default spacing
lg:  24px  - Section spacing
xl:  32px  - Major sections
xxl: 48px  - Hero sections
```

### Border Radius
```
xs:  4px   - Small elements
sm:  6px   - Inputs
md:  8px   - Buttons
lg:  12px  - Cards
xl:  16px  - Large cards
xxl: 24px  - Hero sections
```

### Shadows
```css
/* Soft */
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

/* Medium */
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);

/* Strong */
box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);

/* Extra Strong */
box-shadow: 0 12px 32px rgba(0, 0, 0, 0.20);
```

---

## 🌐 Responsive Design

### Breakpoints
```
xs:  < 576px   - Mobile
sm:  576px     - Large mobile
md:  768px     - Tablet
lg:  992px     - Desktop
xl:  1200px    - Large desktop
xxl: 1600px    - Extra large
```

### Mobile Considerations
- Stack cards vertically
- Full-width buttons on mobile
- Simplified navigation
- Touch-friendly targets (44px minimum)
- Reduced animation on low-power devices

---

## 🎨 Design Effects

### Glass Morphism
```css
.glass {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}
```

### Shimmer Effect (Loading)
```css
.shimmer {
  background: linear-gradient(
    90deg,
    #f0f0f0 0px,
    #e8e8e8 40px,
    #f0f0f0 80px
  );
  background-size: 1000px;
  animation: shimmer 1.5s infinite;
}
```

### Gradient Text
```css
.gradient-text {
  background: linear-gradient(135deg, #1890ff 0%, #722ed1 50%, #13c2c2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

---

## 📱 Icon Usage

### File Type Icons
- **PDF**: Red gradient (`#ff4d4f` to `#ff7875`)
- **Word**: Blue gradient (`#1890ff` to `#40a9ff`)
- **Excel**: Green gradient (`#52c41a` to `#95de64`)
- **Image**: Purple gradient (`#722ed1` to `#b37feb`)
- **Default**: Gray gradient (`#8c8c8c` to `#bfbfbf`)

### Status Icons
- **Pending**: ClockCircleOutlined
- **Processing**: SyncOutlined (spinning)
- **Completed**: CheckCircleOutlined
- **Failed**: WarningOutlined

### Action Icons
- **View**: EyeOutlined
- **Download**: DownloadOutlined
- **Delete**: DeleteOutlined
- **Edit**: EditOutlined
- **Upload**: CloudUploadOutlined
- **Chat**: MessageOutlined

---

## 🎬 Page Layouts

### Landing Page
1. **Hero Section**
   - Animated gradient background
   - Floating ARIA avatar
   - Bold headline with gradient text
   - Dual CTAs (primary + secondary)
   - Social proof (5-star rating)

2. **Features Section**
   - 3-column grid (responsive)
   - Icon + title + description cards
   - Hover animations
   - Staggered entrance animations

3. **CTA Section**
   - Full-width gradient card
   - Centered content
   - Single strong CTA

### Login/Register
- **Split Layout**: Branding left, form right
- **Animated Background**: Floating orbs
- **Gradient Form**: Rounded inputs
- **ARIA Avatar**: Animated, floating

### Dashboard
- **Header**: Logo + navigation + user menu
- **Stats Cards**: Icon + number + label
- **Document Grid**: Responsive card layout
- **Sidebar**: Navigation with icons

### Chat Interface
- **Header**: ARIA avatar + status + document selector
- **Messages**: Alternating user/AI bubbles
- **Quick Prompts**: Suggested questions
- **Input**: Text area + gradient send button

---

## ✅ Usage Guidelines

### Do's ✓
- Use brand gradients for primary actions
- Maintain consistent spacing
- Apply animations for delight
- Use ARIA avatar consistently
- Keep layouts clean and minimal
- Ensure high contrast for accessibility
- Test on mobile devices

### Don'ts ✗
- Don't use off-brand colors
- Don't over-animate
- Don't mix gradient styles
- Don't use low-quality images
- Don't neglect loading states
- Don't ignore accessibility
- Don't clutter interfaces

---

## 📦 Asset Inventory

### Brand Assets
```
/public/
├── favicon.svg          - Browser icon
├── logo.svg            - Full logo with text
├── aria-avatar.svg     - Main ARIA character
└── favicon.ico         - Legacy browser support
```

### Style Files
```
/src/styles/
├── globals.css         - Global styles & animations
└── theme.ts           - Ant Design theme config
```

### Components
```
/src/components/
├── ARIAChat.tsx       - Enhanced chat interface
└── DocumentCard.tsx   - Beautiful document cards
```

---

## 🎯 Brand Applications

### Email Templates
- Use ARIA avatar in header
- Apply brand gradient to headers
- Maintain 600px max width
- Include social proof

### Documentation
- Use gradient headers
- Include ARIA avatar for tips
- Apply syntax highlighting
- Consistent typography

### Social Media
- Profile: ARIA avatar
- Cover: Brand gradient with tagline
- Posts: Consistent color palette
- Hashtags: #ARIAai #DocumentIntelligence

---

## 📞 Support & Resources

### Design Files
- **Figma**: [Coming soon]
- **Style Guide**: This document
- **Component Library**: `/src/components/`

### Questions?
For brand identity questions or design assets, refer to this guide or contact the design team.

---

**ARIA Brand Identity Guide v1.0**  
*Last Updated: 2025-10-04*  
*© 2025 ARIA - AI Document Intelligence*
