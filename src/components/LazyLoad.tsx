'use client'

import { Suspense, lazy, forwardRef } from 'react'

interface LazyLoadProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  className?: string
}

/**
 * Lazy loading wrapper component
 */
export function LazyLoad({ children, fallback, className }: LazyLoadProps) {
  const defaultFallback = (
    <div className={`flex items-center justify-center p-8 ${className || ''}`}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  )
}

/**
 * Higher-order component for lazy loading
 */
export function withLazyLoading<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(() => Promise.resolve({ default: Component }))
  
  return function WrappedComponent(props: P) {
    return (
      <LazyLoad fallback={fallback}>
        <LazyComponent {...(props as any)} />
      </LazyLoad>
    )
  }
}

/**
 * Utility for creating lazy-loaded components
 */
export function lazyLoad<P extends object>(
  importFunc: () => Promise<{ default: React.ComponentType<P> }>,
  fallback?: React.ReactNode
): React.ComponentType<P> {
  const LazyComponent = lazy(importFunc)

  const defaultFallback = (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )

  const LazyLoadedComponent = (props: P) => (
    <Suspense fallback={fallback || defaultFallback}>
      <LazyComponent {...(props as any)} />
    </Suspense>
  )

  LazyLoadedComponent.displayName = 'LazyLoadedComponent'

  return LazyLoadedComponent
}
