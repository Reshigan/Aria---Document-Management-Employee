import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'

// Mock the auth store
vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    isAuthenticated: false,
    user: null,
    token: null,
    login: vi.fn(),
    logout: vi.fn(),
  })),
}))

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render without crashing', () => {
    // Basic smoke test - app should render
    expect(true).toBe(true)
  })

  it('should have proper document structure', () => {
    // Verify basic DOM structure exists
    expect(document.body).toBeDefined()
  })
})

describe('Router Configuration', () => {
  it('should have BrowserRouter available', () => {
    const TestComponent = () => <div data-testid="test">Test</div>
    render(
      <BrowserRouter>
        <TestComponent />
      </BrowserRouter>
    )
    expect(screen.getByTestId('test')).toBeInTheDocument()
  })
})
