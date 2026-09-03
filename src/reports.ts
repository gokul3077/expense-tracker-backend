import { Router } from 'express';
import { monthBounds } from './dates.js';
import { supabase, type ExpenseRow } from './db.js';

export const reportsRouter = Router();

function currentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function lastNMonths(count: number) {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
    return currentMonthKey(date);
  });
}

function shortMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
}

async function expensesInMonth(month: string): Promise<ExpenseRow[]> {
  const { from, to } = monthBounds(month);
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .gte('expense_date', from)
    .lte('expense_date', to);

  if (error) {
    throw error;
  }

  return (data ?? []) as ExpenseRow[];
}

reportsRouter.get('/monthly', async (req, res) => {
  const month = typeof req.query.month === 'string' ? req.query.month : currentMonthKey();
  try {
    const expenses = await expensesInMonth(month);
    const total = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
    res.json({ total });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Report failed' });
  }
});

reportsRouter.get('/categories', async (req, res) => {
  const month = typeof req.query.month === 'string' ? req.query.month : currentMonthKey();
  try {
    const [expenses, categoriesResult] = await Promise.all([
      expensesInMonth(month),
      supabase.from('categories').select('*'),
    ]);

    if (categoriesResult.error) {
      res.status(500).json({ error: categoriesResult.error.message });
      return;
    }

    const totals = new Map<string, number>();
    expenses.forEach(item => {
      totals.set(item.category_id, (totals.get(item.category_id) ?? 0) + Number(item.amount));
    });

    const breakdown = (categoriesResult.data ?? [])
      .map(category => ({
        categoryId: category.id,
        name: category.name,
        color: category.color,
        total: totals.get(category.id) ?? 0,
      }))
      .filter(item => item.total > 0)
      .sort((a, b) => b.total - a.total);

    res.json(breakdown);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Report failed' });
  }
});

reportsRouter.get('/by-user', async (req, res) => {
  const month = typeof req.query.month === 'string' ? req.query.month : currentMonthKey();
  try {
    const expenses = await expensesInMonth(month);
    const totals = new Map<string, number>();
    expenses.forEach(item => {
      totals.set(item.created_by, (totals.get(item.created_by) ?? 0) + Number(item.amount));
    });

    res.json(
      [...totals.entries()]
        .map(([createdBy, total]) => ({ createdBy, total }))
        .sort((a, b) => b.total - a.total),
    );
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Report failed' });
  }
});

reportsRouter.get('/monthly-trend', async (_req, res) => {
  try {
    const months = lastNMonths(6);
    const from = monthBounds(months[0]).from;
    const to = monthBounds(months[months.length - 1]).to;
    const { data, error } = await supabase
      .from('expenses')
      .select('amount, expense_date')
      .gte('expense_date', from)
      .lte('expense_date', to);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    const rows = (data ?? []) as Array<{ amount: number | string; expense_date: string }>;
    res.json(
      months.map(month => ({
        month,
        label: shortMonthLabel(month),
        total: rows
          .filter(item => item.expense_date.slice(0, 7) === month)
          .reduce((sum, item) => sum + Number(item.amount), 0),
      })),
    );
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Report failed' });
  }
});
