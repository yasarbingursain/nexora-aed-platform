import { PrismaClient, RoleScope } from '@prisma/client';
import { PERMISSION_CATALOG, LEGACY_ROLE_MAPPING } from '../../src/config/permissions.catalog';

const prisma = new PrismaClient();

export async function seedIAM() {
  console.log('🔐 Seeding IAM permissions and roles...');

  const allPermissions = { ...PERMISSION_CATALOG.PLATFORM, ...PERMISSION_CATALOG.ORG };
  const permissionRecords: any[] = [];

  for (const [key, value] of Object.entries(allPermissions)) {
    permissionRecords.push({
      key,
      description: value.description,
      riskLevel: value.riskLevel,
    });
  }

  await prisma.permission.createMany({
    data: permissionRecords,
    skipDuplicates: true,
  });

  console.log(`✅ Created ${permissionRecords.length} permissions`);

  const permissions = await prisma.permission.findMany();
  const permissionMap = new Map(permissions.map(p => [p.key, p.id]));

  const platformRoles = [
    {
      name: 'Platform Super Admin',
      scope: RoleScope.PLATFORM,
      organizationId: null,
      description: 'Full platform access',
      isSystem: true,
      permissions: Object.keys(PERMISSION_CATALOG.PLATFORM),
    },
    {
      name: 'Platform Support',
      scope: RoleScope.PLATFORM,
      organizationId: null,
      description: 'Support team with impersonation',
      isSystem: true,
      permissions: [
        'platform.orgs.read',
        'platform.users.read',
        'platform.audit.read',
        'platform.support.impersonate',
      ],
    },
    {
      name: 'Platform Viewer',
      scope: RoleScope.PLATFORM,
      organizationId: null,
      description: 'Read-only platform access',
      isSystem: true,
      permissions: [
        'platform.orgs.read',
        'platform.users.read',
        'platform.audit.read',
      ],
    },
  ];

  for (const roleData of platformRoles) {
    const { permissions: permKeys, ...roleInfo } = roleData;
    
    const role = await prisma.role.upsert({
      where: {
        platform_role_name: {
          scope: roleInfo.scope,
          name: roleInfo.name,
        },
      },
      update: {},
      create: roleInfo,
    });

    const rolePermissions = permKeys
      .map(key => permissionMap.get(key))
      .filter(Boolean)
      .map(permissionId => ({
        roleId: role.id,
        permissionId: permissionId!,
      }));

    await prisma.rolePermission.createMany({
      data: rolePermissions,
      skipDuplicates: true,
    });
  }

  console.log(`✅ Created ${platformRoles.length} platform roles`);

  const orgRoleTemplates = [
    {
      name: 'Organization Admin',
      description: 'Full organization access',
      isSystem: true,
      permissions: LEGACY_ROLE_MAPPING.admin.permissions,
    },
    {
      name: 'SOC Analyst',
      description: 'Security operations analyst',
      isSystem: true,
      permissions: LEGACY_ROLE_MAPPING.analyst.permissions,
    },
    {
      name: 'Auditor',
      description: 'Read-only compliance auditor',
      isSystem: true,
      permissions: LEGACY_ROLE_MAPPING.auditor.permissions,
    },
    {
      name: 'Viewer',
      description: 'Basic read-only access',
      isSystem: true,
      permissions: LEGACY_ROLE_MAPPING.viewer.permissions,
    },
    {
      name: 'Finance',
      description: 'Billing and finance access',
      isSystem: true,
      permissions: [
        'org.users.read',
        'org.billing.read',
        'org.billing.manage',
        'org.invoices.read',
        'org.audit.read',
      ],
    },
  ];

  const organizations = await prisma.organization.findMany({
    where: { status: 'ACTIVE' },
  });

  for (const org of organizations) {
    for (const roleTemplate of orgRoleTemplates) {
      const { permissions: permKeys, ...roleInfo } = roleTemplate;
      
      const role = await prisma.role.upsert({
        where: {
          org_role_name: {
            organizationId: org.id,
            name: roleInfo.name,
          },
        },
        update: {},
        create: {
          ...roleInfo,
          scope: RoleScope.ORG,
          organizationId: org.id,
        },
      });

      const rolePermissions = permKeys
        .map(key => permissionMap.get(key))
        .filter(Boolean)
        .map(permissionId => ({
          roleId: role.id,
          permissionId: permissionId!,
        }));

      await prisma.rolePermission.createMany({
        data: rolePermissions,
        skipDuplicates: true,
      });
    }
  }

  console.log(`✅ Created org role templates for ${organizations.length} organizations`);

  const users = await prisma.user.findMany({
    where: { isActive: true },
  });

  for (const user of users) {
    const legacyMapping = LEGACY_ROLE_MAPPING[user.role as keyof typeof LEGACY_ROLE_MAPPING];
    if (!legacyMapping) continue;

    let roleName: string;
    if (user.role === 'super_admin') {
      roleName = 'Platform Super Admin';
    } else if (user.role === 'admin') {
      roleName = 'Organization Admin';
    } else if (user.role === 'analyst') {
      roleName = 'SOC Analyst';
    } else if (user.role === 'auditor') {
      roleName = 'Auditor';
    } else {
      roleName = 'Viewer';
    }

    const role = await prisma.role.findFirst({
      where: {
        name: roleName,
        OR: [
          { scope: RoleScope.PLATFORM },
          { organizationId: user.organizationId },
        ],
      },
    });

    if (role) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: role.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId: role.id,
        },
      });
    }
  }

  console.log(`✅ Migrated ${users.length} users to new IAM system`);
  console.log('🔐 IAM seeding complete!');
}

if (require.main === module) {
  seedIAM()
    .catch((e) => {
      console.error('❌ IAM seeding failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
