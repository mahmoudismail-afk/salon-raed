import { query } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Edit, ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import MemberDetailClient from '@/components/members/MemberDetailClient';

export const metadata: Metadata = { title: 'Member Profile' };

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [
    { rows: memberRows },
    { rows: membershipsRows },
    { rows: paymentsRows },
    { rows: plans }
  ] = await Promise.all([
    query(`
      SELECT m.*, p.full_name, p.email, p.phone, p.avatar_url 
      FROM members m 
      LEFT JOIN profiles p ON m.profile_id = p.id 
      WHERE m.id = $1 LIMIT 1
    `, [id]),
    query(`
      SELECT ms.*, mp.name as plan_name, mp.price as plan_price, mp.duration_days as plan_duration_days
      FROM memberships ms 
      LEFT JOIN membership_plans mp ON ms.plan_id = mp.id 
      WHERE ms.member_id = $1
    `, [id]),
    query(`
      SELECT id, amount, payment_method, payment_date, notes 
      FROM payments 
      WHERE member_id = $1
    `, [id]),
    query("SELECT * FROM membership_plans WHERE is_active = true ORDER BY price ASC")
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
    },
    memberships: membershipsRows.map((ms: any) => ({
      ...ms,
      plan: { name: ms.plan_name, price: ms.plan_price, duration_days: ms.plan_duration_days }
    })),
    payments: paymentsRows
  };

  if (!member) notFound();

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/members" className="btn btn-ghost btn-icon">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="page-title">Member Profile</h1>
            <p className="page-subtitle">Full details and history</p>
          </div>
        </div>
        <Link href={`/members/${id}/edit`} className="btn btn-secondary" id="edit-member-btn">
          <Edit size={16} /> Edit Member
        </Link>
      </div>

      <MemberDetailClient member={member} plans={plans ?? []} />
    </div>
  );
}
