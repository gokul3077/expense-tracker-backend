import { Router } from 'express';
import { z } from 'zod';
import { supabase } from './db.js';

export const usersRouter = Router();

const createSchema = z.object({
  name: z.string().trim().min(1).max(40),
});

async function namesFromUsersTable(): Promise<string[] | null> {
  const { data, error } = await supabase
    .from('household_users')
    .select('name')
    .order('name');

  if (error) {
    return null;
  }

  return (data ?? []).map(row => row.name as string);
}

async function namesFromExpenses(): Promise<string[]> {
  const { data, error } = await supabase.from('expenses').select('created_by');
  if (error) {
    throw error;
  }

  return [...new Set((data ?? []).map(row => row.created_by as string).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b),
  );
}

usersRouter.get('/', async (_req, res) => {
  try {
    const stored = await namesFromUsersTable();
    const fromExpenses = await namesFromExpenses();
    const names = [...new Set([...(stored ?? []), ...fromExpenses])].sort((a, b) =>
      a.localeCompare(b),
    );
    res.json(names.map(name => ({ name })));
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load users' });
  }
});

usersRouter.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const name = parsed.data.name.trim();
  const { error } = await supabase.from('household_users').upsert({ name }, { onConflict: 'name' });

  if (error && error.code !== 'PGRST205' && error.code !== '42P01') {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(201).json({ name });
});
