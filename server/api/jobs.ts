/**
 * Jobs Express API Router
 * Module 05: Job Discovery & Ingestion
 * 
 * Routes:
 * - GET  /api/jobs          Search and filter canonical jobs
 * - GET  /api/jobs/sources  List configured job sources and policy statuses
 * - GET  /api/jobs/:id      Get canonical job details
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../core/security/authMiddleware.js';
import { jobSearchService } from '../services/job/jobSearchService.js';
import { jobSourceRegistry } from '../services/job/jobSourceRegistry.js';
import { WorkplaceType, CanonicalEmploymentType } from '../services/job/jobTypes.js';
import { configureJobMatchNestedApi } from './matching.js';
import { jobInteractionService } from '../services/jobExperience/jobInteractionService.js';
import { jobExperienceService } from '../services/jobExperience/jobExperienceService.js';

export function configureJobsApi(): Router {
  const router = Router();

  // All job routes require authenticated candidate identity
  router.use(requireAuth);

  /**
   * GET /api/jobs/sources
   * Lists permitted & restricted job sources
   */
  router.get('/sources', (req: Request, res: Response) => {
    const sources = jobSourceRegistry.listSources();
    res.json({ data: sources });
  });

  /**
   * GET /api/jobs
   * Search canonical stored jobs with pagination and filters
   */
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        q,
        title,
        location,
        country,
        experience,
        workplace,
        employment,
        company,
        minSalary,
        page,
        limit,
        sortBy,
        sortOrder,
      } = req.query;

      // Input Validation
      if (typeof q === 'string' && q.length > 500) {
        return res.status(400).json({ error: 'Search query exceeds maximum length of 500 characters' });
      }
      if (typeof title === 'string' && title.length > 200) {
        return res.status(400).json({ error: 'Title parameter exceeds maximum length of 200 characters' });
      }
      if (typeof company === 'string' && company.length > 200) {
        return res.status(400).json({ error: 'Company parameter exceeds maximum length of 200 characters' });
      }
      if (typeof location === 'string' && location.length > 200) {
        return res.status(400).json({ error: 'Location parameter exceeds maximum length of 200 characters' });
      }
      if (typeof country === 'string' && country.length > 100) {
        return res.status(400).json({ error: 'Country parameter exceeds maximum length of 100 characters' });
      }
      if (typeof workplace === 'string' && !['REMOTE', 'HYBRID', 'ONSITE', 'UNKNOWN'].includes(workplace)) {
        return res.status(400).json({ error: 'Invalid workplace enum value' });
      }
      if (typeof employment === 'string' && !['FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP', 'OTHER', 'UNKNOWN'].includes(employment)) {
        return res.status(400).json({ error: 'Invalid employment enum value' });
      }
      if (typeof page === 'string' && (isNaN(parseInt(page, 10)) || parseInt(page, 10) < 1)) {
        return res.status(400).json({ error: 'Page parameter must be a positive integer greater than or equal to 1' });
      }
      if (typeof limit === 'string' && (isNaN(parseInt(limit, 10)) || parseInt(limit, 10) < 1 || parseInt(limit, 10) > 50)) {
        return res.status(400).json({ error: 'Limit parameter must be between 1 and 50' });
      }
      if (typeof minSalary === 'string' && (isNaN(parseFloat(minSalary)) || parseFloat(minSalary) < 0)) {
        return res.status(400).json({ error: 'Minimum salary must be a positive number' });
      }

      const result = await jobSearchService.searchJobs({
        query: typeof q === 'string' ? q : undefined,
        title: typeof title === 'string' ? title : undefined,
        location: typeof location === 'string' ? location : undefined,
        country: typeof country === 'string' ? country : undefined,
        experienceLevel: typeof experience === 'string' ? experience : undefined,
        workplaceType: typeof workplace === 'string' ? (workplace as WorkplaceType) : undefined,
        employmentType: typeof employment === 'string' ? (employment as CanonicalEmploymentType) : undefined,
        company: typeof company === 'string' ? company : undefined,
        minSalary: typeof minSalary === 'string' ? parseFloat(minSalary) : undefined,
        page: typeof page === 'string' ? parseInt(page, 10) : 1,
        limit: typeof limit === 'string' ? parseInt(limit, 10) : 20,
        sortBy: sortBy === 'salary_max' ? 'salary_max' : 'posted_at',
        sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
      });

      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/jobs/feed
   * Candidate personalized discovery feed with enriched match & interaction state
   */
  router.get('/feed', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const {
        q,
        title,
        location,
        country,
        experience,
        workplace,
        employment,
        company,
        minSalary,
        sortBy,
        page,
        limit,
      } = req.query;

      // Validation
      if (typeof q === 'string' && q.length > 500) {
        return res.status(400).json({ error: 'Search query exceeds maximum length of 500 characters' });
      }
      if (typeof title === 'string' && title.length > 200) {
        return res.status(400).json({ error: 'Title parameter exceeds maximum length of 200 characters' });
      }
      if (typeof company === 'string' && company.length > 200) {
        return res.status(400).json({ error: 'Company parameter exceeds maximum length of 200 characters' });
      }
      if (typeof location === 'string' && location.length > 200) {
        return res.status(400).json({ error: 'Location parameter exceeds maximum length of 200 characters' });
      }
      if (typeof country === 'string' && country.length > 100) {
        return res.status(400).json({ error: 'Country parameter exceeds maximum length of 100 characters' });
      }
      if (typeof workplace === 'string' && !['REMOTE', 'HYBRID', 'ONSITE', 'UNKNOWN'].includes(workplace)) {
        return res.status(400).json({ error: 'Invalid workplace enum value' });
      }
      if (typeof employment === 'string' && !['FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP', 'OTHER', 'UNKNOWN'].includes(employment)) {
        return res.status(400).json({ error: 'Invalid employment enum value' });
      }
      if (typeof page === 'string' && (isNaN(parseInt(page, 10)) || parseInt(page, 10) < 1)) {
        return res.status(400).json({ error: 'Page parameter must be a positive integer greater than or equal to 1' });
      }
      if (typeof limit === 'string' && (isNaN(parseInt(limit, 10)) || parseInt(limit, 10) < 1 || parseInt(limit, 10) > 50)) {
        return res.status(400).json({ error: 'Limit parameter must be between 1 and 50' });
      }
      if (typeof minSalary === 'string' && (isNaN(parseFloat(minSalary)) || parseFloat(minSalary) < 0)) {
        return res.status(400).json({ error: 'Minimum salary must be a positive number' });
      }

      const feed = await jobExperienceService.getCandidateFeed(userId, {
        query: typeof q === 'string' ? q : undefined,
        title: typeof title === 'string' ? title : undefined,
        location: typeof location === 'string' ? location : undefined,
        country: typeof country === 'string' ? country : undefined,
        experienceLevel: typeof experience === 'string' ? experience : undefined,
        workplaceType: typeof workplace === 'string' ? workplace : undefined,
        employmentType: typeof employment === 'string' ? employment : undefined,
        company: typeof company === 'string' ? company : undefined,
        minSalary: typeof minSalary === 'string' ? parseFloat(minSalary) : undefined,
        sortBy: sortBy as any,
        page: typeof page === 'string' ? parseInt(page, 10) : 1,
        limit: typeof limit === 'string' ? parseInt(limit, 10) : 20,
      });

      res.json({ data: feed });
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/jobs/recommended
   * Personalized recommendations based on match score and candidate profile
   */
  router.get('/recommended', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const recommended = await jobExperienceService.getRecommendedJobs(userId);
      res.json({ data: recommended });
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/jobs/saved
   * List saved canonical jobs for candidate
   */
  router.get('/saved', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const savedJobs = await jobInteractionService.listSavedJobs(userId);
      res.json({ data: savedJobs });
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /api/jobs/:id/save
   * Save a job
   */
  router.post('/:id/save', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const result = await jobInteractionService.saveJob(userId, req.params.id);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  });

  /**
   * DELETE /api/jobs/:id/save
   * Unsave a job
   */
  router.delete('/:id/save', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const result = await jobInteractionService.unsaveJob(userId, req.params.id);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /api/jobs/:id/dismiss
   * Dismiss a job from discovery
   */
  router.post('/:id/dismiss', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const result = await jobInteractionService.dismissJob(userId, req.params.id);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  });

  /**
   * DELETE /api/jobs/:id/dismiss
   * Undismiss a job
   */
  router.delete('/:id/dismiss', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const result = await jobInteractionService.undismissJob(userId, req.params.id);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /api/jobs/:id/view
   * Record viewing of job
   */
  router.post('/:id/view', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      await jobInteractionService.recordJobView(userId, req.params.id);
      res.json({ data: { success: true } });
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/jobs/recent
   * List recently viewed jobs
   */
  router.get('/recent', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const recent = await jobInteractionService.listRecentlyViewed(userId);
      res.json({ data: recent });
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/jobs/:id
   * Get single job by canonical ID
   */
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return res.status(400).json({ error: 'Malformed job ID: Must be a valid UUID' });
      }

      const job = await jobSearchService.getJobById(id);
      res.json({ data: job });
    } catch (err) {
      next(err);
    }
  });

  // Mount nested Module 06 Job Matching router under /api/jobs/:jobId/match
  router.use('/:jobId/match', configureJobMatchNestedApi());

  return router;
}
