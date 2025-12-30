'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  Brain, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  ChevronDown, 
  ChevronUp,
  FileText,
  Shield,
  Lightbulb,
  Scale
} from 'lucide-react';

interface FeatureContribution {
  feature: string;
  value: number | string;
  contribution: number;
  direction: 'positive' | 'negative' | 'neutral';
  importance: number;
}

interface ExplanationData {
  prediction_id: string;
  identity_id: string;
  prediction: {
    is_anomaly: boolean;
    anomaly_score: number;
    risk_level: string;
    confidence: number;
  };
  explanations: {
    shap?: {
      method: string;
      base_value: number;
      prediction_value: number;
      feature_contributions: FeatureContribution[];
    };
    lime?: {
      method: string;
      prediction_probability: number;
      local_model_r2: number;
      feature_weights: Array<{ feature: string; weight: number; value: string }>;
    };
    counterfactual?: {
      method: string;
      original_prediction: string;
      target_prediction: string;
      changes_required: Array<{
        feature: string;
        current_value: number | string;
        required_value: number | string;
        feasibility: string;
      }>;
    };
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
}

interface ExplainableAIProps {
  identityId: string;
  explanation?: ExplanationData;
  onRequestExplanation?: () => void;
  onRequestHumanReview?: (reason: string) => void;
  loading?: boolean;
}

export function ExplainableAI({
  identityId,
  explanation,
  onRequestExplanation,
  onRequestHumanReview,
  loading = false,
}: ExplainableAIProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('summary');
  const [showGDPR, setShowGDPR] = useState(false);
  const [reviewReason, setReviewReason] = useState('');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-500 bg-red-500/10';
      case 'high': return 'text-orange-500 bg-orange-500/10';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10';
      case 'low': return 'text-green-500 bg-green-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getContributionColor = (direction: string) => {
    switch (direction) {
      case 'positive': return 'bg-red-500';
      case 'negative': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (!explanation && !loading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            AI Explanation
          </CardTitle>
          <CardDescription>
            Generate an explanation for the ML prediction on this identity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onRequestExplanation} className="w-full">
            <Brain className="h-4 w-4 mr-2" />
            Generate Explanation
          </Button>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            GDPR Article 22 compliant explanation
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500 animate-pulse" />
            Generating Explanation...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!explanation) return null;

  return (
    <div className="space-y-4">
      {/* Prediction Summary */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              AI Prediction Explanation
            </CardTitle>
            <Badge className={getRiskColor(explanation.prediction.risk_level)}>
              {explanation.prediction.risk_level.toUpperCase()} RISK
            </Badge>
          </div>
          <CardDescription>
            Model v{explanation.model_info.version} • Generated {new Date(explanation.generated_at).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Anomaly Score */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Anomaly Score</span>
              <span className="font-medium">{(explanation.prediction.anomaly_score * 100).toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-red-500 transition-all" 
                style={{ width: `${explanation.prediction.anomaly_score * 100}%` }}
              />
            </div>
          </div>

          {/* Confidence */}
          <div className="flex items-center justify-between text-sm">
            <span>Model Confidence</span>
            <span className="font-medium">{(explanation.prediction.confidence * 100).toFixed(0)}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Human-Readable Summary */}
      <Card className="border-border/50">
        <CardHeader 
          className="cursor-pointer pb-2"
          onClick={() => toggleSection('summary')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Summary
            </CardTitle>
            {expandedSection === 'summary' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CardHeader>
        {expandedSection === 'summary' && (
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              {explanation.human_readable.summary}
            </p>
            <p className="text-xs text-muted-foreground mt-2 italic">
              {explanation.human_readable.confidence_statement}
            </p>
          </CardContent>
        )}
      </Card>

      {/* Risk Factors */}
      {explanation.human_readable.risk_factors.length > 0 && (
        <Card className="border-border/50 border-red-500/20">
          <CardHeader 
            className="cursor-pointer pb-2"
            onClick={() => toggleSection('risk')}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-red-500">
                <AlertTriangle className="h-4 w-4" />
                Risk Factors ({explanation.human_readable.risk_factors.length})
              </CardTitle>
              {expandedSection === 'risk' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CardHeader>
          {expandedSection === 'risk' && (
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {explanation.human_readable.risk_factors.map((factor, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>
      )}

      {/* Protective Factors */}
      {explanation.human_readable.protective_factors.length > 0 && (
        <Card className="border-border/50 border-green-500/20">
          <CardHeader 
            className="cursor-pointer pb-2"
            onClick={() => toggleSection('protective')}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-green-500">
                <Shield className="h-4 w-4" />
                Protective Factors ({explanation.human_readable.protective_factors.length})
              </CardTitle>
              {expandedSection === 'protective' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CardHeader>
          {expandedSection === 'protective' && (
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {explanation.human_readable.protective_factors.map((factor, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>
      )}

      {/* SHAP Feature Contributions */}
      {explanation.explanations.shap && (
        <Card className="border-border/50">
          <CardHeader 
            className="cursor-pointer pb-2"
            onClick={() => toggleSection('shap')}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Feature Contributions (SHAP)
              </CardTitle>
              {expandedSection === 'shap' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CardHeader>
          {expandedSection === 'shap' && (
            <CardContent className="pt-0 space-y-3">
              {explanation.explanations.shap.feature_contributions.slice(0, 5).map((contrib, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{contrib.feature.replace(/_/g, ' ')}</span>
                    <span className={contrib.direction === 'positive' ? 'text-red-500' : 'text-green-500'}>
                      {contrib.direction === 'positive' ? '+' : ''}{(contrib.contribution * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${getContributionColor(contrib.direction)}`}
                      style={{ width: `${Math.min(contrib.importance * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* Recommendations */}
      {explanation.human_readable.recommended_actions.length > 0 && (
        <Card className="border-border/50 border-blue-500/20">
          <CardHeader 
            className="cursor-pointer pb-2"
            onClick={() => toggleSection('recommendations')}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-blue-500">
                <Lightbulb className="h-4 w-4" />
                Recommended Actions
              </CardTitle>
              {expandedSection === 'recommendations' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CardHeader>
          {expandedSection === 'recommendations' && (
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {explanation.human_readable.recommended_actions.map((action, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-blue-500 font-medium">{i + 1}.</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>
      )}

      {/* GDPR Disclosure */}
      <Card className="border-border/50">
        <CardHeader 
          className="cursor-pointer pb-2"
          onClick={() => setShowGDPR(!showGDPR)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="h-4 w-4" />
              GDPR Article 22 Rights
            </CardTitle>
            {showGDPR ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CardHeader>
        {showGDPR && (
          <CardContent className="pt-0 space-y-4">
            <p className="text-sm text-muted-foreground">
              {explanation.human_readable.gdpr_disclosure}
            </p>
            <div className="space-y-2">
              <textarea
                className="w-full p-2 text-sm border rounded-md bg-background"
                placeholder="Reason for requesting human review..."
                value={reviewReason}
                onChange={(e) => setReviewReason(e.target.value)}
                rows={2}
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onRequestHumanReview?.(reviewReason)}
                disabled={!reviewReason.trim()}
              >
                Request Human Review
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export default ExplainableAI;
