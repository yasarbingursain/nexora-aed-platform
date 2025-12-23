import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import { prisma } from '@/config/database';

export interface AuthenticatedUser {
  userId: string;
  organizationId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'No valid authorization header provided'
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'No token provided'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser;
    
    // Check if user still exists and is active
    const user = await prisma.user.findFirst({
      where: {
        id: decoded.userId,
        isActive: true,
      },
      include: {
        organization: true,
      },
    });

    if (!user) {
      return res.status(401).json({ 
        error: 'Authentication failed',
        message: 'User not found or inactive'
      });
    }

    // SECURITY: Verify user has at least one active session
    const activeSession = await prisma.userSession.findFirst({
      where: {
        userId: user.id,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });

    if (!activeSession) {
      return res.status(401).json({ 
        error: 'Session expired',
        message: 'Your session has expired. Please login again.'
      });
    }

    // Update session last activity (throttled to avoid DB spam)
    const lastActivity = activeSession.lastActivity;
    const now = new Date();
    if (!lastActivity || now.getTime() - lastActivity.getTime() > 60000) { // Update at most once per minute
      await prisma.userSession.update({
        where: { id: activeSession.id },
        data: { lastActivity: now },
      }).catch(() => {}); // Non-blocking update
    }

    // Attach user to request
    req.user = {
      userId: user.id,
      organizationId: user.organizationId,
      email: user.email,
      role: user.role,
      iat: decoded.iat,
      exp: decoded.exp,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ 
        error: 'Authentication failed',
        message: 'Invalid token'
      });
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ 
        error: 'Authentication failed',
        message: 'Token expired'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Authentication check failed'
    });
  }
};

export const requireRole = (roles: string | string[]) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'No user context found'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: `Required roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

// API Key authentication middleware
export const requireApiKey = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      return res.status(401).json({ 
        error: 'API key required',
        message: 'X-API-Key header is required'
      });
    }

    // Hash the provided API key to compare with stored hash
    const crypto = require('crypto');
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const apiKeyRecord = await prisma.apiKey.findFirst({
      where: {
        keyHash,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        organization: true,
      },
    });

    if (!apiKeyRecord) {
      return res.status(401).json({ 
        error: 'Invalid API key',
        message: 'API key not found or expired'
      });
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: { lastUsedAt: new Date() },
    });

    // Create a user-like object for API key authentication
    req.user = {
      userId: 'api-key',
      organizationId: apiKeyRecord.organizationId,
      email: 'api-key@system',
      role: 'api',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    };

    next();
  } catch (error) {
    console.error('API key middleware error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'API key validation failed'
    });
  }
};

// Optional authentication - doesn't fail if no token provided
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return next(); // Continue without authentication
    }

    // Verify JWT token
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser;
    
    // Check if user still exists and is active
    const user = await prisma.user.findFirst({
      where: {
        id: decoded.userId,
        isActive: true,
      },
    });

    if (user) {
      req.user = {
        userId: user.id,
        organizationId: user.organizationId,
        email: user.email,
        role: user.role,
        iat: decoded.iat,
        exp: decoded.exp,
      };
    }

    next();
  } catch (error) {
    // Ignore authentication errors and continue
    next();
  }
};
