import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { useUIStore } from '@/stores/uiStore';
import type { Threat } from '@/types/api.types';
import { toast } from 'react-hot-toast';
import { getStoredTokens } from '@/services/api';

let socket: Socket | null = null;

export function useRealtimeThreats() {
  const queryClient = useQueryClient();
  const setConnectionStatus = useUIStore((state) => state.setConnectionStatus);
  const addNotification = useUIStore((state) => state.addNotification);
  const realTimeEnabled = useUIStore((state) => state.realTimeEnabled);

  const showThreatNotification = useCallback((threat: Threat) => {
    // Browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`${threat.severity.toUpperCase()} Threat Detected`, {
        body: threat.title,
        icon: '/icon-192.png',
        badge: '/badge.png',
        tag: 'nexora-threat',
      });
    }

    // In-app notification
    addNotification({
      type: threat.severity === 'critical' || threat.severity === 'high' ? 'error' : 'warning',
      title: `${threat.severity.toUpperCase()} Threat Detected`,
      message: threat.title,
      persistent: threat.severity === 'critical',
    });

    // Toast notification
    toast.error(`${threat.severity.toUpperCase()}: ${threat.title}`, {
      duration: threat.severity === 'critical' ? 10000 : 5000,
      icon: '🚨',
    });
  }, [addNotification]);

  useEffect(() => {
    if (!realTimeEnabled) {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
      return;
    }

    // Initialize socket connection
    if (!socket) {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';
      const tokens = getStoredTokens();

      socket = io(wsUrl, {
        auth: {
          token: tokens?.accessToken || '',
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      // Connection events
      socket.on('connect', () => {
        console.log('✅ WebSocket connected');
        setConnectionStatus('connected');
      });

      socket.on('disconnect', (reason) => {
        console.log('❌ WebSocket disconnected:', reason);
        setConnectionStatus('disconnected');
      });

      socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        setConnectionStatus('error');
      });

      socket.on('reconnect', (attemptNumber) => {
        console.log(`🔄 WebSocket reconnected after ${attemptNumber} attempts`);
        setConnectionStatus('connected');
      });

      socket.on('reconnecting', (attemptNumber) => {
        console.log(`🔄 WebSocket reconnecting (attempt ${attemptNumber})...`);
        setConnectionStatus('connecting');
      });

      // Threat events
      socket.on('threat:detected', (threat: Threat) => {
        console.log('🚨 New threat detected:', threat.id);

        // Update React Query cache
        queryClient.setQueryData<Threat[]>(
          ['threats'],
          (old = []) => [threat, ...old]
        );

        // Show notification
        showThreatNotification(threat);
      });

      socket.on('threat:updated', (threat: Threat) => {
        console.log('📝 Threat updated:', threat.id);

        // Update specific threat in cache
        queryClient.setQueryData<Threat[]>(
          ['threats'],
          (old = []) => old.map((t) => (t.id === threat.id ? threat : t))
        );

        // Invalidate threat detail if open
        queryClient.invalidateQueries({ queryKey: ['threat', threat.id] });
      });

      socket.on('threat:resolved', (threatId: string) => {
        console.log('✅ Threat resolved:', threatId);

        // Update threat status in cache
        queryClient.setQueryData<Threat[]>(
          ['threats'],
          (old = []) =>
            old.map((t) =>
              t.id === threatId ? { ...t, status: 'resolved' as any } : t
            )
        );
      });

      // Entity events
      socket.on('entity:risk_changed', (data: { entity_id: string; risk_score: number }) => {
        console.log('⚠️ Entity risk changed:', data);
        
        // Invalidate entities query
        queryClient.invalidateQueries({ queryKey: ['entities'] });
      });

      // System events
      socket.on('system:alert', (alert: { type: string; message: string }) => {
        console.log('🔔 System alert:', alert);
        
        addNotification({
          type: 'info',
          title: 'System Alert',
          message: alert.message,
        });
      });
    }

    return () => {
      // Cleanup on unmount
      if (socket) {
        socket.off('threat:detected');
        socket.off('threat:updated');
        socket.off('threat:resolved');
        socket.off('entity:risk_changed');
        socket.off('system:alert');
      }
    };
  }, [queryClient, setConnectionStatus, showThreatNotification, addNotification, realTimeEnabled]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      socket = null;
      setConnectionStatus('disconnected');
    }
  }, [setConnectionStatus]);

  const reconnect = useCallback(() => {
    if (socket) {
      socket.connect();
    }
  }, []);

  return {
    connected: socket?.connected ?? false,
    disconnect,
    reconnect,
  };
}
