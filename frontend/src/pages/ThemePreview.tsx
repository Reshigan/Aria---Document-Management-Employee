import React from 'react';
import { MainLayout } from '../components/layout/MainLayout';

const ThemePreview: React.FC = () => {
  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>
              Vanta X Theme Preview
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Professional corporate design matching vantax.co.za
            </p>
          </div>

          {/* Color Palette */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700-md p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
              Color Palette
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div 
                  className="h-24 rounded-lg mb-2 flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  Navy Blue
                </div>
                <p className="text-sm font-mono">#1a1f3a</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Primary Color</p>
              </div>
              <div className="text-center">
                <div 
                  className="h-24 rounded-lg mb-2 flex items-center justify-center font-bold"
                  style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-primary)' }}
                >
                  Gold
                </div>
                <p className="text-sm font-mono">#f5b800</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Accent Color</p>
              </div>
              <div className="text-center">
                <div 
                  className="h-24 rounded-lg mb-2 flex items-center justify-center font-bold border-2"
                  style={{ backgroundColor: 'var(--color-bg-default)', color: 'var(--color-primary)' }}
                >
                  Light Gray
                </div>
                <p className="text-sm font-mono">#f8f9fa</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Background</p>
              </div>
            </div>
          </div>

          {/* Theme Features */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700-md p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
              Theme Features
            </h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <div 
                  className="w-3 h-3 rounded-full mt-1.5 mr-3"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                />
                <div>
                  <h3 className="font-semibold" style={{ color: 'var(--color-primary)' }}>
                    Navy Blue Sidebar
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Professional dark sidebar with navy blue background matching Vanta X branding
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div 
                  className="w-3 h-3 rounded-full mt-1.5 mr-3"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                />
                <div>
                  <h3 className="font-semibold" style={{ color: 'var(--color-primary)' }}>
                    Gold Accents
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Gold highlighting for active menu items and important elements
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div 
                  className="w-3 h-3 rounded-full mt-1.5 mr-3"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                />
                <div>
                  <h3 className="font-semibold" style={{ color: 'var(--color-primary)' }}>
                    Smooth Transitions
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Hover effects with 250ms transitions for professional feel
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div 
                  className="w-3 h-3 rounded-full mt-1.5 mr-3"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                />
                <div>
                  <h3 className="font-semibold" style={{ color: 'var(--color-primary)' }}>
                    Brand Consistency
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Colors and design match vantax.co.za corporate identity
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700-md p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
              Button Styles
            </h2>
            <div className="flex flex-wrap gap-4">
              <button 
                className="px-6 py-3 rounded-lg font-semibold text-white transition-colors"
                style={{ backgroundColor: 'var(--color-accent)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent-light)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent)'}
              >
                Primary Button
              </button>
              <button 
                className="px-6 py-3 rounded-lg font-semibold text-white transition-colors"
                style={{ backgroundColor: 'var(--color-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-light)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary)'}
              >
                Secondary Button
              </button>
              <button 
                className="px-6 py-3 rounded-lg font-semibold transition-colors border-2"
                style={{ 
                  borderColor: 'var(--color-accent)',
                  color: 'var(--color-accent)'
                }}
              >
                Outlined Button
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700-md p-6 border-l-4" style={{ borderColor: 'var(--color-accent)' }}>
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Total Agents</h3>
              <p className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>67</p>
              <p className="text-sm" style={{ color: 'var(--color-accent)' }}>+12% this month</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700-md p-6 border-l-4" style={{ borderColor: 'var(--color-accent)' }}>
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">ERP Modules</h3>
              <p className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>8</p>
              <p className="text-sm" style={{ color: 'var(--color-accent)' }}>All Active</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700-md p-6 border-l-4" style={{ borderColor: 'var(--color-accent)' }}>
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Confidence</h3>
              <p className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>94%</p>
              <p className="text-sm" style={{ color: 'var(--color-accent)' }}>Excellent</p>
            </div>
          </div>

          {/* Sidebar Instructions */}
          <div 
            className="rounded-xl shadow-lg p-6 text-white"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <h2 className="text-2xl font-semibold mb-4">
              Check Out the Sidebar! 👈
            </h2>
            <p className="mb-4">
              The main theme changes are visible in the sidebar on the left:
            </p>
            <ul className="space-y-2 ml-6">
              <li>• Navy blue background (#1a1f3a)</li>
              <li>• Gold logo badge</li>
              <li>• White text for menu items</li>
              <li>• Gold highlighting for the active page</li>
              <li>• Smooth hover effects</li>
            </ul>
            <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: 'rgba(245, 184, 0, 0.1)' }}>
              <p className="text-sm" style={{ color: 'var(--color-accent)' }}>
                💡 <strong>Try hovering</strong> over different menu items to see the interactive states!
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ThemePreview;
