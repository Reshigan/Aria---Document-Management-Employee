import React from 'react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'

const Card = React.forwardRef(({ 
  className, 
  children,
  hover = true,
  ...props 
}, ref) => (
  <motion.div
    ref={ref}
    className={clsx(
      'bg-white rounded-lg border border-gray-200 shadow-sm',
      'transition-all duration-200',
      hover && 'hover:shadow-md hover:border-gray-300',
      className
    )}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    whileHover={hover ? { y: -2 } : {}}
    {...props}
  >
    {children}
  </motion.div>
))
Card.displayName = "Card"

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={clsx("p-6 pb-4", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={clsx(
      "text-lg font-semibold text-gray-900 leading-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={clsx(
      "text-sm text-gray-600 mt-1",
      className
    )}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div 
    ref={ref} 
    className={clsx("px-6 pb-6", className)} 
    {...props} 
  />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={clsx(
      "flex items-center justify-between px-6 py-4 bg-gray-50 rounded-b-lg border-t border-gray-200",
      className
    )}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }