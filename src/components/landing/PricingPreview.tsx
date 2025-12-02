"use client";

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Check, Zap, Building, Crown } from 'lucide-react';
import Link from 'next/link';

const plans = [
  {
    name: 'Starter',
    icon: Zap,
    price: 1500,
    period: 'month',
    description: 'Perfect for startups and small teams',
    features: [
      'Up to 1K identities',
      'Basic ML anomaly detection',
      'Email alerts',
      'Community support',
      'SOC2 compliance reports',
      '99.9% uptime SLA'
    ],
    cta: 'Start Free Trial',
    popular: false,
    gradient: 'from-nexora-primary to-blue-500'
  },
  {
    name: 'Growth',
    icon: Building,
    price: 5000,
    period: 'month',
    description: 'For growing companies with advanced needs',
    features: [
      'Up to 10K identities',
      'Advanced ML with explainability',
      'Post-quantum crypto ready',
      'NHITI threat feed access',
      'Phone + email support',
      'All compliance frameworks',
      'Custom integrations',
      '99.95% uptime SLA'
    ],
    cta: 'Start Free Trial',
    popular: true,
    gradient: 'from-nexora-quantum to-purple-500'
  },
  {
    name: 'Enterprise',
    icon: Crown,
    price: null,
    period: 'custom',
    description: 'Unlimited scale with dedicated support',
    features: [
      'Unlimited identities',
      'Dedicated infrastructure',
      'On-premise deployment option',
      '24/7 dedicated CSM',
      'Custom SLA (up to 99.99%)',
      'Advanced threat hunting',
      'Quantum migration planning',
      'Priority feature requests'
    ],
    cta: 'Contact Sales',
    popular: false,
    gradient: 'from-nexora-ai to-green-500'
  }
];

export function PricingPreview() {
  return (
    <section id="pricing" className="py-20 px-6 bg-bg-deep/30">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Transparent Pricing. No Surprises.
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your needs. All plans include core security features and 30-day money-back guarantee.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => (
            <PricingCard key={plan.name} plan={plan} />
          ))}
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-8 pt-8 border-t border-border/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-nexora-ai" />
            <span>SOC 2 Type II Certified</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-nexora-ai" />
            <span>ISO 27001 Compliant</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-nexora-ai" />
            <span>GDPR Ready</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-nexora-ai" />
            <span>99.9% Uptime SLA</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-nexora-ai" />
            <span>30-Day Money Back</span>
          </div>
        </div>
      </div>
    </section>
  );
}

interface PricingCardProps {
  plan: typeof plans[0];
}

function PricingCard({ plan }: PricingCardProps) {
  const Icon = plan.icon;

  return (
    <div className={`relative ${plan.popular ? 'md:-mt-4 md:mb-4' : ''}`}>
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-gradient-to-r from-nexora-quantum to-purple-500 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg">
            Most Popular
          </div>
        </div>
      )}
      
      <Card 
        className={`h-full p-8 relative overflow-hidden
                   ${plan.popular 
                     ? 'border-2 border-nexora-quantum shadow-[0_0_40px_rgba(157,78,221,0.2)]' 
                     : 'border border-border/50'
                   }
                   bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl
                   hover:shadow-[0_0_30px_rgba(0,217,255,0.15)] transition-all duration-300
                   transform hover:scale-[1.02]`}
      >
        {/* Icon */}
        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${plan.gradient} 
                        flex items-center justify-center mb-6 shadow-lg`}>
          <Icon className="h-7 w-7 text-white" />
        </div>

        {/* Plan Name */}
        <h3 className="text-2xl font-bold text-foreground mb-2">
          {plan.name}
        </h3>

        {/* Description */}
        <p className="text-muted-foreground text-sm mb-6">
          {plan.description}
        </p>

        {/* Price */}
        <div className="mb-8">
          {plan.price ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-foreground">
                  ${plan.price.toLocaleString()}
                </span>
                <span className="text-muted-foreground">/{plan.period}</span>
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                Billed annually or ${Math.round(plan.price * 1.2).toLocaleString()}/mo monthly
              </div>
            </>
          ) : (
            <>
              <div className="text-5xl font-bold text-foreground mb-2">
                Custom
              </div>
              <div className="text-sm text-muted-foreground">
                Tailored to your needs
              </div>
            </>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-4 mb-8">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check className="h-5 w-5 text-nexora-ai flex-shrink-0 mt-0.5" />
              <span className="text-sm text-foreground">{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <Link href={plan.price ? "/auth/signup" : "/contact"} className="block mt-auto">
          <Button 
            className={`w-full ${
              plan.popular 
                ? 'bg-gradient-to-r from-nexora-quantum to-purple-500 hover:from-nexora-quantum/90 hover:to-purple-500/90' 
                : ''
            }`}
            size="lg"
          >
            {plan.cta}
          </Button>
        </Link>

        {/* Background Gradient Effect */}
        {plan.popular && (
          <div className="absolute inset-0 bg-gradient-to-br from-nexora-quantum/5 to-transparent pointer-events-none" />
        )}
      </Card>
    </div>
  );
}
