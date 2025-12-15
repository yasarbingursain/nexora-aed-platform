/**
 * Kubernetes Pod Isolation Service
 * Enterprise-grade workload isolation using Network Policies and Pod Security
 * 
 * Standards Compliance:
 * - NIST SP 800-190 (Application Container Security Guide)
 * - CIS Kubernetes Benchmark v1.8
 * - NSA/CISA Kubernetes Hardening Guide
 * - ISO/IEC 27001:2013 - A.13.1.1 Network controls
 * 
 * @author Nexora Security Team
 * @version 1.0.0
 */

import { logger } from '@/utils/logger';

interface K8sConfig {
  apiServer: string;
  token: string;
  namespace: string;
  caCert?: string;
}

interface IsolationResult {
  success: boolean;
  policyName?: string;
  podName?: string;
  error?: string;
  timestamp: Date;
  rollbackData?: RollbackData;
}

interface RollbackData {
  originalLabels?: Record<string, string>;
  policyName?: string;
  namespace: string;
  podName?: string;
}

interface NetworkPolicy {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace: string;
    labels: Record<string, string>;
  };
  spec: {
    podSelector: {
      matchLabels: Record<string, string>;
    };
    policyTypes: string[];
    ingress?: unknown[];
    egress?: unknown[];
  };
}

