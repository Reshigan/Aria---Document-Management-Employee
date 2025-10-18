import React, { useState, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const ModernInput = forwardRef(({
  label,
  error,
  helperText,
  type = 'text',
  placeholder,
  icon,
  iconPosition = 'left',
  size = 'md',
  variant = 'default',
  fullWidth = false,
  disabled = false,
  required = false,
  className = '',
  containerClassName = '',
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);

  const inputType = type === 'password' && showPassword ? 'text' : type;

  const baseClasses = `
    block w-full rounded-lg border transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-0
    disabled:opacity-50 disabled:cursor-not-allowed
    ${fullWidth ? 'w-full' : ''}
  `;

  const variants = {
    default: `
      border-gray-300 bg-white text-gray-900 placeholder-gray-400
      focus:border-blue-500 focus:ring-blue-500
      ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
    `,
    filled: `
      border-transparent bg-gray-100 text-gray-900 placeholder-gray-500
      focus:bg-white focus:border-blue-500 focus:ring-blue-500
      ${error ? 'bg-red-50 focus:border-red-500 focus:ring-red-500' : ''}
    `,
    outlined: `
      border-2 border-gray-200 bg-transparent text-gray-900 placeholder-gray-400
      focus:border-blue-500 focus:ring-blue-500
      ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
    `
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const inputVariants = {
    initial: { scale: 1 },
    focus: { scale: 1.02 }
  };

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${containerClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {icon && iconPosition === 'left' && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className={`text-gray-400 ${iconSizes[size]}`}>
              {icon}
            </span>
          </div>
        )}

        <motion.input
          ref={ref}
          type={inputType}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          variants={inputVariants}
          initial="initial"
          animate={focused ? "focus" : "initial"}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`
            ${baseClasses}
            ${variants[variant]}
            ${sizes[size]}
            ${icon && iconPosition === 'left' ? 'pl-10' : ''}
            ${icon && iconPosition === 'right' ? 'pr-10' : ''}
            ${type === 'password' ? 'pr-10' : ''}
            ${className}
          `}
          {...props}
        />

        {type === 'password' && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeSlashIcon className={`text-gray-400 hover:text-gray-600 ${iconSizes[size]}`} />
            ) : (
              <EyeIcon className={`text-gray-400 hover:text-gray-600 ${iconSizes[size]}`} />
            )}
          </button>
        )}

        {icon && iconPosition === 'right' && type !== 'password' && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className={`text-gray-400 ${iconSizes[size]}`}>
              {icon}
            </span>
          </div>
        )}
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1 text-sm text-red-600"
        >
          {error}
        </motion.p>
      )}

      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  );
});

ModernInput.displayName = 'ModernInput';

export default ModernInput;