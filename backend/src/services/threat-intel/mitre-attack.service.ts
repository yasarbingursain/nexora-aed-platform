/**
 * MITRE ATT&CK Framework Integration Service
 * Standards: MITRE ATT&CK v14.1, STIX 2.1
 * 
 * Real-time adversary tactics and techniques from official MITRE ATT&CK
 * NO FAKE DATA - ALL FROM OFFICIAL MITRE REPOSITORY
 */

import axios, { AxiosInstance } from 'axios';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';
import { z } from 'zod';

const prisma = new PrismaClient();

// MITRE ATT&CK STIX 2.1 Schema
const AttackPatternSchema = z.object({
  type: z.literal('attack-pattern'),
  id: z.string(),
  created: z.string(),
  modified: z.string(),
  name: z.string(),
  description: z.string(),
  kill_chain_phases: z.array(z.object({
    kill_chain_name: z.string(),
    phase_name: z.string(),
  })).optional(),
  external_references: z.array(z.object({
    source_name: z.string(),
    external_id: z.string().optional(),
    url: z.string().optional(),
    description: z.string().optional(),
  })).optional(),
  x_mitre_platforms: z.array(z.string()).optional(),
  x_mitre_data_sources: z.array(z.string()).optional(),
  x_mitre_detection: z.string().optional(),
  x_mitre_version: z.string().optional(),
  x_mitre_deprecated: z.boolean().optional(),
});

interface MITRETechnique {
  id: string;
  mitreId: string;
  name: string;
  description: string;
  tactics: string[];
  platforms: string[];
  dataSources: string[];
  detection: string;
  severity: string;
  references: string[];
}

export class MITREAttackService {
  private client: AxiosInstance;
  private readonly ENTERPRISE_ATTACK_URL = 'https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json';
  private readonly MOBILE_ATTACK_URL = 'https://raw.githubusercontent.com/mitre/cti/master/mobile-attack/mobile-attack.json';
  private readonly ICS_ATTACK_URL = 'https://raw.githubusercontent.com/mitre/cti/master/ics-attack/ics-attack.json';

  constructor() {
    this.client = axios.create({
      timeout: 60000, // MITRE files are large
      headers: {
        'User-Agent': 'Nexora-AED-Platform/1.0',
        'Accept': 'application/json',
      },
    });
  }

  /**
   * Fetch and parse MITRE ATT&CK Enterprise techniques
   */
  async fetchEnterpriseTechniques(): Promise<MITRETechnique[]> {
    try {
      logger.info('Fetching MITRE ATT&CK Enterprise techniques...');

      const response = await this.client.get(this.ENTERPRISE_ATTACK_URL);
      const data = response.data;

      if (!data.objects || !Array.isArray(data.objects)) {
        throw new Error('Invalid MITRE ATT&CK data structure');
      }

      // Filter for attack patterns only
      const attackPatterns = data.objects.filter((obj: any) => obj.type === 'attack-pattern');

      const techniques: MITRETechnique[] = [];

      for (const pattern of attackPatterns) {
        try {
          const validated = AttackPatternSchema.parse(pattern);

          // Skip deprecated techniques
          if (validated.x_mitre_deprecated) {
            continue;
          }

          const mitreId = validated.external_references?.find(
            ref => ref.source_name === 'mitre-attack'
          )?.external_id || validated.id;

          const technique: MITRETechnique = {
            id: validated.id,
            mitreId,
            name: validated.name,
            description: validated.description,
            tactics: validated.kill_chain_phases?.map(phase => phase.phase_name) || [],
            platforms: validated.x_mitre_platforms || [],
            dataSources: validated.x_mitre_data_sources || [],
            detection: validated.x_mitre_detection || '',
            severity: this.assessTechniqueSeverity(validated),
            references: validated.external_references?.map(ref => ref.url || '').filter(Boolean) || [],
          };

          techniques.push(technique);
        } catch (error) {
          logger.warn('Failed to parse MITRE technique', { error });
        }
      }

      logger.info(`Fetched ${techniques.length} MITRE ATT&CK techniques`);
      return techniques;

    } catch (error) {
      logger.error('Failed to fetch MITRE ATT&CK data', { error });
      throw error;
    }
  }

