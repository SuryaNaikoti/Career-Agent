import express, { Express, Router } from 'express';
import { healthHandler } from './api/health.js';
import { configureAuthApi } from './api/auth.js';
import { logger } from './core/logging/logger.js';

import { configureCandidateApi } from './api/candidate.js';
import { configureAiApi } from './api/ai.js';
import { configureOnboardingApi } from './api/onboarding.js';
import { configureResumeApi } from './api/resumes.js';
import { configureJobsApi } from './api/jobs.js';
import { configureMatchingApi } from './api/matching.js';
import { configureApplicationPreparationApi } from './api/applications.js';
import { configureHumanTaskApi } from './api/tasks.js';
import { configureGmailApi, configureHiringIntelligenceApi } from './api/gmail.js';
import { configureReportsApi, configureNotificationsApi } from './api/notifications.js';
import { agentSearchRouter } from './api/agentSearch.js';
import { schedulerRouter } from './api/scheduler.js';

export function configureApiRoutes(): Router {
  const router = express.Router();

  // Foundation Health Check
  router.get('/health', healthHandler);

  // Authentication Identity API
  router.use('/auth', configureAuthApi());

  // Module 01: Candidate Data Service & Truth Layer
  router.use('/candidate', configureCandidateApi());

  // Module 02: AI Service Foundation
  router.use('/ai', configureAiApi());

  // Module 03: Interactive AI Onboarding
  router.use('/onboarding', configureOnboardingApi());

  // Module 04: Resume Intelligence
  router.use('/resumes', configureResumeApi());

  // Module 05: Job Discovery & Ingestion
  router.use('/jobs', configureJobsApi());

  // Module 06: Matching Engine
  router.use('/matches', configureMatchingApi());

  // Module 08 & 09: Application Preparation & Lifecycle
  router.use('/applications', configureApplicationPreparationApi());

  // Module 10: Human Task Engine
  router.use('/tasks', configureHumanTaskApi());

  // Module 11: Gmail & Hiring Intelligence
  router.use('/gmail', configureGmailApi());
  router.use('/hiring-intelligence', configureHiringIntelligenceApi());

  // Module 12: Notifications & Daily Career Report
  router.use('/reports', configureReportsApi());
  router.use('/notifications', configureNotificationsApi());

  // Module 13: Autonomous Job Search Engine
  router.use('/agent', agentSearchRouter);

  // Module 14: Background Automation & Scheduling
  router.use('/scheduler', schedulerRouter);

  return router;
}

export function createServerApp(): Express {
  const app = express();

  app.use(express.json());
  
  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      if (req.path.startsWith('/api')) {
        logger.info(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
      }
    });
    next();
  });

  // Mount API router
  app.use('/api', configureApiRoutes());

  // Centralized Error Handling Middleware
  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const statusCode = err.statusCode || (err.name === 'NotFoundError' ? 404 : 500);
    const message = err.message || 'Internal server error';
    res.status(statusCode).json({ error: message, code: err.name || 'INTERNAL_ERROR' });
  });

  return app;
}
