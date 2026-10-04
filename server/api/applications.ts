/**
 * Application Preparation Express API Router
 * Module 08: Application Preparation
 * 
 * Routes:
 * - POST  /api/applications/prepare                Prepare application materials for target job
 * - GET   /api/applications/:id/preparation        Get preparation package by preparation ID or job ID
 * - POST  /api/applications/:id/review             Resolve human review item with candidate response
 * - GET   /api/applications/:id/evidence           Get claim-to-source evidence provenance map
 * 
 * Rules:
 * - Enforces authenticated candidate identity strictly from Bearer token
 * - Never trusts client-supplied user_id or match scores
 * - Strictly does NOT submit the application (hands off to Module 09)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../core/security/authMiddleware.js';
import { applicationPreparationService } from '../services/applicationPreparation/applicationPreparationService.js';
import { applicationLifecycleService } from '../services/applicationLifecycle/index.js';
import { ValidationError } from '../core/errors/appError.js';

export function configureApplicationPreparationApi(): Router {
  const router = Router();

  // All application preparation routes require authenticated candidate identity
  router.use(requireAuth);

  /**
   * POST /api/applications/prepare
   * Prepare tailored materials, question answers, and evidence map
   */
  router.post('/prepare', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const { jobId } = req.body;

      if (!jobId || typeof jobId !== 'string') {
        throw new ValidationError('Job ID is required in request body.');
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(jobId)) {
        return res.status(400).json({ error: 'Malformed job ID: Must be a valid UUID' });
      }

      const prepPackage = await applicationPreparationService.prepareApplication(userId, jobId);
      res.json({ data: prepPackage });
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/applications/:id/preparation
   * Get application preparation details by ID or Job ID
   */
  router.get('/:id/preparation', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const { id } = req.params;

      const prepPackage = await applicationPreparationService.getPreparation(userId, id);
      res.json({ data: prepPackage });
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /api/applications/:id/review
   * Resolve an unresolved review item
   */
  router.post('/:id/review', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const preparationId = req.params.id;
      const { reviewItemId, candidateResponse } = req.body;

      if (!reviewItemId || !candidateResponse) {
        throw new ValidationError('Both reviewItemId and candidateResponse are required.');
      }

      const updated = await applicationPreparationService.resolveReviewItem(
        userId,
        preparationId,
        reviewItemId,
        candidateResponse
      );

      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/applications/:id/evidence
   * Get evidence list
   */
  router.get('/:id/evidence', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const preparationId = req.params.id;

      const prep = await applicationPreparationService.getPreparation(userId, preparationId);
      res.json({ data: prep.evidence });
    } catch (err) {
      next(err);
    }
  });

  // ==========================================================================
  // MODULE 09: APPLICATION LIFECYCLE & SUBMISSION ENDPOINTS
  // ==========================================================================

  /**
   * POST /api/applications/lifecycle
   * Initialize or retrieve application lifecycle record from an approved preparation package
   */
  router.post('/lifecycle', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const { preparationId, idempotencyKey } = req.body;

      if (!preparationId || typeof preparationId !== 'string') {
        throw new ValidationError('preparationId is required in request body.');
      }

      const app = await applicationLifecycleService.createOrGetApplication(
        userId,
        preparationId,
        idempotencyKey
      );
      res.json({ data: app });
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/applications/lifecycle
   * List all application lifecycle records for authenticated candidate
   */
  router.get('/lifecycle', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const apps = await applicationLifecycleService.listApplications(userId);
      res.json({ data: apps });
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/applications/lifecycle/:id
   * Get full application details, job, preparation, attempts, and status history
   */
  router.get('/lifecycle/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const { id } = req.params;
      const details = await applicationLifecycleService.getApplicationDetail(userId, id);
      res.json({ data: details });
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /api/applications/:id/submit
   * Dispatch submission via authorized adapter or enforce human action
   */
  router.post('/:id/submit', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const { id } = req.params;
      const { candidateConfirmed, candidateNotes } = req.body;

      const submission = await applicationLifecycleService.submitApplication(
        userId,
        id,
        { candidateConfirmed: !!candidateConfirmed, candidateNotes }
      );
      res.json({ data: submission });
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /api/applications/:id/confirm-human
   * Candidate explicitly confirms human completion of external submission
   */
  router.post('/:id/confirm-human', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const { id } = req.params;
      const { externalApplicationId, candidateNotes } = req.body;

      const confirmedApp = await applicationLifecycleService.confirmHumanSubmission(
        userId,
        id,
        { externalApplicationId, candidateNotes }
      );
      res.json({ data: confirmedApp });
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /api/applications/:id/cancel
   * Cancel an active application workflow
   */
  router.post('/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const { id } = req.params;
      const { reason } = req.body;

      const cancelledApp = await applicationLifecycleService.cancelApplication(
        userId,
        id,
        reason
      );
      res.json({ data: cancelledApp });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
