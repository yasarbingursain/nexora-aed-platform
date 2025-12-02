/**
 * Enterprise-Grade Real-Time Hook with Resilience
 * 
 * Features:
 * - WebSocket with exponential backoff reconnection
 * - Automatic SSE fallback for corporate proxies
 * - Cookie-based authentication
 * - Connection health monitoring
 * - Graceful degradation
 */

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import type { Threat } from '@/types/threat.types'

type TransportType = 'websocket' | 'sse' | 'none'

interface RealtimeStatus {
  connected: boolean
  transport: TransportType
  reconnectAttempts: number
  lastError: string | null
}

export function useRealtimeThreats() {
  const [status, setStatus] = useState<RealtimeStatus>({
    connected: false,
    transport: 'none',
    reconnectAttempts: 0,
    lastError: null,
  })

  const queryClient = useQueryClient()
  const socketRef = useRef<Socket | null>(null)
  const esRef = useRef<EventSource | null>(null)
  const wsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Update threat in React Query cache
   */
  const updateThreatCache = useCallback(
    (threat: Threat, action: 'add' | 'update' | 'remove') => {
      queryClient.setQueryData<Threat[]>(['threats'], (old = []) => {
        switch (action) {
          case 'add':
            return [threat, ...old]
          case 'update':
            return old.map((t) => (t.id === threat.id ? threat : t))
          case 'remove':
            return old.filter((t) => t.id !== threat.id)
          default:
            return old
        }
      })
    },
    [queryClient]
  )

  /**
   * Initialize WebSocket connection
   */
  const initWebSocket = useCallback(() => {
    try {
      const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080', {
        transports: ['websocket'],
        withCredentials: true, // Send session cookie
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 500,
        reconnectionDelayMax: 8000,
        randomizationFactor: 0.5, // Add jitter to prevent thundering herd
      })

      socketRef.current = socket

      socket.on('connect', () => {
        setStatus((prev) => ({
          ...prev,
          connected: true,
          transport: 'websocket',
          reconnectAttempts: 0,
          lastError: null,
        }))
        console.log('[WebSocket] Connected')
      })

      socket.on('disconnect', (reason) => {
        setStatus((prev) => ({
          ...prev,
          connected: false,
          lastError: reason,
        }))
        console.log('[WebSocket] Disconnected:', reason)
      })

      socket.on('connect_error', (error) => {
        setStatus((prev) => ({
          ...prev,
          reconnectAttempts: prev.reconnectAttempts + 1,
          lastError: error.message,
        }))
        console.error('[WebSocket] Connection error:', error)
      })

      // Threat events
      socket.on('threat:detected', (threat: Threat) => {
        updateThreatCache(threat, 'add')
      })

      socket.on('threat:updated', (threat: Threat) => {
        updateThreatCache(threat, 'update')
      })

      socket.on('threat:resolved', (threat: Threat) => {
        updateThreatCache(threat, 'update')
      })

      // Fallback to SSE if WS doesn't connect within 3 seconds
      wsTimeoutRef.current = setTimeout(() => {
        if (!socket.connected) {
          console.log('[WebSocket] Failed to connect, falling back to SSE')
          socket.close()
          initSSE()
        }
      }, 3000)
    } catch (error) {
      console.error('[WebSocket] Initialization error:', error)
      initSSE()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateThreatCache])

  /**
   * Initialize Server-Sent Events (SSE) fallback
   */
  const initSSE = useCallback(() => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'
      const es = new EventSource(`${apiUrl}/events/stream`, {
        withCredentials: true,
      } as any)

      esRef.current = es

      es.onopen = () => {
        setStatus((prev) => ({
          ...prev,
          connected: true,
          transport: 'sse',
          reconnectAttempts: 0,
          lastError: null,
        }))
        console.log('[SSE] Connected')
      }

      es.onerror = (error) => {
        setStatus((prev) => ({
          ...prev,
          connected: false,
          lastError: 'SSE connection error',
        }))
        console.error('[SSE] Error:', error)
      }

      // Listen for threat events
      es.addEventListener('threat:detected', (event: MessageEvent) => {
        try {
          const threat: Threat = JSON.parse(event.data)
          updateThreatCache(threat, 'add')
        } catch (error) {
          console.error('[SSE] Failed to parse threat:detected event:', error)
        }
      })

      es.addEventListener('threat:updated', (event: MessageEvent) => {
        try {
          const threat: Threat = JSON.parse(event.data)
          updateThreatCache(threat, 'update')
        } catch (error) {
          console.error('[SSE] Failed to parse threat:updated event:', error)
        }
      })

      es.addEventListener('threat:resolved', (event: MessageEvent) => {
        try {
          const threat: Threat = JSON.parse(event.data)
          updateThreatCache(threat, 'update')
        } catch (error) {
          console.error('[SSE] Failed to parse threat:resolved event:', error)
        }
      })
    } catch (error) {
      console.error('[SSE] Initialization error:', error)
      setStatus((prev) => ({
        ...prev,
        transport: 'none',
        connected: false,
        lastError: 'Failed to initialize real-time connection',
      }))
    }
  }, [updateThreatCache])

  /**
   * Initialize connection on mount
   */
  useEffect(() => {
    initWebSocket()

    return () => {
      if (wsTimeoutRef.current) {
        clearTimeout(wsTimeoutRef.current)
      }
      if (socketRef.current) {
        socketRef.current.close()
      }
      if (esRef.current) {
        esRef.current.close()
      }
    }
  }, [initWebSocket])

  /**
   * Manual reconnect function
   */
  const reconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close()
    }
    if (esRef.current) {
      esRef.current.close()
    }
    initWebSocket()
  }, [initWebSocket])

  return {
    ...status,
    reconnect,
  }
}
