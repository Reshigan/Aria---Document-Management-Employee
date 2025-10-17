import React from 'react';
import { motion } from 'framer-motion';

const ModernCard = ({ 
  children, 
  className = '', 
  hover = true, 
  gradient = false,
  glassmorphism = false,
  shadow = 'sm',
  padding = 'p-6',
  rounded = 'rounded-xl',
  border = true,
  ...props 
}) => {
  const baseClasses = `
    ${padding} ${rounded} transition-all duration-300
    ${border ? 'border border-gray-100' : ''}
    ${shadow === 'sm' ? 'shadow-sm' : shadow === 'md' ? 'shadow-md' : shadow === 'lg' ? 'shadow-lg' : ''}
    ${hover ? 'hover:shadow-md hover:-translate-y-1' : ''}
    ${gradient ? 'bg-gradient-to-br from-white to-gray-50' : glassmorphism ? 'backdrop-blur-lg bg-white/80' : 'bg-white'}
    ${className}
  `;

  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    hover: hover ? { y: -4, scale: 1.02 } : {}
  };

  return (
    <motion.div
      className={baseClasses}
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      transition={{ duration: 0.3, ease: "easeOut" }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const CardHeader = ({ children, className = '' }) => (
  <div className={`mb-4 ${className}`}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '', size = 'lg' }) => {
  const sizeClasses = {
    sm: 'text-sm font-medium',
    md: 'text-base font-semibold',
    lg: 'text-lg font-semibold',
    xl: 'text-xl font-bold'
  };

  return (
    <h3 className={`text-gray-900 ${sizeClasses[size]} ${className}`}>
      {children}
    </h3>
  );
};

export const CardDescription = ({ children, className = '' }) => (
  <p className={`text-sm text-gray-600 mt-1 ${className}`}>
    {children}
  </p>
);

export const CardContent = ({ children, className = '' }) => (
  <div className={className}>
    {children}
  </div>
);

export const CardFooter = ({ children, className = '' }) => (
  <div className={`mt-4 pt-4 border-t border-gray-100 ${className}`}>
    {children}
  </div>
);

export default ModernCard;