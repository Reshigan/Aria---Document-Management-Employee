// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Map<string, number> = new Map()

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  // Mark the start of a performance measurement
  mark(name: string): void {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`${name}-start`)
    }
    this.metrics.set(`${name}-start`, Date.now())
  }

  // Mark the end of a performance measurement and calculate duration
  measure(name: string): number {
    const startTime = this.metrics.get(`${name}-start`)
    const endTime = Date.now()
    
    if (startTime) {
      const duration = endTime - startTime
      this.metrics.set(name, duration)
      
      if (typeof performance !== 'undefined' && performance.mark && performance.measure) {
        performance.mark(`${name}-end`)
        performance.measure(name, `${name}-start`, `${name}-end`)
      }
      
      // Log slow operations in development
      if (import.meta.env.DEV && duration > 100) {
        console.warn(`Slow operation detected: ${name} took ${duration}ms`)
      }
      
      return duration
    }
    
    return 0
  }

  // Get all metrics
  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics)
  }

  // Clear all metrics
  clear(): void {
    this.metrics.clear()
    if (typeof performance !== 'undefined' && performance.clearMarks) {
      performance.clearMarks()
      performance.clearMeasures()
    }
  }
}

// Memory usage monitoring
export const getMemoryUsage = (): any => {
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    return {
      usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
      totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
      jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
    }
  }
  return null
}

// Bundle size analyzer (development only)
export const analyzeBundleSize = () => {
  if (import.meta.env.DEV) {
    const scripts = document.querySelectorAll('script[src]')
    const styles = document.querySelectorAll('link[rel="stylesheet"]')
    
    console.group('Bundle Analysis')
    console.log(`Scripts loaded: ${scripts.length}`)
    console.log(`Stylesheets loaded: ${styles.length}`)
    
    scripts.forEach((script, index) => {
      const src = (script as HTMLScriptElement).src
      if (src.includes('localhost') || src.includes('127.0.0.1')) {
        console.log(`Script ${index + 1}: ${src.split('/').pop()}`)
      }
    })
    
    console.groupEnd()
  }
}

export default PerformanceMonitor