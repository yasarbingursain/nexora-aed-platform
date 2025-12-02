import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory store for idempotency (use Redis in production)
const processedRequests = new Map<string, { timestamp: number; response: any }>();
const IDEMPOTENCY_TTL = 3600000; // 1 hour

// Rate limiting store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 5;

// Disposable email domains to block
const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com', 'guerrillamail.com', '10minutemail.com', 'mailinator.com',
  'throwaway.email', 'temp-mail.org', 'getnada.com'
]);

function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return DISPOSABLE_DOMAINS.has(domain);
}

function getClientIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0] ||
         req.headers.get('x-real-ip') ||
         'unknown';
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

function cleanupOldEntries() {
  const now = Date.now();
  
  // Cleanup idempotency store
  processedRequests.forEach((value, key) => {
    if (now - value.timestamp > IDEMPOTENCY_TTL) {
      processedRequests.delete(key);
    }
  });

  // Cleanup rate limit store
  rateLimitStore.forEach((value, key) => {
    if (now > value.resetAt) {
      rateLimitStore.delete(key);
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    // Cleanup old entries periodically
    if (Math.random() < 0.01) cleanupOldEntries();

    // Check idempotency key
    const idempotencyKey = req.headers.get('Idempotency-Key');
    if (!idempotencyKey) {
      return NextResponse.json(
        { error: 'Missing Idempotency-Key header' },
        { status: 400 }
      );
    }

    // Check if already processed
    const existing = processedRequests.get(idempotencyKey);
    if (existing) {
      return NextResponse.json(existing.response, { status: 201 });
    }

    // Rate limiting
    const clientIP = getClientIP(req);
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const { email, name, company, message, honeypot, timestamp: clientTimestamp } = body;

    // Honeypot check (should be empty)
    if (honeypot) {
      return NextResponse.json({ success: true }, { status: 201 }); // Fake success
    }

    // Time-to-complete check (prevent instant submissions)
    if (clientTimestamp) {
      const submitTime = Date.now() - clientTimestamp;
      if (submitTime < 2000) { // Less than 2 seconds
        return NextResponse.json(
          { error: 'Submission too fast. Please try again.' },
          { status: 400 }
        );
      }
    }

    // Validate required fields
    if (!email || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Block disposable emails
    if (isDisposableEmail(email)) {
      return NextResponse.json(
        { error: 'Disposable email addresses are not allowed' },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Lead qualification scoring
    const score = calculateLeadScore({ email: normalizedEmail, company, message });

    // Store lead data (in production, send to CRM/database)
    const leadData = {
      email: normalizedEmail,
      name: name.trim(),
      company: company?.trim(),
      message: message?.trim(),
      score,
      source: req.headers.get('referer') || 'direct',
      userAgent: req.headers.get('user-agent'),
      ip: clientIP,
      timestamp: new Date().toISOString(),
    };

    // In production: Send to CRM with retry logic
    // await sendToCRM(leadData);

    console.log('[Lead] New submission:', leadData);

    // Store response for idempotency
    const response = { success: true, leadId: idempotencyKey };
    processedRequests.set(idempotencyKey, {
      timestamp: Date.now(),
      response,
    });

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('[Lead] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function calculateLeadScore(data: {
  email: string;
  company?: string;
  message?: string;
}): number {
  let score = 50; // Base score

  // Company email domain (not free email)
  const freeEmailDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
  const domain = data.email.split('@')[1];
  if (!freeEmailDomains.includes(domain)) {
    score += 20;
  }

  // Has company name
  if (data.company && data.company.length > 2) {
    score += 15;
  }

  // Has detailed message
  if (data.message && data.message.length > 50) {
    score += 15;
  }

  return Math.min(score, 100);
}
