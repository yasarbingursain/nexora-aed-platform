/**
 * Explainable AI Routes
 * GDPR Article 22 & EU AI Act Compliant Endpoints
 */

import { Router } from 'express';
import { explainableAIController } from '@/controllers/explainable-ai.controller';
import { requireAuth } from '@/middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Generate explanation for a prediction
router.post('/', explainableAIController.explainPrediction.bind(explainableAIController));

// Get explanation history for an identity
router.get('/history/:identityId', explainableAIController.getExplanationHistory.bind(explainableAIController));

// Request human review (GDPR Article 22)
router.post('/review', explainableAIController.requestHumanReview.bind(explainableAIController));

// Health check
router.get('/health', explainableAIController.healthCheck.bind(explainableAIController));

export default router;
