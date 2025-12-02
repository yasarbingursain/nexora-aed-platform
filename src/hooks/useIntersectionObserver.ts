import { useEffect, useRef, useState } from 'react'

interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  freezeOnceVisible?: boolean
}

/**
 * Custom hook for intersection observer
 * @param options - Intersection observer options
 * @returns Ref to attach to element and intersection entry
 */
export function useIntersectionObserver({
  threshold = 0,
  root = null,
  rootMargin = '0%',
  freezeOnceVisible = false
}: UseIntersectionObserverOptions = {}) {
  const [entry, setEntry] = useState<IntersectionObserverEntry>()
  const [node, setNode] = useState<Element | null>(null)

  const observer = useRef<IntersectionObserver | null>(null)
  const hasIOSupport = typeof window !== 'undefined' && 'IntersectionObserver' in window

  const frozen = entry?.isIntersecting && freezeOnceVisible

  useEffect(() => {
    if (observer.current) observer.current.disconnect()
    observer.current = null

    if (!hasIOSupport || frozen || !node) return

    const thresholdValue = Array.isArray(threshold) ? threshold.join(',') : threshold

    observer.current = new IntersectionObserver(
      ([entry]) => setEntry(entry),
      { threshold, root, rootMargin }
    )

    const { current: currentObserver } = observer
    currentObserver.observe(node)

    return () => currentObserver.disconnect()
  }, [node, threshold, root, rootMargin, frozen, hasIOSupport])

  const previousY = useRef<number>()
  const previousRatio = useRef<number>()

  useEffect(() => {
    if (entry && entry.boundingClientRect) {
      const currentY = entry.boundingClientRect.y
      const currentRatio = entry.intersectionRatio
      const isIntersecting = entry.isIntersecting

      // Update the direction and ratio
      if (currentY < (previousY.current ?? 0)) {
        // Scrolling down/up
      }

      previousY.current = currentY
      previousRatio.current = currentRatio
    }
  }, [entry])

  return [setNode, entry] as const
}
