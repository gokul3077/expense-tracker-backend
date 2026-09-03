import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in api/.env');
}

export const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export type ExpenseRow = {
  id: string;
  amount: number | string;
  category_id: string;
  description: string | null;
  expense_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type CategoryRow = {
  id: string;
  name: string;
  color: string;
};

export function toExpense(row: ExpenseRow) {
  return {
    id: row.id,
    amount: Number(row.amount),
    categoryId: row.category_id,
    description: row.description ?? '',
    expenseDate: String(row.expense_date).slice(0, 10),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toCategory(row: CategoryRow) {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
  };
}
