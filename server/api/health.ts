import { Request, Response } from 'express';

export function healthHandler(_req: Request, res: Response): void {
  res.status(200).json({
    status: 'ok',
    app: 'Career Agent',
    module: '00-foundation',
    timestamp: new Date().toISOString()
  });
}
