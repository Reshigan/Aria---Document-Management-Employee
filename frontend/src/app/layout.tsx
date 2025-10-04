'use client';

import { Inter } from 'next/font/google';
import '../styles/globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ConfigProvider } from 'antd';
import { ariaTheme } from '@/styles/theme';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>ARIA - AI Document Intelligence</title>
        <meta name="description" content="AI-Powered Document Management System with OCR, data extraction, and intelligent processing" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/aria-avatar.svg" />
        <meta name="theme-color" content="#1890ff" />
      </head>
      <body className={inter.className}>
        <ConfigProvider theme={ariaTheme}>
          <AuthProvider>{children}</AuthProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}
