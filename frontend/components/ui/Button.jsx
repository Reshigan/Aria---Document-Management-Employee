import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

const buttonVariants = {
  default: "vx-btn vx-btn-primary",
  secondary: "vx-btn vx-btn-secondary", 
  ghost: "vx-btn vx-btn-ghost",
  outline: "border border-vx-primary-gold text-vx-primary-gold hover:bg-vx-primary-gold hover:text-black",
  destructive: "bg-red-600 text-white hover:bg-red-700",
  link: "text-vx-primary-gold underline-offset-4 hover:underline"
};

const sizeVariants = {
  default: "h-10 px-4 py-2",
  sm: "h-9 rounded-md px-3",
  lg: "h-11 rounded-md px-8",
  icon: "h-10 w-10"
};

const Button = React.forwardRef(({ 
  className, 
  variant = "default", 
  size = "default", 
  asChild = false,
  loading = false,
  icon,
  children,
  ...props 
}, ref) => {
  const Comp = asChild ? "span" : "button";
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <Comp
        className={cn(
          buttonVariants[variant],
          sizeVariants[size],
          loading && "opacity-50 cursor-not-allowed",
          className
        )}
        ref={ref}
        disabled={loading}
        {...props}
      >
        {loading && (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {icon && <span className="mr-2">{icon}</span>}
        {children}
      </Comp>
    </motion.div>
  );
});

Button.displayName = "Button";

export { Button, buttonVariants };