import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles, LayoutDashboard, Search, Bot, FileText, Settings } from 'lucide-react';

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  target?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to ARIA ERP',
    description: 'ARIA is your AI-powered business management platform. Let us show you around the key features that will help you run your business more efficiently.',
    icon: <Sparkles className="h-8 w-8 text-blue-500" />,
  },
  {
    id: 'dashboard',
    title: 'Executive Dashboard',
    description: 'Your dashboard gives you a real-time overview of your business. View key metrics, pending approvals, alerts, and recent activity all in one place.',
    icon: <LayoutDashboard className="h-8 w-8 text-green-500" />,
    target: '[data-tour="dashboard"]',
  },
  {
    id: 'search',
    title: 'Quick Search (Ctrl+K)',
    description: 'Press Ctrl+K (or Cmd+K on Mac) anytime to open the command palette. Search for anything, navigate quickly, or create new records instantly.',
    icon: <Search className="h-8 w-8 text-purple-500" />,
    target: '[data-tour="search"]',
  },
  {
    id: 'aria-ai',
    title: 'Ask ARIA - AI Assistant',
    description: 'ARIA is your intelligent assistant. Ask questions about your data, get insights, generate reports, or let ARIA help you with complex tasks.',
    icon: <Bot className="h-8 w-8 text-indigo-500" />,
    target: '[data-tour="aria"]',
  },
  {
    id: 'modules',
    title: 'Business Modules',
    description: 'Access all your business functions from the navigation menu: Sales, Purchasing, Inventory, Manufacturing, HR, Finance, and more. Everything is connected.',
    icon: <FileText className="h-8 w-8 text-orange-500" />,
    target: '[data-tour="menu"]',
  },
  {
    id: 'automation',
    title: 'Automation Bots',
    description: 'ARIA includes 67 automation bots that work 24/7 to handle routine tasks: invoice processing, collections, inventory alerts, and more. They run automatically every hour.',
    icon: <Bot className="h-8 w-8 text-cyan-500" />,
    target: '[data-tour="bots"]',
  },
  {
    id: 'settings',
    title: 'Customize Your Experience',
    description: 'Personalize ARIA to fit your workflow. Toggle dark mode, set up keyboard shortcuts, configure notifications, and more in Settings.',
    icon: <Settings className="h-8 w-8 text-gray-500" />,
    target: '[data-tour="settings"]',
  },
];

interface OnboardingTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

export default function OnboardingTour({ onComplete, onSkip }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const step = tourSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tourSteps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('aria-onboarding-complete', 'true');
    setIsVisible(false);
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem('aria-onboarding-complete', 'true');
    setIsVisible(false);
    onSkip();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentStep]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Tour Card */}
      <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Progress Bar */}
        <div className="h-1 bg-gray-200 dark:bg-gray-700">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / tourSteps.length) * 100}%` }}
          />
        </div>

        {/* Close Button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-2 text-gray-300 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Content */}
        <div className="p-8 pt-6">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-2xl">
              {step.icon}
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-3">
            {step.title}
          </h2>

          {/* Description */}
          <p className="text-center text-gray-600 dark:text-gray-300 leading-relaxed">
            {step.description}
          </p>

          {/* Step Indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {tourSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentStep 
                    ? 'w-6 bg-blue-500' 
                    : index < currentStep 
                      ? 'bg-blue-300' 
                      : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-200"
          >
            Skip tour
          </button>

          <div className="flex items-center gap-3">
            {!isFirstStep && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg shadow-blue-500/25"
            >
              {isLastStep ? 'Get Started' : 'Next'}
              {!isLastStep && <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function useOnboarding() {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem('aria-onboarding-complete');
    if (!completed) {
      // Delay showing tour to let the app load
      const timer = setTimeout(() => setShowTour(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const resetTour = () => {
    localStorage.removeItem('aria-onboarding-complete');
    setShowTour(true);
  };

  return { showTour, setShowTour, resetTour };
}
