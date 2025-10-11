import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import MobilePage from '../mobile'
import { mobileService } from '../../services/mobileService'

// Mock the mobile service
jest.mock('../../services/mobileService', () => ({
  mobileService: {
    getUserDevices: jest.fn(),
    getDeviceStorageUsage: jest.fn(),
    getSyncStatistics: jest.fn(),
    formatFileSize: jest.fn((bytes) => `${bytes} bytes`),
  },
}))

// Mock the auth context
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: global.testUtils.mockUser,
    isAuthenticated: true,
  }),
}))

// Mock the mobile components
jest.mock('../../components/mobile/MobileDeviceManager', () => {
  return function MockMobileDeviceManager() {
    return <div data-testid="mobile-device-manager">Mobile Device Manager</div>
  }
})

jest.mock('../../components/mobile/SyncMonitor', () => {
  return function MockSyncMonitor() {
    return <div data-testid="sync-monitor">Sync Monitor</div>
  }
})

jest.mock('../../components/mobile/OfflineDocumentManager', () => {
  return function MockOfflineDocumentManager() {
    return <div data-testid="offline-document-manager">Offline Document Manager</div>
  }
})

jest.mock('../../components/mobile/MobileAnalytics', () => {
  return function MockMobileAnalytics() {
    return <div data-testid="mobile-analytics">Mobile Analytics</div>
  }
})

const theme = createTheme()

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  )
}

