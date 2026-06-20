import { query } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import MemberForm from '@/components/members/MemberForm';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Edit Member' };

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [
    { rows: memberRows },
    { rows: plans }
  ] = await Promise.all([
    query(`
      SELECT m.*, p.full_name, p.email, p.phone, p.avatar_url 
      FROM members m 
      LEFT JOIN profiles p ON m.profile_id = p.id 
      WHERE m.id = $1 LIMIT 1
    `, [id]),
    query("SELECT id, name, price, duration_days FROM membership_plans WHERE is_active = true ORDER BY price ASC")
  ]);

  const memberData = memberRows[0];
  if (!memberData) notFound();

  const member = {
    ...memberData,
    profile: {
      full_name: memberData.full_name,
      email: memberData.email,
      phone: memberData.phone,
      avatar_url: memberData.avatar_url
    }
  };

  if (!member) notFound();

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href={`/members/${id}`} className="btn btn-ghost btn-icon">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="page-title">Edit Member</h1>
            <p className="page-subtitle">{member.profile?.full_name ?? 'Member'}</p>
          </div>
        </div>
      </div>
      <MemberForm
        plans={plans ?? []}
        member={member}
        profile={member.profile}
        isEdit
      />
    </div>
  );
}
