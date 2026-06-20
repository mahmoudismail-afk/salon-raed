import { query } from '@/lib/db';
import { Receipt } from 'lucide-react';
import ExpensesClient from '@/components/expenses/ExpensesClient';
import { requirePermission } from '@/lib/auth-guard';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Expenses' };
export const dynamic = 'force-dynamic';

export default async function ExpensesPage() {
  await requirePermission('expenses');

  let expenses: any[] = [];
  try {
    const { rows } = await query('SELECT * FROM expenses ORDER BY date DESC');
    expenses = rows ?? [];
  } catch {
    // table not yet created
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <Receipt size={22} style={{ color: 'var(--primary-light)' }} /> Expenses
          </h1>
          <p className="page-subtitle">Track gym expenses and staff salaries</p>
        </div>
      </div>

      <ExpensesClient initialExpenses={expenses ?? []} />
    </div>
  );
}
