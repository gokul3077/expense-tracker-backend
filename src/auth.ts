import type { Request, Response, NextFunction } from 'express';

export function requireHouseholdKey(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.HOUSEHOLD_KEY;
  const received = req.header('x-household-key');

  if (!expected || received !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}
