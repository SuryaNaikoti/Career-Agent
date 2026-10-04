import { Router, Request, Response } from 'express';
import { requireAuth } from '../core/security/authMiddleware.js';
import {
  backgroundSchedulingService,
  backgroundRunnerService,
  BackgroundScheduleType,
  UpdateBackgroundScheduleInput,
} from '../services/scheduler/index.js';
import { AppError } from '../core/errors/appError.js';
import { logger } from '../core/logging/logger.js';

export const schedulerRouter = Router();

// All scheduler routes require candidate authentication
schedulerRouter.use(requireAuth);

const handleRouteError = (res: Response, error: any, contextMsg: string) => {
  if (error?.name === 'DATABASE_NOT_CONFIGURED' || error?.statusCode === 503) {
    return res.status(503).json({
      error: {
        code: 'DATABASE_NOT_CONFIGURED',
        message: 'Candidate data service is not configured.',
      },
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: {
        code: error.name,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    });
  }

  logger.error(contextMsg, { error: error?.message || String(error) });
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: error?.message || 'Internal server error processing scheduler request.',
    },
  });
};

/**
 * GET /api/scheduler/preferences
 * Returns the candidate's persistent background schedules (JOB_SEARCH & DAILY_REPORT).
 */
schedulerRouter.get('/preferences', async (req: Request, res: Response) => {
  try {
    const userId = req.authUser?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: missing candidate identity' });
    }

    const schedules = await backgroundSchedulingService.getSchedulesForUser(userId);
    return res.status(200).json({ schedules });
  } catch (error: any) {
    return handleRouteError(res, error, 'Failed to fetch scheduler preferences');
  }
});

/**
 * PUT /api/scheduler/preferences/:type
 * Updates candidate's schedule configuration for JOB_SEARCH or DAILY_REPORT.
 */
schedulerRouter.put('/preferences/:type', async (req: Request, res: Response) => {
  try {
    const userId = req.authUser?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: missing candidate identity' });
    }

    const scheduleType = req.params.type.toUpperCase() as BackgroundScheduleType;
    if (scheduleType !== 'JOB_SEARCH' && scheduleType !== 'DAILY_REPORT') {
      return res.status(400).json({ error: "Invalid schedule type. Must be 'JOB_SEARCH' or 'DAILY_REPORT'." });
    }

    const input: UpdateBackgroundScheduleInput = req.body;
    const updated = await backgroundSchedulingService.updateSchedule(userId, scheduleType, input);

    return res.status(200).json({ schedule: updated });
  } catch (error: any) {
    return handleRouteError(res, error, 'Failed to update scheduler preferences');
  }
});

/**
 * GET /api/scheduler/history
 * Returns the candidate's background execution audit history.
 */
schedulerRouter.get('/history', async (req: Request, res: Response) => {
  try {
    const userId = req.authUser?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: missing candidate identity' });
    }

    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const history = await backgroundRunnerService.getExecutionHistory(userId, limit);

    return res.status(200).json({ history });
  } catch (error: any) {
    return handleRouteError(res, error, 'Failed to fetch scheduler execution history');
  }
});

/**
 * GET /api/scheduler/status
 * Returns the overall scheduler worker status.
 */
schedulerRouter.get('/status', async (req: Request, res: Response) => {
  try {
    const status = await backgroundRunnerService.getSchedulerStatus();
    return res.status(200).json({ status });
  } catch (error: any) {
    return handleRouteError(res, error, 'Failed to fetch scheduler status');
  }
});

/**
 * POST /api/scheduler/tick
 * Triggers a manual or cron-driven scheduler tick to process due jobs.
 */
schedulerRouter.post('/tick', async (req: Request, res: Response) => {
  try {
    const result = await backgroundRunnerService.executeSchedulerTick();
    return res.status(200).json({ result });
  } catch (error: any) {
    return handleRouteError(res, error, 'Failed to execute scheduler tick');
  }
});
