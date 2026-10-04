/**
 * Notifications & Daily Career Report API Controller Routes
 * Module 12: Notifications & Daily Career Report
 * 
 * Endpoints:
 * GET  /api/reports/today        - Get or generate candidate's daily career report
 * GET  /api/reports              - List past daily career reports
 * GET  /api/reports/preferences  - Get candidate report & notification preferences
 * PUT  /api/reports/preferences  - Update report preferences (schedule, timezone, toggle)
 * GET  /api/notifications        - List internal notifications (with unread filter)
 * POST /api/notifications/:id/read - Mark notification as read
 * POST /api/notifications/read-all - Mark all unread notifications as read
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../core/security/authMiddleware.js';
import { dailyCareerReportService } from '../services/notification/dailyCareerReportService.js';
import { careerReportPreferencesService } from '../services/notification/careerReportPreferencesService.js';
import { notificationService } from '../services/notification/notificationService.js';
import { ValidationError } from '../core/errors/appError.js';

export function configureReportsApi(): Router {
  const router = Router();
  router.use(requireAuth);

  /**
   * GET /api/reports/today
   */
  router.get('/today', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const force = req.query.force === 'true';
      const targetDate = typeof req.query.date === 'string' ? req.query.date : undefined;

      const report = await dailyCareerReportService.getOrGenerateReport(userId, {
        targetDate,
        forceRegenerate: force,
      });

      res.json({ data: report });
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/reports/preferences
   */
  router.get('/preferences', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const prefs = await careerReportPreferencesService.getPreferences(userId);
      res.json({ data: prefs });
    } catch (err) {
      next(err);
    }
  });

  /**
   * PUT /api/reports/preferences
   */
  router.put('/preferences', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const { dailyReportEnabled, preferredReportTime, timezone, inAppNotificationsEnabled } = req.body;

      const updated = await careerReportPreferencesService.updatePreferences(userId, {
        dailyReportEnabled,
        preferredReportTime,
        timezone,
        inAppNotificationsEnabled,
      });

      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/reports
   */
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const limit = Number(req.query.limit) || 10;
      const reports = await dailyCareerReportService.listReports(userId, limit);
      res.json({ data: reports });
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/reports/:id
   */
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const report = await dailyCareerReportService.getReportById(userId, req.params.id);
      if (!report) {
        res.status(404).json({ error: 'Report not found' });
        return;
      }
      res.json({ data: report });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function configureNotificationsApi(): Router {
  const router = Router();
  router.use(requireAuth);

  /**
   * GET /api/notifications
   */
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const status = req.query.status as any;
      const limit = Number(req.query.limit) || 20;

      const items = await notificationService.listNotifications(userId, { status, limit });
      res.json({ data: items });
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /api/notifications/:id/read
   */
  router.post('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const updated = await notificationService.markAsRead(userId, req.params.id);
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /api/notifications/read-all
   */
  router.post('/read-all', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const result = await notificationService.markAllAsRead(userId);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
