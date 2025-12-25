/**
 * Unified Compliance Frameworks Controller
 * Handles all compliance framework assessments and reporting
 * 
 * @author Nexora Security Team
 * @version 1.0.0
 */

import { Request, Response } from 'express';
import { logger } from '@/utils/logger';
import { nistControlsService } from '@/services/compliance/nist-controls.service';
import { soc2Type2Service } from '@/services/compliance/soc2-type2.service';
import { pciDSSService } from '@/services/compliance/pci-dss.service';
import { hipaaService } from '@/services/compliance/hipaa.service';
import { iso27001Service } from '@/services/compliance/iso27001.service';
import { soxITGCService } from '@/services/compliance/sox-itgc.service';
import { glbaService } from '@/services/compliance/glba.service';
import { ffiecService } from '@/services/compliance/ffiec.service';
import { ccpaCPRAService } from '@/services/compliance/ccpa-cpra.service';
import { iso27017And27018Service } from '@/services/compliance/iso27017-27018.service';
import { csaSTARService } from '@/services/compliance/csa-star.service';

/**
 * Assess NIST 800-53 compliance
 */
export const assessNIST = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const { baseline = 'moderate' } = req.body;

    const assessment = await nistControlsService.assessCompliance(organizationId, baseline);

    res.json({
      success: true,
      framework: 'NIST 800-53 Rev 5',
      assessment,
    });
  } catch (error) {
    logger.error('NIST assessment failed', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to assess NIST compliance',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Assess SOC 2 Type II audit readiness
 */
export const assessSOC2 = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const { reportingPeriodStart, reportingPeriodEnd } = req.body;

    const periodStart = reportingPeriodStart ? new Date(reportingPeriodStart) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const periodEnd = reportingPeriodEnd ? new Date(reportingPeriodEnd) : new Date();

    const assessment = await soc2Type2Service.assessAuditReadiness(organizationId, periodStart, periodEnd);

    res.json({
      success: true,
      framework: 'SOC 2 Type II',
      assessment,
    });
  } catch (error) {
    logger.error('SOC 2 assessment failed', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to assess SOC 2 compliance',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Assess PCI DSS 4.0 compliance
 */
export const assessPCIDSS = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    const assessment = await pciDSSService.assessCompliance(organizationId);

    res.json({
      success: true,
      framework: 'PCI DSS 4.0',
      assessment,
    });
  } catch (error) {
    logger.error('PCI DSS assessment failed', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to assess PCI DSS compliance',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Assess HIPAA Security Rule compliance
 */
export const assessHIPAA = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    const assessment = await hipaaService.assessCompliance(organizationId);

    res.json({
      success: true,
      framework: 'HIPAA Security Rule',
      assessment,
    });
  } catch (error) {
    logger.error('HIPAA assessment failed', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to assess HIPAA compliance',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Assess ISO 27001:2022 compliance
 */
export const assessISO27001 = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    const assessment = await iso27001Service.assessCompliance(organizationId);

    res.json({
      success: true,
      framework: 'ISO 27001:2022',
      assessment,
    });
  } catch (error) {
    logger.error('ISO 27001 assessment failed', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to assess ISO 27001 compliance',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Assess SOX IT General Controls
 */
export const assessSOX = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const { fiscalYear = new Date().getFullYear() } = req.body;

    const assessment = await soxITGCService.assessCompliance(organizationId, fiscalYear);

    res.json({
      success: true,
      framework: 'SOX ITGC',
      assessment,
    });
  } catch (error) {
    logger.error('SOX assessment failed', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to assess SOX compliance',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Assess GLBA Safeguards Rule compliance
 */
export const assessGLBA = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    const assessment = await glbaService.assessCompliance(organizationId);

    res.json({
      success: true,
      framework: 'GLBA Safeguards Rule',
      assessment,
    });
  } catch (error) {
    logger.error('GLBA assessment failed', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to assess GLBA compliance',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Assess FFIEC CAT compliance
 */
export const assessFFIEC = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    const assessment = await ffiecService.assessCompliance(organizationId);

    res.json({
      success: true,
      framework: 'FFIEC CAT',
      assessment,
    });
  } catch (error) {
    logger.error('FFIEC assessment failed', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to assess FFIEC compliance',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Assess CCPA/CPRA compliance
 */
export const assessCCPA = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    const assessment = await ccpaCPRAService.assessCompliance(organizationId);

    res.json({
      success: true,
      framework: 'CCPA/CPRA',
      assessment,
    });
  } catch (error) {
    logger.error('CCPA assessment failed', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to assess CCPA compliance',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Assess ISO 27017/27018 cloud security and privacy
 */
export const assessCloudSecurity = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    const assessment = await iso27017And27018Service.assessCompliance(organizationId);

    res.json({
      success: true,
      framework: 'ISO 27017 & ISO 27018',
      assessment,
    });
  } catch (error) {
    logger.error('Cloud security assessment failed', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to assess cloud security compliance',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Assess CSA STAR certification readiness
 */
export const assessCSASTAR = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    const assessment = await csaSTARService.assessCompliance(organizationId);

    res.json({
      success: true,
      framework: 'CSA STAR',
      assessment,
    });
  } catch (error) {
    logger.error('CSA STAR assessment failed', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to assess CSA STAR compliance',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get all compliance framework statuses
 */
export const getAllComplianceStatus = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    const [nist, soc2, pciDss, hipaa, iso27001, sox, glba, ffiec, ccpa, cloudSec, csaStar] = await Promise.all([
      nistControlsService.getLatestAssessment(organizationId),
      soc2Type2Service.getLatestAssessment(organizationId),
      pciDSSService.getLatestAssessment(organizationId),
      hipaaService.getLatestAssessment(organizationId),
      iso27001Service.getLatestAssessment(organizationId),
      soxITGCService.getLatestAssessment(organizationId),
      glbaService.getLatestAssessment(organizationId),
      ffiecService.getLatestAssessment(organizationId),
      ccpaCPRAService.getLatestAssessment(organizationId),
      iso27017And27018Service.getLatestAssessment(organizationId),
      csaSTARService.getLatestAssessment(organizationId),
    ]);

    res.json({
      success: true,
      frameworks: {
        nist: nist ? { compliance: nist.overallCompliance, lastAssessed: nist.assessmentDate } : null,
        soc2: soc2 ? { compliance: soc2.overallReadiness, auditReady: soc2.auditReadiness, lastAssessed: soc2.assessmentDate } : null,
        pciDss: pciDss ? { compliance: pciDss.overallCompliance, aoaRequired: pciDss.aoaRequired, lastAssessed: pciDss.assessmentDate } : null,
        hipaa: hipaa ? { compliance: hipaa.overallCompliance, lastAssessed: hipaa.assessmentDate } : null,
        iso27001: iso27001 ? { compliance: iso27001.overallCompliance, certificationReady: iso27001.certificationReady, lastAssessed: iso27001.assessmentDate } : null,
        sox: sox ? { compliance: sox.overallCompliance, ipoReady: sox.ipoReady, lastAssessed: sox.assessmentDate } : null,
        glba: glba ? { compliance: glba.overallCompliance, lastAssessed: glba.assessmentDate } : null,
        ffiec: ffiec ? { maturity: ffiec.cybersecurityMaturity, score: ffiec.overallScore, lastAssessed: ffiec.assessmentDate } : null,
        ccpa: ccpa ? { compliance: ccpa.overallCompliance, lastAssessed: ccpa.assessmentDate } : null,
        cloudSecurity: cloudSec ? { iso27017: cloudSec.iso27017Compliance, iso27018: cloudSec.iso27018Compliance, lastAssessed: cloudSec.assessmentDate } : null,
        csaStar: csaStar ? { compliance: csaStar.overallCompliance, certificationReady: csaStar.certificationReady, lastAssessed: csaStar.assessmentDate } : null,
      },
    });
  } catch (error) {
    logger.error('Failed to get compliance status', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve compliance status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
