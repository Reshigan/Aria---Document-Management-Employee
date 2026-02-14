import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@mui/material', () => ({
  Box: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Typography: ({ children, variant, ...props }: any) => <span data-variant={variant} {...props}>{children}</span>,
  Button: ({ children, onClick, startIcon, variant: btnVariant, size, ...props }: any) => (
    <button onClick={onClick} data-variant={btnVariant} data-size={size} {...props}>{children}</button>
  ),
  Paper: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

vi.mock('@mui/icons-material', () => ({
  Inbox: () => <span data-testid="icon-inbox" />,
  Search: () => <span data-testid="icon-search" />,
  Add: () => <span data-testid="icon-add" />,
  FilterList: () => <span data-testid="icon-filter" />,
  CloudOff: () => <span data-testid="icon-offline" />,
  ErrorOutline: () => <span data-testid="icon-error" />,
  Assignment: () => <span data-testid="icon-tasks" />,
  People: () => <span data-testid="icon-people" />,
  ShoppingCart: () => <span data-testid="icon-orders" />,
  Receipt: () => <span data-testid="icon-invoices" />,
  Inventory: () => <span data-testid="icon-inventory" />,
  Work: () => <span data-testid="icon-work" />,
}))

import { EmptyState } from '../../components/EmptyState'

describe('EmptyState', () => {
  describe('Default rendering', () => {
    it('should render with default no-data type', () => {
      render(<EmptyState />)
      expect(screen.getByText('No data yet')).toBeInTheDocument()
      expect(screen.getByText('Get started by creating your first item.')).toBeInTheDocument()
    })
  })

  describe('Type variations', () => {
    it('should render no-results type', () => {
      render(<EmptyState type="no-results" />)
      expect(screen.getByText('No results found')).toBeInTheDocument()
      expect(screen.getByText('Try adjusting your search terms or filters.')).toBeInTheDocument()
    })

    it('should render no-filter-results type', () => {
      render(<EmptyState type="no-filter-results" />)
      expect(screen.getByText('No matching results')).toBeInTheDocument()
    })

    it('should render error type', () => {
      render(<EmptyState type="error" />)
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('should render offline type', () => {
      render(<EmptyState type="offline" />)
      expect(screen.getByText("You're offline")).toBeInTheDocument()
    })

    it('should render custom type', () => {
      render(<EmptyState type="custom" />)
      expect(screen.getByText('No items')).toBeInTheDocument()
    })
  })

  describe('Custom content', () => {
    it('should override title', () => {
      render(<EmptyState title="Custom Title" />)
      expect(screen.getByText('Custom Title')).toBeInTheDocument()
    })

    it('should override description', () => {
      render(<EmptyState description="Custom Description" />)
      expect(screen.getByText('Custom Description')).toBeInTheDocument()
    })

    it('should override both title and description', () => {
      render(<EmptyState title="My Title" description="My Desc" />)
      expect(screen.getByText('My Title')).toBeInTheDocument()
      expect(screen.getByText('My Desc')).toBeInTheDocument()
    })
  })

  describe('Actions', () => {
    it('should render primary action button', () => {
      const onAction = vi.fn()
      render(<EmptyState actionLabel="Create New" onAction={onAction} />)
      const button = screen.getByText('Create New')
      expect(button).toBeInTheDocument()
      fireEvent.click(button)
      expect(onAction).toHaveBeenCalledTimes(1)
    })

    it('should not render action without handler', () => {
      render(<EmptyState actionLabel="Create New" />)
      expect(screen.queryByText('Create New')).not.toBeInTheDocument()
    })

    it('should not render action without label', () => {
      const onAction = vi.fn()
      render(<EmptyState onAction={onAction} />)
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('should render secondary action button', () => {
      const onAction = vi.fn()
      const onSecondary = vi.fn()
      render(
        <EmptyState
          actionLabel="Primary"
          onAction={onAction}
          secondaryActionLabel="Secondary"
          onSecondaryAction={onSecondary}
        />
      )
      const secondaryBtn = screen.getByText('Secondary')
      expect(secondaryBtn).toBeInTheDocument()
      fireEvent.click(secondaryBtn)
      expect(onSecondary).toHaveBeenCalledTimes(1)
    })

    it('should not render secondary action without handler', () => {
      const onAction = vi.fn()
      render(
        <EmptyState actionLabel="Primary" onAction={onAction} secondaryActionLabel="Secondary" />
      )
      expect(screen.queryByText('Secondary')).not.toBeInTheDocument()
    })
  })

  describe('Compact mode', () => {
    it('should render compact variant', () => {
      render(<EmptyState compact={true} />)
      expect(screen.getByText('No data yet')).toBeInTheDocument()
    })

    it('should render action in compact mode', () => {
      const onAction = vi.fn()
      render(<EmptyState compact={true} actionLabel="Add Item" onAction={onAction} />)
      expect(screen.getByText('Add Item')).toBeInTheDocument()
    })
  })

  describe('Custom icons', () => {
    it('should use search icon for no-results', () => {
      render(<EmptyState type="no-results" />)
      expect(screen.getByTestId('icon-search')).toBeInTheDocument()
    })

    it('should use error icon for error type', () => {
      render(<EmptyState type="error" />)
      expect(screen.getByTestId('icon-error')).toBeInTheDocument()
    })

    it('should use offline icon for offline type', () => {
      render(<EmptyState type="offline" />)
      expect(screen.getByTestId('icon-offline')).toBeInTheDocument()
    })

    it('should allow custom icon override', () => {
      render(<EmptyState icon="people" />)
      expect(screen.getByTestId('icon-people')).toBeInTheDocument()
    })
  })
})