  /**
   * Store MITRE techniques in database
   */
  async storeTechniquesInDatabase(techniques: MITRETechnique[]): Promise<number> {
    let stored = 0;

    for (const technique of techniques) {
      try {
        await prisma.threat.upsert({
          where: {
            externalId: technique.mitreId,
          },
          update: {
            severity: technique.severity,
            description: technique.description,
            lastSeen: new Date(),
            metadata: JSON.stringify({
              tactics: technique.tactics,
              platforms: technique.platforms,
              dataSources: technique.dataSources,
              detection: technique.detection,
              references: technique.references,
            }),
          },
          create: {
            externalId: technique.mitreId,
            source: 'MITRE_ATTCK',
            type: 'technique',
            severity: technique.severity,
            description: technique.description,
            firstSeen: new Date(),
            lastSeen: new Date(),
            organizationId: 'global',
            status: 'active',
            metadata: JSON.stringify({
              name: technique.name,
              tactics: technique.tactics,
              platforms: technique.platforms,
              dataSources: technique.dataSources,
              detection: technique.detection,
              references: technique.references,
            }),
          },
        });

        stored++;
      } catch (error) {
        logger.error(`Failed to store MITRE technique ${technique.mitreId}`, { error });
      }
    }

    logger.info(`Stored ${stored}/${techniques.length} MITRE techniques in database`);
    return stored;
  }

  /**
   * Get techniques by tactic
   */
  async getTechniquesByTactic(tactic: string): Promise<MITRETechnique[]> {
    const threats = await prisma.threat.findMany({
      where: {
        source: 'MITRE_ATTCK',
        type: 'technique',
      },
    });

    return threats
      .map(threat => {
        const metadata = JSON.parse(threat.metadata || '{}');
        return {
          id: threat.externalId,
          mitreId: threat.externalId,
          name: metadata.name || '',
          description: threat.description,
          tactics: metadata.tactics || [],
          platforms: metadata.platforms || [],
          dataSources: metadata.dataSources || [],
          detection: metadata.detection || '',
          severity: threat.severity,
          references: metadata.references || [],
        };
      })
      .filter(tech => tech.tactics.includes(tactic));
  }

  /**
   * Get techniques relevant to specific platforms
   */
  async getTechniquesByPlatform(platform: string): Promise<MITRETechnique[]> {
    const threats = await prisma.threat.findMany({
      where: {
        source: 'MITRE_ATTCK',
        type: 'technique',
      },
    });

    return threats
      .map(threat => {
        const metadata = JSON.parse(threat.metadata || '{}');
        return {
          id: threat.externalId,
          mitreId: threat.externalId,
          name: metadata.name || '',
          description: threat.description,
          tactics: metadata.tactics || [],
          platforms: metadata.platforms || [],
          dataSources: metadata.dataSources || [],
          detection: metadata.detection || '',
          severity: threat.severity,
          references: metadata.references || [],
        };
      })
      .filter(tech => tech.platforms.some(p => 
        p.toLowerCase().includes(platform.toLowerCase())
      ));
  }

  /**
   * Get MITRE ATT&CK statistics
   */
  async getStatistics(): Promise<any> {
    const [total, byTactic, bySeverity] = await Promise.all([
      prisma.threat.count({
        where: {
          source: 'MITRE_ATTCK',
          type: 'technique',
        },
      }),
      prisma.threat.findMany({
        where: {
          source: 'MITRE_ATTCK',
          type: 'technique',
        },
        select: {
          metadata: true,
        },
      }),
      prisma.threat.groupBy({
        by: ['severity'],
        where: {
          source: 'MITRE_ATTCK',
          type: 'technique',
        },
        _count: true,
      }),
    ]);

    // Count techniques by tactic
    const tacticCounts: Record<string, number> = {};
    byTactic.forEach(threat => {
      const metadata = JSON.parse(threat.metadata || '{}');
      const tactics = metadata.tactics || [];
      tactics.forEach((tactic: string) => {
        tacticCounts[tactic] = (tacticCounts[tactic] || 0) + 1;
      });
    });

    return {
      total,
      byTactic: tacticCounts,
      bySeverity: bySeverity.reduce((acc, item) => {
        acc[item.severity] = item._count;
        return acc;
      }, {} as Record<string, number>),
      source: 'MITRE ATT&CK Framework',
      lastUpdated: new Date(),
    };
  }

  /**
   * Assess technique severity based on characteristics
   */
  private assessTechniqueSeverity(technique: any): string {
    const tactics = technique.kill_chain_phases?.map((p: any) => p.phase_name) || [];
    const platforms = technique.x_mitre_platforms || [];

    // Impact and Exfiltration tactics are critical
    if (tactics.includes('impact') || tactics.includes('exfiltration')) {
      return 'critical';
    }

    // Privilege escalation, credential access, lateral movement are high
    if (tactics.includes('privilege-escalation') || 
        tactics.includes('credential-access') || 
        tactics.includes('lateral-movement')) {
      return 'high';
    }

    // Multi-platform techniques are higher risk
    if (platforms.length >= 3) {
      return 'high';
    }

    // Defense evasion and persistence are medium
    if (tactics.includes('defense-evasion') || tactics.includes('persistence')) {
      return 'medium';
    }

    // Default to medium
    return 'medium';
  }
}
