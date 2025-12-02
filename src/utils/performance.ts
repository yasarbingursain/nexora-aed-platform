/**
 * Performance utilities for the Nexora platform
 */

/**
 * Debounce function to limit the rate of function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate?: boolean
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      if (!immediate) func(...args)
    }

    const callNow = immediate && !timeout

    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)

    if (callNow) func(...args)
  }
}

/**
 * Throttle function to limit function calls to once per interval
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Memoization function for expensive computations
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  getKey?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>()

  return ((...args: Parameters<T>) => {
    const key = getKey ? getKey(...args) : JSON.stringify(args)
    
    if (cache.has(key)) {
      return cache.get(key)!
    }

    const result = func(...args)
    cache.set(key, result)
    return result
  }) as T
}

/**
 * Performance measurement utility
 */
export class PerformanceMonitor {
  private static marks = new Map<string, number>()

  static mark(name: string): void {
    this.marks.set(name, performance.now())
  }

  static measure(name: string, startMark?: string): number {
    const endTime = performance.now()
    const startTime = startMark ? this.marks.get(startMark) || 0 : this.marks.get(name) || 0
    const duration = endTime - startTime

    console.log(`Performance [${name}]: ${duration.toFixed(2)}ms`)
    return duration
  }

  static clear(name?: string): void {
    if (name) {
      this.marks.delete(name)
    } else {
      this.marks.clear()
    }
  }
}

/**
 * Batch processing utility for large datasets
 */
export function batchProcess<T, R>(
  items: T[],
  processor: (batch: T[]) => Promise<R[]>,
  batchSize: number = 100,
  delay: number = 0
): Promise<R[]> {
  return new Promise(async (resolve, reject) => {
    try {
      const results: R[] = []
      
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize)
        const batchResults = await processor(batch)
        results.push(...batchResults)
        
        // Add delay between batches to prevent blocking
        if (delay > 0 && i + batchSize < items.length) {
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
      
      resolve(results)
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Virtual scrolling utilities
 */
export interface VirtualScrollOptions {
  itemHeight: number
  containerHeight: number
  overscan?: number
}

export function calculateVirtualScrollParams(
  scrollTop: number,
  totalItems: number,
  options: VirtualScrollOptions
) {
  const { itemHeight, containerHeight, overscan = 5 } = options
  
  const visibleCount = Math.ceil(containerHeight / itemHeight)
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(totalItems - 1, startIndex + visibleCount + overscan * 2)
  
  return {
    startIndex,
    endIndex,
    visibleCount,
    totalHeight: totalItems * itemHeight,
    offsetY: startIndex * itemHeight
  }
}

/**
 * Image lazy loading utility
 */
export function createImageLoader(
  src: string,
  onLoad?: () => void,
  onError?: () => void
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    
    img.onload = () => {
      onLoad?.()
      resolve(img)
    }
    
    img.onerror = () => {
      onError?.()
      reject(new Error(`Failed to load image: ${src}`))
    }
    
    img.src = src
  })
}

/**
 * Request animation frame utility
 */
export function rafScheduler(callback: () => void): () => void {
  let rafId: number | null = null
  
  const schedule = () => {
    if (rafId !== null) return
    
    rafId = requestAnimationFrame(() => {
      rafId = null
      callback()
    })
  }
  
  const cancel = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }
  
  schedule()
  return cancel
}

/**
 * Memory usage monitoring
 */
interface MemoryInfo {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
}

export function getMemoryUsage(): MemoryInfo | null {
  if ('memory' in performance) {
    return (performance as any).memory
  }
  return null
}

/**
 * Bundle size analyzer helper
 */
export function analyzeBundleSize(): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('Bundle analysis available in development mode')
    // This would integrate with webpack-bundle-analyzer or similar
  }
}
