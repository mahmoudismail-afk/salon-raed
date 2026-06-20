'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Edit, Trash2, RefreshCw, MessageCircle } from 'lucide-react';
import { getInitials, getMemberStatusColor, formatDate } from '@/lib/utils';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { deleteMember, autoExpireMemberships } from '@/lib/actions/members';

interface MembersTableProps {
  members: any[];
}

// Compute days left for a member based on their active membership
function getDaysLeft(m: any): number | null {
  const memberships: any[] = m.memberships ?? [];
  const active = memberships
    .filter((ms: any) => ms.status === 'active')
    .sort((a: any, b: any) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())[0];
  if (!active?.end_date) return null;
  const diff = new Date(active.end_date).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function MembersTable({ members }: MembersTableProps) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  // 'none' = default order, 'asc' = expiring soonest first, 'desc' = most time remaining first
  const [sortDays, setSortDays] = useState<'none' | 'asc' | 'desc'>('none');
  // 'none' = default, 'asc' = A→Z, 'desc' = Z→A
  const [sortName, setSortName] = useState<'none' | 'asc' | 'desc'>('none');
  
  const sendReminder = (m: any, dLeft: number) => {
    const phone = m.profile?.phone ?? '';
    if (!phone) return;
    const name = m.profile?.full_name ?? 'there';
    const message = `Hello ${name}, your membership at Salon Raed expires ${dLeft === 0 ? 'today' : dLeft === 1 ? 'tomorrow' : `in ${dLeft} days`}! Don't forget to renew.`;
    const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Auto-expire: when the table loads, patch any membership/member whose end_date has passed
  useEffect(() => {
    async function autoExpire() {
      const { count } = await autoExpireMemberships();
      if (count && count > 0) {
        router.refresh();
      }
    }

    autoExpire();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    await deleteMember(deleteId);
    setDeleteId(null);
    setDeleting(false);
    router.refresh();
  }

  function cycleSortDays() {
    setSortDays(prev => prev === 'none' ? 'asc' : prev === 'asc' ? 'desc' : 'none');
  }

  function cycleSortName() {
    setSortName(prev => prev === 'none' ? 'asc' : prev === 'asc' ? 'desc' : 'none');
  }

  // Helper: build a sort icon for a given sort state
  function SortIcon({ state }: { state: 'none' | 'asc' | 'desc' }) {
    if (state === 'none') return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        style={{ opacity: 0.4, verticalAlign: 'middle' }}>
        <path d="M8 9l4-4 4 4M8 15l4 4 4-4"/>
      </svg>
    );
    if (state === 'asc') return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        style={{ color: 'var(--primary)', verticalAlign: 'middle' }}>
        <path d="M5 15l7-7 7 7"/>
      </svg>
    );
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        style={{ color: 'var(--primary)', verticalAlign: 'middle' }}>
        <path d="M5 9l7 7 7-7"/>
      </svg>
    );
  }

  const sortedMembers = [...members].sort((a, b) => {
    // Name sort applied first
    if (sortName !== 'none') {
      const na = (a.profile?.full_name ?? '').toLowerCase();
      const nb = (b.profile?.full_name ?? '').toLowerCase();
      const cmp = na.localeCompare(nb);
      if (cmp !== 0) return sortName === 'asc' ? cmp : -cmp;
    }
    // Days-left sort applied second
    if (sortDays !== 'none') {
      const da = getDaysLeft(a);
      const db = getDaysLeft(b);
      if (da === null && db === null) return 0;
      if (da === null) return 1;
      if (db === null) return -1;
      return sortDays === 'asc' ? da - db : db - da;
    }
    return 0;
  });



  if (members.length === 0) {
    return (
      <div className="card empty-state">
        <div className="empty-state-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <h3 style={{ color: 'var(--text-primary)' }}>No members found</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Add your first member to get started.
        </p>
        <Link href="/members/new" className="btn btn-primary btn-sm">Add Member</Link>
      </div>
    );
  }

  return (
    <>
      <div className="table-wrapper">
        <table className="table" id="members-table">
          <thead>
            <tr>
              <th>
                <button
                  onClick={cycleSortName}
                  id="sort-name-btn"
                  title={sortName === 'none' ? 'Sort A→Z' : sortName === 'asc' ? 'Sort Z→A' : 'Clear sort'}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: sortName !== 'none' ? 'var(--primary)' : 'inherit',
                    fontWeight: sortName !== 'none' ? 700 : 'inherit',
                    fontSize: 'inherit',
                    padding: 0,
                    transition: 'color 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Member
                  <SortIcon state={sortName} />
                </button>
              </th>
              <th>Contact</th>
              <th>Status</th>
              <th>
                <button
                  onClick={cycleSortDays}
                  id="sort-days-left-btn"
                  title={
                    sortDays === 'none'
                      ? 'Sort by days left (expiring soonest first)'
                      : sortDays === 'asc'
                      ? 'Sort by days left (most time remaining first)'
                      : 'Clear sort'
                  }
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: sortDays !== 'none' ? 'var(--primary)' : 'inherit',
                    fontWeight: sortDays !== 'none' ? 700 : 'inherit',
                    fontSize: 'inherit',
                    padding: 0,
                    transition: 'color 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Joined / Days Left
                  <SortIcon state={sortDays} />
                </button>
              </th>
              <th>Plan</th>
              <th style={{ textAlign: 'center' }}>Subscription</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedMembers.map((m: any) => {
              const name = m.profile?.full_name ?? 'Unknown';
              const email = m.profile?.email ?? '';
              const phone = m.profile?.phone ?? '';
              const avatar = m.profile?.avatar_url;
              const memberships: any[] = m.memberships ?? [];
              const active = memberships
                .filter((ms: any) => ms.status === 'active')
                .sort((a: any, b: any) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())[0];
              const earliest = [...memberships]
                .sort((a: any, b: any) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0];
              const date = active?.start_date ?? earliest?.start_date ?? m.created_at;
              const daysLeft = getDaysLeft(m);
              const planName = active?.plan?.name ?? '—';

              return (
                <tr key={m.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="avatar avatar-sm">
                        {avatar
                          ? <img src={avatar} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : getInitials(name)}
                      </div>
                  <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <p style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{name}</p>
                          {m.gender === 'male' && (
                            <span title="Male" style={{ fontSize: '0.7rem', fontWeight: 700, color: '#60a5fa', background: 'rgba(96,165,250,0.12)', borderRadius: '999px', padding: '0.1rem 0.4rem', lineHeight: 1.4 }}>♂</span>
                          )}
                          {m.gender === 'female' && (
                            <span title="Female" style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f472b6', background: 'rgba(244,114,182,0.12)', borderRadius: '999px', padding: '0.1rem 0.4rem', lineHeight: 1.4 }}>♀</span>
                          )}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{email}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    {phone ? (
                      <a 
                        href={`https://wa.me/${phone.replace(/\\D/g, '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: 'var(--primary)', textDecoration: 'none' }}
                        title="Chat on WhatsApp"
                      >
                        {phone}
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-disabled)' }}>—</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${getMemberStatusColor(m.status)}`}>
                      {m.status}
                    </span>
                  </td>
                  <td>
                    <div>
                      <span>{formatDate(date)}</span>
                      {daysLeft !== null && (
                        <div style={{ marginTop: '0.2rem' }}>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '0.1rem 0.45rem',
                            borderRadius: '999px',
                            background: daysLeft <= 0 ? 'var(--danger-bg)' : daysLeft <= 7 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.12)',
                            color: daysLeft <= 0 ? 'var(--danger)' : daysLeft <= 7 ? 'var(--warning)' : 'var(--success)',
                          }}>
                            {daysLeft <= 0
                              ? daysLeft === 0
                                ? 'Expired today'
                                : `Expired ${Math.abs(daysLeft)}d ago`
                              : `${daysLeft}d left`}
                          </span>
                          {daysLeft !== null && daysLeft <= 1 && phone && (
                            <button
                              onClick={() => sendReminder(m, daysLeft)}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: '0 4px',
                                cursor: 'pointer',
                                color: '#25D366',
                                verticalAlign: 'middle',
                                marginLeft: '6px'
                              }}
                              title="Send WhatsApp Reminder"
                            >
                              <MessageCircle size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="badge" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                      {planName}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <Link href={`/members/${m.id}`} className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                      <RefreshCw size={12} style={{ marginRight: '4px' }} /> Renew
                    </Link>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                      <Link href={`/members/${m.id}`} className="btn btn-ghost btn-sm btn-icon" title="View">
                        <Eye size={15} />
                      </Link>
                      <Link href={`/members/${m.id}/edit`} className="btn btn-ghost btn-sm btn-icon" title="Edit">
                        <Edit size={15} />
                      </Link>
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        title="Delete"
                        onClick={() => setDeleteId(m.id)}
                        style={{ color: 'var(--danger)' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Member"
        message="Are you sure you want to delete this member? This action cannot be undone and will remove all their data."
        confirmLabel="Delete Member"
        loading={deleting}
      />
    </>
  );
}
