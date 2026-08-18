import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { requireHouseholdKey } from './auth.js';
import { categoriesRouter } from './categories.js';
import { supabase } from './db.js';
import { expensesRouter } from './expenses.js';
import { reportsRouter } from './reports.js';
import { usersRouter } from './users.js';

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/wake', async (_req, res) => {
  const { error } = await supabase.from('categories').select('id').limit(1);
  if (error) {
    res.status(503).json({ ok: false });
    return;
  }
  res.json({ ok: true });
});

app.use(requireHouseholdKey);
app.use('/categories', categoriesRouter);
app.use('/expenses', expensesRouter);
app.use('/reports', reportsRouter);
app.use('/users', usersRouter);

app.listen(port, '0.0.0.0', () => {
  console.log(`Expense API listening on http://localhost:${port}`);
});
