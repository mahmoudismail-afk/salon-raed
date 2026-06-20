import { query } from '@/lib/db';
import MemberForm from '@/components/members/MemberForm';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Add Member' };

export default async function NewMemberPage() {
  const { rows: plans } = await query(
    "SELECT id, name, price, duration_days FROM membership_plans WHERE is_active = true ORDER BY price ASC"
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Add Member</h1>
          <p className="page-subtitle">Create a new gym member account</p>
        </div>
      </div>
      <MemberForm plans={plans ?? []} />
    </div>
  );
}
