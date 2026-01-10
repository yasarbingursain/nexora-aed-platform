/**
 * Enterprise IAM Permission Catalog Seed
 * 
 * Defines all platform and organization-level permissions
 * Following principle of least privilege and separation of duties
 * 
 * Risk Levels:
 * - LOW: Read-only operations
 * - MED: Write operations with limited impact
 * - HIGH: Destructive operations, security-critical actions
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const PERMISSIONS = [
  // ============================================================================
  // PLATFORM PERMISSIONS (Nexora Internal)
  // ============================================================================
  {
    key: 'platform.orgs.read',
    description: 'View all organizations',
    riskLevel: 'LOW',
  },
  {
    key: 'platform.orgs.manage',
    description: 'Create, update, suspend, delete organizations',
    riskLevel: 'HIGH',
  },
  {
    key: 'platform.users.read',
    description: 'View all users across organizations',
    riskLevel: 'LOW',
  },
  {
    key: 'platform.users.manage',
    description: 'Create, update, suspend users across organizations',
    riskLevel: 'HIGH',
  },
  {
    key: 'platform.billing.read',
    description: 'View billing data for all organizations',
    riskLevel: 'LOW',
  },
  {
    key: 'platform.billing.manage',
    description: 'Manage billing, subscriptions, invoices',
    riskLevel: 'HIGH',
  },
  {
    key: 'platform.audit.read',
    description: 'View platform-wide audit logs',
    riskLevel: 'MED',
  },
  {
    key: 'platform.security.read',
    description: 'View platform security events',
    riskLevel: 'MED',
  },
  {
    key: 'platform.security.manage',
    description: 'Manage platform security settings',
    riskLevel: 'HIGH',
  },
  {
    key: 'platform.support.impersonate',
    description: 'Impersonate users for support (requires ticket)',
    riskLevel: 'HIGH',
  },
  {
    key: 'platform.iam.catalog.read',
    description: 'View permission catalog',
    riskLevel: 'LOW',
  },
  {
    key: 'platform.iam.catalog.manage',
    description: 'Manage permission catalog (add/remove permissions)',
    riskLevel: 'HIGH',
  },

  // ============================================================================
  // ORGANIZATION PERMISSIONS (Customer Tenant)
  // ============================================================================

  // Users & IAM
  {
    key: 'org.users.read',
    description: 'View organization users',
    riskLevel: 'LOW',
  },
  {
    key: 'org.users.invite',
    description: 'Invite new users to organization',
    riskLevel: 'MED',
  },
  {
    key: 'org.users.update',
    description: 'Update user profiles and settings',
    riskLevel: 'MED',
  },
  {
    key: 'org.users.suspend',
    description: 'Suspend or reactivate users',
    riskLevel: 'HIGH',
  },
  {
    key: 'org.users.remove',
    description: 'Remove users from organization',
    riskLevel: 'HIGH',
  },
  {
    key: 'org.roles.read',
    description: 'View roles and permissions',
    riskLevel: 'LOW',
  },
  {
    key: 'org.roles.manage',
    description: 'Create, update, delete roles',
    riskLevel: 'HIGH',
  },
  {
    key: 'org.teams.read',
    description: 'View teams',
    riskLevel: 'LOW',
  },
  {
    key: 'org.teams.manage',
    description: 'Create, update, delete teams',
    riskLevel: 'HIGH',
  },

  // API Keys
  {
    key: 'org.api_keys.read',
    description: 'View API keys (hashed)',
    riskLevel: 'LOW',
  },
  {
    key: 'org.api_keys.manage',
    description: 'Create, update, rotate, revoke API keys',
    riskLevel: 'HIGH',
  },

  // Threats
  {
    key: 'org.threats.read',
    description: 'View threat detections',
    riskLevel: 'LOW',
  },
  {
    key: 'org.threats.investigate',
    description: 'Investigate threats, view details',
    riskLevel: 'MED',
  },
  {
    key: 'org.threats.dismiss',
    description: 'Dismiss false positives',
    riskLevel: 'MED',
  },
  {
    key: 'org.threats.remediate',
    description: 'Execute remediation actions',
    riskLevel: 'HIGH',
  },
  {
    key: 'org.threats.export',
    description: 'Export threat data',
    riskLevel: 'MED',
  },

  // Identities (Non-Human Identities)
  {
    key: 'org.identities.read',
    description: 'View non-human identities',
    riskLevel: 'LOW',
  },
  {
    key: 'org.identities.manage',
    description: 'Create, update, delete identities',
    riskLevel: 'HIGH',
  },
  {
    key: 'org.identities.rotate_credentials',
    description: 'Rotate credentials for identities',
    riskLevel: 'HIGH',
  },
  {
    key: 'org.identities.quarantine',
    description: 'Quarantine compromised identities',
    riskLevel: 'HIGH',
  },

  // NHITI & Integrations
  {
    key: 'org.nhiti.read',
    description: 'View NHITI threat intelligence feed',
    riskLevel: 'LOW',
  },
  {
    key: 'org.nhiti.share',
    description: 'Share threat indicators to NHITI network',
    riskLevel: 'HIGH',
  },
  {
    key: 'org.integrations.read',
    description: 'View integrations',
    riskLevel: 'LOW',
  },
  {
    key: 'org.integrations.manage',
    description: 'Configure integrations (SIEM, cloud providers)',
    riskLevel: 'HIGH',
  },

  // Audit & Compliance
  {
    key: 'org.audit.read',
    description: 'View audit logs',
    riskLevel: 'LOW',
  },
  {
    key: 'org.audit.export',
    description: 'Export audit logs',
    riskLevel: 'MED',
  },
  {
    key: 'org.compliance.read',
    description: 'View compliance reports',
    riskLevel: 'LOW',
  },
  {
    key: 'org.compliance.manage',
    description: 'Generate compliance reports, manage frameworks',
    riskLevel: 'HIGH',
  },

  // Billing
  {
    key: 'org.billing.read',
    description: 'View billing and subscription details',
    riskLevel: 'LOW',
  },
  {
    key: 'org.billing.manage',
    description: 'Manage subscription, payment methods',
    riskLevel: 'HIGH',
  },
  {
    key: 'org.invoices.read',
    description: 'View and download invoices',
    riskLevel: 'LOW',
  },

  // Settings
  {
    key: 'org.settings.read',
    description: 'View organization settings',
    riskLevel: 'LOW',
  },
  {
    key: 'org.settings.manage',
    description: 'Update organization settings',
    riskLevel: 'HIGH',
  },
];

export async function seedPermissions() {
  console.log('🔐 Seeding permissions catalog...');

  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: {
        description: perm.description,
        riskLevel: perm.riskLevel,
      },
      create: perm,
    });
  }

  console.log(`✅ Seeded ${PERMISSIONS.length} permissions`);
}

export async function seedSystemRoles() {
  console.log('👥 Seeding system roles...');

  // Platform Roles
  const platformSuperAdmin = await prisma.role.upsert({
    where: {
      scope_organizationId_name: {
        scope: 'PLATFORM',
        organizationId: null,
        name: 'Super Admin',
      },
    },
    update: {},
    create: {
      scope: 'PLATFORM',
      name: 'Super Admin',
      description: 'Full platform access',
      isSystem: true,
    },
  });

  const platformAdmin = await prisma.role.upsert({
    where: {
      scope_organizationId_name: {
        scope: 'PLATFORM',
        organizationId: null,
        name: 'Platform Admin',
      },
    },
    update: {},
    create: {
      scope: 'PLATFORM',
      name: 'Platform Admin',
      description: 'Platform administration',
      isSystem: true,
    },
  });

  const platformSupport = await prisma.role.upsert({
    where: {
      scope_organizationId_name: {
        scope: 'PLATFORM',
        organizationId: null,
        name: 'Support Engineer',
      },
    },
    update: {},
    create: {
      scope: 'PLATFORM',
      name: 'Support Engineer',
      description: 'Customer support with impersonation',
      isSystem: true,
    },
  });

  // Assign permissions to platform roles
  const allPlatformPerms = await prisma.permission.findMany({
    where: { key: { startsWith: 'platform.' } },
  });

  // Super Admin gets all platform permissions
  for (const perm of allPlatformPerms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: platformSuperAdmin.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: platformSuperAdmin.id,
        permissionId: perm.id,
      },
    });
  }

  // Platform Admin gets read/manage but not impersonate
  const adminPerms = allPlatformPerms.filter(
    (p) => !p.key.includes('impersonate') && !p.key.includes('catalog.manage')
  );
  for (const perm of adminPerms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: platformAdmin.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: platformAdmin.id,
        permissionId: perm.id,
      },
    });
  }

  // Support gets read + impersonate
  const supportPerms = allPlatformPerms.filter(
    (p) => p.key.includes('.read') || p.key.includes('impersonate')
  );
  for (const perm of supportPerms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: platformSupport.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: platformSupport.id,
        permissionId: perm.id,
      },
    });
  }

  console.log('✅ Seeded platform system roles');
}

export async function seedOrgSystemRoles(organizationId: string) {
  console.log(`👥 Seeding org system roles for ${organizationId}...`);

  // Org Admin
  const orgAdmin = await prisma.role.upsert({
    where: {
      scope_organizationId_name: {
        scope: 'ORG',
        organizationId,
        name: 'Organization Admin',
      },
    },
    update: {},
    create: {
      scope: 'ORG',
      organizationId,
      name: 'Organization Admin',
      description: 'Full organization access',
      isSystem: true,
    },
  });

  // Security Analyst
  const securityAnalyst = await prisma.role.upsert({
    where: {
      scope_organizationId_name: {
        scope: 'ORG',
        organizationId,
        name: 'Security Analyst',
      },
    },
    update: {},
    create: {
      scope: 'ORG',
      organizationId,
      name: 'Security Analyst',
      description: 'Threat investigation and remediation',
      isSystem: true,
    },
  });

  // Auditor
  const auditor = await prisma.role.upsert({
    where: {
      scope_organizationId_name: {
        scope: 'ORG',
        organizationId,
        name: 'Auditor',
      },
    },
    update: {},
    create: {
      scope: 'ORG',
      organizationId,
      name: 'Auditor',
      description: 'Read-only access for compliance',
      isSystem: true,
    },
  });

  // Viewer
  const viewer = await prisma.role.upsert({
    where: {
      scope_organizationId_name: {
        scope: 'ORG',
        organizationId,
        name: 'Viewer',
      },
    },
    update: {},
    create: {
      scope: 'ORG',
      organizationId,
      name: 'Viewer',
      description: 'Read-only access',
      isSystem: true,
    },
  });

  const allOrgPerms = await prisma.permission.findMany({
    where: { key: { startsWith: 'org.' } },
  });

  // Org Admin gets all org permissions
  for (const perm of allOrgPerms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: orgAdmin.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: orgAdmin.id,
        permissionId: perm.id,
      },
    });
  }

  // Security Analyst gets threat + identity permissions
  const analystPerms = allOrgPerms.filter(
    (p) =>
      p.key.includes('threats.') ||
      p.key.includes('identities.') ||
      p.key.includes('nhiti.read') ||
      p.key.includes('audit.read')
  );
  for (const perm of analystPerms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: securityAnalyst.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: securityAnalyst.id,
        permissionId: perm.id,
      },
    });
  }

  // Auditor gets read-only permissions
  const auditorPerms = allOrgPerms.filter(
    (p) => p.key.includes('.read') || p.key.includes('audit.') || p.key.includes('compliance.')
  );
  for (const perm of auditorPerms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: auditor.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: auditor.id,
        permissionId: perm.id,
      },
    });
  }

  // Viewer gets basic read permissions
  const viewerPerms = allOrgPerms.filter(
    (p) =>
      p.key === 'org.threats.read' ||
      p.key === 'org.identities.read' ||
      p.key === 'org.users.read' ||
      p.key === 'org.settings.read'
  );
  for (const perm of viewerPerms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: viewer.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: viewer.id,
        permissionId: perm.id,
      },
    });
  }

  console.log('✅ Seeded org system roles');
}

if (require.main === module) {
  seedPermissions()
    .then(() => seedSystemRoles())
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e);
      prisma.$disconnect();
      process.exit(1);
    });
}
