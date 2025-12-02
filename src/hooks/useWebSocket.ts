import { useEffect, useRef, useState, useCallback } from 'react'
import { useUIStore } from '@/stores/uiStore'

export interface WebSocketMessage<T = any> {
  type: string
  data: T
  timestamp: string
  id: string
}

interface UseWebSocketOptions {
  url: string
  protocols?: string | string[]
  onMessage?: (message: WebSocketMessage) => void
  onError?: (error: Event) => void
  onOpen?: (event: Event) => void
  onClose?: (event: CloseEvent) => void
  shouldReconnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

interface UseWebSocketReturn {
  socket: WebSocket | null
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  sendMessage: (message: any) => void
  disconnect: () => void
  reconnect: () => void
}

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const {
    url,
    protocols,
    onMessage,
    onError,
    onOpen,
    onClose,
    shouldReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5
  } = options

  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectAttemptsRef = useRef(0)
  const shouldConnectRef = useRef(true)

  const { setConnectionStatus: setUIConnectionStatus } = useUIStore()

  const connect = useCallback(() => {
    if (!shouldConnectRef.current) return

    try {
      setConnectionStatus('connecting')
      setUIConnectionStatus('connecting')

      const ws = new WebSocket(url, protocols)

      ws.onopen = (event) => {
        setConnectionStatus('connected')
        setUIConnectionStatus('connected')
        reconnectAttemptsRef.current = 0
        onOpen?.(event)
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          onMessage?.(message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        setConnectionStatus('error')
        setUIConnectionStatus('error')
        onError?.(error)
      }

      ws.onclose = (event) => {
        setConnectionStatus('disconnected')
        setUIConnectionStatus('disconnected')
        setSocket(null)
        onClose?.(event)

        // Attempt to reconnect if enabled and not manually closed
        if (shouldReconnect && shouldConnectRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++
          const delay = reconnectInterval * Math.pow(1.5, reconnectAttemptsRef.current - 1) // Exponential backoff
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (shouldConnectRef.current) {
              connect()
            }
          }, delay)
        }
      }

      setSocket(ws)
    } catch (error) {
      setConnectionStatus('error')
      setUIConnectionStatus('error')
      console.error('WebSocket connection failed:', error)
    }
  }, [url, protocols, onMessage, onError, onOpen, onClose, shouldReconnect, reconnectInterval, maxReconnectAttempts, setUIConnectionStatus])

  const sendMessage = useCallback((message: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        const messageWithId = {
          ...message,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString()
        }
        socket.send(JSON.stringify(messageWithId))
      } catch (error) {
        console.error('Failed to send WebSocket message:', error)
      }
    } else {
      console.warn('WebSocket is not connected')
    }
  }, [socket])

  const disconnect = useCallback(() => {
    shouldConnectRef.current = false
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (socket) {
      socket.close()
    }
  }, [socket])

  const reconnect = useCallback(() => {
    disconnect()
    shouldConnectRef.current = true
    reconnectAttemptsRef.current = 0
    connect()
  }, [connect, disconnect])

  useEffect(() => {
    shouldConnectRef.current = true
    connect()

    return () => {
      shouldConnectRef.current = false
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (socket) {
        socket.close()
      }
    }
  }, [connect, socket])

  return {
    socket,
    connectionStatus,
    sendMessage,
    disconnect,
    reconnect
  }
}
