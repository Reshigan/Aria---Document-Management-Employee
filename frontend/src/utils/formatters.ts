/**
 * Utility functions for formatting data
 */

/**
 * Format a number as South African Rand currency
 */
export const formatCurrency = (amount: number | string | null | undefined): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) || 0 : Number(amount ?? 0);
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};

/**
 * Format a date string to readable format
 */
export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format a datetime string to readable format with time
 */
export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format a number with thousand separators
 */
export const formatNumber = (num: number | string | null | undefined, decimals: number = 0): string => {
  const n = typeof num === 'string' ? parseFloat(num) || 0 : Number(num ?? 0);
  return new Intl.NumberFormat('en-ZA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(n);
};

/**
 * Format a percentage
 */
export const formatPercentage = (num: number | string | null | undefined, decimals: number = 1): string => {
  const n = typeof num === 'string' ? parseFloat(num) || 0 : Number(num ?? 0);
  return `${formatNumber(n, decimals)}%`;
};

/**
 * Format file size in bytes to human readable
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Format SA ID number with spaces
 */
export const formatIDNumber = (idNumber: string): string => {
  // Format as: YYMMDD SSSS C A Z
  if (idNumber.length !== 13) return idNumber;
  return `${idNumber.slice(0, 6)} ${idNumber.slice(6, 10)} ${idNumber.slice(10, 11)} ${idNumber.slice(11, 12)} ${idNumber.slice(12)}`;
};

/**
 * Format SA phone number
 */
export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');
  
  // Format as: (0XX) XXX XXXX or +27 XX XXX XXXX
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('27')) {
    return `+27 ${cleaned.slice(2, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  
  return phone;
};

/**
 * Format SA VAT number
 */
export const formatVATNumber = (vat: string): string => {
  // Format as: 4XXXXXXXXX
  const cleaned = vat.replace(/\D/g, '');
  if (cleaned.length === 10 && cleaned.startsWith('4')) {
    return `${cleaned.slice(0, 1)} ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return vat;
};

/**
 * Truncate text with ellipsis
 */
export const truncate = (text: string, length: number = 50): string => {
  if (text.length <= length) return text;
  return `${text.slice(0, length)}...`;
};

/**
 * Capitalize first letter
 */
export const capitalize = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

/**
 * Format status badge color
 */
export const getStatusColor = (status: string): { bg: string; text: string } => {
  const statusColors: Record<string, { bg: string; text: string }> = {
    draft: { bg: 'bg-gray-100', text: 'text-gray-800' },
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    approved: { bg: 'bg-blue-100', text: 'text-blue-800' },
    active: { bg: 'bg-green-100', text: 'text-green-800' },
    completed: { bg: 'bg-green-100', text: 'text-green-800' },
    paid: { bg: 'bg-green-100', text: 'text-green-800' },
    partial: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-800' },
    rejected: { bg: 'bg-red-100', text: 'text-red-800' },
    overdue: { bg: 'bg-red-100', text: 'text-red-800' },
    inactive: { bg: 'bg-gray-100', text: 'text-gray-800' }
  };
  
  return statusColors[status.toLowerCase()] || { bg: 'bg-gray-100', text: 'text-gray-800' };
};
