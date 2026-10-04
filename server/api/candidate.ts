import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../core/security/authMiddleware.js';
import {
  candidateProfileService,
  candidateSkillService,
  candidateExperienceService,
  candidateEducationService,
  candidatePreferencesService,
} from '../services/candidate/index.js';
import { AppError } from '../core/errors/appError.js';
import { logger } from '../core/logging/logger.js';

export function configureCandidateApi(): Router {
  const router = Router();

  // Enforce authentication on all candidate API routes
  router.use(requireAuth);

  // Centralized async route wrapper for standard error responses
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

        logger.error('Unhandled candidate route error', { path: req.path, error: String(err) });
        res.status(500).json({
          error: {
            code: 'InternalServerError',
            message: 'An unexpected error occurred while processing candidate data.',
          },
        });
      });
    };
  };

  // ============================================================================
  // PROFILE ENDPOINTS
  // ============================================================================

  /**
   * GET /api/candidate/profile
   */
  router.get('/profile', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.authUser!.id;
    const profile = await candidateProfileService.getProfile(userId);
    res.status(200).json({ data: profile });
  }));

  /**
   * PUT /api/candidate/profile
   */
  router.put('/profile', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.authUser!.id;
    const defaultDisplayName = req.authUser?.email ? req.authUser.email.split('@')[0] : 'Candidate';
    const updated = await candidateProfileService.upsertProfile(userId, req.body || {}, defaultDisplayName);
    res.status(200).json({ data: updated });
  }));

  // ============================================================================
  // SKILLS ENDPOINTS
  // ============================================================================

  /**
   * GET /api/candidate/skills
   */
  router.get('/skills', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.authUser!.id;
    const skills = await candidateSkillService.listSkills(userId);
    res.status(200).json({
      data: skills,
      meta: { count: skills.length },
    });
  }));

  /**
   * POST /api/candidate/skills
   */
  router.post('/skills', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.authUser!.id;
    const skill = await candidateSkillService.createSkill(userId, req.body || {});
    res.status(201).json({ data: skill });
  }));

  /**
   * PATCH /api/candidate/skills/:id
   */
  router.patch('/skills/:id', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.authUser!.id;
    const skill = await candidateSkillService.updateSkill(userId, req.params.id, req.body || {});
    res.status(200).json({ data: skill });
  }));

  /**
   * DELETE /api/candidate/skills/:id
   */
  router.delete('/skills/:id', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.authUser!.id;
    await candidateSkillService.deleteSkill(userId, req.params.id);
    res.status(200).json({ success: true, message: 'Skill deleted successfully' });
  }));

  // ============================================================================
  // EXPERIENCE ENDPOINTS
  // ============================================================================

  /**
   * GET /api/candidate/experience
   */
  router.get('/experience', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.authUser!.id;
    const experience = await candidateExperienceService.listExperience(userId);
    res.status(200).json({
      data: experience,
      meta: { count: experience.length },
    });
  }));

  /**
   * POST /api/candidate/experience
   */
  router.post('/experience', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.authUser!.id;
    const exp = await candidateExperienceService.createExperience(userId, req.body || {});
    res.status(201).json({ data: exp });
  }));

  /**
   * PATCH /api/candidate/experience/:id
   */
  router.patch('/experience/:id', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.authUser!.id;
    const exp = await candidateExperienceService.updateExperience(userId, req.params.id, req.body || {});
    res.status(200).json({ data: exp });
  }));

  /**
   * DELETE /api/candidate/experience/:id
   */
  router.delete('/experience/:id', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.authUser!.id;
    await candidateExperienceService.deleteExperience(userId, req.params.id);
    res.status(200).json({ success: true, message: 'Experience deleted successfully' });
  }));

  // ============================================================================
  // EDUCATION ENDPOINTS
  // ============================================================================

  /**
   * GET /api/candidate/education
   */
  router.get('/education', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.authUser!.id;
    const education = await candidateEducationService.listEducation(userId);
    res.status(200).json({
      data: education,
      meta: { count: education.length },
    });
  }));

  /**
   * POST /api/candidate/education
   */
  router.post('/education', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.authUser!.id;
    const edu = await candidateEducationService.createEducation(userId, req.body || {});
    res.status(201).json({ data: edu });
  }));

  /**
   * PATCH /api/candidate/education/:id
   */
  router.patch('/education/:id', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.authUser!.id;
    const edu = await candidateEducationService.updateEducation(userId, req.params.id, req.body || {});
    res.status(200).json({ data: edu });
  }));

  /**
   * DELETE /api/candidate/education/:id
   */
  router.delete('/education/:id', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.authUser!.id;
    await candidateEducationService.deleteEducation(userId, req.params.id);
    res.status(200).json({ success: true, message: 'Education deleted successfully' });
  }));

  // ============================================================================
  // PREFERENCES ENDPOINTS
  // ============================================================================

  /**
   * GET /api/candidate/preferences
   */
  router.get('/preferences', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.authUser!.id;
    const preferences = await candidatePreferencesService.getPreferences(userId);
    res.status(200).json({ data: preferences });
  }));

  /**
   * PUT /api/candidate/preferences
   */
  router.put('/preferences', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.authUser!.id;
    const updated = await candidatePreferencesService.upsertPreferences(userId, req.body || {});
    res.status(200).json({ data: updated });
  }));

  return router;
}
