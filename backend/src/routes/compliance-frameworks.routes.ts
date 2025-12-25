/**
 * Unified Compliance Frameworks Routes
 * API endpoints for all compliance framework assessments
 * 
 * @author Nexora Security Team
 * @version 1.0.0
 */

import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import * as complianceController from '@/controllers/compliance-frameworks.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * Get all compliance framework statuses
 * GET /api/v1/compliance-frameworks/status
 */
router.get('/status', complianceController.getAllComplianceStatus);

/**
 * Assess NIST 800-53 compliance
 * POST /api/v1/compliance-frameworks/nist/assess
 */
router.post('/nist/assess', complianceController.assessNIST);

/**
 * Assess SOC 2 Type II audit readiness
 * POST /api/v1/compliance-frameworks/soc2/assess
 */
router.post('/soc2/assess', complianceController.assessSOC2);

/**
 * Assess PCI DSS 4.0 compliance
 * POST /api/v1/compliance-frameworks/pci-dss/assess
 */
router.post('/pci-dss/assess', complianceController.assessPCIDSS);

/**
 * Assess HIPAA Security Rule compliance
 * POST /api/v1/compliance-frameworks/hipaa/assess
 */
router.post('/hipaa/assess', complianceController.assessHIPAA);

/**
 * Assess ISO 27001:2022 compliance
 * POST /api/v1/compliance-frameworks/iso27001/assess
 */
router.post('/iso27001/assess', complianceController.assessISO27001);

/**
 * Assess SOX IT General Controls
 * POST /api/v1/compliance-frameworks/sox/assess
 */
router.post('/sox/assess', complianceController.assessSOX);

/**
 * Assess GLBA Safeguards Rule compliance
 * POST /api/v1/compliance-frameworks/glba/assess
 */
router.post('/glba/assess', complianceController.assessGLBA);

/**
 * Assess FFIEC CAT compliance
 * POST /api/v1/compliance-frameworks/ffiec/assess
 */
router.post('/ffiec/assess', complianceController.assessFFIEC);

/**
 * Assess CCPA/CPRA compliance
 * POST /api/v1/compliance-frameworks/ccpa/assess
 */
router.post('/ccpa/assess', complianceController.assessCCPA);

/**
 * Assess ISO 27017/27018 cloud security and privacy
 * POST /api/v1/compliance-frameworks/cloud-security/assess
 */
router.post('/cloud-security/assess', complianceController.assessCloudSecurity);

/**
 * Assess CSA STAR certification readiness
 * POST /api/v1/compliance-frameworks/csa-star/assess
 */
router.post('/csa-star/assess', complianceController.assessCSASTAR);

export default router;
