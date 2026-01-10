import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * SOAR Blocklist API
 * Generates blocklist from high-risk OSINT threats
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const minRisk = parseInt(searchParams.get('minRisk') || '60');
    const maxItems = parseInt(searchParams.get('maxItems') || '500');

    // Fetch threats from NVD
    const nvdResponse = await fetch(
      'https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=100',
      {
        headers: {
          'User-Agent': 'Nexora-AED-Platform/1.0',
        },
        next: { revalidate: 0 },
      }
    );

    if (!nvdResponse.ok) {
      throw new Error('Failed to fetch from NIST NVD');
    }

    const nvdData = await nvdResponse.json();

    // Filter high-risk items and generate blocklist
    const ips: string[] = [];
    const domains: string[] = [];
    const urls: string[] = [];

    nvdData.vulnerabilities.forEach((vuln: any, index: number) => {
      const metrics = vuln.cve.metrics?.cvssMetricV31?.[0] || vuln.cve.metrics?.cvssMetricV2?.[0];
      const baseScore = metrics?.cvssData?.baseScore || 5.0;
      const riskScore = baseScore * 10;

      if (riskScore >= minRisk && ips.length + domains.length + urls.length < maxItems) {
        // Generate sample blocklist entries based on CVE data
        // In production, this would come from actual threat intelligence feeds
        const cveId = vuln.cve.id;
        const hash = cveId.split('-')[2] || '0000';
        
        // Generate sample IPs for high-risk CVEs
        if (baseScore >= 7) {
          ips.push(`192.0.2.${(parseInt(hash) % 254) + 1}`);
        }
        
        // Generate sample domains
        if (baseScore >= 8) {
          domains.push(`malicious-${hash}.example.com`);
        }
        
        // Generate sample URLs
        if (baseScore >= 9) {
          urls.push(`https://threat-${hash}.example.com/exploit`);
        }
      }
    });

    const generatedAt = new Date();
    const expiresAt = new Date(generatedAt.getTime() + 3600000); // 1 hour

    return NextResponse.json({
      generated_at: generatedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      total_items: ips.length + domains.length + urls.length,
      ips,
      domains,
      urls,
      metadata: {
        min_risk_score: minRisk,
        max_items: maxItems,
        sources: ['nvd'],
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });

  } catch (error) {
    console.error('Error generating blocklist:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate blocklist',
        generated_at: new Date().toISOString(),
        expires_at: new Date().toISOString(),
        total_items: 0,
        ips: [],
        domains: [],
        urls: [],
        metadata: {
          min_risk_score: 60,
          max_items: 500,
          sources: [],
        }
      },
      { status: 500 }
    );
  }
}
