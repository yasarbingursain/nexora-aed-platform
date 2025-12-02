import { Router } from 'express';
import { AuthController } from '@/controllers/auth.controller';
import { validate } from '@/middleware/validation.middleware';
import { requireAuth, requireRole } from '@/middleware/auth.middleware';
import { authRateLimit } from '@/middleware/rateLimiter.middleware';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  mfaSetupSchema,
  mfaVerifySchema,
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

router.post('/refresh', 
  validate(refreshTokenSchema),
  AuthController.refresh
);

router.post('/forgot-password',
  authRateLimit,
  validate(forgotPasswordSchema),
  // TODO: Implement forgot password controller
  (req, res) => res.status(501).json({ error: 'Not implemented' })
);

router.post('/reset-password',
  authRateLimit,
  validate(resetPasswordSchema),
  // TODO: Implement reset password controller
  (req, res) => res.status(501).json({ error: 'Not implemented' })
);

// Protected routes (authentication required)
router.use(requireAuth);

router.post('/logout', AuthController.logout);

router.get('/profile', AuthController.getProfile);

router.post('/change-password',
  validate(changePasswordSchema),
  // TODO: Implement change password controller
  (req, res) => res.status(501).json({ error: 'Not implemented' })
);

// MFA routes
router.post('/mfa/setup', AuthController.setupMfa);

router.post('/mfa/verify',
  validate(mfaVerifySchema),
  AuthController.verifyMfa
);

router.post('/mfa/disable', AuthController.disableMfa);

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
