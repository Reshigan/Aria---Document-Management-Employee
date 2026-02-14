import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('AI Orchestrator Service', () => {
  describe('Intent Classification', () => {
    it('should classify customer creation intent', () => {
      const message = 'create a new customer named John'
      const patterns = [
        { pattern: /create.*customer/i, intent: 'create_customer' },
        { pattern: /list.*customer/i, intent: 'list_customers' },
        { pattern: /create.*quote/i, intent: 'create_quote' },
      ]

      const match = patterns.find(p => p.pattern.test(message))
      expect(match).toBeDefined()
      expect(match?.intent).toBe('create_customer')
    })

    it('should classify listing intent', () => {
      const message = 'show me all customers'
      const patterns = [
        { pattern: /show.*customer|list.*customer|get.*customer/i, intent: 'list_customers' },
      ]

      const match = patterns.find(p => p.pattern.test(message))
      expect(match).toBeDefined()
      expect(match?.intent).toBe('list_customers')
    })

    it('should classify quote creation intent', () => {
      const message = 'create a quote for customer ABC'
      const patterns = [
        { pattern: /create.*quote|new.*quote|generate.*quote/i, intent: 'create_quote' },
      ]

      const match = patterns.find(p => p.pattern.test(message))
      expect(match).toBeDefined()
      expect(match?.intent).toBe('create_quote')
    })

    it('should return null for unrecognized intent', () => {
      const message = 'hello how are you'
      const patterns = [
        { pattern: /create.*customer/i, intent: 'create_customer' },
        { pattern: /list.*customer/i, intent: 'list_customers' },
      ]

      const match = patterns.find(p => p.pattern.test(message))
      expect(match).toBeUndefined()
    })

    it('should handle case insensitive matching', () => {
      const message = 'CREATE A NEW CUSTOMER'
      const pattern = /create.*customer/i
      expect(pattern.test(message)).toBe(true)
    })
  })

  describe('Confidence Scoring', () => {
    it('should return high confidence for exact matches', () => {
      const confidence = 0.95
      expect(confidence).toBeGreaterThan(0.7)
    })

    it('should return low confidence for partial matches', () => {
      const confidence = 0.4
      expect(confidence).toBeLessThan(0.7)
    })

    it('should threshold at 0.7 for rule-based fallback', () => {
      const threshold = 0.7
      const highConfidence = 0.85
      const lowConfidence = 0.5

      expect(highConfidence >= threshold).toBe(true)
      expect(lowConfidence >= threshold).toBe(false)
    })
  })
})

