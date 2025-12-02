import { Router } from 'express';
import { remediationController } from '@/controllers/remediation.controller';
import { requireAuth } from '@/middleware/auth.middleware';
import { tenantMiddleware } from '@/middleware/tenant.middleware';
import { validate, validateQuery } from '@/middleware/validation.middleware';
import {
  createPlaybookSchema,
  updatePlaybookSchema,
  executePlaybookSchema,
  listPlaybooksQuerySchema,
  listActionsQuerySchema,
} from '@/validators/remediation.validator';

const router = Router();

router.use(requireAuth);
router.use(tenantMiddleware);

// Playbooks
router.get('/playbooks', validateQuery(listPlaybooksQuerySchema), remediationController.listPlaybooks.bind(remediationController));
router.post('/playbooks', validate(createPlaybookSchema), remediationController.createPlaybook.bind(remediationController));
router.get('/playbooks/:id', remediationController.getPlaybookById.bind(remediationController));
router.put('/playbooks/:id', validate(updatePlaybookSchema), remediationController.updatePlaybook.bind(remediationController));
router.delete('/playbooks/:id', remediationController.deletePlaybook.bind(remediationController));

// Execute
router.post('/execute', validate(executePlaybookSchema), remediationController.executePlaybook.bind(remediationController));

// Actions
router.get('/actions', validateQuery(listActionsQuerySchema), remediationController.listActions.bind(remediationController));
router.get('/actions/:id', remediationController.getActionById.bind(remediationController));

export default router;
