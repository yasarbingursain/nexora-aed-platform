import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * OSINT Threat Statistics API
 * Returns aggregated statistics from OSINT threat data
 */
export async function GET() {
  try {
    // Fetch recent threats to calculate stats
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

    // Calculate statistics
    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;
    let totalRisk = 0;

    nvdData.vulnerabilities.forEach((vuln: any) => {
      const metrics = vuln.cve.metrics?.cvssMetricV31?.[0] || vuln.cve.metrics?.cvssMetricV2?.[0];
      const baseScore = metrics?.cvssData?.baseScore || 5.0;
      const severity = metrics?.cvssData?.baseSeverity?.toLowerCase() || 
                      (baseScore >= 9 ? 'critical' : baseScore >= 7 ? 'high' : baseScore >= 4 ? 'medium' : 'low');

      totalRisk += baseScore;
      
      switch (severity) {
        case 'critical': critical++; break;
        case 'high': high++; break;
        case 'medium': medium++; break;
        case 'low': low++; break;
      }
    });

    const total = nvdData.vulnerabilities.length;
    const avgRiskScore = total > 0 ? totalRisk / total : 0;

    return NextResponse.json({
      success: true,
      data: {
        total,
        critical,
        high,
        medium,
        low,
        new_threats: Math.floor(total * 0.1), // Approximate new threats
        avg_risk_score: avgRiskScore,
        sources: 1, // Currently only NVD
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });

  } catch (error) {
    console.error('Error fetching OSINT stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch OSINT statistics',
        data: {
          total: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          new_threats: 0,
          avg_risk_score: 0,
          sources: 0,
        }
      },
      { status: 500 }
    );
  }
}
