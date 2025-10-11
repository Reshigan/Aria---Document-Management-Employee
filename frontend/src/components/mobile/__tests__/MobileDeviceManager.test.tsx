import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import MobileDeviceManager from '../MobileDeviceManager'
import { mobileService } from '../../../services/mobileService'

// Mock the mobile service
jest.mock('../../../services/mobileService', () => ({
  mobileService: {
    getUserDevices: jest.fn(),
    registerDevice: jest.fn(),
    updateDevice: jest.fn(),
    deactivateDevice: jest.fn(),
    getDeviceStorageUsage: jest.fn(),
    getSyncStatistics: jest.fn(),
    formatDeviceType: jest.fn((type) => type.charAt(0).toUpperCase() + type.slice(1)),
    formatFileSize: jest.fn((bytes) => `${bytes} bytes`),
    isDeviceOnline: jest.fn(() => true),
    getDeviceStatusText: jest.fn(() => 'Online'),
    getDeviceStatusColor: jest.fn(() => 'success'),
  },
}))

// Mock the auth context
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: global.testUtils.mockUser,
  }),
}))

const theme = createTheme()

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  )
}

describe('MobileDeviceManager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the mobile device manager', async () => {
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

    renderWithTheme(<MobileDeviceManager />)

    expect(screen.getByText('Mobile Device Management')).toBeInTheDocument()
    expect(screen.getByText('Register Device')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Test iPhone')).toBeInTheDocument()
    })
  })

  it('opens register device dialog when register button is clicked', async () => {
    ;(mobileService.getUserDevices as jest.Mock).mockResolvedValue({
      success: true,
      devices: [],
    })

    renderWithTheme(<MobileDeviceManager />)

    const registerButton = screen.getByText('Register Device')
    fireEvent.click(registerButton)

    await waitFor(() => {
      expect(screen.getByText('Register New Device')).toBeInTheDocument()
      expect(screen.getByLabelText('Device Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Device Type')).toBeInTheDocument()
    })
  })

  it('registers a new device successfully', async () => {
    const mockNewDevice = {
      ...global.testUtils.mockMobileDevice,
      id: 2,
      device_name: 'New Test Device',
    }

    ;(mobileService.getUserDevices as jest.Mock).mockResolvedValue({
      success: true,
      devices: [],
    })
    ;(mobileService.registerDevice as jest.Mock).mockResolvedValue({
      success: true,
      device: mockNewDevice,
    })

    renderWithTheme(<MobileDeviceManager />)

    // Open register dialog
    fireEvent.click(screen.getByText('Register Device'))

    await waitFor(() => {
      expect(screen.getByText('Register New Device')).toBeInTheDocument()
    })

    // Fill in device details
    const deviceNameInput = screen.getByLabelText('Device Name')
    fireEvent.change(deviceNameInput, { target: { value: 'New Test Device' } })

    // Submit registration
    const registerSubmitButton = screen.getByRole('button', { name: 'Register' })
    fireEvent.click(registerSubmitButton)

    await waitFor(() => {
      expect(mobileService.registerDevice).toHaveBeenCalledWith(
        expect.objectContaining({
          device_name: 'New Test Device',
        })
      )
    })
  })

  it('updates device settings', async () => {
    const mockDevice = global.testUtils.mockMobileDevice

    ;(mobileService.getUserDevices as jest.Mock).mockResolvedValue({
      success: true,
      devices: [mockDevice],
    })
    ;(mobileService.updateDevice as jest.Mock).mockResolvedValue({
      success: true,
      device: { ...mockDevice, sync_enabled: false },
    })

    renderWithTheme(<MobileDeviceManager />)

    await waitFor(() => {
      expect(screen.getByText('Test iPhone')).toBeInTheDocument()
    })

    // Find and click the sync enabled switch
    const syncSwitch = screen.getByRole('checkbox', { name: 'Sync Enabled' })
    fireEvent.click(syncSwitch)

    await waitFor(() => {
      expect(mobileService.updateDevice).toHaveBeenCalledWith(
        mockDevice.id,
        { sync_enabled: false }
      )
    })
  })

  it('deactivates a device', async () => {
    const mockDevice = global.testUtils.mockMobileDevice

    ;(mobileService.getUserDevices as jest.Mock).mockResolvedValue({
      success: true,
      devices: [mockDevice],
    })
    ;(mobileService.deactivateDevice as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Device deactivated',
    })

    // Mock window.confirm
    window.confirm = jest.fn(() => true)

    renderWithTheme(<MobileDeviceManager />)

    await waitFor(() => {
      expect(screen.getByText('Test iPhone')).toBeInTheDocument()
    })

    // Find and click the deactivate button
    const deactivateButton = screen.getByLabelText('Deactivate Device')
    fireEvent.click(deactivateButton)

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith(
        'Are you sure you want to deactivate this device?'
      )
      expect(mobileService.deactivateDevice).toHaveBeenCalledWith(mockDevice.id)
    })
  })

  it('displays device statistics', async () => {
    const mockDevice = global.testUtils.mockMobileDevice
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
      devices: [mockDevice],
    })
    ;(mobileService.getDeviceStorageUsage as jest.Mock).mockResolvedValue({
      success: true,
      storage_usage: mockStorageUsage,
    })
    ;(mobileService.getSyncStatistics as jest.Mock).mockResolvedValue({
      success: true,
      sync_statistics: mockSyncStats,
    })

    renderWithTheme(<MobileDeviceManager />)

    await waitFor(() => {
      expect(screen.getByText('Test iPhone')).toBeInTheDocument()
      expect(screen.getByText('Sync Success Rate: 80.0%')).toBeInTheDocument()
      expect(screen.getByText('8/10 sessions')).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    ;(mobileService.getUserDevices as jest.Mock).mockRejectedValue(
      new Error('API Error')
    )

    renderWithTheme(<MobileDeviceManager />)

    await waitFor(() => {
      expect(screen.getByText('Error loading devices')).toBeInTheDocument()
    })
  })

  it('shows empty state when no devices are registered', async () => {
    ;(mobileService.getUserDevices as jest.Mock).mockResolvedValue({
      success: true,
      devices: [],
    })

    renderWithTheme(<MobileDeviceManager />)

    await waitFor(() => {
      expect(screen.getByText('No Mobile Devices Registered')).toBeInTheDocument()
      expect(screen.getByText('Register your first mobile device to start syncing documents')).toBeInTheDocument()
    })
  })

  it('refreshes device list when refresh button is clicked', async () => {
    ;(mobileService.getUserDevices as jest.Mock).mockResolvedValue({
      success: true,
      devices: [],
    })

    renderWithTheme(<MobileDeviceManager />)

    const refreshButton = screen.getByText('Refresh')
    fireEvent.click(refreshButton)

    await waitFor(() => {
      expect(mobileService.getUserDevices).toHaveBeenCalledTimes(2) // Initial load + refresh
    })
  })

  it('validates device registration form', async () => {
    ;(mobileService.getUserDevices as jest.Mock).mockResolvedValue({
      success: true,
      devices: [],
    })

    renderWithTheme(<MobileDeviceManager />)

    // Open register dialog
    fireEvent.click(screen.getByText('Register Device'))

    await waitFor(() => {
      expect(screen.getByText('Register New Device')).toBeInTheDocument()
    })

    // Try to submit without device name
    const registerSubmitButton = screen.getByRole('button', { name: 'Register' })
    expect(registerSubmitButton).toBeDisabled()

    // Add device name
    const deviceNameInput = screen.getByLabelText('Device Name')
    fireEvent.change(deviceNameInput, { target: { value: 'Test Device' } })

    // Button should now be enabled
    expect(registerSubmitButton).not.toBeDisabled()
  })

  it('opens device settings dialog', async () => {
    const mockDevice = global.testUtils.mockMobileDevice

    ;(mobileService.getUserDevices as jest.Mock).mockResolvedValue({
      success: true,
      devices: [mockDevice],
    })

    renderWithTheme(<MobileDeviceManager />)

    await waitFor(() => {
      expect(screen.getByText('Test iPhone')).toBeInTheDocument()
    })

    // Click settings button
    const settingsButton = screen.getByLabelText('Settings')
    fireEvent.click(settingsButton)

    await waitFor(() => {
      expect(screen.getByText('Device Settings - Test iPhone')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test iPhone')).toBeInTheDocument()
    })
  })
})