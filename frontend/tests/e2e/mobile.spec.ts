import { test, expect } from '@playwright/test'

test.describe('Mobile Management Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await page.route('**/api/mobile/devices', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          devices: [
            {
              id: 1,
              device_id: 'test_device_123',
              device_name: 'Test iPhone',
              device_type: 'ios',
              platform_version: 'iOS 16.5',
              app_version: '1.0.0',
              is_active: true,
              sync_enabled: true,
              last_seen: new Date().toISOString(),
            },
          ],
        }),
      })
    })

    await page.route('**/api/mobile/storage/usage', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          storage_usage: {
            total_size: 1024,
            storage_limit: 2048,
            usage_percentage: 50,
            document_count: 5,
          },
        }),
      })
    })

    await page.route('**/api/mobile/sync/statistics', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          sync_statistics: {
            total_sessions: 10,
            successful_sessions: 8,
            failed_sessions: 2,
            success_rate: 80,
            total_data_transferred: 5120,
          },
        }),
      })
    })

    // Navigate to mobile page
    await page.goto('/mobile')
  })

  test('should display mobile management page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Mobile Management')
    await expect(page.locator('[data-testid="mobile-device-manager"]')).toBeVisible()
    await expect(page.locator('[data-testid="sync-monitor"]')).toBeVisible()
    await expect(page.locator('[data-testid="offline-document-manager"]')).toBeVisible()
    await expect(page.locator('[data-testid="mobile-analytics"]')).toBeVisible()
  })

  test('should display device statistics', async ({ page }) => {
    // Wait for data to load
    await page.waitForSelector('[data-testid="device-count"]')
    
    // Check device count
    await expect(page.locator('[data-testid="device-count"]')).toContainText('1')
    
    // Check storage usage
    await expect(page.locator('[data-testid="storage-usage"]')).toContainText('1 KB')
    
    // Check sync statistics
    await expect(page.locator('[data-testid="sync-sessions"]')).toContainText('10')
    await expect(page.locator('[data-testid="success-rate"]')).toContainText('80%')
  })

  test('should open device registration dialog', async ({ page }) => {
    await page.click('button:has-text("Register Device")')
    
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    await expect(page.locator('h2')).toContainText('Register New Device')
    await expect(page.locator('input[name="device_name"]')).toBeVisible()
    await expect(page.locator('select[name="device_type"]')).toBeVisible()
  })

  test('should register a new device', async ({ page }) => {
    // Mock device registration API
    await page.route('**/api/mobile/devices/register', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          device: {
            id: 2,
            device_id: 'new_device_456',
            device_name: 'New Test Device',
            device_type: 'android',
            platform_version: 'Android 13',
            app_version: '1.0.0',
            is_active: true,
            sync_enabled: true,
            last_seen: new Date().toISOString(),
          },
        }),
      })
    })

    // Open registration dialog
    await page.click('button:has-text("Register Device")')
    
    // Fill in device details
    await page.fill('input[name="device_name"]', 'New Test Device')
    await page.selectOption('select[name="device_type"]', 'android')
    await page.fill('input[name="platform_version"]', 'Android 13')
    
    // Submit registration
    await page.click('button:has-text("Register")')
    
    // Wait for success message
    await expect(page.locator('.ant-message-success')).toBeVisible()
    await expect(page.locator('.ant-message-success')).toContainText('Device registered successfully')
  })

  test('should display device list', async ({ page }) => {
    // Wait for device list to load
    await page.waitForSelector('[data-testid="device-list"]')
    
    // Check device is displayed
    await expect(page.locator('[data-testid="device-item"]')).toHaveCount(1)
    await expect(page.locator('[data-testid="device-name"]')).toContainText('Test iPhone')
    await expect(page.locator('[data-testid="device-type"]')).toContainText('iOS')
    await expect(page.locator('[data-testid="device-status"]')).toContainText('Online')
  })

  test('should toggle sync settings', async ({ page }) => {
    // Mock device update API
    await page.route('**/api/mobile/devices/1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          device: {
            id: 1,
            device_name: 'Test iPhone',
            sync_enabled: false,
          },
        }),
      })
    })

    // Wait for device list
    await page.waitForSelector('[data-testid="sync-toggle"]')
    
    // Toggle sync setting
    await page.click('[data-testid="sync-toggle"]')
    
    // Wait for update confirmation
    await expect(page.locator('.ant-message-success')).toBeVisible()
  })

  test('should display sync monitor', async ({ page }) => {
    // Mock sync sessions API
    await page.route('**/api/mobile/sync/sessions**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          sessions: [
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
          ],
        }),
      })
    })

    // Check sync monitor is visible
    await expect(page.locator('[data-testid="sync-monitor"]')).toBeVisible()
    
    // Wait for sync sessions to load
    await page.waitForSelector('[data-testid="sync-session"]')
    
    // Check sync session details
    await expect(page.locator('[data-testid="sync-session"]')).toHaveCount(1)
    await expect(page.locator('[data-testid="sync-status"]')).toContainText('Completed')
    await expect(page.locator('[data-testid="sync-progress"]')).toContainText('10/10')
  })

  test('should start manual sync', async ({ page }) => {
    // Mock start sync API
    await page.route('**/api/mobile/sync/start', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          session: {
            id: 2,
            session_id: 'sync_456',
            sync_type: 'manual',
            status: 'in_progress',
            started_at: new Date().toISOString(),
            total_items: 0,
            synced_items: 0,
            failed_items: 0,
          },
        }),
      })
    })

    // Click start sync button
    await page.click('button:has-text("Start Sync")')
    
    // Wait for sync to start
    await expect(page.locator('.ant-message-success')).toBeVisible()
    await expect(page.locator('.ant-message-success')).toContainText('Sync started')
  })

  test('should display offline documents', async ({ page }) => {
    // Mock offline documents API
    await page.route('**/api/mobile/offline/documents**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          documents: [
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
          ],
        }),
      })
    })

    // Check offline document manager is visible
    await expect(page.locator('[data-testid="offline-document-manager"]')).toBeVisible()
    
    // Wait for offline documents to load
    await page.waitForSelector('[data-testid="offline-document"]')
    
    // Check offline document details
    await expect(page.locator('[data-testid="offline-document"]')).toHaveCount(1)
    await expect(page.locator('[data-testid="download-status"]')).toContainText('Completed')
    await expect(page.locator('[data-testid="file-size"]')).toContainText('1 KB')
  })

  test('should queue document for offline', async ({ page }) => {
    // Mock queue document API
    await page.route('**/api/mobile/offline/documents', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          offline_document: {
            id: 2,
            document_id: 456,
            download_status: 'pending',
            download_priority: 2,
            file_size: null,
            downloaded_size: 0,
            local_path: null,
            created_at: new Date().toISOString(),
          },
        }),
      })
    })

    // Click queue document button
    await page.click('button:has-text("Queue for Offline")')
    
    // Wait for success message
    await expect(page.locator('.ant-message-success')).toBeVisible()
    await expect(page.locator('.ant-message-success')).toContainText('Document queued for offline')
  })

  test('should display mobile analytics', async ({ page }) => {
    // Mock analytics API
    await page.route('**/api/mobile/analytics**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          events: [
            {
              id: 1,
              event_type: 'app_launch',
              event_data: { version: '1.0.0' },
              session_id: 'session_123',
              timestamp: '2023-01-01T00:00:00Z',
            },
          ],
        }),
      })
    })

    // Check analytics component is visible
    await expect(page.locator('[data-testid="mobile-analytics"]')).toBeVisible()
    
    // Wait for analytics data to load
    await page.waitForSelector('[data-testid="analytics-chart"]')
    
    // Check analytics charts are displayed
    await expect(page.locator('[data-testid="analytics-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="event-count"]')).toContainText('1')
  })

  test('should handle responsive layout', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Check components adapt to mobile layout
    await expect(page.locator('[data-testid="mobile-device-manager"]')).toBeVisible()
    await expect(page.locator('[data-testid="sync-monitor"]')).toBeVisible()
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    
    // Check components adapt to tablet layout
    await expect(page.locator('[data-testid="mobile-device-manager"]')).toBeVisible()
    await expect(page.locator('[data-testid="sync-monitor"]')).toBeVisible()
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 })
    
    // Check components display properly on desktop
    await expect(page.locator('[data-testid="mobile-device-manager"]')).toBeVisible()
    await expect(page.locator('[data-testid="sync-monitor"]')).toBeVisible()
    await expect(page.locator('[data-testid="offline-document-manager"]')).toBeVisible()
    await expect(page.locator('[data-testid="mobile-analytics"]')).toBeVisible()
  })

  test('should handle error states', async ({ page }) => {
    // Mock API error
    await page.route('**/api/mobile/devices', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Internal server error',
        }),
      })
    })

    // Reload page to trigger error
    await page.reload()
    
    // Check error message is displayed
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Error loading mobile data')
  })

  test('should refresh data', async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('[data-testid="device-list"]')
    
    // Click refresh button
    await page.click('button:has-text("Refresh")')
    
    // Check loading indicator appears
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible()
    
    // Wait for data to reload
    await page.waitForSelector('[data-testid="device-list"]')
    
    // Check data is refreshed
    await expect(page.locator('[data-testid="device-item"]')).toHaveCount(1)
  })
})