import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Test form validation utilities
describe('Form Validation', () => {
  describe('Email Validation', () => {
    const isValidEmail = (email: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(email)
    }

    it('should validate correct email format', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name@domain.co.za')).toBe(true)
      expect(isValidEmail('user+tag@example.org')).toBe(true)
    })

    it('should reject invalid email format', () => {
      expect(isValidEmail('invalid')).toBe(false)
      expect(isValidEmail('invalid@')).toBe(false)
      expect(isValidEmail('@domain.com')).toBe(false)
      expect(isValidEmail('user@.com')).toBe(false)
      expect(isValidEmail('')).toBe(false)
    })
  })

  describe('Password Validation', () => {
    const isValidPassword = (password: string) => {
      return password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password)
    }

    it('should validate strong password', () => {
      expect(isValidPassword('Password123')).toBe(true)
      expect(isValidPassword('SecurePass1')).toBe(true)
    })

    it('should reject weak password', () => {
      expect(isValidPassword('password')).toBe(false) // no uppercase, no number
      expect(isValidPassword('PASSWORD123')).toBe(false) // no lowercase
      expect(isValidPassword('Pass1')).toBe(false) // too short
      expect(isValidPassword('')).toBe(false)
    })
  })

  describe('Required Field Validation', () => {
    const isRequired = (value: string | null | undefined) => {
      return value !== null && value !== undefined && value.trim() !== ''
    }

    it('should validate non-empty values', () => {
      expect(isRequired('test')).toBe(true)
      expect(isRequired('  test  ')).toBe(true)
    })

    it('should reject empty values', () => {
      expect(isRequired('')).toBe(false)
      expect(isRequired('   ')).toBe(false)
      expect(isRequired(null)).toBe(false)
      expect(isRequired(undefined)).toBe(false)
    })
  })

  describe('Phone Number Validation', () => {
    const isValidPhone = (phone: string) => {
      const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/
      return phoneRegex.test(phone)
    }

    it('should validate correct phone formats', () => {
      expect(isValidPhone('0123456789')).toBe(true)
      expect(isValidPhone('+27 12 345 6789')).toBe(true)
      expect(isValidPhone('(012) 345-6789')).toBe(true)
    })

    it('should reject invalid phone formats', () => {
      expect(isValidPhone('123')).toBe(false)
      expect(isValidPhone('abc')).toBe(false)
      expect(isValidPhone('')).toBe(false)
    })
  })

  describe('Number Validation', () => {
    const isValidNumber = (value: string, min?: number, max?: number) => {
      const num = parseFloat(value)
      if (isNaN(num)) return false
      if (min !== undefined && num < min) return false
      if (max !== undefined && num > max) return false
      return true
    }

    it('should validate numbers within range', () => {
      expect(isValidNumber('10', 0, 100)).toBe(true)
      expect(isValidNumber('0', 0, 100)).toBe(true)
      expect(isValidNumber('100', 0, 100)).toBe(true)
    })

    it('should reject numbers outside range', () => {
      expect(isValidNumber('-1', 0, 100)).toBe(false)
      expect(isValidNumber('101', 0, 100)).toBe(false)
    })

    it('should reject non-numeric values', () => {
      expect(isValidNumber('abc')).toBe(false)
      expect(isValidNumber('')).toBe(false)
    })
  })

  describe('Date Validation', () => {
    const isValidDate = (dateStr: string) => {
      const date = new Date(dateStr)
      return !isNaN(date.getTime())
    }

    it('should validate correct date formats', () => {
      expect(isValidDate('2024-01-15')).toBe(true)
      expect(isValidDate('2024-12-31')).toBe(true)
    })

    it('should reject invalid date formats', () => {
      expect(isValidDate('invalid')).toBe(false)
      expect(isValidDate('')).toBe(false)
    })
  })
})

