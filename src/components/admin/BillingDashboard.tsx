"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, RefreshCw, Mail, CreditCard } from 'lucide-react';
import type { BillingDashboardResponse } from './BillingDashboard.types';
import { fetchBillingDashboard, retryPayment, sendPaymentReminder } from '@/lib/api/billing';

export function BillingDashboard() {
  const [data, setData] = useState<BillingDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const billingData = await fetchBillingDashboard();
      setData(billingData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-nexora-primary" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <Card className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-nexora-threat mx-auto mb-4" />
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={loadData}>Retry</Button>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Billing & Revenue</h2>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="h-5 w-5 text-nexora-primary" />
            <Badge className="bg-nexora-ai/10 text-nexora-ai">
              +{data.metrics.growth}%
            </Badge>
          </div>
          <div className="text-2xl font-bold text-foreground">
            ${(data.metrics.mrr / 1000).toFixed(1)}K
          </div>
          <div className="text-sm text-muted-foreground">MRR</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-5 w-5 text-nexora-ai" />
            <Badge className="bg-nexora-ai/10 text-nexora-ai">
              +{(data.metrics.growth * 12).toFixed(1)}%
            </Badge>
          </div>
          <div className="text-2xl font-bold text-foreground">
            ${(data.metrics.arr / 1000000).toFixed(1)}M
          </div>
          <div className="text-sm text-muted-foreground">ARR</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingDown className="h-5 w-5 text-nexora-threat" />
            <Badge className={data.metrics.churnRate > 5 ? 'bg-nexora-threat/10 text-nexora-threat' : 'bg-nexora-ai/10 text-nexora-ai'}>
              {data.metrics.churnRate.toFixed(1)}%
            </Badge>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {data.metrics.churnRate.toFixed(1)}%
          </div>
          <div className="text-sm text-muted-foreground">Churn Rate</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="h-5 w-5 text-nexora-warning" />
            <TrendingUp className="h-4 w-4 text-nexora-ai" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            ${data.metrics.arpu.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground">ARPU</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Revenue by Tier</h3>
          <div className="space-y-4">
            {data.revenueByTier.map((tier, index) => (
              <div key={index}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-foreground">{tier.tier}</span>
                  <span className="text-muted-foreground">{tier.percentage}% | ${(tier.revenue / 1000).toFixed(1)}K</span>
                </div>
                <div className="w-full bg-bg-elevated rounded-full h-2">
                  <div
                    className="bg-nexora-primary h-2 rounded-full"
                    style={{ width: `${tier.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Monthly Revenue Trend</h3>
          <div className="space-y-3">
            {data.monthlyRevenue.slice(-6).map((month, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-foreground">{month.month}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{month.customers} customers</span>
                  <span className="text-sm font-semibold text-nexora-primary">
                    ${(month.revenue / 1000000).toFixed(2)}M
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Failed Payments ({data.failedPayments.length})
        </h3>
        <div className="space-y-3">
          {data.failedPayments.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-foreground">{payment.organizationName}</div>
                <div className="text-sm text-muted-foreground">
                  ${payment.amount.toLocaleString()} • Due: {payment.dueDate.toLocaleDateString()} • {payment.attempts} attempts
                </div>
                <div className="text-xs text-nexora-threat">{payment.reason}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => sendPaymentReminder(payment.id)}>
                  <Mail className="h-4 w-4 mr-1" />
                  Remind
                </Button>
                <Button variant="outline" size="sm" onClick={() => retryPayment(payment.id)}>
                  <CreditCard className="h-4 w-4 mr-1" />
                  Retry
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Churn Risk ({data.churnRisk.length} customers)
        </h3>
        <div className="space-y-3">
          {data.churnRisk.map((customer) => (
            <div key={customer.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-foreground">{customer.organizationName}</span>
                  <Badge variant="outline">{customer.plan}</Badge>
                  <Badge className={
                    customer.riskScore >= 80 ? 'bg-nexora-threat/10 text-nexora-threat' :
                    customer.riskScore >= 60 ? 'bg-nexora-warning/10 text-nexora-warning' :
                    'bg-security-high/10 text-security-high'
                  }>
                    Risk: {customer.riskScore}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground mb-1">
                  ${customer.revenue.toLocaleString()}/mo • Last activity: {customer.lastActivity.toLocaleDateString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {customer.riskFactors.join(' • ')}
                </div>
              </div>
              <Button variant="outline" size="sm">
                Contact
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
