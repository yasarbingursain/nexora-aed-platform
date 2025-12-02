"use client";

import React from 'react';
import { useConsent } from '@/providers/ConsentProvider';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Shield, X } from 'lucide-react';

export function ConsentBanner() {
  const { showBanner, acceptAll, rejectAll } = useConsent();

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur-sm border-t border-border">
      <Card className="max-w-6xl mx-auto p-6">
        <div className="flex items-start gap-4">
          <Shield className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">Privacy & Cookie Consent</h3>
            <p className="text-sm text-muted-foreground mb-4">
              We use cookies and similar technologies to provide essential functionality, 
              analyze site usage, and improve your experience. By clicking &quot;Accept All&quot;, 
              you consent to our use of cookies for analytics and marketing purposes. 
              You can manage your preferences at any time.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={acceptAll} size="sm">
                Accept All
              </Button>
              <Button onClick={rejectAll} variant="outline" size="sm">
                Reject Optional
              </Button>
              <a href="/privacy" target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm">Privacy Policy</Button>
              </a>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
