import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * OSINT Threats Latest API
 * Returns latest threat intelligence from OSINT sources
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    // Fetch from NIST NVD
    const nvdResponse = await fetch(
      `https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=${Math.min(limit, 100)}`,
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

    const threats = nvdData.vulnerabilities.map((vuln: any) => {
      const cve = vuln.cve;
      const metrics = cve.metrics?.cvssMetricV31?.[0] || cve.metrics?.cvssMetricV2?.[0];
      const baseScore = metrics?.cvssData?.baseScore || 5.0;
      const severity = metrics?.cvssData?.baseSeverity?.toLowerCase() || 
                      (baseScore >= 9 ? 'critical' : baseScore >= 7 ? 'high' : baseScore >= 4 ? 'medium' : 'low');

      return {
        id: cve.id,
        external_id: cve.id,
        source: 'nvd',
        indicator_type: 'vulnerability',
        value: cve.id,
        severity: severity,
        risk_score: baseScore * 10,
        risk_label: severity.toUpperCase(),
        description: cve.descriptions[0]?.value || 'No description available',
        first_seen: cve.published,
        last_seen: cve.lastModified,
        created_at: cve.published,
      };
    });

    return NextResponse.json({
      success: true,
      data: threats,
      total: threats.length,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });

  } catch (error) {
    console.error('Error fetching OSINT threats:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch OSINT threats',
        data: []
      },
      { status: 500 }
    );
  }
}
