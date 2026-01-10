import { Request, Response, NextFunction } from 'express';
import { PermissionsService } from '@/services/permissions.service';

export interface PermissionOptions {
  requireAll?: boolean;
  abacCheck?: boolean;
}

export const requirePermission = (
  permission: string | string[],
  options: PermissionOptions = { requireAll: false, abacCheck: true }
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({
        code: 'AUTHZ_NO_CONTEXT',
        error: 'Authentication required',
        message: 'No authentication context found',
      });
    }

    const requiredPermissions = Array.isArray(permission) ? permission : [permission];
    const { effectivePermissions, roles } = req.auth;

    let hasPermission: boolean;

    if (options.requireAll) {
      hasPermission = PermissionsService.hasAllPermissions(effectivePermissions, requiredPermissions);
    } else {
      hasPermission = PermissionsService.hasAnyPermission(effectivePermissions, requiredPermissions);
    }

    if (!hasPermission) {
      return res.status(403).json({
        code: 'AUTHZ_DENIED',
        error: 'Insufficient permissions',
        message: `Required permission(s): ${requiredPermissions.join(', ')}`,
        required: requiredPermissions,
      });
    }

    if (options.abacCheck) {
      for (const perm of requiredPermissions) {
        if (effectivePermissions.includes(perm)) {
          const abacAllowed = PermissionsService.applyABACRules(
            perm,
            { permissions: effectivePermissions, roles, teamIds: req.auth.teamIds },
            req.user?.role
          );

          if (!abacAllowed) {
            return res.status(403).json({
              code: 'AUTHZ_ABAC_DENIED',
              error: 'Access denied by policy',
              message: `Permission '${perm}' is restricted by ABAC rules`,
            });
          }
        }
      }
    }

    next();
  };
};

export const requireAnyPermission = (permissions: string[], options?: PermissionOptions) => {
  return requirePermission(permissions, { ...options, requireAll: false });
};

export const requireAllPermissions = (permissions: string[], options?: PermissionOptions) => {
  return requirePermission(permissions, { ...options, requireAll: true });
};

export const requirePlatformRole = (roles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({
        code: 'AUTHZ_NO_CONTEXT',
        error: 'Authentication required',
      });
    }

    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    const hasPlatformRole = requiredRoles.some(role => 
      req.auth!.roles.platform.includes(role)
    );

    if (!hasPlatformRole) {
      return res.status(403).json({
        code: 'AUTHZ_DENIED',
        error: 'Insufficient platform permissions',
        message: `Required platform role(s): ${requiredRoles.join(', ')}`,
      });
    }

    next();
  };
};

export const requireImpersonation = (req: Request, res: Response, next: NextFunction) => {
  if (!req.auth) {
    return res.status(401).json({
      code: 'AUTHZ_NO_CONTEXT',
      error: 'Authentication required',
    });
  }

  if (req.auth.mode !== 'IMPERSONATED') {
    return res.status(403).json({
      code: 'AUTHZ_NOT_IMPERSONATED',
      error: 'Impersonation required',
      message: 'This action requires an active impersonation session',
    });
  }

  next();
};

export const denyImpersonation = (req: Request, res: Response, next: NextFunction) => {
  if (!req.auth) {
    return res.status(401).json({
      code: 'AUTHZ_NO_CONTEXT',
      error: 'Authentication required',
    });
  }

  if (req.auth.mode === 'IMPERSONATED') {
    return res.status(403).json({
      code: 'AUTHZ_IMPERSONATION_DENIED',
      error: 'Action not allowed during impersonation',
      message: 'This action cannot be performed while impersonating',
    });
  }

  next();
};
