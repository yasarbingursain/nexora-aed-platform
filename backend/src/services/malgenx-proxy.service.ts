/**
 * MalGenX Proxy Service
 * Secure proxy to MalGenX FastAPI microservice with authentication and validation
 * Nexora AED Platform - Enterprise Grade
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

class MalGenXProxyService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: env.MALGENX_SERVICE_URL,
      timeout: env.MALGENX_SERVICE_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Auth': env.MALGENX_API_KEY || '',
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('MalGenX proxy request', {
          method: config.method,
          url: config.url,
          organizationId: config.headers['X-Organization-Id'],
        });
        return config;
      },
      (error) => {
        logger.error('MalGenX proxy request error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('MalGenX proxy response', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error) => {
        logger.error('MalGenX proxy response error', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Submit a malware sample for analysis
   */
  async submitSample(data: {
    type: 'file' | 'url';
    url?: string;
    fileId?: string;
    source?: string;
    tags?: string[];
    priority?: 'low' | 'normal' | 'high' | 'critical';
    organizationId: string;
    userId: string;
  }) {
    try {
      const response = await this.client.post('/api/v1/samples/submit', {
        type: data.type,
        url: data.url,
        fileId: data.fileId,
        source: data.source,
        tags: data.tags,
        priority: data.priority || 'normal',
      }, {
        headers: {
          'X-Organization-Id': data.organizationId,
          'X-User-Id': data.userId,
        },
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to submit sample to MalGenX', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: data.organizationId,
      });
      throw error;
    }
  }

  /**
   * Get sample analysis status
   */
  async getSampleStatus(sampleId: string, organizationId: string) {
    try {
      const response = await this.client.get(`/api/v1/samples/${sampleId}/status`, {
        headers: {
          'X-Organization-Id': organizationId,
        },
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to get sample status from MalGenX', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sampleId,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Get detailed analysis report
   */
  async getSampleReport(sampleId: string, organizationId: string) {
    try {
      const response = await this.client.get(`/api/v1/samples/${sampleId}/report`, {
        headers: {
          'X-Organization-Id': organizationId,
        },
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to get sample report from MalGenX', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sampleId,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Search IOCs
   */
  async searchIOCs(data: {
    query: string;
    type?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    limit?: number;
    offset?: number;
    organizationId: string;
  }) {
    try {
      const response = await this.client.post('/api/v1/iocs/search', {
        query: data.query,
        type: data.type,
        severity: data.severity,
        limit: data.limit || 100,
        offset: data.offset || 0,
      }, {
        headers: {
          'X-Organization-Id': data.organizationId,
        },
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to search IOCs in MalGenX', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: data.organizationId,
      });
      throw error;
    }
  }

  /**
   * Get real-time threats feed
   */
  async getThreatsFeed(data: {
    sinceMinutes?: number;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    limit?: number;
    organizationId: string;
  }) {
    try {
      const response = await this.client.get('/api/v1/threats/feed', {
        params: {
          sinceMinutes: data.sinceMinutes,
          severity: data.severity,
          limit: data.limit || 100,
        },
        headers: {
          'X-Organization-Id': data.organizationId,
        },
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to get threats feed from MalGenX', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: data.organizationId,
      });
      throw error;
    }
  }

  /**
   * Health check for MalGenX service
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      logger.error('MalGenX service health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

export const malgenxProxyService = new MalGenXProxyService();
