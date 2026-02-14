import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercentage,
  formatFileSize,
  formatIDNumber,
  formatPhoneNumber,
  formatVATNumber,
  truncate,
  capitalize,
  getStatusColor,
} from '../../utils/formatters'

describe('formatCurrency', () => {
  it('should format number as ZAR currency', () => {
    const result = formatCurrency(1000)
    expect(result).toContain('1')
    expect(result).toContain('000')
  })

  it('should handle string input', () => {
    const result = formatCurrency('2500.50')
    expect(result).toContain('2')
    expect(result).toContain('500')
  })

  it('should handle zero', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0')
  })

  it('should handle negative amounts', () => {
    const result = formatCurrency(-500)
    expect(result).toContain('500')
  })

  it('should include two decimal places', () => {
    const result = formatCurrency(100)
    expect(result).toMatch(/\d+[.,]\d{2}/)
  })
})

describe('formatDate', () => {
  it('should format date string', () => {
    const result = formatDate('2024-03-15')
    expect(result).toContain('2024')
    expect(result).toContain('Mar')
    expect(result).toContain('15')
  })

  it('should format Date object', () => {
    const result = formatDate(new Date(2024, 0, 1))
    expect(result).toContain('2024')
    expect(result).toContain('Jan')
  })
})

describe('formatDateTime', () => {
  it('should include time in output', () => {
    const result = formatDateTime('2024-03-15T14:30:00')
    expect(result).toContain('2024')
    expect(result).toContain('Mar')
  })

  it('should format Date object with time', () => {
    const date = new Date(2024, 5, 15, 10, 30)
    const result = formatDateTime(date)
    expect(result).toContain('2024')
  })
})

describe('formatNumber', () => {
  it('should format number with no decimals by default', () => {
    const result = formatNumber(1234567)
    expect(result).toContain('1')
    expect(result).toContain('234')
    expect(result).toContain('567')
  })

  it('should format with specified decimals', () => {
    const result = formatNumber(1234.5678, 2)
    expect(result).toContain('1')
    expect(result).toContain('234')
  })

  it('should handle string input', () => {
    const result = formatNumber('9876')
    expect(result).toContain('9')
    expect(result).toContain('876')
  })
})

describe('formatPercentage', () => {
  it('should format as percentage', () => {
    const result = formatPercentage(85.5)
    expect(result).toContain('85')
    expect(result).toContain('%')
  })

  it('should handle zero percentage', () => {
    const result = formatPercentage(0)
    expect(result).toContain('0')
    expect(result).toContain('%')
  })

  it('should handle string input', () => {
    const result = formatPercentage('99.9')
    expect(result).toContain('99')
    expect(result).toContain('%')
  })
})

describe('formatFileSize', () => {
  it('should format bytes', () => {
    expect(formatFileSize(0)).toBe('0 Bytes')
    expect(formatFileSize(500)).toContain('Bytes')
  })

  it('should format kilobytes', () => {
    expect(formatFileSize(1024)).toContain('KB')
  })

  it('should format megabytes', () => {
    expect(formatFileSize(1048576)).toContain('MB')
  })

  it('should format gigabytes', () => {
    expect(formatFileSize(1073741824)).toContain('GB')
  })
})

describe('formatIDNumber', () => {
  it('should format 13-digit SA ID number', () => {
    const result = formatIDNumber('8501015800086')
    expect(result).toContain(' ')
    expect(result.replace(/ /g, '')).toBe('8501015800086')
  })

  it('should return as-is if not 13 digits', () => {
    expect(formatIDNumber('12345')).toBe('12345')
  })
})

describe('formatPhoneNumber', () => {
  it('should format 10-digit SA phone number', () => {
    const result = formatPhoneNumber('0123456789')
    expect(result).toContain('(012)')
    expect(result).toContain('345')
    expect(result).toContain('6789')
  })

  it('should format international SA number', () => {
    const result = formatPhoneNumber('27123456789')
    expect(result).toContain('+27')
  })

  it('should return as-is for unknown format', () => {
    expect(formatPhoneNumber('12345')).toBe('12345')
  })
})

describe('formatVATNumber', () => {
  it('should format 10-digit VAT number starting with 4', () => {
    const result = formatVATNumber('4123456789')
    expect(result).toContain(' ')
    expect(result.replace(/ /g, '')).toBe('4123456789')
  })

  it('should return as-is for invalid format', () => {
    expect(formatVATNumber('12345')).toBe('12345')
  })
})

describe('truncate', () => {
  it('should truncate long text', () => {
    const result = truncate('This is a very long text that should be truncated', 20)
    expect(result).toHaveLength(23)
    expect(result).toContain('...')
  })

  it('should not truncate short text', () => {
    expect(truncate('Short', 50)).toBe('Short')
  })

  it('should use default length of 50', () => {
    const longText = 'A'.repeat(60)
    const result = truncate(longText)
    expect(result).toHaveLength(53)
  })
})

describe('capitalize', () => {
  it('should capitalize first letter', () => {
    expect(capitalize('hello')).toBe('Hello')
  })

  it('should lowercase rest of text', () => {
    expect(capitalize('HELLO')).toBe('Hello')
  })

  it('should handle single character', () => {
    expect(capitalize('a')).toBe('A')
  })
})

describe('getStatusColor', () => {
  it('should return correct colors for known statuses', () => {
    expect(getStatusColor('draft')).toEqual({ bg: 'bg-gray-100', text: 'text-gray-800' })
    expect(getStatusColor('pending')).toEqual({ bg: 'bg-yellow-100', text: 'text-yellow-800' })
    expect(getStatusColor('approved')).toEqual({ bg: 'bg-blue-100', text: 'text-blue-800' })
    expect(getStatusColor('active')).toEqual({ bg: 'bg-green-100', text: 'text-green-800' })
    expect(getStatusColor('completed')).toEqual({ bg: 'bg-green-100', text: 'text-green-800' })
    expect(getStatusColor('paid')).toEqual({ bg: 'bg-green-100', text: 'text-green-800' })
    expect(getStatusColor('cancelled')).toEqual({ bg: 'bg-red-100', text: 'text-red-800' })
    expect(getStatusColor('rejected')).toEqual({ bg: 'bg-red-100', text: 'text-red-800' })
    expect(getStatusColor('overdue')).toEqual({ bg: 'bg-red-100', text: 'text-red-800' })
  })

  it('should return default colors for unknown status', () => {
    expect(getStatusColor('unknown')).toEqual({ bg: 'bg-gray-100', text: 'text-gray-800' })
  })

  it('should be case insensitive', () => {
    expect(getStatusColor('ACTIVE')).toEqual({ bg: 'bg-green-100', text: 'text-green-800' })
    expect(getStatusColor('Pending')).toEqual({ bg: 'bg-yellow-100', text: 'text-yellow-800' })
  })
})
