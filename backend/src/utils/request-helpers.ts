import { Request } from 'express';

/**
 * Request Helper Utilities
 * 
 * Provides type-safe helpers for extracting request data.
 * Follows defensive programming practices (MISRA C++ Rule 0-3-2).
 * 
 * Security Standards:
 * - CWE-476: NULL Pointer Dereference Prevention
 * - CERT C Coding Standard: EXP34-C
 * - ISO/IEC TS 17961: Null pointer dereference
 */

/**
 * Safely get IP address from request
 * Returns 'unknown' if IP is undefined (prevents null pointer issues)
 */
export function getClientIP(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

/**
 * Safely get User-Agent from request
 * Returns 'unknown' if User-Agent is undefined
 */
export function getUserAgent(req: Request): string {
  return req.headers['user-agent'] ?? 'unknown';
}

/**
 * Safely get required path parameter
 * Throws error if parameter is missing (fail-fast principle)
 */
export function getRequiredParam(req: Request, paramName: string): string {
  const value = req.params[paramName];
  if (!value) {
    throw new Error(`Required parameter '${paramName}' is missing`);
  }
  return value;
}

/**
 * Safely get optional path parameter
 * Returns undefined if parameter is missing
 */
export function getOptionalParam(req: Request, paramName: string): string | undefined {
  return req.params[paramName];
}

/**
 * Validate and get user ID from authenticated request
 * Throws error if user is not authenticated
 */
export function getAuthenticatedUserId(req: Request): string {
  if (!req.user?.userId) {
    throw new Error('User not authenticated');
  }
  return req.user.userId;
}

/**
 * Validate and get organization ID from authenticated request
 * Throws error if organization context is missing
 */
export function getAuthenticatedOrgId(req: Request): string {
  if (!req.user?.organizationId) {
    throw new Error('Organization context missing');
  }
  return req.user.organizationId;
}
