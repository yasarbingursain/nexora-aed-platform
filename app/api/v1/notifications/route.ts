import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = new Date();
    const mockNotifications = [
      {
        id: '1',
        title: 'New threat detected',
        message: 'Anomalous token usage detected in agent-ops-runner',
        timestamp: new Date(now.getTime() - 2 * 60 * 1000),
        type: 'critical',
        read: false,
      },
      {
        id: '2',
        title: 'OSINT ingestion complete',
        message: 'Successfully ingested 247 new threat indicators from NIST NVD',
        timestamp: new Date(now.getTime() - 5 * 60 * 1000),
        type: 'success',
        read: false,
      },
      {
        id: '3',
        title: 'Policy update applied',
        message: 'Least privilege policy updated for production environment',
        timestamp: new Date(now.getTime() - 15 * 60 * 1000),
        type: 'info',
        read: true,
      },
      {
        id: '4',
        title: 'Service account rotated',
        message: 'Credentials rotated for svc-payments',
        timestamp: new Date(now.getTime() - 30 * 60 * 1000),
        type: 'success',
        read: true,
      },
    ];

    return NextResponse.json(
      { notifications: mockNotifications },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
        },
      }
    );
  } catch (error) {
    console.error('Notifications API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