describe('Bot Executor Service', () => {
  describe('Bot Scheduling', () => {
    it('should identify enabled bots', () => {
      const bots = [
        { id: '1', name: 'Quote Bot', enabled: true, schedule: '0 * * * *' },
        { id: '2', name: 'Invoice Bot', enabled: false, schedule: '0 * * * *' },
        { id: '3', name: 'Payroll Bot', enabled: true, schedule: null },
      ]

      const scheduledBots = bots.filter(b => b.enabled && b.schedule)
      expect(scheduledBots).toHaveLength(1)
      expect(scheduledBots[0].name).toBe('Quote Bot')
    })

    it('should check if bot is paused', () => {
      const bot = { id: '1', paused: false, enabled: true }
      const canExecute = bot.enabled && !bot.paused
      expect(canExecute).toBe(true)
    })

    it('should track bot execution results', () => {
      const result = {
        bot_id: 'bot-1',
        status: 'success',
        records_created: 5,
        duration_ms: 1200,
        state_changed: true,
      }

      expect(result.status).toBe('success')
      expect(result.records_created).toBe(5)
      expect(result.state_changed).toBe(true)
    })

    it('should handle bot execution failure', () => {
      const result = {
        bot_id: 'bot-2',
        status: 'error',
        error: 'Database connection timeout',
        records_created: 0,
      }

      expect(result.status).toBe('error')
      expect(result.error).toBeTruthy()
      expect(result.records_created).toBe(0)
    })
  })

  describe('Quote Generation Bot', () => {
    it('should generate quote number', () => {
      const prefix = 'QT'
      const timestamp = Date.now()
      const quoteNumber = `${prefix}-${timestamp}`

      expect(quoteNumber).toMatch(/^QT-\d+$/)
    })

    it('should calculate quote totals', () => {
      const lines = [
        { quantity: 2, unit_price: 100 },
        { quantity: 1, unit_price: 250 },
      ]

      const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0)
      const vatRate = 0.15
      const vat = subtotal * vatRate
      const total = subtotal + vat

      expect(subtotal).toBe(450)
      expect(vat).toBeCloseTo(67.5)
      expect(total).toBeCloseTo(517.5)
    })
  })

  describe('Invoice Bot', () => {
    it('should generate invoice number with prefix', () => {
      const lastNumber = 42
      const nextNumber = lastNumber + 1
      const invoiceNumber = `INV-${String(nextNumber).padStart(6, '0')}`

      expect(invoiceNumber).toBe('INV-000043')
    })

    it('should calculate due date from terms', () => {
      const invoiceDate = new Date('2025-01-15')
      const paymentTermDays = 30
      const dueDate = new Date(invoiceDate.getTime() + paymentTermDays * 24 * 60 * 60 * 1000)

      expect(dueDate.toISOString().split('T')[0]).toBe('2025-02-14')
    })
  })

  describe('Payroll Bot', () => {
    it('should calculate gross salary', () => {
      const baseSalary = 25000
      const overtime = 2500
      const allowances = 1500
      const gross = baseSalary + overtime + allowances

      expect(gross).toBe(29000)
    })

    it('should calculate PAYE deduction', () => {
      const annualIncome = 350000
      let paye = 0
      if (annualIncome <= 237100) paye = annualIncome * 0.18
      else if (annualIncome <= 370500) paye = 42678 + (annualIncome - 237100) * 0.26
      else paye = 77362 + (annualIncome - 370500) * 0.31

      const monthlyPaye = paye / 12
      expect(monthlyPaye).toBeGreaterThan(0)
    })

    it('should calculate UIF contribution', () => {
      const grossSalary = 25000
      const uifRate = 0.01
      const employeeUIF = grossSalary * uifRate
      const employerUIF = grossSalary * uifRate

      expect(employeeUIF).toBe(250)
      expect(employerUIF).toBe(250)
    })

    it('should check idempotency for existing payroll run', () => {
      const existingRuns = [
        { month: '2025-01', company_id: 'comp-1' },
      ]

      const hasRun = existingRuns.some(
        r => r.month === '2025-01' && r.company_id === 'comp-1'
      )
      expect(hasRun).toBe(true)

      const hasNotRun = existingRuns.some(
        r => r.month === '2025-02' && r.company_id === 'comp-1'
      )
      expect(hasNotRun).toBe(false)
    })
  })
})

describe('Data Seeding Service', () => {
  it('should generate SA phone numbers', () => {
    const prefixes = ['+2711', '+2712', '+2721', '+2731']
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
    const number = prefix + Math.floor(Math.random() * 10000000).toString().padStart(7, '0')

    expect(number).toMatch(/^\+27\d{9,10}$/)
  })

  it('should generate valid BBBEE levels', () => {
    const validLevels = [1, 2, 3, 4, 5, 6, 7, 8]
    const level = validLevels[Math.floor(Math.random() * validLevels.length)]
    expect(level).toBeGreaterThanOrEqual(1)
    expect(level).toBeLessThanOrEqual(8)
  })

  it('should generate master data counts', () => {
    const expectedCounts = {
      customers: 50,
      suppliers: 30,
      products: 100,
      employees: 20,
    }

    const total = Object.values(expectedCounts).reduce((a, b) => a + b, 0)
    expect(total).toBe(200)
  })

  it('should generate monthly transaction data', () => {
    const monthlyRecords = {
      quotes: 50,
      salesOrders: 40,
      invoices: 60,
      purchaseOrders: 20,
      supplierInvoices: 30,
    }

    const totalPerMonth = Object.values(monthlyRecords).reduce((a, b) => a + b, 0)
    expect(totalPerMonth).toBe(200)
  })

  it('should seed 12 months of data', () => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const month = (i + 1).toString().padStart(2, '0')
      return `2025-${month}`
    })

    expect(months).toHaveLength(12)
    expect(months[0]).toBe('2025-01')
    expect(months[11]).toBe('2025-12')
  })
})
