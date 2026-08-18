import { Router } from 'express';
import { z } from 'zod';
import { supabase, toExpense, type ExpenseRow } from './db.js';

export const expensesRouter = Router();

const createSchema = z.object({
  id: z.string().uuid().optional(),
  amount: z.number().positive(),
  categoryId: z.string().min(1),
  description: z.string().optional(),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  createdBy: z.string().min(1),
});

const updateSchema = z.object({
  amount: z.number().positive(),
  categoryId: z.string().min(1),
  description: z.string().optional(),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

expensesRouter.get('/', async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : '';
  const month = typeof req.query.month === 'string' ? req.query.month : '';

  let query = supabase.from('expenses').select('*').order('expense_date', { ascending: false });

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }
  if (month) {
    query = query.gte('expense_date', `${month}-01`).lte('expense_date', `${month}-31`);
  }
  if (search) {
    query = query.ilike('description', `%${search}%`);
  }

  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(((data ?? []) as ExpenseRow[]).map(toExpense));
});

expensesRouter.get('/:id', async (req, res) => {
  const { data, error } = await supabase.from('expenses').select('*').eq('id', req.params.id).maybeSingle();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: 'Expense not found' });
    return;
  }

  res.json(toExpense(data as ExpenseRow));
});

expensesRouter.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const payload: Record<string, unknown> = {
    amount: parsed.data.amount,
    category_id: parsed.data.categoryId,
    description: parsed.data.description?.trim() || 'Expense',
    expense_date: parsed.data.expenseDate,
    created_by: parsed.data.createdBy.trim(),
  };
  if (parsed.data.id) {
    payload.id = parsed.data.id;
  }

  const { data, error } = await supabase.from('expenses').insert(payload).select('*').single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  await supabase
    .from('household_users')
    .upsert({ name: parsed.data.createdBy.trim() }, { onConflict: 'name' });

  res.status(201).json(toExpense(data as ExpenseRow));
});

expensesRouter.put('/:id', async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { data, error } = await supabase
    .from('expenses')
    .update({
      amount: parsed.data.amount,
      category_id: parsed.data.categoryId,
      description: parsed.data.description?.trim() || 'Expense',
      expense_date: parsed.data.expenseDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .select('*')
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: 'Expense not found' });
    return;
  }

  res.json(toExpense(data as ExpenseRow));
});

expensesRouter.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('expenses').delete().eq('id', req.params.id);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(204).send();
});
