import { Router, Request, Response } from 'express';
import { getAuthenticatedUser } from '../core/security/authMiddleware.js';

export function configureAuthApi(): Router {
  const router = Router();

  /**
   * GET /api/auth/me
   * Returns safe user identity for the authenticated session.
   * Derives identity exclusively from Authorization Bearer token.
   */
  router.get('/me', async (req: Request, res: Response) => {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({
        authenticated: false,
        error: 'Unauthorized: No valid session token provided',
      });
      return;
    }

    res.status(200).json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        emailConfirmed: user.emailConfirmed,
      },
    });
  });

  return router;
}
