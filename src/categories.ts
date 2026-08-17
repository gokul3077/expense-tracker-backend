import { Router } from 'express';
import { supabase, toCategory, type CategoryRow } from './db.js';

export const categoriesRouter = Router();

categoriesRouter.get('/', async (_req, res) => {
  const { data, error } = await supabase.from('categories').select('*').order('name');
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(((data ?? []) as CategoryRow[]).map(toCategory));
});
