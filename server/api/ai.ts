/**
 * AI Endpoint Router
 * Module 02 AI Service Foundation
 * 
 * Exposes controlled POST /api/ai/respond endpoint.
 * Protected by authentication middleware. Derives identity strictly from req.authUser.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../core/security/authMiddleware.js';
import { aiOrchestrator } from '../services/ai/aiOrchestrator.js';
import { AppError } from '../core/errors/appError.js';
import { logger } from '../core/logging/logger.js';

export function configureAiApi(): Router {
  const router = Router();

  // Enforce authentication on all AI endpoints
  router.use(requireAuth);

  /**
   * POST /api/ai/respond
   * Authenticated, controlled AI query execution.
   */
  router.post('/respond', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.authUser!.id;

    // Reject any client-supplied userId to prevent identity spoofing
    if (req.body?.userId && req.body.userId !== userId) {
      res.status(403).json({
        error: {
          code: 'ForbiddenError',
          message: 'Client-supplied userId is not permitted. Identity is strictly derived from session.',
        },
      });
      return;
    }

    try {
      const response = await aiOrchestrator.processRequest({
        userId,
        request: {
          taskType: req.body?.taskType,
          message: req.body?.message,
          untrustedExternalContent: req.body?.untrustedExternalContent,
        },
      });

      res.status(200).json(response);
    } catch (err: any) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({
          error: {
            code: err.name,
            message: err.message,
            requestId: (err as any).requestId,
            ...(err.details ? { details: err.details } : {}),
          },
        });
        return;
      }

      logger.error('Unexpected AI endpoint error', { userId, error: String(err) });
      res.status(500).json({
        error: {
          code: 'InternalServerError',
          message: 'An unexpected error occurred during AI processing.',
        },
      });
    }
  });

  return router;
}
