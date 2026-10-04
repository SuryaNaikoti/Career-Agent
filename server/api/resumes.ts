/**
 * Resume Intelligence Express API Router
 * Module 04: Resume Intelligence
 * 
 * Routes:
 * - POST   /api/resumes               Upload and process resume (multipart/form-data)
 * - GET    /api/resumes               List user's resumes
 * - GET    /api/resumes/:id           Get resume status & extracted intelligence
 * - GET    /api/resumes/:id/preview   Get temporary signed preview URL
 * - POST   /api/resumes/:id/confirm   Confirm extracted facts -> persist to Module 01
 * - POST   /api/resumes/:id/correct   Submit candidate correction for a field
 * - DELETE /api/resumes/:id           Delete resume document & storage
 */

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { requireAuth } from '../core/security/authMiddleware.js';
import { resumeService } from '../services/resume/resumeService.js';
import { DEFAULT_RESUME_LIMITS } from '../services/resume/resumeTypes.js';
import { AppError } from '../core/errors/appError.js';
import { logger } from '../core/logging/logger.js';

// Setup memory storage for multer with strict file size limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: DEFAULT_RESUME_LIMITS.maxFileSizeBytes,
  },
});

export function configureResumeApi(): Router {
  const router = Router();

  // All resume endpoints strictly require authentication
  router.use(requireAuth);

  /**
   * POST /api/resumes
   * Multipart upload of PDF/DOCX resume
   */
  router.post('/', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = (req as any).authUser;
      if (!authUser || !authUser.id) {
        return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      }

      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ code: 'FILE_MISSING', message: 'No resume file uploaded.' });
      }

      const result = await resumeService.uploadAndProcessResume(
        authUser.id,
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      res.status(201).json({
        data: result,
      });
    } catch (err: any) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          code: 'FILE_TOO_LARGE',
          message: `File exceeds maximum allowed size of ${DEFAULT_RESUME_LIMITS.maxFileSizeBytes / (1024 * 1024)}MB`,
        });
      }
      next(err);
    }
  });

  /**
   * GET /api/resumes
   * List all resumes owned by current authenticated user
   */
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = (req as any).authUser;
      const resumes = await resumeService.listResumes(authUser.id);
      res.json({ data: resumes });
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/resumes/:id
   * Get resume details & parsed intelligence
   */
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = (req as any).authUser;
      const resume = await resumeService.getResume(authUser.id, req.params.id);
      res.json({ data: resume });
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/resumes/:id/preview
   * Get short-lived signed URL for document viewing
   */
  router.get('/:id/preview', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = (req as any).authUser;
      const previewUrl = await resumeService.getPreviewUrl(authUser.id, req.params.id);
      res.json({ data: { previewUrl } });
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /api/resumes/:id/confirm
   * Confirm selected facts to merge with Module 01 candidate profile
   */
  router.post('/:id/confirm', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = (req as any).authUser;
      const confirmationResult = await resumeService.confirmResumeFacts(
        authUser.id,
        req.params.id,
        req.body
      );
      res.json({ data: confirmationResult });
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /api/resumes/:id/correct
   * Submit correction for extracted fact
   */
  router.post('/:id/correct', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = (req as any).authUser;
      const updatedResume = await resumeService.correctResumeFact(
        authUser.id,
        req.params.id,
        req.body
      );
      res.json({ data: updatedResume });
    } catch (err) {
      next(err);
    }
  });

  /**
   * DELETE /api/resumes/:id
   * Safely delete resume document and private storage file
   */
  router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = (req as any).authUser;
      await resumeService.deleteResume(authUser.id, req.params.id);
      res.json({ data: { success: true } });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
