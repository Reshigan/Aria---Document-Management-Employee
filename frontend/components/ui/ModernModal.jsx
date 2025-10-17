import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

const ModernModal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  className = '',
  headerClassName = '',
  contentClassName = '',
  footerClassName = '',
  footer = null
}) => {
  const sizes = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    full: 'max-w-full'
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const modalVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.95,
      y: 20
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300
      }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: 20,
      transition: {
        duration: 0.2
      }
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog 
        as="div" 
        className="relative z-50" 
        onClose={closeOnOverlayClick ? onClose : () => {}}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <motion.div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel 
                as={motion.div}
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className={`
                  w-full ${sizes[size]} transform overflow-hidden rounded-2xl 
                  bg-white shadow-2xl transition-all text-left align-middle
                  ${className}
                `}
              >
                {/* Header */}
                {(title || showCloseButton) && (
                  <div className={`
                    flex items-center justify-between p-6 border-b border-gray-100
                    ${headerClassName}
                  `}>
                    {title && (
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-semibold leading-6 text-gray-900"
                      >
                        {title}
                      </Dialog.Title>
                    )}
                    {showCloseButton && (
                      <button
                        type="button"
                        className="
                          rounded-lg p-2 text-gray-400 hover:text-gray-600 
                          hover:bg-gray-100 transition-colors duration-200
                          focus:outline-none focus:ring-2 focus:ring-blue-500
                        "
                        onClick={onClose}
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className={`p-6 ${contentClassName}`}>
                  {children}
                </div>

                {/* Footer */}
                {footer && (
                  <div className={`
                    px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl
                    ${footerClassName}
                  `}>
                    {footer}
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ModernModal;