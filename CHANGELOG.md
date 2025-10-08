# Changelog

All notable changes to ARIA will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2025-10-07

### 🎨 Added - Corporate Redesign
- **Professional Corporate Icon System**
  - New `aria-corporate-icon.svg` - elegant document management icon with AI badge
  - New `favicon-corporate.svg` - simplified favicon for browser tabs
  - Premium navy, slate, teal, and gold color palette
  - Professional gradients and depth effects

- **Complete Password Reset System**
  - New `/forgot-password` page with email input form
  - New `/reset-password` page with password strength validation
  - Backend API endpoints: `POST /api/auth/forgot-password` and `POST /api/auth/reset-password`
  - Database table `password_reset_tokens` with 48-hour expiration
  - Token generation, validation, and usage tracking
  - Email enumeration prevention
  - Password strength requirements enforcement

- **Corporate Color Palette**
  - Primary Navy: #1a2332 (trust & authority)
  - Primary Slate: #2c3e50 (professionalism)
  - Accent Teal: #16a085 (innovation & clarity)
  - Premium Gold: #f39c12 (premium features)
  - Success Green: #27ae60
  - Error Red: #e74c3c

### 🐛 Fixed
- Fixed 404 error on `/forgot-password` (page now fully implemented)
- Fixed 404 error on `/reset-password` (page now fully implemented)
- Fixed missing password reset API endpoints

### 🎨 Changed
- Updated all pages to use new corporate color scheme
- Replaced old blue gradients (#003d82, #0059b3, #0288d1) with navy/slate/teal
- Updated Ant Design theme to match corporate colors
- Enhanced button hover states and interactive elements
- Improved visual hierarchy and professional appearance

### 📝 Documentation
- Added `SYSTEM_TEST_PLAN.md` - comprehensive testing guide
- Added `DEPLOYMENT_GUIDE.md` - step-by-step deployment instructions
- Added `frontend/src/styles/corporate-colors.ts` - color palette reference

### 🔒 Security
- Password reset tokens are random and unpredictable (100 characters)
- Tokens expire after 48 hours
- One-time use tokens (marked as used after reset)
- Password strength validation (8+ chars, uppercase, lowercase, number, special char)
- Email enumeration prevention in forgot password flow

## [Unreleased]

### Planned
- Email template for password reset notifications
- Multi-language support for password reset
- Two-factor authentication integration

## [2.0.0] - 2025-01-04

### Added
- Complete project documentation
- Architecture documentation with microservices design
- Comprehensive installation guide (Docker, Kubernetes, Local)
- Configuration reference with all environment variables
- Contributing guidelines
- MIT License
- .gitignore for project files
- .env.example template

### Documentation
- README.md with project overview and quick start
- ARCHITECTURE.md with detailed system design
- INSTALLATION.md with multiple installation methods
- CONFIGURATION.md with complete configuration reference
- CONTRIBUTING.md with development guidelines

### Infrastructure
- Docker and Docker Compose support
- Kubernetes deployment manifests (planned)
- CI/CD pipeline configuration (planned)

## [1.0.0] - Initial Concept

### Planned Features
- AI-powered document processing
- SAP integration (RFC/BAPI and REST)
- Multi-channel communication (Email, Slack, Teams)
- Natural language understanding
- Vision models integration (Donut, LayoutLMv3, TrOCR, PaddleOCR)
- Web-based user interface
- RESTful API
- Real-time notifications
- Batch processing
- Multi-language support
- Handwriting recognition

---

## Version History

### Version 2.x Series
- **2.0.0** - Complete rewrite with microservices architecture

### Version 1.x Series
- **1.0.0** - Initial concept and planning

---

## Types of Changes

- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** in case of vulnerabilities

---

[Unreleased]: https://github.com/Reshigan/Aria---Document-Management-Employee/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/Reshigan/Aria---Document-Management-Employee/releases/tag/v2.0.0
[1.0.0]: https://github.com/Reshigan/Aria---Document-Management-Employee/releases/tag/v1.0.0
