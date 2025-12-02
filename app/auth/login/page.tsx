"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import { Eye, EyeOff, Github, Mail, Lock, User } from 'lucide-react';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement authentication logic
    console.log('Login attempt:', formData);
    
    // Redirect based on user role (mock logic)
    if (formData.email.includes('admin')) {
      window.location.href = '/admin';
    } else {
      window.location.href = '/client-dashboard';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">N</span>
            </div>
            <span className="text-2xl font-bold text-foreground">Nexora</span>
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome Back</h1>
          <p className="text-muted-foreground">Sign in to your Nexora account</p>
        </div>

        {/* Login Form */}
        <Card className="p-8">
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
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-12 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="rounded border-border text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-muted-foreground">Remember me</span>
              </label>
              <Link href="/auth/forgot-password" className="text-sm text-blue-400 hover:text-blue-300">
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full" size="lg">
              Sign In
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
