import { query } from '@/lib/db';
import ReportsClient from '@/components/reports/ReportsClient';
import { requirePermission } from '@/lib/auth-guard';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Reports & Analytics' };

export default async function ReportsPage() {
  await requirePermission('reports');

  const [
    { rows: payments },
    { rows: members },
    { rows: membershipsRows },
    { rows: plans },
    { rows: classSchedules },
    { rows: classTypes },
    { rows: checkins },
    { rows: inventoryTxns },
    { rows: expenses },
  ] = await Promise.all([
    query('SELECT amount, payment_date, payment_method FROM payments ORDER BY payment_date ASC'),
    query('SELECT id, status, created_at FROM members'),
    query(`
      SELECT ms.plan_id, ms.status, mp.name as plan_name 
      FROM memberships ms 
      LEFT JOIN membership_plans mp ON ms.plan_id = mp.id
    `),
    query('SELECT id, name FROM membership_plans'),
    query('SELECT id, class_type_id, status, start_time FROM class_schedules'),
    query('SELECT id, name, color FROM class_types'),
    query('SELECT id, checked_in_at FROM check_ins'),
    query('SELECT type, total_amount, created_at FROM inventory_transactions'),
    query('SELECT type, amount, date FROM expenses'),
  ]);

  const memberships = membershipsRows.map((r: any) => ({
    plan_id: r.plan_id,
    status: r.status,
    membership_plans: { name: r.plan_name }
  }));

  return (
    <ReportsClient
      payments={payments ?? []}
      members={members ?? []}
      memberships={memberships ?? []}
      plans={plans ?? []}
      classSchedules={classSchedules ?? []}
      classTypes={classTypes ?? []}
      checkins={checkins ?? []}
      inventoryTxns={inventoryTxns ?? []}
      expenses={expenses ?? []}
    />
  );
}
