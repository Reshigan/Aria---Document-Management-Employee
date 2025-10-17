import React from 'react';
import { motion } from 'framer-motion';

const LoadingSpinner = ({ 
  size = 'md', 
  color = 'blue', 
  variant = 'spin',
  className = '',
  text = null,
  fullScreen = false
}) => {
  const sizes = {
    xs: 'h-4 w-4',
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const colors = {
    blue: 'text-blue-500',
    green: 'text-green-500',
    red: 'text-red-500',
    yellow: 'text-yellow-500',
    purple: 'text-purple-500',
    gray: 'text-gray-500',
    white: 'text-white'
  };

  const SpinVariant = () => (
    <motion.div
      className={`${sizes[size]} ${colors[color]} ${className}`}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    >
      <svg fill="none" viewBox="0 0 24 24">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </motion.div>
  );

  const PulseVariant = () => (
    <motion.div
      className={`${sizes[size]} ${colors[color]} rounded-full bg-current ${className}`}
      animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    />
  );

  const DotsVariant = () => (
    <div className={`flex space-x-1 ${className}`}>
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className={`w-2 h-2 ${colors[color]} bg-current rounded-full`}
          animate={{ y: [0, -8, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: index * 0.1,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );

  const BarsVariant = () => (
    <div className={`flex space-x-1 ${className}`}>
      {[0, 1, 2, 3].map((index) => (
        <motion.div
          key={index}
          className={`w-1 h-6 ${colors[color]} bg-current rounded-full`}
          animate={{ scaleY: [1, 2, 1] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: index * 0.1,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );

  const RippleVariant = () => (
    <div className={`relative ${sizes[size]} ${className}`}>
      {[0, 1].map((index) => (
        <motion.div
          key={index}
          className={`absolute inset-0 border-2 ${colors[color]} border-current rounded-full`}
          animate={{ scale: [0, 1], opacity: [1, 0] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: index * 1,
            ease: "easeOut"
          }}
        />
      ))}
    </div>
  );

  const variants = {
    spin: SpinVariant,
    pulse: PulseVariant,
    dots: DotsVariant,
    bars: BarsVariant,
    ripple: RippleVariant
  };

  const SpinnerComponent = variants[variant];

  const content = (
    <div className="flex flex-col items-center justify-center space-y-3">
      <SpinnerComponent />
      {text && (
        <motion.p
          className={`text-sm ${colors[color]} font-medium`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <motion.div
        className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
};

export default LoadingSpinner;