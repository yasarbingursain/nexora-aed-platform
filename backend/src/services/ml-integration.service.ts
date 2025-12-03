/**
 * ML Integration Service
 * PRODUCTION - Connects ML models to real-time identity monitoring
 * Standards: NIST AI RMF, ISO/IEC 23894
 */

import axios from 'axios';
import { logger } from '@/utils/logger';
import { prisma } from '@/config/database';

interface MLPredictionRequest {
  identity_id: string;
  organization_id: string;
  features: {
    behavioral: Record<string, any>;
    temporal: Record<string, any>;
    network: Record<string, any>;
  };
}

interface MLPredictionResponse {
  is_anomaly: boolean;
  anomaly_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  contributing_factors: string[];
  model_version: string;
}

export class MLIntegrationService {
  private mlServiceUrl: string;
  private enabled: boolean;

  constructor() {
    this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8002';
    this.enabled = process.env.ENABLE_ML_MONITORING === 'true';
  }

  /**
   * Analyze identity activity for anomalies using ML models
   */
  async analyzeIdentityActivity(identityId: string, organizationId: string): Promise<MLPredictionResponse | null> {
    if (!this.enabled) {
      logger.debug('ML monitoring disabled');
      return null;
    }

    try {
      // Fetch recent activity and baseline
      const [activities, baseline] = await Promise.all([
        prisma.identityActivity.findMany({
          where: { identityId },
          orderBy: { timestamp: 'desc' },
          take: 100,
        }),
        prisma.baseline.findFirst({
          where: { identityId },
          orderBy: { lastUpdated: 'desc' },
        }),
      ]);

      if (!baseline || activities.length === 0) {
        logger.debug('Insufficient data for ML analysis', { identityId });
        return null;
      }

      // Extract features
      const features = this.extractFeatures(activities, baseline);

      // Call ML service
      const request: MLPredictionRequest = {
        identity_id: identityId,
        organization_id: organizationId,
        features,
      };

      const response = await axios.post<MLPredictionResponse>(
        `${this.mlServiceUrl}/api/v1/predict`,
        request,
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'X-Organization-ID': organizationId,
          },
        }
      );

      logger.info('ML prediction completed', {
        identityId,
        isAnomaly: response.data.is_anomaly,
        riskLevel: response.data.risk_level,
        confidence: response.data.confidence,
      });

      // Store prediction result
      await this.storePrediction(identityId, organizationId, response.data);

      return response.data;
    } catch (error) {
      logger.error('ML analysis failed', { identityId, error });
      return null;
    }
  }

  /**
   * Extract ML features from activity data
   */
  private extractFeatures(activities: any[], baseline: any): MLPredictionRequest['features'] {
    const baselineFeatures = baseline.features as any || {};

    // Behavioral features
    const behavioral = {
      resource_access_pattern: this.calculateResourcePattern(activities),
      scope_usage: this.calculateScopeUsage(activities),
      api_call_frequency: activities.length / 24, // calls per hour
      error_rate: activities.filter(a => a.metadata?.statusCode >= 400).length / activities.length,
      baseline_deviation: this.calculateBaselineDeviation(activities, baselineFeatures),
    };

    // Temporal features
    const temporal = {
      time_of_day_distribution: this.calculateTimeDistribution(activities),
      day_of_week_pattern: this.calculateDayPattern(activities),
      activity_burst_score: this.calculateBurstScore(activities),
      inactive_periods: this.calculateInactivePeriods(activities),
    };

    // Network features
    const network = {
      unique_ips: new Set(activities.map(a => a.metadata?.sourceIP).filter(Boolean)).size,
      unique_regions: new Set(activities.map(a => a.metadata?.region).filter(Boolean)).size,
      geographic_anomaly: this.calculateGeographicAnomaly(activities, baselineFeatures),
      user_agent_changes: new Set(activities.map(a => a.metadata?.userAgent).filter(Boolean)).size,
    };

    return { behavioral, temporal, network };
  }

  private calculateResourcePattern(activities: any[]): number {
    const resources = activities.map(a => a.metadata?.resource).filter(Boolean);
    const uniqueResources = new Set(resources);
    return uniqueResources.size / Math.max(resources.length, 1);
  }

  private calculateScopeUsage(activities: any[]): number {
    const scopes = activities.flatMap(a => a.metadata?.scopes || []);
    const uniqueScopes = new Set(scopes);
    return uniqueScopes.size;
  }

  private calculateBaselineDeviation(activities: any[], baseline: any): number {
    // Simple deviation score (0-1)
    const currentResources = new Set(activities.map(a => a.metadata?.resource).filter(Boolean));
    const baselineResources = new Set(baseline.resources || []);
    
    const intersection = new Set([...currentResources].filter(x => baselineResources.has(x)));
    const union = new Set([...currentResources, ...baselineResources]);
    
    return 1 - (intersection.size / Math.max(union.size, 1));
  }

  private calculateTimeDistribution(activities: any[]): Record<string, number> {
    const hourCounts: Record<number, number> = {};
    activities.forEach(a => {
      const hour = new Date(a.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    return hourCounts;
  }

  private calculateDayPattern(activities: any[]): Record<string, number> {
    const dayCounts: Record<number, number> = {};
    activities.forEach(a => {
      const day = new Date(a.timestamp).getDay();
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });
    return dayCounts;
  }

  private calculateBurstScore(activities: any[]): number {
    if (activities.length < 2) return 0;
    
    const timestamps = activities.map(a => new Date(a.timestamp).getTime()).sort();
    const intervals = [];
    
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const minInterval = Math.min(...intervals);
    
    return minInterval < (avgInterval * 0.1) ? 1 : 0;
  }

  private calculateInactivePeriods(activities: any[]): number {
    if (activities.length < 2) return 0;
    
    const timestamps = activities.map(a => new Date(a.timestamp).getTime()).sort();
    let inactivePeriods = 0;
    const threshold = 3600000; // 1 hour
    
    for (let i = 1; i < timestamps.length; i++) {
      if (timestamps[i] - timestamps[i - 1] > threshold) {
        inactivePeriods++;
      }
    }
    
    return inactivePeriods;
  }

  private calculateGeographicAnomaly(activities: any[], baseline: any): number {
    const currentRegions = new Set(activities.map(a => a.metadata?.region).filter(Boolean));
    const baselineRegions = new Set(baseline.regions || []);
    
    const newRegions = [...currentRegions].filter(r => !baselineRegions.has(r));
    return newRegions.length > 0 ? 1 : 0;
  }

  /**
   * Store ML prediction in observations table
   */
  private async storePrediction(identityId: string, organizationId: string, prediction: MLPredictionResponse): Promise<void> {
    try {
      await prisma.observation.create({
        data: {
          identityId,
          organizationId,
          observationType: 'anomaly',
          timestamp: new Date(),
          anomalyScore: prediction.anomaly_score,
          data: JSON.stringify({
            is_anomaly: prediction.is_anomaly,
            risk_level: prediction.risk_level,
            confidence: prediction.confidence,
            contributing_factors: prediction.contributing_factors,
            model_version: prediction.model_version,
          }),
        },
      });
    } catch (error) {
      logger.error('Failed to store ML prediction', { identityId, error });
    }
  }

  /**
   * Check if ML service is available
   */
  async healthCheck(): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      const response = await axios.get(`${this.mlServiceUrl}/health`, { timeout: 2000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

export const mlIntegrationService = new MLIntegrationService();
