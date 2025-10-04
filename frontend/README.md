# ARIA Frontend

React/Next.js frontend for ARIA Document Management System.

## Quick Start

### Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   - Navigate to http://localhost:3000

### Build

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── src/
│   ├── app/                # Next.js App Router
│   ├── components/         # Reusable components
│   │   ├── common/        # Common UI components
│   │   ├── features/      # Feature-specific components
│   │   └── layouts/       # Layout components
│   ├── features/          # Feature modules
│   │   ├── auth/          # Authentication
│   │   ├── dashboard/     # Dashboard
│   │   ├── documents/     # Document management
│   │   ├── chat/          # Chat interface
│   │   └── reports/       # Reports
│   ├── services/          # API services
│   ├── store/             # Redux store
│   ├── hooks/             # Custom React hooks
│   ├── types/             # TypeScript types
│   └── utils/             # Utilities
├── public/                # Static assets
└── tests/                 # Tests
```

## Features

- **Document Upload**: Drag-and-drop document upload with progress tracking
- **Real-time Processing**: WebSocket-based real-time updates
- **Chat Interface**: Natural language interaction with ARIA
- **Dashboard**: Overview of document processing statistics
- **Document Management**: View, search, and manage processed documents
- **SAP Integration**: View SAP posting status and details
- **Reports**: Analytics and reporting

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI Library**: Ant Design
- **State Management**: Redux Toolkit
- **API Client**: Axios + React Query
- **Real-time**: Socket.IO
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm run format` - Format code with Prettier
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_APP_NAME=ARIA
```

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines.