interface K8sPod {
  metadata?: {
    labels?: Record<string, string>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export class KubernetesIsolationService {
  private config: K8sConfig;

  constructor() {
    this.config = {
      apiServer: process.env.K8S_API_SERVER || 'https://kubernetes.default.svc',
      token: process.env.K8S_SERVICE_TOKEN || '',
      namespace: process.env.K8S_NAMESPACE || 'default',
      caCert: process.env.K8S_CA_CERT,
    };
  }

  isConfigured(): boolean {
    return !!(this.config.apiServer && this.config.token);
  }

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.config.token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private getFetchOptions(): RequestInit {
    return { headers: this.getHeaders() };
  }

  async isolatePod(
    podName: string,
    namespace: string = this.config.namespace,
    reason: string
  ): Promise<IsolationResult> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Kubernetes isolation service not configured', timestamp: new Date() };
    }

    try {
      const pod = await this.getPod(podName, namespace);
      if (!pod) {
        throw new Error(`Pod ${podName} not found in namespace ${namespace}`);
      }

      const originalLabels = pod.metadata?.labels || {};
      const isolationLabel = `nexora-isolated-${Date.now()}`;

      await this.labelPod(podName, namespace, {
        'nexora.io/isolated': 'true',
        'nexora.io/isolation-id': isolationLabel,
        'nexora.io/isolation-reason': reason.substring(0, 63).replace(/[^a-zA-Z0-9-_.]/g, '-'),
      });

      const policyName = `nexora-isolate-${podName}-${Date.now()}`;
      const policy = this.createDenyAllPolicy(policyName, namespace, isolationLabel);
      await this.applyNetworkPolicy(policy);

      logger.info('Kubernetes pod isolated', { podName, namespace, policyName, reason });

      return {
        success: true,
        policyName,
        podName,
        timestamp: new Date(),
        rollbackData: { originalLabels, policyName, namespace, podName },
      };
    } catch (error) {
      logger.error('Kubernetes pod isolation failed', { podName, namespace, error: error instanceof Error ? error.message : error });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date() };
    }
  }

  async removeIsolation(podName: string, policyName: string, namespace: string = this.config.namespace): Promise<IsolationResult> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Kubernetes isolation service not configured', timestamp: new Date() };
    }

    try {
      await this.deleteNetworkPolicy(policyName, namespace);
      await this.removePodLabels(podName, namespace, ['nexora.io/isolated', 'nexora.io/isolation-id', 'nexora.io/isolation-reason']);

      logger.info('Kubernetes pod isolation removed', { podName, namespace, policyName });
      return { success: true, policyName, podName, timestamp: new Date() };
    } catch (error) {
      logger.error('Kubernetes isolation removal failed', { podName, policyName, error: error instanceof Error ? error.message : error });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date() };
    }
  }

  private async getPod(podName: string, namespace: string): Promise<K8sPod | null> {
    const url = `${this.config.apiServer}/api/v1/namespaces/${namespace}/pods/${podName}`;
    const response = await fetch(url, { method: 'GET', ...this.getFetchOptions() });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to get pod: ${response.status}`);
    }
    return response.json() as Promise<K8sPod>;
  }

  private async labelPod(podName: string, namespace: string, labels: Record<string, string>): Promise<void> {
    const url = `${this.config.apiServer}/api/v1/namespaces/${namespace}/pods/${podName}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { ...this.getHeaders(), 'Content-Type': 'application/strategic-merge-patch+json' },
      body: JSON.stringify({ metadata: { labels } }),
    });

    if (!response.ok) {
      const errorData = await response.json() as { message?: string };
      throw new Error(errorData.message || `Failed to label pod: ${response.status}`);
    }
  }

  private async removePodLabels(podName: string, namespace: string, labelKeys: string[]): Promise<void> {
    const url = `${this.config.apiServer}/api/v1/namespaces/${namespace}/pods/${podName}`;
    const patch = labelKeys.map(key => ({ op: 'remove', path: `/metadata/labels/${key.replace(/\//g, '~1')}` }));

    const response = await fetch(url, {
      method: 'PATCH',
      headers: { ...this.getHeaders(), 'Content-Type': 'application/json-patch+json' },
      body: JSON.stringify(patch),
    });

    if (!response.ok && response.status !== 422) {
      const errorData = await response.json() as { message?: string };
      throw new Error(errorData.message || `Failed to remove pod labels: ${response.status}`);
    }
  }

  private createDenyAllPolicy(name: string, namespace: string, isolationLabel: string): NetworkPolicy {
    return {
      apiVersion: 'networking.k8s.io/v1',
      kind: 'NetworkPolicy',
      metadata: {
        name,
        namespace,
        labels: { 'app.kubernetes.io/managed-by': 'nexora', 'nexora.io/policy-type': 'isolation' },
      },
      spec: {
        podSelector: { matchLabels: { 'nexora.io/isolation-id': isolationLabel } },
        policyTypes: ['Ingress', 'Egress'],
        ingress: [],
        egress: [{
          to: [{ namespaceSelector: {}, podSelector: { matchLabels: { 'k8s-app': 'kube-dns' } } }],
          ports: [{ protocol: 'UDP', port: 53 }, { protocol: 'TCP', port: 53 }],
        }],
      },
    };
  }

  private async applyNetworkPolicy(policy: NetworkPolicy): Promise<void> {
    const url = `${this.config.apiServer}/apis/networking.k8s.io/v1/namespaces/${policy.metadata.namespace}/networkpolicies`;
    const response = await fetch(url, { method: 'POST', ...this.getFetchOptions(), body: JSON.stringify(policy) });

    if (!response.ok) {
      const errorData = await response.json() as { message?: string };
      throw new Error(errorData.message || `Failed to create network policy: ${response.status}`);
    }
  }

  private async deleteNetworkPolicy(name: string, namespace: string): Promise<void> {
    const url = `${this.config.apiServer}/apis/networking.k8s.io/v1/namespaces/${namespace}/networkpolicies/${name}`;
    const response = await fetch(url, { method: 'DELETE', ...this.getFetchOptions() });

    if (!response.ok && response.status !== 404) {
      const errorData = await response.json() as { message?: string };
      throw new Error(errorData.message || `Failed to delete network policy: ${response.status}`);
    }
  }

  async listIsolationPolicies(namespace?: string): Promise<NetworkPolicy[]> {
    if (!this.isConfigured()) return [];

    try {
      const ns = namespace || this.config.namespace;
      const url = `${this.config.apiServer}/apis/networking.k8s.io/v1/namespaces/${ns}/networkpolicies?labelSelector=nexora.io/policy-type=isolation`;
      const response = await fetch(url, { method: 'GET', ...this.getFetchOptions() });

      if (!response.ok) return [];
      const data = await response.json() as { items?: NetworkPolicy[] };
      return data.items || [];
    } catch (error) {
      logger.error('Failed to list isolation policies', { error: error instanceof Error ? error.message : error });
      return [];
    }
  }

  async listIsolatedPods(namespace?: string): Promise<K8sPod[]> {
    if (!this.isConfigured()) return [];

    try {
      const ns = namespace || this.config.namespace;
      const url = `${this.config.apiServer}/api/v1/namespaces/${ns}/pods?labelSelector=nexora.io/isolated=true`;
      const response = await fetch(url, { method: 'GET', ...this.getFetchOptions() });

      if (!response.ok) return [];
      const data = await response.json() as { items?: K8sPod[] };
      return data.items || [];
    } catch (error) {
      logger.error('Failed to list isolated pods', { error: error instanceof Error ? error.message : error });
      return [];
    }
  }
}

export const kubernetesIsolationService = new KubernetesIsolationService();
