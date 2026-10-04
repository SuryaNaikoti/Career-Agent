import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../core/security/authMiddleware.js';
import {
  agentConfigurationService,
  autonomousJobSearchEngine,
  UpdateAgentSearchConfigurationInput,
  JobSearchSessionMode,
} from '../services/agentEngine/index.js';
import { AppError } from '../core/errors/appError.js';
import { logger } from '../core/logging/logger.js';

export const agentSearchRouter = Router();

// Enforce authentication on all agent search routes
agentSearchRouter.use(requireAuth);

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
      message: error?.message || 'Internal server error processing agent request.',
    },
  });
};

/**
 * GET /api/agent/status
 * Returns the overall agent configuration, active/latest session status.
 */
agentSearchRouter.get('/status', async (req: Request, res: Response) => {
  try {
    const userId = req.authUser?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: missing candidate identity' });
    }

    const config = await agentConfigurationService.getConfiguration(userId);
    const history = await autonomousJobSearchEngine.listSessions(userId, 1);
    const latestSession = history[0] || null;

    return res.status(200).json({
      config,
      latestSession,
      status: latestSession ? latestSession.status : 'READY',
    });
  } catch (error: any) {
    return handleRouteError(res, error, 'Failed to fetch agent status');
  }
});

/**
 * GET /api/agent/config
 * Retrieves candidate-configured search & safety controls.
 */
agentSearchRouter.get('/config', async (req: Request, res: Response) => {
  try {
    const userId = req.authUser?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: missing candidate identity' });
    }

    const config = await agentConfigurationService.getConfiguration(userId);
    return res.status(200).json({ config });
  } catch (error: any) {
    return handleRouteError(res, error, 'Failed to fetch agent config');
  }
});

/**
 * PUT /api/agent/config
 * Updates candidate-configured search & safety controls.
 */
agentSearchRouter.put('/config', async (req: Request, res: Response) => {
  try {
    const userId = req.authUser?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: missing candidate identity' });
    }

    const updates: UpdateAgentSearchConfigurationInput = req.body;
    const updated = await agentConfigurationService.updateConfiguration(userId, updates);
    return res.status(200).json({ config: updated });
  } catch (error: any) {
    return handleRouteError(res, error, 'Failed to update configuration');
  }
});

/**
 * POST /api/agent/search/start
 * Starts a new controlled autonomous search session.
 */
agentSearchRouter.post('/search/start', async (req: Request, res: Response) => {
  try {
    const userId = req.authUser?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: missing candidate identity' });
    }

    const mode: JobSearchSessionMode = req.body.mode || 'MANUAL';
    const session = await autonomousJobSearchEngine.startSession(userId, { mode });

    return res.status(201).json({ session });
  } catch (error: any) {
    return handleRouteError(res, error, 'Failed to start search session');
  }
});

/**
 * GET /api/agent/search/history
 * Lists historical execution sessions for the candidate.
 */
agentSearchRouter.get('/search/history', async (req: Request, res: Response) => {
  try {
    const userId = req.authUser?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: missing candidate identity' });
    }

    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const sessions = await autonomousJobSearchEngine.listSessions(userId, limit);

    return res.status(200).json({ sessions });
  } catch (error: any) {
    return handleRouteError(res, error, 'Failed to fetch session history');
  }
});

/**
 * GET /api/agent/search/:id
 * Fetches session detail and chronological step audit events.
 */
agentSearchRouter.get('/search/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.authUser?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: missing candidate identity' });
    }

    const { id } = req.params;
    const session = await autonomousJobSearchEngine.getSessionById(userId, id);
    if (!session) {
      return res.status(404).json({ error: 'Job search session not found' });
    }

    const events = await autonomousJobSearchEngine.getSessionEvents(userId, id);

    return res.status(200).json({ session, events });
  } catch (error: any) {
    return handleRouteError(res, error, 'Failed to fetch session details');
  }
});

/**
 * POST /api/agent/search/:id/pause
 * Pauses a currently running search session.
 */
agentSearchRouter.post('/search/:id/pause', async (req: Request, res: Response) => {
  try {
    const userId = req.authUser?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: missing candidate identity' });
    }

    const { id } = req.params;
    const session = await autonomousJobSearchEngine.pauseSession(userId, id);
    return res.status(200).json({ session });
  } catch (error: any) {
    return handleRouteError(res, error, 'Failed to pause session');
  }
});

/**
 * POST /api/agent/search/:id/resume
 * Resumes a paused or waiting session.
 */
agentSearchRouter.post('/search/:id/resume', async (req: Request, res: Response) => {
  try {
    const userId = req.authUser?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: missing candidate identity' });
    }

    const { id } = req.params;
    const session = await autonomousJobSearchEngine.resumeSession(userId, id);
    return res.status(200).json({ session });
  } catch (error: any) {
    return handleRouteError(res, error, 'Failed to resume session');
  }
});

/**
 * POST /api/agent/search/:id/stop
 * Cancels/terminates a session safely.
 */
agentSearchRouter.post('/search/:id/stop', async (req: Request, res: Response) => {
  try {
    const userId = req.authUser?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: missing candidate identity' });
    }

    const { id } = req.params;
    const session = await autonomousJobSearchEngine.stopSession(userId, id);
    return res.status(200).json({ session });
  } catch (error: any) {
    return handleRouteError(res, error, 'Failed to stop session');
  }
});
