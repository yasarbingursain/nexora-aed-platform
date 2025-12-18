/**
 * Explainable AI API Client
 * GDPR Article 22 Compliant Explanation Requests
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export interface ExplanationRequest {
  identity_id: string;
  prediction_id?: string;
  methods?: ('shap' | 'lime' | 'counterfactual')[];
  include_human_readable?: boolean;
}

export interface ExplanationResponse {
  success: boolean;
  data: {
    prediction_id: string;
    identity_id: string;
    organization_id: string;
    prediction: {
      is_anomaly: boolean;
      anomaly_score: number;
      risk_level: string;
      confidence: number;
    };
    explanations: {
      shap?: any;
      lime?: any;
      counterfactual?: any;
    };
    human_readable: {
      summary: string;
      risk_factors: string[];
      protective_factors: string[];
      key_insights: string[];
      recommended_actions: string[];
      confidence_statement: string;
      gdpr_disclosure: string;
    };
    model_info: {
      version: string;
      trained_at: string;
      feature_count: number;
    };
    generated_at: string;
    audit_id: string;
  };
}

export interface HumanReviewRequest {
  prediction_id: string;
  reason: string;
}

export interface HumanReviewResponse {
  success: boolean;
  data: {
    success: boolean;
    ticket_id: string;
  };
  message: string;
}

/**
 * Generate explanation for a prediction
 */
export async function generateExplanation(
  request: ExplanationRequest,
  token: string
): Promise<ExplanationResponse> {
  const response = await fetch(`${API_BASE}/explain`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate explanation: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get explanation history for an identity
 */
export async function getExplanationHistory(
  identityId: string,
  token: string,
  limit = 10
): Promise<{ success: boolean; data: any[] }> {
  const response = await fetch(
    `${API_BASE}/explain/history/${identityId}?limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get explanation history: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Request human review (GDPR Article 22)
 */
export async function requestHumanReview(
  request: HumanReviewRequest,
  token: string
): Promise<HumanReviewResponse> {
  const response = await fetch(`${API_BASE}/explain/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Failed to request human review: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Check explainable AI service health
 */
export async function checkExplainableAIHealth(
  token: string
): Promise<{ success: boolean; data: { healthy: boolean; ml_service: boolean } }> {
  const response = await fetch(`${API_BASE}/explain/health`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Health check failed: ${response.statusText}`);
  }

  return response.json();
}
