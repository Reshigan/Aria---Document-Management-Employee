import { describe, it, expect } from 'vitest'
import {
  CURRENCY_CODE,
  CURRENCY_SYMBOL,
  DEFAULT_VAT_RATE,
  DECIMAL_PLACES,
  formatCurrency,
  parseCurrency,
  roundAmount,
  calculateLineSubtotal,
  calculateDiscount,
  calculateTax,
  calculateLineTotal,
  calculateDocumentTotals,
  validateBalance,
  formatPercent,
  calculatePercentage,
} from '../../utils/currency'

describe('Currency Constants', () => {
  it('should have correct ZAR constants', () => {
    expect(CURRENCY_CODE).toBe('ZAR')
    expect(CURRENCY_SYMBOL).toBe('R')
    expect(DEFAULT_VAT_RATE).toBe(15.0)
    expect(DECIMAL_PLACES).toBe(2)
  })
})

describe('formatCurrency', () => {
  it('should format with R symbol', () => {
    const result = formatCurrency(1000)
    expect(result).toContain('R')
  })

  it('should include two decimal places', () => {
    const result = formatCurrency(100)
    expect(result).toMatch(/\d+[.,]\d{2}/)
  })

  it('should handle zero', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0')
  })

  it('should handle large amounts', () => {
    const result = formatCurrency(1000000)
    expect(result).toContain('1')
    expect(result).toContain('000')
  })
})

describe('parseCurrency', () => {
  it('should parse currency string to number', () => {
    expect(parseCurrency('R 1,000.50')).toBe(1000.50)
  })

  it('should handle plain numbers', () => {
    expect(parseCurrency('100.50')).toBe(100.50)
  })

  it('should return 0 for invalid input', () => {
    expect(parseCurrency('abc')).toBe(0)
    expect(parseCurrency('')).toBe(0)
  })
})

describe('roundAmount', () => {
  it('should round to 2 decimal places by default', () => {
    expect(roundAmount(10.555)).toBe(10.56)
    expect(roundAmount(10.554)).toBe(10.55)
  })

  it('should round to specified decimal places', () => {
    expect(roundAmount(10.5555, 3)).toBe(10.556)
    expect(roundAmount(10.5, 0)).toBe(11)
  })

  it('should handle integers', () => {
    expect(roundAmount(10)).toBe(10)
  })
})

describe('calculateLineSubtotal', () => {
  it('should multiply quantity by unit price', () => {
    expect(calculateLineSubtotal(5, 100)).toBe(500)
  })

  it('should handle decimal quantities', () => {
    expect(calculateLineSubtotal(2.5, 100)).toBe(250)
  })

  it('should handle zero', () => {
    expect(calculateLineSubtotal(0, 100)).toBe(0)
    expect(calculateLineSubtotal(5, 0)).toBe(0)
  })

  it('should round result', () => {
    expect(calculateLineSubtotal(3, 33.33)).toBe(99.99)
  })
})

describe('calculateDiscount', () => {
  it('should calculate percentage discount', () => {
    expect(calculateDiscount(1000, 10)).toBe(100)
  })

  it('should handle zero discount', () => {
    expect(calculateDiscount(1000, 0)).toBe(0)
  })

  it('should handle 100% discount', () => {
    expect(calculateDiscount(1000, 100)).toBe(1000)
  })

  it('should round result', () => {
    expect(calculateDiscount(333.33, 10)).toBe(33.33)
  })
})

describe('calculateTax', () => {
  it('should calculate tax at given rate', () => {
    expect(calculateTax(1000, 15)).toBe(150)
  })

  it('should handle zero tax rate', () => {
    expect(calculateTax(1000, 0)).toBe(0)
  })

  it('should round result', () => {
    expect(calculateTax(333.33, 15)).toBe(50)
  })
})

describe('calculateLineTotal', () => {
  it('should calculate total with VAT', () => {
    const total = calculateLineTotal(1, 1000)
    expect(total).toBe(1150)
  })

  it('should apply discount before tax', () => {
    const total = calculateLineTotal(1, 1000, 10, 15)
    expect(total).toBe(1035)
  })

  it('should handle zero quantity', () => {
    expect(calculateLineTotal(0, 1000)).toBe(0)
  })

  it('should handle custom tax rate', () => {
    const total = calculateLineTotal(1, 1000, 0, 0)
    expect(total).toBe(1000)
  })
})

describe('calculateDocumentTotals', () => {
  it('should calculate totals for multiple lines', () => {
    const lines = [
      { quantity: 2, unit_price: 100 },
      { quantity: 3, unit_price: 200 },
    ]
    const totals = calculateDocumentTotals(lines)
    expect(totals.subtotal).toBe(800)
    expect(totals.taxAmount).toBe(120)
    expect(totals.total).toBe(920)
  })

  it('should handle empty lines', () => {
    const totals = calculateDocumentTotals([])
    expect(totals.subtotal).toBe(0)
    expect(totals.discountAmount).toBe(0)
    expect(totals.taxAmount).toBe(0)
    expect(totals.total).toBe(0)
  })

  it('should apply discounts per line', () => {
    const lines = [
      { quantity: 1, unit_price: 1000, discount_percent: 10, tax_rate: 15 },
    ]
    const totals = calculateDocumentTotals(lines)
    expect(totals.subtotal).toBe(900)
    expect(totals.discountAmount).toBe(100)
    expect(totals.taxAmount).toBe(135)
    expect(totals.total).toBe(1035)
  })

  it('should handle custom tax rates per line', () => {
    const lines = [
      { quantity: 1, unit_price: 100, tax_rate: 0 },
      { quantity: 1, unit_price: 100, tax_rate: 15 },
    ]
    const totals = calculateDocumentTotals(lines)
    expect(totals.subtotal).toBe(200)
    expect(totals.taxAmount).toBe(15)
    expect(totals.total).toBe(215)
  })
})

describe('validateBalance', () => {
  it('should validate equal debits and credits', () => {
    expect(validateBalance(1000, 1000)).toBe(true)
  })

  it('should accept within tolerance', () => {
    expect(validateBalance(1000, 1000.005)).toBe(true)
  })

  it('should reject outside tolerance', () => {
    expect(validateBalance(1000, 1001)).toBe(false)
  })

  it('should accept custom tolerance', () => {
    expect(validateBalance(1000, 1005, 10)).toBe(true)
  })
})

describe('formatPercent', () => {
  it('should format percentage with decimals', () => {
    expect(formatPercent(85.5)).toBe('85.50%')
  })

  it('should handle custom decimal places', () => {
    expect(formatPercent(85.555, 1)).toBe('85.6%')
  })

  it('should handle zero', () => {
    expect(formatPercent(0)).toBe('0.00%')
  })
})

describe('calculatePercentage', () => {
  it('should calculate percentage', () => {
    expect(calculatePercentage(25, 100)).toBe(25)
  })

  it('should handle division by zero', () => {
    expect(calculatePercentage(25, 0)).toBe(0)
  })

  it('should round result', () => {
    expect(calculatePercentage(1, 3)).toBe(33.33)
  })
})
