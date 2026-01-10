# Enterprise IAM Setup Instructions

## Overview
This implements a complete enterprise-grade RBAC system with permissions, roles, teams, API key scopes, impersonation, and audit logging.

## Setup Steps

### 1. Generate Prisma Client
```bash
npm run db:generate
```

### 2. Run Database Migration
```bash
npm run db:migrate
```

When prompted for migration name, use: `add_enterprise_iam`

### 3. Seed IAM Data
```bash
npx tsx backend/scripts/migrate-to-iam.ts
```

This will:
- Create all permissions from the catalog
- Create platform roles (Platform Super Admin, Platform Support, Platform Viewer)
- Create org role templates (Organization Admin, SOC Analyst, Auditor, Viewer, Finance)
- Migrate existing users to the new IAM system based on their legacy roles

### 4. Update Server Routes

Add the new routes to your main server file:

```typescript
import orgAdminRoutes from './routes/org-admin.routes';
import platformAdminRoutes from './routes/platform-admin.routes';

app.use('/api/org/admin', orgAdminRoutes);
app.use('/api/platform/admin', platformAdminRoutes);
```

### 5. Test the System

#### Test Permission Check
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8080/api/org/admin/users
```

#### Test Role Management
```bash
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Custom Role","description":"Test","permissionIds":[]}' \
  http://localhost:8080/api/org/admin/roles
```

## Permission Catalog

### Platform Permissions
- `platform.orgs.read` - View organizations
- `platform.orgs.manage` - Manage organizations (HIGH)
- `platform.users.read` - View all users
- `platform.users.manage` - Manage all users (HIGH)
- `platform.support.impersonate` - Impersonate users (HIGH)
- `platform.audit.read` - View platform audit logs

### Organization Permissions
- `org.users.read` - View org users
- `org.users.invite` - Invite users
- `org.users.update` - Update users
- `org.users.suspend` - Suspend/reactivate users (HIGH)
- `org.users.remove` - Remove users (HIGH)
- `org.roles.read` - View roles
- `org.roles.manage` - Manage roles (HIGH)
- `org.teams.read` - View teams
- `org.teams.manage` - Manage teams (HIGH)
- `org.api_keys.read` - View API keys
- `org.api_keys.manage` - Manage API keys (HIGH)
- `org.threats.read` - View threats
- `org.threats.investigate` - Investigate threats
- `org.threats.remediate` - Remediate threats (HIGH)
- `org.identities.read` - View identities
- `org.identities.manage` - Manage identities (HIGH)
- `org.audit.read` - View audit logs
- `org.audit.export` - Export audit logs
- `org.compliance.read` - View compliance
- `org.billing.read` - View billing
- `org.billing.manage` - Manage billing (HIGH)

## ABAC Rules

### Auditor Restrictions
Auditors are automatically denied the following permissions even if granted:
- `org.threats.remediate`
- `org.identities.rotate_credentials`
- `org.identities.quarantine`
- `org.roles.manage`
- `org.teams.manage`
- `org.api_keys.manage`

### Impersonation Rules
- Requires `platform.support.impersonate` permission
- Must provide `ticketId` and `reason`
- Maximum duration: 30 minutes
- All actions logged to IAM audit log
- Session automatically expires

## API Endpoints

### Organization Admin

#### Users
- `GET /api/org/admin/users` - List users
- `POST /api/org/admin/invites` - Invite user
- `POST /api/org/admin/invites/:token/accept` - Accept invite
- `PATCH /api/org/admin/users/:id` - Update user
- `POST /api/org/admin/users/:id/suspend` - Suspend user
- `POST /api/org/admin/users/:id/reactivate` - Reactivate user
- `DELETE /api/org/admin/users/:id` - Remove user

#### Roles
- `GET /api/org/admin/roles` - List roles
- `POST /api/org/admin/roles` - Create role
- `PATCH /api/org/admin/roles/:id` - Update role
- `DELETE /api/org/admin/roles/:id` - Delete role

#### Teams
- `GET /api/org/admin/teams` - List teams
- `POST /api/org/admin/teams` - Create team
- `PATCH /api/org/admin/teams/:id` - Update team
- `DELETE /api/org/admin/teams/:id` - Delete team

#### API Keys
- `GET /api/org/admin/api-keys` - List API keys
- `POST /api/org/admin/api-keys` - Create API key
- `PATCH /api/org/admin/api-keys/:id/scopes` - Update scopes
- `POST /api/org/admin/api-keys/:id/rotate` - Rotate key
- `POST /api/org/admin/api-keys/:id/revoke` - Revoke key

#### Audit
- `GET /api/org/admin/audit/iam` - Get IAM audit logs
- `GET /api/org/admin/audit/export` - Export audit logs

### Platform Admin

#### Organizations
- `GET /api/platform/admin/organizations` - List orgs
- `PATCH /api/platform/admin/organizations/:id` - Update org
- `POST /api/platform/admin/organizations/:id/suspend` - Suspend org
- `POST /api/platform/admin/organizations/:id/reactivate` - Reactivate org

#### Users
- `GET /api/platform/admin/users` - List all users
- `PATCH /api/platform/admin/users/:id` - Update user

#### Impersonation
- `POST /api/platform/admin/impersonations` - Start impersonation
- `GET /api/platform/admin/impersonations` - List sessions
- `POST /api/platform/admin/impersonations/:id/end` - End session

#### Audit
- `GET /api/platform/admin/audit` - Platform audit logs
- `GET /api/platform/admin/security-events` - Security events

## Migration Strategy

### Phase 1: Dual Read (Current)
- New IAM tables populated
- Permission resolver checks new tables first
- Falls back to legacy `User.role` if no UserRole records
- All new code uses `requirePermission` middleware

### Phase 2: Monitor & Validate
- Monitor fallback usage logs
- Verify all users have correct permissions
- Test all permission-gated endpoints

### Phase 3: Remove Legacy (Future)
- Remove `User.role` field usage
- Remove `requireRole` middleware
- Remove legacy role string checks

## Cache Invalidation

The system automatically invalidates permission caches when:
- User roles change
- User teams change
- Role permissions change
- Team permissions change
- API key scopes change

Cache key format: `perm:v{version}:{userId}:{orgId}:{mode}`

## Troubleshooting

### TypeScript Errors
Run `npm run db:generate` to regenerate Prisma client with new models.

### Permission Denied
Check:
1. User has correct roles assigned in `user_roles` table
2. Role has correct permissions in `role_permissions` table
3. ABAC rules aren't blocking the permission
4. Cache is up to date (check `permissionsVersion`)

### Impersonation Not Working
Verify:
1. Support user has `platform.support.impersonate` permission
2. `ticketId` and `reason` are provided
3. Session hasn't expired (max 30 minutes)
4. Session hasn't been manually ended

## Security Notes

1. **HIGH risk permissions** require explicit confirmation in UI
2. **System roles** cannot be modified or deleted
3. **Impersonation** is fully audited with IP and user agent
4. **API key scopes** use permission-based model, not role strings
5. **ABAC rules** provide hard denials that override granted permissions
6. **Cache versioning** prevents stale permission checks
