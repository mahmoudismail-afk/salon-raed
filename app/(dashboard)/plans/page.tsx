import { query } from '@/lib/db';
import PlansClient from '@/components/plans/PlansClient';
import { requirePermission } from '@/lib/auth-guard';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Membership Plans' };

export default async function PlansPage() {
  await requirePermission('plans');

  const { rows: plans } = await query('SELECT * FROM membership_plans ORDER BY price ASC');

  return (
    <div>
      <PlansClient plans={plans ?? []} />
    </div>
  );
}
