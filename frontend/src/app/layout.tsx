'use client';

import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ConfigProvider } from 'antd';
import { ariaTheme } from '@/styles/theme';
import Navigation from '@/components/Navigation';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>ARIA - Digital Twin Intelligence</title>
        <meta name="description" content="Advanced AI-Powered Document Management System with Neural Processing, OCR, and Intelligent Data Extraction" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/aria-avatar.svg" />
        <meta name="theme-color" content="#003d82" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className={inter.className}>
        <ConfigProvider theme={ariaTheme}>
          <AuthProvider>
            <div className="min-h-screen bg-gray-50">
              <Navigation />
              
              {/* Main Content */}
              <main className="md:ml-80 min-h-screen">
                <div className="relative z-10">
                  {children}
                </div>
              </main>
            </div>
          </AuthProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}
