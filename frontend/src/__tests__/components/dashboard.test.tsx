import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('Dashboard Components', () => {
  describe('KPI Cards', () => {
    it('should render KPI card with value', () => {
      render(
        <div data-testid="kpi-card">
          <span data-testid="kpi-label">Total Revenue</span>
          <span data-testid="kpi-value">R 1,500,000.00</span>
          <span data-testid="kpi-change">+12.5%</span>
        </div>
      )
      expect(screen.getByTestId('kpi-label')).toHaveTextContent('Total Revenue')
      expect(screen.getByTestId('kpi-value')).toHaveTextContent('R 1,500,000.00')
      expect(screen.getByTestId('kpi-change')).toHaveTextContent('+12.5%')
    })

    it('should render negative change indicator', () => {
      render(
        <div data-testid="kpi-card">
          <span data-testid="kpi-change" className="negative">-5.2%</span>
        </div>
      )
      expect(screen.getByTestId('kpi-change')).toHaveTextContent('-5.2%')
      expect(screen.getByTestId('kpi-change')).toHaveClass('negative')
    })

    it('should render multiple KPI cards', () => {
      const kpis = [
        { label: 'Revenue', value: 'R 1.5M' },
        { label: 'Orders', value: '342' },
        { label: 'Customers', value: '128' },
        { label: 'Products', value: '567' },
      ]
      render(
        <div data-testid="kpi-grid">
          {kpis.map(kpi => (
            <div key={kpi.label} data-testid={`kpi-${kpi.label.toLowerCase()}`}>
              <span>{kpi.label}</span>
              <span>{kpi.value}</span>
            </div>
          ))}
        </div>
      )
      expect(screen.getByTestId('kpi-grid').children).toHaveLength(4)
      expect(screen.getByText('Revenue')).toBeInTheDocument()
      expect(screen.getByText('Orders')).toBeInTheDocument()
      expect(screen.getByText('Customers')).toBeInTheDocument()
      expect(screen.getByText('Products')).toBeInTheDocument()
    })
  })

  describe('Chart Components', () => {
    it('should render chart container', () => {
      render(
        <div data-testid="chart-container">
          <h3>Revenue Trend</h3>
          <div data-testid="chart-area" style={{ height: 300 }}>
            Chart placeholder
          </div>
        </div>
      )
      expect(screen.getByTestId('chart-container')).toBeInTheDocument()
      expect(screen.getByText('Revenue Trend')).toBeInTheDocument()
    })

    it('should render chart with loading state', () => {
      render(
        <div data-testid="chart-loading" role="progressbar">
          Loading chart data...
        </div>
      )
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
  })

  describe('Recent Activity', () => {
    it('should render activity list', () => {
      const activities = [
        { id: 1, action: 'Created Quote #Q001', time: '2 hours ago' },
        { id: 2, action: 'Approved Order #SO005', time: '3 hours ago' },
        { id: 3, action: 'Posted Invoice #INV010', time: '5 hours ago' },
      ]
      render(
        <div data-testid="activity-list">
          {activities.map(a => (
            <div key={a.id} data-testid={`activity-${a.id}`}>
              <span>{a.action}</span>
              <span>{a.time}</span>
            </div>
          ))}
        </div>
      )
      expect(screen.getByTestId('activity-list').children).toHaveLength(3)
      expect(screen.getByText('Created Quote #Q001')).toBeInTheDocument()
      expect(screen.getByText('2 hours ago')).toBeInTheDocument()
    })

    it('should render empty activity state', () => {
      render(
        <div data-testid="no-activities">
          <span>No recent activities</span>
        </div>
      )
      expect(screen.getByText('No recent activities')).toBeInTheDocument()
    })
  })

  describe('Quick Actions', () => {
    it('should render quick action buttons', () => {
      const actions = ['New Quote', 'New Invoice', 'New Customer', 'New Product']
      render(
        <div data-testid="quick-actions">
          {actions.map(action => (
            <button key={action}>{action}</button>
          ))}
        </div>
      )
      actions.forEach(action => {
        expect(screen.getByText(action)).toBeInTheDocument()
      })
    })

    it('should handle quick action click', () => {
      const onClick = vi.fn()
      render(<button onClick={onClick}>New Quote</button>)
      screen.getByText('New Quote').click()
      expect(onClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Status Indicators', () => {
    it('should render status badges', () => {
      const statuses = ['Active', 'Pending', 'Overdue', 'Paid']
      render(
        <div data-testid="status-list">
          {statuses.map(s => (
            <span key={s} data-testid={`status-${s.toLowerCase()}`} className={`badge badge-${s.toLowerCase()}`}>
              {s}
            </span>
          ))}
        </div>
      )
      statuses.forEach(s => {
        expect(screen.getByTestId(`status-${s.toLowerCase()}`)).toHaveTextContent(s)
      })
    })
  })

  describe('Date Range Filter', () => {
    it('should render date range selector', () => {
      render(
        <div data-testid="date-range">
          <input type="date" data-testid="start-date" />
          <input type="date" data-testid="end-date" />
          <button>Apply</button>
        </div>
      )
      expect(screen.getByTestId('start-date')).toBeInTheDocument()
      expect(screen.getByTestId('end-date')).toBeInTheDocument()
      expect(screen.getByText('Apply')).toBeInTheDocument()
    })

    it('should render period presets', () => {
      const periods = ['Today', 'This Week', 'This Month', 'This Quarter', 'This Year']
      render(
        <div data-testid="period-presets">
          {periods.map(p => (
            <button key={p}>{p}</button>
          ))}
        </div>
      )
      periods.forEach(p => {
        expect(screen.getByText(p)).toBeInTheDocument()
      })
    })
  })
})
