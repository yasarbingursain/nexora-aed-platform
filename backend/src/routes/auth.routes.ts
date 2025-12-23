import { Router } from 'express';
import { AuthController } from '@/controllers/auth.controller';
import { TokenRotationService } from '@/services/token-rotation.service';
import { validate } from '@/middleware/validation.middleware';
import { requireAuth, requireRole } from '@/middleware/auth.middleware';
import { authRateLimit } from '@/middleware/rateLimiter.middleware';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  mfaSetupSchema,
  mfaVerifySchema,
  mfaDisableSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@/validators/auth.validator';

const router = Router();

// Public routes (no authentication required)
router.post('/register', 
  authRateLimit,
  validate(registerSchema),
  AuthController.register
);

router.post('/login', 
  authRateLimit,
  validate(loginSchema),
  AuthController.login
);

// SPRINT 2: Token rotation for replay attack prevention
router.post('/refresh', 
  authRateLimit,
  validate(refreshTokenSchema),
  TokenRotationService.refreshWithRotation
);

router.post('/forgot-password',
  authRateLimit,
  validate(forgotPasswordSchema),
  AuthController.forgotPassword
);

router.post('/reset-password',
  authRateLimit,
  validate(resetPasswordSchema),
  AuthController.resetPassword
);

// Protected routes (authentication required)
router.use(requireAuth);

router.post('/logout', AuthController.logout);

router.get('/profile', AuthController.getProfile);

router.post('/change-password',
  validate(changePasswordSchema),
  AuthController.changePassword
);

// MFA routes
router.post('/mfa/setup',
  validate(mfaSetupSchema),
  AuthController.setupMfa
);

router.post('/mfa/verify',
  validate(mfaVerifySchema),
  AuthController.verifyMfa
);

router.post('/mfa/disable',
  validate(mfaDisableSchema),
  AuthController.disableMfa
);

// Admin only routes
router.get('/users',
  requireRole(['admin']),
  // TODO: Implement list users controller
  (req, res) => res.status(501).json({ error: 'Not implemented' })
);

router.post('/users',
  requireRole(['admin']),
  // TODO: Implement create user controller
  (req, res) => res.status(501).json({ error: 'Not implemented' })
);

router.put('/users/:id',
  requireRole(['admin']),
  // TODO: Implement update user controller
  (req, res) => res.status(501).json({ error: 'Not implemented' })
);

router.delete('/users/:id',
  requireRole(['admin']),
  // TODO: Implement delete user controller
  (req, res) => res.status(501).json({ error: 'Not implemented' })
);

export default router;
