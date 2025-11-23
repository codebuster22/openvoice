import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /health
 *
 * Health check endpoint for monitoring and Docker healthchecks
 * Returns 200 OK with timestamp if service is running
 */
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: Date.now(),
  });
});

export default router;
