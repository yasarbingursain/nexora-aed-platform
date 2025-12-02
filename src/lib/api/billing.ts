import type { BillingDashboardResponse } from '@/components/admin/BillingDashboard.types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function fetchBillingDashboard(): Promise<BillingDashboardResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/billing/dashboard`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) throw new Error(`Billing API error: ${response.status}`);

    const data = await response.json();
    
    return {
      metrics: data.metrics,
      revenueByTier: data.revenueByTier,
      monthlyRevenue: data.monthlyRevenue,
      failedPayments: data.failedPayments.map((p: any) => ({
        ...p,
        dueDate: new Date(p.dueDate),
      })),
      churnRisk: data.churnRisk.map((c: any) => ({
        ...c,
        lastActivity: new Date(c.lastActivity),
      })),
    };
  } catch (error) {
    console.error('Failed to fetch billing dashboard:', error);
    throw error;
  }
}

export async function retryPayment(paymentId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/billing/retry/${paymentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error(`Failed to retry payment: ${response.status}`);
  } catch (error) {
    console.error('Failed to retry payment:', error);
    throw error;
  }
}

export async function sendPaymentReminder(paymentId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/billing/remind/${paymentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error(`Failed to send reminder: ${response.status}`);
  } catch (error) {
    console.error('Failed to send reminder:', error);
    throw error;
  }
}
