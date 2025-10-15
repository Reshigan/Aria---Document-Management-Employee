import React from 'react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'

const Button = React.forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  className,
  onClick,
  ...props
}, ref) => {
  const baseClasses = [
    'inline-flex items-center justify-center font-medium transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
    'relative overflow-hidden'
  ]

  const variants = {
    primary: [
      'bg-blue-600 hover:bg-blue-700 active:bg-blue-800',
      'text-white border border-transparent',
      'shadow-sm hover:shadow-md'
    ],
    secondary: [
      'bg-white hover:bg-gray-50 active:bg-gray-100',
      'text-gray-900 border border-gray-300',
      'shadow-sm hover:shadow-md'
    ],
    ghost: [
      'bg-transparent hover:bg-gray-100 active:bg-gray-200',
      'text-gray-700 border border-transparent'
    ],
    danger: [
      'bg-red-600 hover:bg-red-700 active:bg-red-800',
      'text-white border border-transparent',
      'shadow-sm hover:shadow-md'
    ],
    success: [
      'bg-green-600 hover:bg-green-700 active:bg-green-800',
      'text-white border border-transparent',
      'shadow-sm hover:shadow-md'
    ]
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-md gap-1.5',
    md: 'px-4 py-2 text-sm rounded-md gap-2',
    lg: 'px-6 py-3 text-base rounded-lg gap-2',
    xl: 'px-8 py-4 text-lg rounded-lg gap-3'
  }

  const classes = clsx(
    baseClasses,
    variants[variant],
    sizes[size],
    className
  )

  const LoadingSpinner = () => (
    <svg 
      className="animate-spin h-4 w-4" 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
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
  )

  return (
    <motion.button
      ref={ref}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      transition={{ duration: 0.15 }}
      {...props}
    >
      {/* Ripple effect */}
      <motion.div
        className="absolute inset-0 bg-white opacity-0"
        initial={false}
        whileTap={{ opacity: [0, 0.2, 0] }}
        transition={{ duration: 0.3 }}
      />
      
      {loading && <LoadingSpinner />}
      {!loading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
      
      <span className={clsx(loading && 'opacity-0')}>
        {children}
      </span>
      
      {!loading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
    </motion.button>
  )
})

Button.displayName = 'Button'

export default Button