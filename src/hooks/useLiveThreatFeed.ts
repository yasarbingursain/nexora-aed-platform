
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface ThreatEvent {
  id: string;
  source: string;
  ioc_type: string;
  count: number;
  timestamp: string;
}

export function useLiveThreatFeed() {
  const [threats, setThreats] = useState<ThreatEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [statistics, setStatistics] = useState({
    threats_today: 0,
    by_category: [] as { name: string; icon: string; count: number }[],
  });

  useEffect(() => {
    const token = localStorage.getItem('accessToken');

    const ws = io(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080', {
      transports: ['websocket'],
      withCredentials: true,
      auth: token ? { token } : undefined,
    });

    ws.on('connect', () => {
      setConnected(true);
      ws.emit('subscribe:threatfeed');
      console.log('[ThreatFeed] Connected');
    });

    ws.on('threat:detected', (threat: ThreatEvent) => {
      setThreats((prev) => [threat, ...prev].slice(0, 50)); // Keep last 50
    });

    ws.on('disconnect', () => {
      setConnected(false);
    });

    ws.on('connect_error', (error) => {
      console.error('WebSocket connection failed:', error);
      setConnected(false);
    });

    setSocket(ws);

    // Fetch initial statistics
    fetchStatistics();

    return () => {
      ws.emit('unsubscribe:threatfeed');
      ws.close();
    };
  }, []);

  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/v1/threat-feed/statistics', {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setStatistics({
          threats_today: data.data.total_today,
          by_category: mapCategories(data.data.sources),
        });
      }
    } catch (error) {
      console.error('[ThreatFeed] Failed to fetch statistics', error);
    }
  };

  return { threats, connected, socket, statistics };
}

function updateCategories(
  categories: { name: string; icon: string; count: number }[],
  threat: ThreatEvent
): { name: string; icon: string; count: number }[] {
  const categoryMap: Record<string, { name: string; icon: string }> = {
    url: { name: 'Malicious URLs', icon: '🔗' },
    malware_sample: { name: 'Malware Samples', icon: '🦠' },
    ip: { name: 'Malicious IPs', icon: '🌐' },
    domain: { name: 'Malicious Domains', icon: '🏠' },
  };

  const category = categoryMap[threat.ioc_type] || { name: threat.ioc_type, icon: '⚠️' };
  const existing = categories.find((c) => c.name === category.name);

  if (existing) {
    return categories.map((c) =>
      c.name === category.name ? { ...c, count: c.count + threat.count } : c
    );
  }

  return [...categories, { ...category, count: threat.count }];
}

function mapCategories(sources: any[]): { name: string; icon: string; count: number }[] {
  const categoryMap: Record<string, { name: string; icon: string }> = {
    url: { name: 'Malicious URLs', icon: '🔗' },
    malware_sample: { name: 'Malware Samples', icon: '🦠' },
    ip: { name: 'Malicious IPs', icon: '🌐' },
  };

  return sources.map((s) => ({
    name: categoryMap[s.ioc_type]?.name || s.ioc_type,
    icon: categoryMap[s.ioc_type]?.icon || '⚠️',
    count: parseInt(s.total_count),
  }));
}