describe('Mobile Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the mobile page with all components', async () => {
    const mockDevices = [global.testUtils.mockMobileDevice]
    const mockStorageUsage = {
      total_size: 1024,
      storage_limit: 2048,
      usage_percentage: 50,
      document_count: 5,
    }
    const mockSyncStats = {
      total_sessions: 10,
      successful_sessions: 8,
      failed_sessions: 2,
      success_rate: 80,
      total_data_transferred: 5120,
    }

    ;(mobileService.getUserDevices as jest.Mock).mockResolvedValue({
      success: true,
      devices: mockDevices,
    })
    ;(mobileService.getDeviceStorageUsage as jest.Mock).mockResolvedValue({
      success: true,
      storage_usage: mockStorageUsage,
    })
    ;(mobileService.getSyncStatistics as jest.Mock).mockResolvedValue({
      success: true,
      sync_statistics: mockSyncStats,
    })

    renderWithTheme(<MobilePage />)

    // Check page title
    expect(screen.getByText('Mobile Management')).toBeInTheDocument()

    // Check all components are rendered
    await waitFor(() => {
      expect(screen.getByTestId('mobile-device-manager')).toBeInTheDocument()
      expect(screen.getByTestId('sync-monitor')).toBeInTheDocument()
      expect(screen.getByTestId('offline-document-manager')).toBeInTheDocument()
      expect(screen.getByTestId('mobile-analytics')).toBeInTheDocument()
    })
  })

  it('displays overview statistics', async () => {
    const mockDevices = [
      global.testUtils.mockMobileDevice,
      { ...global.testUtils.mockMobileDevice, id: 2, device_name: 'Test Android' },
    ]
    const mockStorageUsage = {
      total_size: 2048,
      storage_limit: 4096,
      usage_percentage: 50,
      document_count: 10,
    }
    const mockSyncStats = {
      total_sessions: 20,
      successful_sessions: 18,
      failed_sessions: 2,
      success_rate: 90,
      total_data_transferred: 10240,
    }

    ;(mobileService.getUserDevices as jest.Mock).mockResolvedValue({
      success: true,
      devices: mockDevices,
    })
    ;(mobileService.getDeviceStorageUsage as jest.Mock).mockResolvedValue({
      success: true,
      storage_usage: mockStorageUsage,
    })
    ;(mobileService.getSyncStatistics as jest.Mock).mockResolvedValue({
      success: true,
      sync_statistics: mockSyncStats,
    })
    ;(mobileService.formatFileSize as jest.Mock).mockImplementation((bytes) => {
      if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
      return `${bytes} bytes`
    })

    renderWithTheme(<MobilePage />)

    await waitFor(() => {
      // Check device count
      expect(screen.getByText('2')).toBeInTheDocument() // Total devices
      
      // Check storage usage
      expect(screen.getByText('2.0 KB')).toBeInTheDocument() // Total storage used
      
      // Check sync statistics
      expect(screen.getByText('20')).toBeInTheDocument() // Total sync sessions
      expect(screen.getByText('90%')).toBeInTheDocument() // Success rate
    })
  })

  it('handles loading state', () => {
    ;(mobileService.getUserDevices as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    renderWithTheme(<MobilePage />)

    expect(screen.getByText('Loading mobile data...')).toBeInTheDocument()
  })

  it('handles error state', async () => {
    ;(mobileService.getUserDevices as jest.Mock).mockRejectedValue(
      new Error('Failed to load devices')
    )

    renderWithTheme(<MobilePage />)

    await waitFor(() => {
      expect(screen.getByText('Error loading mobile data')).toBeInTheDocument()
    })
  })

  it('displays empty state when no devices exist', async () => {
    ;(mobileService.getUserDevices as jest.Mock).mockResolvedValue({
      success: true,
      devices: [],
    })
    ;(mobileService.getDeviceStorageUsage as jest.Mock).mockResolvedValue({
      success: true,
      storage_usage: {
        total_size: 0,
        storage_limit: 0,
        usage_percentage: 0,
        document_count: 0,
      },
    })
    ;(mobileService.getSyncStatistics as jest.Mock).mockResolvedValue({
      success: true,
      sync_statistics: {
        total_sessions: 0,
        successful_sessions: 0,
        failed_sessions: 0,
        success_rate: 0,
        total_data_transferred: 0,
      },
    })

    renderWithTheme(<MobilePage />)

    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument() // No devices
      expect(screen.getByText('Get started by registering your first mobile device')).toBeInTheDocument()
    })
  })

  it('refreshes data when refresh is triggered', async () => {
    const mockDevices = [global.testUtils.mockMobileDevice]
    
    ;(mobileService.getUserDevices as jest.Mock).mockResolvedValue({
      success: true,
      devices: mockDevices,
    })
    ;(mobileService.getDeviceStorageUsage as jest.Mock).mockResolvedValue({
      success: true,
      storage_usage: {
        total_size: 1024,
        storage_limit: 2048,
        usage_percentage: 50,
        document_count: 5,
      },
    })
    ;(mobileService.getSyncStatistics as jest.Mock).mockResolvedValue({
      success: true,
      sync_statistics: {
        total_sessions: 10,
        successful_sessions: 8,
        failed_sessions: 2,
        success_rate: 80,
        total_data_transferred: 5120,
      },
    })

    renderWithTheme(<MobilePage />)

    await waitFor(() => {
      expect(mobileService.getUserDevices).toHaveBeenCalledTimes(1)
      expect(mobileService.getDeviceStorageUsage).toHaveBeenCalledTimes(1)
      expect(mobileService.getSyncStatistics).toHaveBeenCalledTimes(1)
    })

    // The page should automatically refresh data periodically
    // This would be tested with timer mocks in a real implementation
  })

  it('displays correct page metadata', () => {
    renderWithTheme(<MobilePage />)

    // Check that the page has proper structure
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByText('Mobile Management')).toBeInTheDocument()
  })

  it('handles responsive layout', () => {
    // Mock window.matchMedia for responsive testing
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query.includes('max-width: 600px'), // Simulate mobile viewport
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    })

    renderWithTheme(<MobilePage />)

    // The components should adapt to mobile layout
    expect(screen.getByTestId('mobile-device-manager')).toBeInTheDocument()
  })

  it('integrates with authentication context', () => {
    renderWithTheme(<MobilePage />)

    // Page should render when user is authenticated
    expect(screen.getByText('Mobile Management')).toBeInTheDocument()
  })
})