import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create demo organization
  const demoOrg = await prisma.organization.upsert({
    where: { domain: 'demo.nexora.com' },
    update: {},
    create: {
      name: 'Nexora Demo Organization',
      domain: 'demo.nexora.com',
      subscriptionTier: 'enterprise',
      maxUsers: 100,
      maxIdentities: 10000,
      settings: JSON.stringify({
        features: ['threat_detection', 'auto_remediation', 'compliance'],
        notifications: { email: true, slack: false },
        security: { mfa_required: true, session_timeout: 3600 }
      })
    }
  });

  console.log('✅ Created demo organization:', demoOrg.name);

  // Create demo users
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      passwordHash: await bcrypt.hash('demo123', 12),
      fullName: 'System Administrator',
      role: 'admin',
      organizationId: demoOrg.id,
      mfaEnabled: true
    }
  });

  const clientUser = await prisma.user.upsert({
    where: { email: 'client@demo.com' },
    update: {},
    create: {
      email: 'client@demo.com',
      passwordHash: await bcrypt.hash('demo123', 12),
      fullName: 'Client User',
      role: 'analyst',
      organizationId: demoOrg.id,
      mfaEnabled: false
    }
  });

  console.log('✅ Created demo users:', adminUser.email, clientUser.email);

  // Create demo identities
  const identities = [
    {
      name: 'prod-api-key-7829',
      type: 'api_key',
      provider: 'github',
      status: 'active',
      riskLevel: 'high',
      owner: 'devops@demo.com',
      description: 'Production GitHub API key for CI/CD',
      tags: 'production,github,ci-cd',
      credentials: JSON.stringify({ keyId: 'ghp_xxxxxxxxxxxxxxxxxxxx', scopes: ['repo', 'workflow'] }),
      metadata: JSON.stringify({ created: '2024-01-15', lastRotated: '2024-10-01' })
    },
    {
      name: 'data-processor-svc',
      type: 'service_account',
      provider: 'aws',
      status: 'active',
      riskLevel: 'medium',
      owner: 'data-team@demo.com',
      description: 'AWS service account for data processing',
      tags: 'aws,data,processing',
      credentials: JSON.stringify({ accessKeyId: 'AKIA...', region: 'us-east-1' }),
      metadata: JSON.stringify({ policies: ['S3ReadOnly', 'LambdaExecute'] })
    },
    {
      name: 'customer-support-bot',
      type: 'ai_agent',
      provider: 'custom',
      status: 'active',
      riskLevel: 'low',
      owner: 'support@demo.com',
      description: 'AI agent for customer support automation',
      tags: 'ai,support,automation',
      credentials: JSON.stringify({ apiKey: 'sk-...', model: 'gpt-4' }),
      metadata: JSON.stringify({ capabilities: ['chat', 'ticket_routing'] })
    }
  ];

  for (const identity of identities) {
    const existing = await prisma.identity.findFirst({
      where: { name: identity.name, organizationId: demoOrg.id }
    });
    
    if (!existing) {
      await prisma.identity.create({
        data: {
          ...identity,
          organizationId: demoOrg.id
        }
      });
    }
  }

  console.log('✅ Created demo identities');

  // Create demo threats
  const threats = [
    {
      title: 'Suspicious API Key Usage',
      description: 'API key "prod-api-key-7829" accessed from unusual geographic location (Russia)',
      severity: 'critical',
      status: 'active',
      category: 'credential_abuse',
      sourceIp: '185.220.101.42',
      indicators: JSON.stringify(['unusual_location', 'high_frequency_requests', 'new_ip']),
      evidence: JSON.stringify({
        requests: 1247,
        locations: ['Moscow, Russia', 'St. Petersburg, Russia'],
        timeframe: '2024-10-30T01:00:00Z - 2024-10-30T02:00:00Z'
      }),
      mitreTactics: 'T1078,T1110',
      mitreId: 'T1078.004'
    },
    {
      title: 'Service Account Privilege Escalation',
      description: 'Service account attempted to access admin-level resources',
      severity: 'high',
      status: 'investigating',
      category: 'privilege_escalation',
      sourceIp: '10.0.1.45',
      indicators: JSON.stringify(['privilege_escalation', 'unauthorized_access']),
      evidence: JSON.stringify({
        attempted_resources: ['admin-bucket', 'user-database'],
        permissions: ['s3:GetObject', 's3:PutObject', 'dynamodb:Scan']
      }),
      mitreTactics: 'T1078,T1484',
      mitreId: 'T1484.001'
    }
  ];

  for (const threat of threats) {
    const existing = await prisma.threat.findFirst({
      where: { title: threat.title, organizationId: demoOrg.id }
    });
    
    if (!existing) {
      await prisma.threat.create({
        data: {
          ...threat,
          organizationId: demoOrg.id
        }
      });
    }
  }

  console.log('✅ Created demo threats');

  // Create demo API key
  const existingApiKey = await prisma.apiKey.findFirst({
    where: { name: 'Demo API Key', organizationId: demoOrg.id }
  });
  
  if (!existingApiKey) {
    await prisma.apiKey.create({
      data: {
        name: 'Demo API Key',
        keyHash: await bcrypt.hash('demo-api-key-12345', 12),
        permissions: 'read:identities,read:threats,write:actions',
        organizationId: demoOrg.id
      }
    });
  }

  console.log('✅ Created demo API key');

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
