"use client";

import React from 'react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { Home, Shield, Settings, Play, User, Building } from 'lucide-react';

export function QuickNav() {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg">
        <div className="flex flex-col gap-2">
          <Link href="/">
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Home className="h-4 w-4 mr-2" />
              Landing
            </Button>
          </Link>
          <Link href="/demo">
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Play className="h-4 w-4 mr-2" />
              Demo
            </Button>
          </Link>
          <Link href="/client-dashboard">
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Shield className="h-4 w-4 mr-2" />
              Client
            </Button>
          </Link>
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Building className="h-4 w-4 mr-2" />
              Admin
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <User className="h-4 w-4 mr-2" />
              Login
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
