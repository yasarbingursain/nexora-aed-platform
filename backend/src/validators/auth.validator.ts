import { z } from 'zod';

export const registerSchema = z.object({
  organizationName: z.string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_.]+$/, 'Organization name contains invalid characters'),
  
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters'),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  fullName: z.string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .regex(/^[a-zA-Z\s\-'.]+$/, 'Full name contains invalid characters'),
});

export const loginSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters'),
  
  password: z.string()
    .min(1, 'Password is required')
    .max(128, 'Password must be less than 128 characters'),
  
  mfaToken: z.string()
    .regex(/^\d{6}$/, 'MFA token must be 6 digits')
    .optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string()
    .min(1, 'Refresh token is required'),
});

export const mfaSetupSchema = z.object({
  secret: z.string()
    .min(1, 'MFA secret is required'),
});

export const mfaVerifySchema = z.object({
  token: z.string()
    .regex(/^\d{6}$/, 'MFA token must be 6 digits'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string()
    .min(1, 'Current password is required'),
  
  newPassword: z.string()
    .min(8, 'New password must be at least 8 characters')
    .max(128, 'New password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
});

export const forgotPasswordSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters'),
});

export const resetPasswordSchema = z.object({
  token: z.string()
    .min(1, 'Reset token is required'),
  
  newPassword: z.string()
    .min(8, 'New password must be at least 8 characters')
    .max(128, 'New password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
});
