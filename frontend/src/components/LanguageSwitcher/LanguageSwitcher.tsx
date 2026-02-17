import React, { useState } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../i18n';

interface LanguageSwitcherProps {
  variant?: 'icon' | 'dropdown' | 'full';
  className?: string;
}

export default function LanguageSwitcher({ variant = 'dropdown', className = '' }: LanguageSwitcherProps) {
  const { changeLanguage, currentLanguage, languages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const currentLang = languages.find(l => l.code === currentLanguage) || languages[0];

  if (variant === 'icon') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Change language"
        >
          <Globe className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </button>
        
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50">
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => {
                    changeLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    currentLanguage === lang.code ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="text-lg">{lang.flag}</span>
                  {lang.name}
                  {currentLanguage === lang.code && <Check className="h-4 w-4 ml-auto" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {languages.map(lang => (
          <button
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              currentLanguage === lang.code
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <span>{lang.flag}</span>
            {lang.name}
          </button>
        ))}
      </div>
    );
  }

  // Dropdown variant (default)
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <span className="text-lg">{currentLang.flag}</span>
        <span className="text-sm text-gray-700 dark:text-gray-300">{currentLang.name}</span>
        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50">
            {languages.map(lang => (
              <button
                key={lang.code}
                onClick={() => {
                  changeLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  currentLanguage === lang.code ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className="text-lg">{lang.flag}</span>
                {lang.name}
                {currentLanguage === lang.code && <Check className="h-4 w-4 ml-auto" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
