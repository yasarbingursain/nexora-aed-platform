"use client";

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Logo } from '@/components/ui/Logo';
import Link from 'next/link';
import { Eye, EyeOff, Github, Mail, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { loginFormSchema, type LoginFormData } from '@/lib/validation/forms';
import { storeTokens } from '@/services/api';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  
  // SECURITY FIX: Use ref for password instead of state
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setFormData(prev => ({ ...prev, email }));
    
    // Real-time email validation
    try {
      loginFormSchema.shape.email.parse(email);
      setEmailValid(email.length > 0 ? true : null);
      setErrors(prev => ({ ...prev, email: '' }));
    } catch {
      setEmailValid(email.length > 0 ? false : null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrors({});
    setIsLoading(true);
    
    try {
      const password = passwordRef.current?.value;
      if (!password) {
        setErrors({ password: 'Password is required' });
        setIsLoading(false);
        return;
      }

      // Validate form data
      const validation = loginFormSchema.safeParse({
        ...formData,
        password,
      });

      if (!validation.success) {
        const fieldErrors: Record<string, string> = {};
        validation.error.errors.forEach((err) => {
          const field = err.path[0] as string;
          fieldErrors[field] = err.message;
        });
        setErrors(fieldErrors);
        setIsLoading(false);
        return;
      }

      // SECURITY: Server-side authentication
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Login failed');
      }

      const { user, accessToken, refreshToken } = await response.json();

      // Compute expiry from JWT `exp` claim and store tokens centrally
      const parseJwtExp = (token: string): number => {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          return (payload.exp || 0) * 1000;
        } catch {
          return Date.now() + 60 * 60 * 1000; // fallback 1 hour
        }
      };

      storeTokens({
        accessToken,
        refreshToken,
        expiresAt: parseJwtExp(accessToken),
        tokenType: 'Bearer',
      });
      
      // Clear password field
      if (passwordRef.current) {
        passwordRef.current.value = '';
      }

      // SECURITY FIX: Server determines role, not client
      router.push(user.role === 'admin' ? '/admin' : '/client-dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
      // Clear password on error
      if (passwordRef.current) {
        passwordRef.current.value = '';
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-8">
            <Logo size="lg" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome Back</h1>
          <p className="text-muted-foreground">Sign in to your Nexora account</p>
        </div>

        {/* Login Form */}
        <Card className="p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleEmailChange}
                  className={`w-full pl-10 pr-12 py-3 bg-background border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                    errors.email ? 'border-red-500 focus:ring-red-500' : 
                    emailValid === true ? 'border-green-500 focus:ring-green-500' :
                    'border-border focus:ring-blue-500'
                  }`}
                  placeholder="Enter your email"
                  required
                  autoComplete="email"
                />
                {emailValid === true && (
                  <CheckCircle2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
                )}
                {emailValid === false && (
                  <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-red-500" />
                )}
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  ref={passwordRef}
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  className={`w-full pl-10 pr-12 py-3 bg-background border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                    errors.password ? 'border-red-500 focus:ring-red-500' : 'border-border focus:ring-blue-500'
                  }`}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.password}
                </p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={(e) => setFormData(prev => ({ ...prev, rememberMe: e.target.checked }))}
                  className="rounded border-border text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-muted-foreground">Remember me</span>
              </label>
              <Link href="/auth/forgot-password" className="text-sm text-blue-400 hover:text-blue-300">
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-border"></div>
            <span className="px-4 text-sm text-muted-foreground">Or continue with</span>
            <div className="flex-1 border-t border-border"></div>
          </div>

          {/* Social Login */}
          <div className="space-y-3">
            <Button variant="outline" className="w-full" size="lg">
              <Github className="mr-2 h-5 w-5" />
              Continue with GitHub
            </Button>
            <Button variant="outline" className="w-full" size="lg">
              <Mail className="mr-2 h-5 w-5" />
              Continue with Google
            </Button>
          </div>

          {/* Demo Accounts */}
          <div className="mt-6 p-4 bg-card/50 rounded-lg border border-border">
            <h3 className="text-sm font-medium text-foreground mb-3">Demo Accounts</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Client Demo:</span>
                <span className="text-foreground font-mono">client@demo.com</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Admin Demo:</span>
                <span className="text-foreground font-mono">admin@demo.com</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Password:</span>
                <span className="text-foreground font-mono">demo123</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Sign Up Link */}
        <div className="text-center mt-6">
          <p className="text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-blue-400 hover:text-blue-300 font-medium">
              Sign up for free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
