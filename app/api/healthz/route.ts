import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'nexora-landing',
    version: process.env.npm_package_version || '1.2.0',
  });
}
