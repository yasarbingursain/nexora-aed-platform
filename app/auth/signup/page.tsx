"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Logo } from '@/components/ui/Logo';
import Link from 'next/link';
import { Eye, EyeOff, Github, Mail, Lock, User, Building, CheckCircle, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { registrationFormSchema, type RegistrationFormData } from '@/lib/validation/forms';
import { storeTokens } from '@/services/api';

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    tier: 'starter',
    price: '$99',
    period: '/month',
    description: 'Perfect for small teams getting started',
    features: [
      'Up to 100 non-human identities',
      'Basic threat detection',
      'Email support',
      '7-day data retention'
    ],
    popular: false
  },
  {
    id: 'professional',
    name: 'Professional',
    tier: 'professional',
    price: '$299',
    period: '/month',
    description: 'For growing teams with advanced needs',
    features: [
      'Up to 1,000 non-human identities',
      'Advanced ML-powered detection',
      'Priority support',
      '30-day data retention',
      'API access',
      'Custom integrations'
    ],
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tier: 'enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations with complex requirements',
    features: [
      'Unlimited non-human identities',
      'Real-time threat intelligence',
      '24/7 dedicated support',
      'Unlimited data retention',
      'Advanced API access',
      'Custom integrations',
      'SLA guarantees',
      'Dedicated account manager'
    ],
    popular: false
  }
];

export default function SignUpPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('professional');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fieldValidation, setFieldValidation] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<RegistrationFormData>({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
    subscribeNewsletter: true
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({ ...prev, [name]: newValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrors({});
    setIsLoading(true);

    try {
      const validationResult = registrationFormSchema.safeParse(formData);
      
      if (!validationResult.success) {
        const fieldErrors: Record<string, string> = {};
        validationResult.error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
        setError('Please fix the errors above');
        setIsLoading(false);
        return;
      }

      const selectedPlanData = plans.find(p => p.id === selectedPlan);
      
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: formData.company,
          email: formData.email,
          password: formData.password,
          fullName: `${formData.firstName} ${formData.lastName}`,
          subscriptionTier: selectedPlanData?.tier || 'starter',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Registration failed');
      }

      if (data.accessToken && data.refreshToken) {
        const parseJwtExp = (token: string): number => {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return (payload.exp || 0) * 1000;
          } catch {
            return Date.now() + 60 * 60 * 1000;
          }
        };

        storeTokens({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresAt: parseJwtExp(data.accessToken),
          tokenType: 'Bearer',
        });
      }

      router.push('/client-dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-8">
            <Logo size="lg" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Start Your Free Trial</h1>
          <p className="text-muted-foreground">Join 150+ companies securing their non-human identities</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <Card className="p-8">
            <h2 className="text-2xl font-semibold text-foreground mb-6">Create Your Account</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}

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
                      className={`w-full pl-10 pr-12 py-3 bg-background border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                        errors.firstName ? 'border-red-500 focus:ring-red-500' : 
                        fieldValidation.firstName ? 'border-green-500 focus:ring-green-500' :
                        'border-border focus:ring-blue-500'
                      }`}
                      placeholder="John"
                      required
                    />
                    {fieldValidation.firstName && (
                      <CheckCircle2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
                    )}
                  </div>
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.firstName}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-foreground mb-2">
                    Last Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className={`w-full pl-4 pr-12 py-3 bg-background border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                        errors.lastName ? 'border-red-500 focus:ring-red-500' : 
                        fieldValidation.lastName ? 'border-green-500 focus:ring-green-500' :
                        'border-border focus:ring-blue-500'
                      }`}
                      placeholder="Doe"
                      required
                    />
                    {fieldValidation.lastName && (
                      <CheckCircle2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
                    )}
                  </div>
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.lastName}
                    </p>
                  )}
                </div>
              </div>

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
                    className={`w-full pl-10 pr-12 py-3 bg-background border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                      errors.email ? 'border-red-500 focus:ring-red-500' : 
                      fieldValidation.email ? 'border-green-500 focus:ring-green-500' :
                      'border-border focus:ring-blue-500'
                    }`}
                    placeholder="john@company.com"
                    required
                  />
                  {fieldValidation.email && (
                    <CheckCircle2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
                  )}
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.email}
                  </p>
                )}
              </div>

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
                    className={`w-full pl-10 pr-12 py-3 bg-background border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                      errors.company ? 'border-red-500 focus:ring-red-500' : 
                      fieldValidation.company ? 'border-green-500 focus:ring-green-500' :
                      'border-border focus:ring-blue-500'
                    }`}
                    placeholder="Acme Corp"
                    required
                  />
                  {fieldValidation.company && (
                    <CheckCircle2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
                  )}
                </div>
                {errors.company && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.company}
                  </p>
                )}
              </div>

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
                      className={`w-full pl-10 pr-12 py-3 bg-background border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                        errors.password ? 'border-red-500 focus:ring-red-500' : 
                        fieldValidation.password ? 'border-green-500 focus:ring-green-500' :
                        'border-border focus:ring-blue-500'
                      }`}
                      placeholder="••••••••"
                      required
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
                      className={`w-full pl-10 pr-12 py-3 bg-background border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                        errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 
                        fieldValidation.confirmPassword ? 'border-green-500 focus:ring-green-500' :
                        'border-border focus:ring-blue-500'
                      }`}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>

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

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Start 7-Day Free Trial'
                )}
              </Button>
            </form>

            <div className="my-6 flex items-center">
              <div className="flex-1 border-t border-border"></div>
              <span className="px-4 text-sm text-muted-foreground">Or continue with</span>
              <div className="flex-1 border-t border-border"></div>
            </div>

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

          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Choose Your Plan</h2>
              <p className="text-muted-foreground">Start with a 7-day free trial. No credit card required.</p>
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
                        {plan.popular && (
                          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                            Most Popular
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-foreground">{plan.price}</div>
                      <div className="text-sm text-muted-foreground">{plan.period}</div>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>

            <Card className="p-6 bg-blue-500/5 border-blue-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="font-semibold text-foreground">7-Day Free Trial</h3>
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
