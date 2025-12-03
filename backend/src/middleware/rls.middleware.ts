import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';

/**
 * SPRINT 2: Row-Level Security (RLS) Enforcement Middleware
 * 
 * Sets PostgreSQL session variable for multi-tenant isolation.
 * Prevents cross-tenant data access even with SQL injection.
 * 
 * Security Standards:
 * - OWASP A01:2021 - Broken Access Control
 * - CWE-639: Authorization Bypass Through User-Controlled Key
 * - ISO/IEC 27001:2013 - A.9.4.1 Information access restriction
 */

export const enforceRowLevelSecurity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Skip RLS for non-authenticated requests
  if (!req.user?.organizationId) {
    return next();
  }

  try {
    // Set organization context in PostgreSQL session
    // This variable is used by RLS policies to filter data
    await prisma.$executeRawUnsafe(
      `SELECT set_current_organization($1)`,
      req.user.organizationId
    );

    logger.debug('RLS context established', {
      organizationId: req.user.organizationId,
      userId: req.user.userId,
      path: req.path,
      method: req.method,
    });

    next();
  } catch (error) {
    logger.error('Failed to set RLS context', {
      error: error instanceof Error ? error.message : 'Unknown error',
      organizationId: req.user.organizationId,
      userId: req.user.userId,
      path: req.path,
    });

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to establish secure database context',
    });
  }
};

/**
 * Verify RLS is properly configured on startup
 */
export async function verifyRLSEnabled(): Promise<{
  enabled: boolean;
  tables: string[];
  errors: string[];
}> {
  const requiredTables = [
    'identities',
    'identity_activities',
    'threats',
    'baselines',
    'observations',
    'playbooks',
    'actions',
    'audit_logs',
    'compliance_reports',
  ];

  const errors: string[] = [];
  const enabledTables: string[] = [];

  try {
    for (const tableName of requiredTables) {
      const result = await prisma.$queryRawUnsafe<Array<{ rowsecurity: boolean }>>(
        `SELECT rowsecurity FROM pg_tables WHERE tablename = $1 AND schemaname = 'public'`,
        tableName
      );

      if (result[0]?.rowsecurity) {
        enabledTables.push(tableName);
      } else {
        errors.push(`RLS not enabled on table: ${tableName}`);
      }
    }

    const allEnabled = enabledTables.length === requiredTables.length;

    if (allEnabled) {
      logger.info('RLS verification passed', {
        tablesChecked: requiredTables.length,
        tablesEnabled: enabledTables.length,
      });
    } else {
      logger.error('RLS verification failed', {
        tablesChecked: requiredTables.length,
        tablesEnabled: enabledTables.length,
        errors,
      });
    }

    return {
      enabled: allEnabled,
      tables: enabledTables,
      errors,
    };
  } catch (error) {
    logger.error('RLS verification error', { error });
    return {
      enabled: false,
      tables: [],
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Clear RLS context (for testing or admin operations)
 */
export async function clearRLSContext(): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      `SELECT set_config('app.current_organization_id', '', false)`
    );
  } catch (error) {
    logger.error('Failed to clear RLS context', { error });
  }
}
