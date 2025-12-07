/**
 * Post-Quantum Cryptography Routes
 * MVP API endpoints for NIST-approved PQC algorithms
 */

import { Router } from 'express';
import { pqcController } from '@/controllers/pqc.controller';
import { requireAuth } from '@/middleware/auth.middleware';

const router = Router();

// Public endpoints (for capability discovery and testing)
router.get('/capabilities', pqcController.getCapabilities.bind(pqcController));
router.post('/self-test', pqcController.runSelfTest.bind(pqcController));

// Protected endpoints (require authentication)
router.use(requireAuth);

// Key generation
router.post('/keys/kem', pqcController.generateKEMKey.bind(pqcController));
router.post('/keys/dsa', pqcController.generateDSAKey.bind(pqcController));
router.post('/keys/slh-dsa', pqcController.generateSLHDSAKey.bind(pqcController));

// Cryptographic operations
router.post('/encapsulate', pqcController.encapsulate.bind(pqcController));
router.post('/sign', pqcController.sign.bind(pqcController));
router.post('/verify', pqcController.verify.bind(pqcController));

export default router;
