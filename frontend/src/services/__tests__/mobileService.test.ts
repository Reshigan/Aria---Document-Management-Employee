import axios from 'axios'
import { mobileService } from '../mobileService'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

describe('MobileService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue('mock-token')
  })

  describe('Device Management', () => {
    it('registers a device successfully', async () => {
      const mockDevice = global.testUtils.mockMobileDevice
      const mockResponse = {
        data: {
          success: true,
          device: mockDevice,
        },
      }

      mockedAxios.post.mockResolvedValue(mockResponse)

      const deviceData = {
        device_id: 'test_device_123',
        device_name: 'Test iPhone',
        device_type: 'ios',
        platform_version: 'iOS 16.5',
        app_version: '1.0.0',
      }

      const result = await mobileService.registerDevice(deviceData)

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8000/api/mobile/devices/register',
        deviceData,
        {
          headers: {
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          },
        }
      )
      expect(result.success).toBe(true)
      expect(result.device).toEqual(mockDevice)
    })

    it('gets user devices successfully', async () => {
      const mockDevices = [global.testUtils.mockMobileDevice]
      const mockResponse = {
        data: {
          success: true,
          devices: mockDevices,
        },
      }

      mockedAxios.get.mockResolvedValue(mockResponse)

      const result = await mobileService.getUserDevices()

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:8000/api/mobile/devices',
        {
          headers: {
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          },
        }
      )
      expect(result.success).toBe(true)
      expect(result.devices).toEqual(mockDevices)
    })

    it('updates a device successfully', async () => {
      const mockDevice = { ...global.testUtils.mockMobileDevice, device_name: 'Updated iPhone' }
      const mockResponse = {
        data: {
          success: true,
          device: mockDevice,
        },
      }

      mockedAxios.put.mockResolvedValue(mockResponse)

      const updateData = { device_name: 'Updated iPhone' }
      const result = await mobileService.updateDevice(1, updateData)

      expect(mockedAxios.put).toHaveBeenCalledWith(
        'http://localhost:8000/api/mobile/devices/1',
        updateData,
        {
          headers: {
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          },
        }
      )
      expect(result.success).toBe(true)
      expect(result.device.device_name).toBe('Updated iPhone')
    })

    it('deactivates a device successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Device deactivated',
        },
      }

      mockedAxios.delete.mockResolvedValue(mockResponse)

      const result = await mobileService.deactivateDevice(1)

      expect(mockedAxios.delete).toHaveBeenCalledWith(
        'http://localhost:8000/api/mobile/devices/1',
        {
          headers: {
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          },
        }
      )
      expect(result.success).toBe(true)
      expect(result.message).toBe('Device deactivated')
    })
  })

  describe('Sync Management', () => {
    it('starts a sync session successfully', async () => {
      const mockSession = {
        id: 1,
        session_id: 'sync_123',
        sync_type: 'incremental',
        status: 'in_progress',
        started_at: '2023-01-01T00:00:00Z',
        total_items: 0,
        synced_items: 0,
        failed_items: 0,
      }
      const mockResponse = {
        data: {
          success: true,
          session: mockSession,
        },
      }

      mockedAxios.post.mockResolvedValue(mockResponse)

      const result = await mobileService.startSyncSession(1, 'incremental')

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8000/api/mobile/sync/start',
        { device_id: 1, sync_type: 'incremental' },
        {
          headers: {
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          },
        }
      )
      expect(result.success).toBe(true)
      expect(result.session).toEqual(mockSession)
    })

    it('gets sync sessions successfully', async () => {
      const mockSessions = [
        {
          id: 1,
          session_id: 'sync_123',
          sync_type: 'incremental',
          status: 'completed',
          started_at: '2023-01-01T00:00:00Z',
          completed_at: '2023-01-01T00:05:00Z',
          total_items: 10,
          synced_items: 10,
          failed_items: 0,
        },
      ]
      const mockResponse = {
        data: {
          success: true,
          sessions: mockSessions,
        },
      }

      mockedAxios.get.mockResolvedValue(mockResponse)

      const result = await mobileService.getSyncSessions(1, 50)

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:8000/api/mobile/sync/sessions?device_id=1&limit=50',
        {
          headers: {
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          },
        }
      )
      expect(result.success).toBe(true)
      expect(result.sessions).toEqual(mockSessions)
    })

    it('adds sync items successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          items_added: 2,
        },
      }

      mockedAxios.post.mockResolvedValue(mockResponse)

      const items = [
        { item_type: 'document', item_id: 'doc_1', action: 'upload', priority: 1 },
        { item_type: 'document', item_id: 'doc_2', action: 'download', priority: 2 },
      ]

      const result = await mobileService.addSyncItems(1, items)

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8000/api/mobile/sync/1/items',
        items,
        {
          headers: {
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          },
        }
      )
      expect(result.success).toBe(true)
      expect(result.items_added).toBe(2)
    })

    it('completes sync session successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Sync session completed',
        },
      }

      mockedAxios.post.mockResolvedValue(mockResponse)

      const result = await mobileService.completeSyncSession(1, 'completed')

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8000/api/mobile/sync/1/complete',
        { status: 'completed' },
        {
          headers: {
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          },
        }
      )
      expect(result.success).toBe(true)
    })
  })

  describe('Offline Document Management', () => {
    it('queues document for offline successfully', async () => {
      const mockOfflineDoc = {
        id: 1,
        document_id: 123,
        download_status: 'pending',
        download_priority: 2,
        file_size: null,
        downloaded_size: 0,
        local_path: null,
        created_at: '2023-01-01T00:00:00Z',
      }
      const mockResponse = {
        data: {
          success: true,
          offline_document: mockOfflineDoc,
        },
      }

      mockedAxios.post.mockResolvedValue(mockResponse)

      const result = await mobileService.queueDocumentForOffline(1, 123, 2)

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8000/api/mobile/offline/documents',
        { device_id: 1, document_id: 123, priority: 2 },
        {
          headers: {
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          },
        }
      )
      expect(result.success).toBe(true)
      expect(result.offline_document).toEqual(mockOfflineDoc)
    })

    it('gets offline documents successfully', async () => {
      const mockOfflineDocs = [
        {
          id: 1,
          document_id: 123,
          download_status: 'completed',
          download_priority: 1,
          file_size: 1024,
          downloaded_size: 1024,
          local_path: '/storage/doc_123.pdf',
          created_at: '2023-01-01T00:00:00Z',
        },
      ]
      const mockResponse = {
        data: {
          success: true,
          documents: mockOfflineDocs,
        },
      }

      mockedAxios.get.mockResolvedValue(mockResponse)

      const result = await mobileService.getOfflineDocuments(1, 'completed')

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:8000/api/mobile/offline/documents?device_id=1&status=completed',
        {
          headers: {
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          },
        }
      )
      expect(result.success).toBe(true)
      expect(result.documents).toEqual(mockOfflineDocs)
    })

    it('updates offline document status successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Status updated',
        },
      }

      mockedAxios.put.mockResolvedValue(mockResponse)

      const result = await mobileService.updateOfflineDocumentStatus(
        1,
        'downloading',
        512,
        '/storage/doc.pdf'
      )

      expect(mockedAxios.put).toHaveBeenCalledWith(
        'http://localhost:8000/api/mobile/offline/documents/1/status',
        {
          status: 'downloading',
          downloaded_size: 512,
          local_path: '/storage/doc.pdf',
        },
        {
          headers: {
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          },
        }
      )
      expect(result.success).toBe(true)
    })
  })

  describe('Analytics', () => {
    it('logs mobile event successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          event_id: 1,
        },
      }

      mockedAxios.post.mockResolvedValue(mockResponse)

      const eventData = {
        event_type: 'app_launch',
        event_data: { version: '1.0.0' },
        session_id: 'session_123',
      }

      const result = await mobileService.logMobileEvent(1, eventData)

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8000/api/mobile/analytics/events',
        { device_id: 1, ...eventData },
        {
          headers: {
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          },
        }
      )
      expect(result.success).toBe(true)
      expect(result.event_id).toBe(1)
    })

    it('gets mobile analytics successfully', async () => {
      const mockEvents = [
        {
          id: 1,
          event_type: 'app_launch',
          event_data: { version: '1.0.0' },
          session_id: 'session_123',
          timestamp: '2023-01-01T00:00:00Z',
        },
      ]
      const mockResponse = {
        data: {
          success: true,
          events: mockEvents,
        },
      }

      mockedAxios.get.mockResolvedValue(mockResponse)

      const result = await mobileService.getMobileAnalytics(1, 'app_launch', 30)

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:8000/api/mobile/analytics?device_id=1&event_type=app_launch&days=30',
        {
          headers: {
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          },
        }
      )
      expect(result.success).toBe(true)
      expect(result.events).toEqual(mockEvents)
    })
  })

  describe('Utility Methods', () => {
    it('formats file size correctly', () => {
      expect(mobileService.formatFileSize(0)).toBe('0 Bytes')
      expect(mobileService.formatFileSize(1024)).toBe('1 KB')
      expect(mobileService.formatFileSize(1048576)).toBe('1 MB')
      expect(mobileService.formatFileSize(1073741824)).toBe('1 GB')
    })

    it('formats sync status correctly', () => {
      expect(mobileService.formatSyncStatus('pending')).toBe('Pending')
      expect(mobileService.formatSyncStatus('in_progress')).toBe('In Progress')
      expect(mobileService.formatSyncStatus('completed')).toBe('Completed')
      expect(mobileService.formatSyncStatus('failed')).toBe('Failed')
      expect(mobileService.formatSyncStatus('unknown')).toBe('unknown')
    })

    it('formats device type correctly', () => {
      expect(mobileService.formatDeviceType('ios')).toBe('iOS')
      expect(mobileService.formatDeviceType('android')).toBe('Android')
      expect(mobileService.formatDeviceType('tablet')).toBe('Tablet')
      expect(mobileService.formatDeviceType('desktop')).toBe('Desktop')
      expect(mobileService.formatDeviceType('unknown')).toBe('unknown')
    })

    it('gets correct status color', () => {
      expect(mobileService.getStatusColor('completed')).toBe('success')
      expect(mobileService.getStatusColor('in_progress')).toBe('info')
      expect(mobileService.getStatusColor('pending')).toBe('warning')
      expect(mobileService.getStatusColor('failed')).toBe('error')
      expect(mobileService.getStatusColor('unknown')).toBe('default')
    })

    it('calculates sync progress correctly', () => {
      expect(mobileService.calculateSyncProgress(0, 0)).toBe(0)
      expect(mobileService.calculateSyncProgress(5, 10)).toBe(50)
      expect(mobileService.calculateSyncProgress(10, 10)).toBe(100)
    })

    it('determines device online status correctly', () => {
      const now = new Date()
      const recentTime = new Date(now.getTime() - 2 * 60 * 1000) // 2 minutes ago
      const oldTime = new Date(now.getTime() - 10 * 60 * 1000) // 10 minutes ago

      expect(mobileService.isDeviceOnline(recentTime.toISOString())).toBe(true)
      expect(mobileService.isDeviceOnline(oldTime.toISOString())).toBe(false)
    })

    it('gets device status text correctly', () => {
      const activeDevice = { ...global.testUtils.mockMobileDevice, is_active: true, last_seen: new Date().toISOString() }
      const inactiveDevice = { ...global.testUtils.mockMobileDevice, is_active: false }
      const neverConnectedDevice = { ...global.testUtils.mockMobileDevice, is_active: true, last_seen: null }

      expect(mobileService.getDeviceStatusText(inactiveDevice)).toBe('Inactive')
      expect(mobileService.getDeviceStatusText(neverConnectedDevice)).toBe('Never Connected')
      expect(mobileService.getDeviceStatusText(activeDevice)).toBe('Online')
    })

    it('gets device status color correctly', () => {
      const activeDevice = { ...global.testUtils.mockMobileDevice, is_active: true, last_seen: new Date().toISOString() }
      const inactiveDevice = { ...global.testUtils.mockMobileDevice, is_active: false }
      const neverConnectedDevice = { ...global.testUtils.mockMobileDevice, is_active: true, last_seen: null }

      expect(mobileService.getDeviceStatusColor(inactiveDevice)).toBe('error')
      expect(mobileService.getDeviceStatusColor(neverConnectedDevice)).toBe('warning')
      expect(mobileService.getDeviceStatusColor(activeDevice)).toBe('success')
    })
  })

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network Error'))

      await expect(mobileService.getUserDevices()).rejects.toThrow('Network Error')
    })

    it('handles API errors gracefully', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: {
            success: false,
            message: 'Bad Request',
          },
        },
      }

      mockedAxios.post.mockRejectedValue(errorResponse)

      await expect(
        mobileService.registerDevice({
          device_id: 'test',
          device_name: 'Test',
          device_type: 'ios',
        })
      ).rejects.toEqual(errorResponse)
    })
  })
})