describe('Form Input Components', () => {
  describe('Text Input', () => {
    it('should render input element', () => {
      render(<input type="text" data-testid="text-input" />)
      expect(screen.getByTestId('text-input')).toBeInTheDocument()
    })

    it('should update value on change', async () => {
      const user = userEvent.setup()
      render(<input type="text" data-testid="text-input" />)
      
      const input = screen.getByTestId('text-input')
      await user.type(input, 'test value')
      
      expect(input).toHaveValue('test value')
    })

    it('should handle placeholder text', () => {
      render(<input type="text" placeholder="Enter value" data-testid="text-input" />)
      expect(screen.getByPlaceholderText('Enter value')).toBeInTheDocument()
    })
  })

  describe('Select Input', () => {
    it('should render select element with options', () => {
      render(
        <select data-testid="select-input">
          <option value="">Select...</option>
          <option value="1">Option 1</option>
          <option value="2">Option 2</option>
        </select>
      )
      
      expect(screen.getByTestId('select-input')).toBeInTheDocument()
      expect(screen.getByText('Option 1')).toBeInTheDocument()
      expect(screen.getByText('Option 2')).toBeInTheDocument()
    })

    it('should update value on selection', async () => {
      const user = userEvent.setup()
      render(
        <select data-testid="select-input">
          <option value="">Select...</option>
          <option value="1">Option 1</option>
          <option value="2">Option 2</option>
        </select>
      )
      
      const select = screen.getByTestId('select-input')
      await user.selectOptions(select, '1')
      
      expect(select).toHaveValue('1')
    })
  })

  describe('Checkbox Input', () => {
    it('should render checkbox element', () => {
      render(<input type="checkbox" data-testid="checkbox-input" />)
      expect(screen.getByTestId('checkbox-input')).toBeInTheDocument()
    })

    it('should toggle checked state', async () => {
      const user = userEvent.setup()
      render(<input type="checkbox" data-testid="checkbox-input" />)
      
      const checkbox = screen.getByTestId('checkbox-input')
      expect(checkbox).not.toBeChecked()
      
      await user.click(checkbox)
      expect(checkbox).toBeChecked()
      
      await user.click(checkbox)
      expect(checkbox).not.toBeChecked()
    })
  })

  describe('Button', () => {
    it('should render button element', () => {
      render(<button data-testid="submit-btn">Submit</button>)
      expect(screen.getByTestId('submit-btn')).toBeInTheDocument()
    })

    it('should call onClick handler', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()
      render(<button onClick={handleClick} data-testid="submit-btn">Submit</button>)
      
      await user.click(screen.getByTestId('submit-btn'))
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should be disabled when disabled prop is true', () => {
      render(<button disabled data-testid="submit-btn">Submit</button>)
      expect(screen.getByTestId('submit-btn')).toBeDisabled()
    })
  })
})

describe('Form Submission', () => {
  it('should prevent default form submission', async () => {
    const handleSubmit = vi.fn((e) => e.preventDefault())
    
    render(
      <form onSubmit={handleSubmit} data-testid="test-form">
        <button type="submit">Submit</button>
      </form>
    )
    
    fireEvent.submit(screen.getByTestId('test-form'))
    
    expect(handleSubmit).toHaveBeenCalled()
  })

  it('should collect form data on submission', async () => {
    const user = userEvent.setup()
    const formData: Record<string, string> = {}
    
    const handleSubmit = vi.fn((e) => {
      e.preventDefault()
      const form = e.target as HTMLFormElement
      const data = new FormData(form)
      data.forEach((value, key) => {
        formData[key] = value as string
      })
    })
    
    render(
      <form onSubmit={handleSubmit} data-testid="test-form">
        <input name="email" type="email" data-testid="email-input" />
        <input name="password" type="password" data-testid="password-input" />
        <button type="submit">Submit</button>
      </form>
    )
    
    await user.type(screen.getByTestId('email-input'), 'test@example.com')
    await user.type(screen.getByTestId('password-input'), 'Password123')
    
    fireEvent.submit(screen.getByTestId('test-form'))
    
    expect(formData.email).toBe('test@example.com')
    expect(formData.password).toBe('Password123')
  })
})

describe('Error States', () => {
  it('should display error message', () => {
    render(<div role="alert" data-testid="error-message">Invalid email address</div>)
    expect(screen.getByTestId('error-message')).toHaveTextContent('Invalid email address')
  })

  it('should apply error styling class', () => {
    render(<input className="error" data-testid="error-input" />)
    expect(screen.getByTestId('error-input')).toHaveClass('error')
  })
})

describe('Loading States', () => {
  it('should show loading indicator', () => {
    render(<div data-testid="loading">Loading...</div>)
    expect(screen.getByTestId('loading')).toBeInTheDocument()
  })

  it('should disable form during submission', () => {
    render(
      <fieldset disabled data-testid="form-fieldset">
        <input data-testid="input" />
        <button data-testid="button">Submit</button>
      </fieldset>
    )
    
    expect(screen.getByTestId('input')).toBeDisabled()
    expect(screen.getByTestId('button')).toBeDisabled()
  })
})
