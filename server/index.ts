import express, { Express, Router } from 'express';
import { healthHandler } from './api/health.js';
import { configureAuthApi } from './api/auth.js';
import { logger } from './core/logging/logger.js';

export function configureApiRoutes(): Router {
  const router = express.Router();

  // Foundation Health Check
  router.get('/health', healthHandler);

  // Module 01: Authentication Identity API
  router.use('/auth', configureAuthApi());

  // Future API Modules will be mounted here in subsequent modules:
  // router.use('/candidates', candidatesRouter);
  // router.use('/jobs', jobsRouter);
  // router.use('/applications', applicationsRouter);
  // router.use('/agent', agentRouter);
  // router.use('/gmail', gmailRouter);

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

  return app;
}
