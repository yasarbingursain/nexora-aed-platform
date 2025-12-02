import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

export interface SocketUser {
  userId: string;
  organizationId: string;
  email: string;
  role: string;
}

declare module 'socket.io' {
  interface Socket {
    data: {
      user?: SocketUser;
    };
  }
}

export const setupWebSocket = (httpServer: HttpServer): SocketIOServer => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.ALLOWED_ORIGINS.split(','),
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, env.JWT_SECRET) as any;
      
      socket.data.user = {
        userId: decoded.userId,
        organizationId: decoded.organizationId,
        email: decoded.email,
        role: decoded.role,
      };

      logger.info('WebSocket client authenticated', {
        userId: decoded.userId,
        organizationId: decoded.organizationId,
        socketId: socket.id,
      });

      next();
    } catch (error) {
      logger.warn('WebSocket authentication failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        socketId: socket.id,
      });
      next(new Error('Authentication failed'));
    }
  });

  // Connection handling
  io.on('connection', (socket) => {
    const user = socket.data.user;
    if (!user) return;

    const { organizationId, userId, role } = user;

    // Join organization-specific room
    socket.join(`org:${organizationId}`);
    
    // Join role-specific room
    socket.join(`org:${organizationId}:${role}`);
    
    // Join user-specific room
    socket.join(`user:${userId}`);

    logger.info('WebSocket client connected', {
      userId,
      organizationId,
      role,
      socketId: socket.id,
      rooms: Array.from(socket.rooms),
    });

    // Handle subscription to threat feeds
    socket.on('subscribe:threats', () => {
      socket.join(`org:${organizationId}:threats`);
      logger.debug('Client subscribed to threats', { userId, socketId: socket.id });
    });

    // Handle subscription to identity feeds
    socket.on('subscribe:identities', () => {
      socket.join(`org:${organizationId}:identities`);
      logger.debug('Client subscribed to identities', { userId, socketId: socket.id });
    });

    // Handle subscription to remediation feeds
    socket.on('subscribe:remediation', () => {
      socket.join(`org:${organizationId}:remediation`);
      logger.debug('Client subscribed to remediation', { userId, socketId: socket.id });
    });

    // Handle subscription to audit feeds (admin only)
    socket.on('subscribe:audit', () => {
      if (role === 'admin') {
        socket.join(`org:${organizationId}:audit`);
        logger.debug('Client subscribed to audit', { userId, socketId: socket.id });
      } else {
        socket.emit('error', { message: 'Insufficient permissions for audit feed' });
      }
    });

    // Handle unsubscription
    socket.on('unsubscribe:threats', () => {
      socket.leave(`org:${organizationId}:threats`);
      logger.debug('Client unsubscribed from threats', { userId, socketId: socket.id });
    });

    socket.on('unsubscribe:identities', () => {
      socket.leave(`org:${organizationId}:identities`);
      logger.debug('Client unsubscribed from identities', { userId, socketId: socket.id });
    });

    socket.on('unsubscribe:remediation', () => {
      socket.leave(`org:${organizationId}:remediation`);
      logger.debug('Client unsubscribed from remediation', { userId, socketId: socket.id });
    });

    socket.on('unsubscribe:audit', () => {
      socket.leave(`org:${organizationId}:audit`);
      logger.debug('Client unsubscribed from audit', { userId, socketId: socket.id });
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info('WebSocket client disconnected', {
        userId,
        organizationId,
        socketId: socket.id,
        reason,
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error('WebSocket error', {
        userId,
        organizationId,
        socketId: socket.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to Nexora AED Platform',
      userId,
      organizationId,
      timestamp: new Date().toISOString(),
    });
  });

  return io;
};

// Helper functions to emit events to specific rooms
export const emitToOrganization = (io: SocketIOServer, organizationId: string, event: string, data: any) => {
  io.to(`org:${organizationId}`).emit(event, data);
  logger.debug('Event emitted to organization', { organizationId, event });
};

export const emitToRole = (io: SocketIOServer, organizationId: string, role: string, event: string, data: any) => {
  io.to(`org:${organizationId}:${role}`).emit(event, data);
  logger.debug('Event emitted to role', { organizationId, role, event });
};

export const emitToUser = (io: SocketIOServer, userId: string, event: string, data: any) => {
  io.to(`user:${userId}`).emit(event, data);
  logger.debug('Event emitted to user', { userId, event });
};

export const emitThreatEvent = (io: SocketIOServer, organizationId: string, threat: any) => {
  io.to(`org:${organizationId}:threats`).emit('threat:detected', {
    ...threat,
    timestamp: new Date().toISOString(),
  });
  logger.info('Threat event emitted', { organizationId, threatId: threat.id });
};

export const emitIdentityEvent = (io: SocketIOServer, organizationId: string, identity: any) => {
  io.to(`org:${organizationId}:identities`).emit('identity:updated', {
    ...identity,
    timestamp: new Date().toISOString(),
  });
  logger.info('Identity event emitted', { organizationId, identityId: identity.id });
};

export const emitRemediationEvent = (io: SocketIOServer, organizationId: string, action: any) => {
  io.to(`org:${organizationId}:remediation`).emit('remediation:executed', {
    ...action,
    timestamp: new Date().toISOString(),
  });
  logger.info('Remediation event emitted', { organizationId, actionId: action.id });
};

export const emitAuditEvent = (io: SocketIOServer, organizationId: string, auditLog: any) => {
  io.to(`org:${organizationId}:audit`).emit('audit:logged', {
    ...auditLog,
    timestamp: new Date().toISOString(),
  });
  logger.debug('Audit event emitted', { organizationId, auditLogId: auditLog.id });
};
