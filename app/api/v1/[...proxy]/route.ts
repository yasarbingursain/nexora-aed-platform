import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ proxy: string[] }> }
) {
  const params = await context.params;
  const path = params.proxy.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const url = `${API_URL}/api/v1/${path}${searchParams ? `?${searchParams}` : ''}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: request.headers.get('cookie') || '',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: 'Proxy error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ proxy: string[] }> }
) {
  const params = await context.params;
  const path = params.proxy.join('/');
  const url = `${API_URL}/api/v1/${path}`;
  const body = await request.text();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: request.headers.get('cookie') || '',
      },
      body,
    });

    const data = await response.json();
    
    // Forward Set-Cookie headers
    const setCookie = response.headers.get('set-cookie');
    const headers: HeadersInit = {};
    if (setCookie) {
      headers['Set-Cookie'] = setCookie;
    }

    return NextResponse.json(data, { status: response.status, headers });
  } catch (error) {
    return NextResponse.json(
      { error: 'Proxy error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
