/**
 * Network Error Detection Helper for E2E Tests
 * Automatically catches 404/500 errors that tests might otherwise miss
 */
import { Page, test as base } from '@playwright/test';

interface NetworkError {
  url: string;
  status: number;
  statusText: string;
  method: string;
  timestamp: Date;
}

/**
 * Tracks network errors during test execution
 */
export class NetworkErrorTracker {
  private errors: NetworkError[] = [];
  private page: Page;
  private isTracking = false;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Start tracking network errors
   * Call this at the beginning of each test
   */
  start() {
    if (this.isTracking) return;
    
    this.errors = [];
    this.isTracking = true;

    this.page.on('response', (response) => {
      const status = response.status();
      const url = response.url();
      
      // Skip non-API requests (assets, etc.)
      if (!url.includes('/api') && !url.includes('workers.dev')) {
        return;
      }

      // Track 4xx and 5xx errors (except 401 which is expected for auth)
      if (status >= 400 && status !== 401) {
        this.errors.push({
          url,
          status,
          statusText: response.statusText(),
          method: response.request().method(),
          timestamp: new Date(),
        });
      }
    });
  }

  /**
   * Stop tracking and return any errors found
   */
  stop(): NetworkError[] {
    this.isTracking = false;
    return [...this.errors];
  }

  /**
   * Get all errors without stopping tracking
   */
  getErrors(): NetworkError[] {
    return [...this.errors];
  }

  /**
   * Check if any errors were detected
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * Get a formatted error report
   */
  getErrorReport(): string {
    if (this.errors.length === 0) {
      return 'No network errors detected';
    }

    const lines = ['Network errors detected:'];
    for (const error of this.errors) {
      lines.push(`  ${error.method} ${error.url} -> ${error.status} ${error.statusText}`);
    }
    return lines.join('\n');
  }

  /**
   * Clear all tracked errors
   */
  clear() {
    this.errors = [];
  }
}

/**
 * Setup network error detection on a page
 * Returns a function to check for errors at the end of the test
 */
export function setupNetworkErrorDetection(page: Page): NetworkErrorTracker {
  const tracker = new NetworkErrorTracker(page);
  tracker.start();
  return tracker;
}

/**
 * Assert no network errors occurred
 * Throws an error if any 404/500 responses were detected
 */
export function assertNoNetworkErrors(tracker: NetworkErrorTracker) {
  const errors = tracker.getErrors();
  if (errors.length > 0) {
    const errorMessages = errors.map(e => `${e.method} ${e.url} -> ${e.status}`).join('\n  ');
    throw new Error(`Network errors detected during test:\n  ${errorMessages}`);
  }
}

/**
 * Extended test fixture with automatic network error detection
 */
export const test = base.extend<{ networkTracker: NetworkErrorTracker }>({
  networkTracker: async ({ page }, use) => {
    const tracker = setupNetworkErrorDetection(page);
    await use(tracker);
    
    // After test completes, check for errors
    const errors = tracker.stop();
    if (errors.length > 0) {
      console.warn('\n⚠️ Network errors detected during test:');
      for (const error of errors) {
        console.warn(`  ${error.method} ${error.url} -> ${error.status} ${error.statusText}`);
      }
    }
  },
});

export { expect } from '@playwright/test';
