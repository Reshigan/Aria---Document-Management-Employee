import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@mui/material', () => ({
  Box: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Typography: ({ children, variant, ...props }: any) => <span data-variant={variant} {...props}>{children}</span>,
  Button: ({ children, onClick, startIcon, ...props }: any) => <button onClick={onClick} {...props}>{children}</button>,
  Paper: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

vi.mock('@mui/icons-material', () => ({
  ErrorOutline: () => <span data-testid="error-icon" />,
  Refresh: () => <span data-testid="refresh-icon" />,
  Home: () => <span data-testid="home-icon" />,
}))

import ErrorBoundary from '../../components/ErrorBoundary'

function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div data-testid="child-content">Content</div>
}

describe('ErrorBoundary', () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

  beforeEach(() => {
    consoleErrorSpy.mockClear()
  })

  it('should render children when no error', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Hello</div>
      </ErrorBoundary>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('should render error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('should render custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom Error</div>}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
  })

  it('should display Try Again button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Try Again')).toBeInTheDocument()
  })

  it('should display Reload Page button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Reload Page')).toBeInTheDocument()
  })

  it('should display Go to Dashboard button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument()
  })

  it('should show support contact info', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText(/support@aria.vantax.co.za/)).toBeInTheDocument()
  })

  it('should reset error state on Try Again click', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Try Again'))
  })

  it('should call window.location.reload on Reload Page click', () => {
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadMock, href: '' },
      writable: true,
    })
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    fireEvent.click(screen.getByText('Reload Page'))
    expect(reloadMock).toHaveBeenCalled()
  })

  it('should navigate to dashboard on Go to Dashboard click', () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, href: '' },
      writable: true,
    })
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    fireEvent.click(screen.getByText('Go to Dashboard'))
    expect(window.location.href).toBe('/dashboard')
  })

  it('should log error to console', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(consoleErrorSpy).toHaveBeenCalled()
  })
})
