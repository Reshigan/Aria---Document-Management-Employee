import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface ThemeToggleProps {
  variant?: 'icon' | 'dropdown' | 'buttons';
  className?: string;
}

export default function ThemeToggle({ variant = 'icon', className = '' }: ThemeToggleProps) {
  const { theme, actualTheme, setTheme, toggleTheme } = useTheme();

  if (variant === 'icon') {
    return (
      <button
        onClick={toggleTheme}
        className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${className}`}
        title={`Switch to ${actualTheme === 'light' ? 'dark' : 'light'} mode`}
      >
        {actualTheme === 'light' ? (
          <Moon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        ) : (
          <Sun className="h-5 w-5 text-yellow-500" />
        )}
      </button>
    );
  }

  if (variant === 'buttons') {
    return (
      <div className={`flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}>
        <button
          onClick={() => setTheme('light')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
            theme === 'light' 
              ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' 
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Sun className="h-4 w-4" />
          Light
        </button>
        <button
          onClick={() => setTheme('dark')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
            theme === 'dark' 
              ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' 
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Moon className="h-4 w-4" />
          Dark
        </button>
        <button
          onClick={() => setTheme('system')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
            theme === 'system' 
              ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' 
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Monitor className="h-4 w-4" />
          System
        </button>
      </div>
    );
  }

  // Dropdown variant
  return (
    <div className={`relative group ${className}`}>
      <button
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="Theme settings"
      >
        {actualTheme === 'light' ? (
          <Sun className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        ) : (
          <Moon className="h-5 w-5 text-gray-300" />
        )}
      </button>
      <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
        <button
          onClick={() => setTheme('light')}
          className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
            theme === 'light' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
          }`}
        >
          <Sun className="h-4 w-4" />
          Light
          {theme === 'light' && <span className="ml-auto">✓</span>}
        </button>
        <button
          onClick={() => setTheme('dark')}
          className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
            theme === 'dark' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
          }`}
        >
          <Moon className="h-4 w-4" />
          Dark
          {theme === 'dark' && <span className="ml-auto">✓</span>}
        </button>
        <button
          onClick={() => setTheme('system')}
          className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
            theme === 'system' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
          }`}
        >
          <Monitor className="h-4 w-4" />
          System
          {theme === 'system' && <span className="ml-auto">✓</span>}
        </button>
      </div>
    </div>
  );
}
