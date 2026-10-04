/**
 * Matching Express API Router
 * Module 06: Matching Engine
 * 
 * Routes:
 * - GET  /api/jobs/:jobId/match             Get or compute match for a specific job
 * - POST /api/jobs/:jobId/match/recalculate Force recalculate match for a specific job
 * - GET  /api/matches                       List all evaluated candidate matches
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../core/security/authMiddleware.js';
import { matchingService } from '../services/matching/matchingService.js';
import { ValidationError } from '../core/errors/appError.js';

export function configureMatchingApi(): Router {
  const router = Router();

  // All matching routes strictly require authenticated candidate identity
  router.use(requireAuth);

  /**
   * GET /api/matches
   * Lists match summaries for candidate
   */
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const matches = await matchingService.listCandidateMatches(userId);
      res.json({ data: matches });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function configureJobMatchNestedApi(): Router {
  const router = Router({ mergeParams: true });

  router.use(requireAuth);

  /**
   * GET /api/jobs/:jobId/match
   * Get cached or freshly calculated match result
   */
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const { jobId } = req.params;
      if (!jobId) {
        throw new ValidationError('Job ID is required');
      }

      const match = await matchingService.getOrCalculateJobMatch(userId, jobId, false);
      res.json({ data: match });
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /api/jobs/:jobId/match/recalculate
   * Force recalculate match (invalidating cached snapshot)
   */
  router.post('/recalculate', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const { jobId } = req.params;
      if (!jobId) {
        throw new ValidationError('Job ID is required');
      }

      const match = await matchingService.getOrCalculateJobMatch(userId, jobId, true);
      res.json({ data: match });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
