/**
 * Keyboard Shortcuts for Analyst Speed
 * 
 * J/K = Navigate threats
 * Q = Quarantine
 * R = Mark remediated
 * D = Dismiss
 * ? = Show help
 */

'use client'

import { useEffect, useCallback } from 'react'

export interface KeyboardShortcut {
  key: string
  description: string
  handler: () => void
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean
  shortcuts: KeyboardShortcut[]
}

export function useKeyboardShortcuts({
  enabled = true,
  shortcuts,
}: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey
        const altMatch = shortcut.alt ? event.altKey : !event.altKey

        if (
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          ctrlMatch &&
          shiftMatch &&
          altMatch
        ) {
          event.preventDefault()
          shortcut.handler()
          break
        }
      }
    },
    [enabled, shortcuts]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

/**
 * Predefined shortcuts for threat triage
 */
export function useThreatTriageShortcuts({
  onNext,
  onPrevious,
  onQuarantine,
  onRemediate,
  onDismiss,
  onHelp,
}: {
  onNext?: () => void
  onPrevious?: () => void
  onQuarantine?: () => void
  onRemediate?: () => void
  onDismiss?: () => void
  onHelp?: () => void
}) {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'j',
      description: 'Next threat',
      handler: () => onNext?.(),
    },
    {
      key: 'k',
      description: 'Previous threat',
      handler: () => onPrevious?.(),
    },
    {
      key: 'q',
      description: 'Quarantine threat',
      handler: () => onQuarantine?.(),
    },
    {
      key: 'r',
      description: 'Mark as remediated',
      handler: () => onRemediate?.(),
    },
    {
      key: 'd',
      description: 'Dismiss threat',
      handler: () => onDismiss?.(),
    },
    {
      key: '?',
      description: 'Show keyboard shortcuts',
      handler: () => onHelp?.(),
      shift: true,
    },
  ]

  useKeyboardShortcuts({ shortcuts })

  return shortcuts
}
