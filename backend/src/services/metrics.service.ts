import { prisma } from '@/config/database';
import { redis } from '@/config/redis';

export class MetricsService {
  
  async getSystemMetrics() {
    const [
      totalOrganizations,
      activeOrganizations,
      totalUsers,
      activeUsers,
      totalIdentities,
      activeIdentities,
      threatsDetected,
      threatsBlocked
    ] = await Promise.all([
      prisma.organization.count(),
      prisma.organization.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.identity.count(),
      prisma.identity.count({ where: { status: 'active' } }),
      prisma.threat.count({ 
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } 
      }),
      prisma.threat.count({ 
        where: { 
          status: 'resolved',
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      })
    ]);

    // Get system performance metrics from Redis
    const [cpuUsage, memoryUsage, diskUsage] = await Promise.all([
      redis.get('metrics:cpu_usage').catch(() => '0'),
      redis.get('metrics:memory_usage').catch(() => '0'),
      redis.get('metrics:disk_usage').catch(() => '0')
    ]);

    return {
      organizations: {
        total: totalOrganizations,
        active: activeOrganizations,
        suspended: totalOrganizations - activeOrganizations
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers
      },
      identities: {
        total: totalIdentities,
        active: activeIdentities,
        monitored: activeIdentities
      },
      threats: {
        detected_24h: threatsDetected,
        blocked_24h: threatsBlocked,
        detection_rate: threatsDetected > 0 ? (threatsBlocked / threatsDetected) * 100 : 0
      },
      system: {
        cpu_usage: parseFloat(cpuUsage || '0'),
        memory_usage: parseFloat(memoryUsage || '0'),
        disk_usage: parseFloat(diskUsage || '0'),
        uptime: process.uptime()
      }
    };
  }

  async getSystemHealth() {
    const checks = await Promise.allSettled([
      this.checkDatabaseHealth(),
      this.checkRedisHealth(),
      this.checkExternalAPIHealth()
    ]);

    const results = checks.map((check, index) => ({
      service: ['database', 'redis', 'external_apis'][index],
      status: check.status === 'fulfilled' ? 'healthy' : 'unhealthy',
      details: check.status === 'fulfilled' ? check.value : { error: 'failed' }
    }));

    const overall = results.every(r => r.status === 'healthy') ? 'healthy' : 'degraded';

    return {
      overall_status: overall,
      checks: results,
      timestamp: new Date().toISOString()
    };
  }

  async getOrganizationMetrics(organizationId: string) {
    const [
      userCount,
      identityCount,
      threatCount,
      blockedThreats
    ] = await Promise.all([
      prisma.user.count({ where: { organizationId } }),
      prisma.identity.count({ where: { organizationId } }),
      prisma.threat.count({ 
        where: { 
          organizationId,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      }),
      prisma.threat.count({ 
        where: { 
          organizationId,
          status: 'resolved',
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      })
    ]);

    return {
      users: userCount,
      identities: identityCount,
      threats_30d: threatCount,
      threats_blocked_30d: blockedThreats,
      threat_detection_rate: threatCount > 0 ? (blockedThreats / threatCount) * 100 : 0
    };
  }

  private async checkDatabaseHealth() {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'connected', response_time: Date.now() - start };
  }

  private async checkRedisHealth() {
    const start = Date.now();
    await redis.ping();
    return { status: 'connected', response_time: Date.now() - start };
  }

  private async checkExternalAPIHealth() {
    return { status: 'connected', apis_checked: 0 };
  }

  async updateSystemMetrics() {
    const cpuUsage = process.cpuUsage();
    const memoryUsage = process.memoryUsage();
    
    const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000;
    const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    await Promise.all([
      redis.set('metrics:cpu_usage', cpuPercent.toFixed(2), 'EX', 300),
      redis.set('metrics:memory_usage', memoryPercent.toFixed(2), 'EX', 300)
    ]);
  }
}

export const metricsService = new MetricsService();
