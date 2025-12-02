"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import { Eye, EyeOff, Github, Mail, Lock, User, Building, CheckCircle } from 'lucide-react';

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('professional');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
    subscribeNewsletter: true
  });

  const plans = [
    {
      id: 'professional',
      name: 'Professional',
      price: '$99',
      period: '/month',
      features: ['Up to 1,000 entities', 'Basic threat detection', 'Email support', '99.9% uptime SLA']
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '$299',
      period: '/month',
      features: ['Unlimited entities', 'Advanced AI detection', '24/7 phone support', '99.99% uptime SLA', 'Custom integrations']
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    if (!formData.agreeToTerms) {
      alert('Please agree to the terms and conditions');
      return;
    }

    // TODO: Implement registration logic
    console.log('Registration attempt:', { ...formData, selectedPlan });
    
    // Redirect to onboarding or dashboard
    window.location.href = '/client-dashboard';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">N</span>
            </div>
            <span className="text-2xl font-bold text-foreground">Nexora</span>
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-2">Start Your Free Trial</h1>
          <p className="text-muted-foreground">Join 150+ companies securing their non-human identities</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Registration Form */}
          <Card className="p-8">
            <h2 className="text-2xl font-semibold text-foreground mb-6">Create Your Account</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-foreground mb-2">
                    First Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="John"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-foreground mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  Work Email
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
                    placeholder="john@company.com"
                    required
                  />
                </div>
              </div>

              {/* Company Field */}
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-foreground mb-2">
                  Company Name
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your Company"
                    required
                  />
                </div>
              </div>

              {/* Password Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      placeholder="Create password"
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
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-12 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Confirm password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Terms and Newsletter */}
              <div className="space-y-3">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    name="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={handleInputChange}
                    className="rounded border-border text-blue-600 focus:ring-blue-500 mt-1"
                    required
                  />
                  <span className="ml-2 text-sm text-muted-foreground">
                    I agree to the{' '}
                    <Link href="/terms" className="text-blue-400 hover:text-blue-300">Terms of Service</Link>
                    {' '}and{' '}
                    <Link href="/privacy" className="text-blue-400 hover:text-blue-300">Privacy Policy</Link>
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="subscribeNewsletter"
                    checked={formData.subscribeNewsletter}
                    onChange={handleInputChange}
                    className="rounded border-border text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-muted-foreground">
                    Send me product updates and security insights
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full" size="lg">
                Start Free Trial
              </Button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center">
              <div className="flex-1 border-t border-border"></div>
              <span className="px-4 text-sm text-muted-foreground">Or sign up with</span>
              <div className="flex-1 border-t border-border"></div>
            </div>

            {/* Social Signup */}
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
          </Card>

          {/* Plan Selection */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Choose Your Plan</h2>
              <p className="text-muted-foreground">Start with a 14-day free trial. No credit card required.</p>
            </div>

            <div className="space-y-4">
              {plans.map((plan) => (
                <Card 
                  key={plan.id}
                  className={`p-6 cursor-pointer transition-all ${
                    selectedPlan === plan.id 
                      ? 'ring-2 ring-blue-500 border-blue-500' 
                      : 'hover:border-border-hover'
                  }`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-foreground">{plan.name}</h3>
                        {plan.id === 'enterprise' && (
                          <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                            Popular
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                        <span className="text-muted-foreground">{plan.period}</span>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedPlan === plan.id 
                        ? 'border-blue-500 bg-blue-500' 
                        : 'border-border'
                    }`}>
                      {selectedPlan === plan.id && (
                        <CheckCircle className="h-4 w-4 text-white" />
                      )}
                    </div>
                  </div>
                  
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>

            {/* Trial Info */}
            <Card className="p-6 bg-blue-500/5 border-blue-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="font-semibold text-foreground">14-Day Free Trial</h3>
              </div>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Full access to all features</li>
                <li>• No credit card required</li>
                <li>• Cancel anytime</li>
                <li>• Dedicated onboarding support</li>
              </ul>
            </Card>
          </div>
        </div>

        {/* Sign In Link */}
        <div className="text-center mt-8">
          <p className="text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-blue-400 hover:text-blue-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
