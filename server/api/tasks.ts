/**
 * Human Task API Controller Routes
 * Module 10: Human Task Engine
 * 
 * Authenticated endpoints for:
 * GET    /api/tasks          - List tasks with status/priority filtering & pagination
 * GET    /api/tasks/:id      - Get single task ensuring IDOR protection
 * POST   /api/tasks/:id/start - Move task to IN_PROGRESS
 * POST   /api/tasks/:id/complete - Validate & complete task, trigger downstream updates
 * POST   /api/tasks/:id/cancel - Cancel task
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../core/security/authMiddleware.js';
import { humanTaskService } from '../services/humanTask/humanTaskService.js';
import {
  HumanTaskLifecycleStatus,
  HumanTaskPriority,
  HumanTaskType,
} from '../services/humanTask/humanTaskTypes.js';
import { ValidationError } from '../core/errors/appError.js';

export function configureHumanTaskApi(): Router {
  const router = Router();
  router.use(requireAuth);

  /**
   * GET /api/tasks
   * List tasks for authenticated user
   */
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const { status, priority, taskType, applicationId, limit, offset } = req.query;

      const parsedLimit = limit ? parseInt(String(limit), 10) : 20;
      const parsedOffset = offset ? parseInt(String(offset), 10) : 0;

      if (isNaN(parsedLimit) || parsedLimit <= 0) {
        throw new ValidationError('Query param limit must be a positive integer.');
      }
      if (isNaN(parsedOffset) || parsedOffset < 0) {
        throw new ValidationError('Query param offset must be a non-negative integer.');
      }

      const tasks = await humanTaskService.listTasks(userId, {
        status: status as HumanTaskLifecycleStatus,
        priority: priority as HumanTaskPriority,
        taskType: taskType as HumanTaskType,
        applicationId: applicationId ? String(applicationId) : undefined,
        limit: parsedLimit,
        offset: parsedOffset,
      });

      res.json({ data: tasks });
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/tasks/:id
   * Get single task by ID
   */
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const { id } = req.params;

      const task = await humanTaskService.getTaskById(userId, id);
      res.json({ data: task });
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /api/tasks/:id/start
   * Start a task
   */
  router.post('/:id/start', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const { id } = req.params;

      const task = await humanTaskService.startTask(userId, id);
      res.json({ data: task });
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /api/tasks/:id/complete
   * Complete task with response
   */
  router.post('/:id/complete', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const { id } = req.params;
      const { responseValue, candidateNotes, candidateConfirmed, externalReferenceId } = req.body;

      const completed = await humanTaskService.completeTask(userId, id, {
        responseValue,
        candidateNotes: candidateNotes ? String(candidateNotes) : undefined,
        candidateConfirmed: !!candidateConfirmed,
        externalReferenceId: externalReferenceId ? String(externalReferenceId) : undefined,
      });

      res.json({ data: completed });
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /api/tasks/:id/cancel
   * Cancel task
   */
  router.post('/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const { id } = req.params;
      const { reason } = req.body;

      const cancelled = await humanTaskService.cancelTask(userId, id, reason ? String(reason) : undefined);
      res.json({ data: cancelled });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
