import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // In production: Store in database for audit trail
    // For now, just log to console
    console.log('[Consent] User consent recorded:', {
      timestamp: body.timestamp,
      region: body.region,
      consent: {
        functional: body.functional,
        analytics: body.analytics,
        marketing: body.marketing,
      },
      ip: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent'),
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('[Consent] Error logging consent:', error);
    return NextResponse.json(
      { error: 'Failed to log consent' },
      { status: 500 }
    );
  }
}
