import { query } from '@/lib/db';
import Link from 'next/link';
import { UserPlus, Search } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import MembersTable from '@/components/members/MembersTable';
import { requirePermission } from '@/lib/auth-guard';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Members' };

export default async function MembersPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  await requirePermission('members');
  const q = resolvedSearchParams.q ?? '';
  const status = resolvedSearchParams.status ?? '';
  
  let sql = `
    SELECT 
      m.id, m.status, m.created_at, m.gender,
      p.full_name, p.email, p.phone, p.avatar_url,
      ms.start_date, ms.end_date, ms.status as membership_status,
      mp.name as plan_name
    FROM members m
    LEFT JOIN profiles p ON m.profile_id = p.id
    LEFT JOIN memberships ms ON m.id = ms.member_id
    LEFT JOIN membership_plans mp ON ms.plan_id = mp.id
  `;
  let params: any[] = [];
  if (status) {
    sql += ' WHERE m.status = $1';
    params.push(status);
  }
  sql += ' ORDER BY m.created_at DESC';

  const { rows } = await query(sql, params);

  const membersMap = new Map();
  rows.forEach((r: any) => {
    if (!membersMap.has(r.id)) {
      membersMap.set(r.id, {
        id: r.id,
        status: r.status,
        created_at: r.created_at,
        gender: r.gender,
        profile: {
          full_name: r.full_name,
          email: r.email,
          phone: r.phone,
          avatar_url: r.avatar_url
        },
        memberships: []
      });
    }
    if (r.membership_status) {
      membersMap.get(r.id).memberships.push({
        start_date: r.start_date,
        end_date: r.end_date,
        status: r.membership_status,
        plan: { name: r.plan_name }
      });
    }
  });
  
  const members = Array.from(membersMap.values());

  // Filter by name/email client-side from the fetched data
  const filtered = (members ?? []).filter((m: any) => {
    if (!q) return true;
    const name = m.profile?.full_name?.toLowerCase() ?? '';
    const email = m.profile?.email?.toLowerCase() ?? '';
    return name.includes(q.toLowerCase()) || email.includes(q.toLowerCase());
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Members</h1>
          <p className="page-subtitle">{filtered.length} member{filtered.length !== 1 ? 's' : ''} found</p>
        </div>
        <Link href="/members/new" className="btn btn-primary" id="add-member-btn">
          <UserPlus size={16} />
          Add Member
        </Link>
      </div>

      {/* Filters */}
      <div className="search-bar" style={{ marginBottom: '1.5rem' }}>
        <form className="search-input-wrapper" action="/members" method="get">
          <Search size={16} className="search-icon" />
          <input
            name="q"
            type="search"
            className="search-input"
            placeholder="Search by name or email..."
            defaultValue={q}
            id="member-search"
          />
        </form>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['', 'active', 'inactive', 'paused', 'expired'].map((s) => (
            <Link
              key={s}
              href={s ? `/members?status=${s}${q ? `&q=${q}` : ''}` : `/members${q ? `?q=${q}` : ''}`}
              className={`btn btn-sm ${status === s ? 'btn-primary' : 'btn-secondary'}`}
            >
              {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
            </Link>
          ))}
        </div>
      </div>

      <MembersTable members={filtered} />
    </div>
  );
}
