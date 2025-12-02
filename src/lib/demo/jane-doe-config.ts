/**
 * Jane Doe Demo Configuration
 * Company profile ONLY - ALL METRICS COME FROM REAL-TIME APIs
 * NO MOCK DATA - Uses live data from NIST NVD, GitHub, AbuseIPDB
 */

export const JANE_DOE_COMPANY = {
  id: 'org_jane_doe_001',
  name: 'Jane Doe Enterprises',
  industry: 'Technology & Financial Services',
  size: 'Enterprise (1000+ employees)',
  plan: 'Enterprise',
  status: 'active' as const,

  // Security Profile
  security: {
    zeroTrustEnabled: true,
    mfaEnforced: true,
    pqcReady: true,
    complianceFrameworks: ['SOC2', 'ISO27001', 'HIPAA', 'PCI-DSS'],
    autoRemediationEnabled: true,
    threatIntelSharing: true,
  },

  // Contact Information
  contact: {
    primaryContact: 'Jane Doe',
    email: 'jane.doe@janedoe-enterprises.com',
    phone: '+1 (555) 123-4567',
    address: '123 Enterprise Blvd, San Francisco, CA 94105',
  },

  // Real-time Data Sources (live APIs)
  dataSources: [
    {
      name: 'GitHub API',
      type: 'credential_exposure',
      url: 'https://api.github.com/search/code',
      description: 'Real-time exposed credential detection in public repositories',
    },
    {
      name: 'AbuseIPDB',
      type: 'behavioral_anomaly',
      url: 'https://api.abuseipdb.com/api/v2/blacklist',
      description: 'Live malicious IP and bot detection',
    },
    {
      name: 'NIST NVD',
      type: 'supply_chain',
      url: 'https://services.nvd.nist.gov/rest/json/cves/2.0',
      description: 'Real-time CVE vulnerability monitoring',
    },
  ],
};

/**
 * Get Jane Doe company configuration
 */
export function getJaneDoeConfig() {
  return JANE_DOE_COMPANY;
}
