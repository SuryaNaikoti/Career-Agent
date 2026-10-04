/**
 * Onboarding API Router
 * Module 03 Interactive AI Onboarding
 * 
 * Endpoints:
 * - POST /api/onboarding/start
 * - GET  /api/onboarding/state
 * - POST /api/onboarding/message
 * - POST /api/onboarding/confirm
 * - POST /api/onboarding/correct
 * - POST /api/onboarding/complete
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../core/security/authMiddleware.js';
import { onboardingService } from '../services/onboarding/onboardingService.js';
import { AppError } from '../core/errors/appError.js';
import { logger } from '../core/logging/logger.js';

export function configureOnboardingApi(): Router {
  const router = Router();

  // Enforce authentication on all onboarding endpoints
  router.use(requireAuth);

  const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
    return (req: Request, res: Response, next: NextFunction) => {
      fn(req, res, next).catch((err) => {
        if (err instanceof AppError) {
          res.status(err.statusCode).json({
            error: {
              code: err.name,
              message: err.message,
              ...(err.details ? { details: err.details } : {}),
            },
          });
          return;
        }

        logger.error('Unhandled onboarding route error', { path: req.path, error: String(err) });
        res.status(500).json({
          error: {
            code: 'InternalServerError',
            message: 'An unexpected error occurred during onboarding processing.',
          },
        });
      });
    };
  };

  /**
   * POST /api/onboarding/start
   */
  router.post('/start', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.authUser!.id;
    const displayName = req.authUser?.email ? req.authUser.email.split('@')[0] : 'Candidate';
    const result = await onboardingService.startOnboarding(userId, displayName);
    res.status(200).json(result);
  }));

  /**
   * GET /api/onboarding/state
   */
  router.get('/state', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.authUser!.id;
    const session = await onboardingService.getSessionState(userId);
    res.status(200).json({ session });
  }));

  /**
   * POST /api/onboarding/message
   */
  router.post('/message', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.authUser!.id;
    const { sessionId, message } = req.body || {};

    if (!sessionId || typeof sessionId !== 'string') {
      res.status(400).json({ error: { code: 'ValidationError', message: 'sessionId is required' } });
      return;
    }

    const result = await onboardingService.processMessage(userId, sessionId, message);
    res.status(200).json(result);
  }));

  /**
   * POST /api/onboarding/confirm
   */
  router.post('/confirm', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.authUser!.id;
    const { sessionId, factIds } = req.body || {};

    if (!sessionId || !Array.isArray(factIds)) {
      res.status(400).json({ error: { code: 'ValidationError', message: 'sessionId and factIds array are required' } });
      return;
    }

    const result = await onboardingService.confirmFacts(userId, sessionId, factIds);
    res.status(200).json(result);
  }));

  /**
   * POST /api/onboarding/correct
   */
  router.post('/correct', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.authUser!.id;
    const { sessionId, factId, correctedValue, displayValue } = req.body || {};

    if (!sessionId || !factId) {
      res.status(400).json({ error: { code: 'ValidationError', message: 'sessionId and factId are required' } });
      return;
    }

    const result = await onboardingService.correctFact(userId, sessionId, factId, correctedValue, displayValue);
    res.status(200).json(result);
  }));

  /**
   * POST /api/onboarding/complete
   */
  router.post('/complete', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.authUser!.id;
    const { sessionId } = req.body || {};

    if (!sessionId) {
      res.status(400).json({ error: { code: 'ValidationError', message: 'sessionId is required' } });
      return;
    }

    const result = await onboardingService.completeOnboarding(userId, sessionId);
    res.status(200).json(result);
  }));

  return router;
}
