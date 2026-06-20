import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { query } from '@/lib/db';
import SettingsClient from '@/components/settings/SettingsClient';
import { getStaffPermissions, getLbpRate } from '@/lib/actions/settings';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Settings' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { rows: profileRows } = await query(
    'SELECT id, full_name, email, phone, role, avatar_url FROM profiles WHERE auth_id = $1 LIMIT 1',
    [user.id]
  );
  const profile = profileRows[0];

  let allUsers: any[] = [];
  if (profile?.role === 'admin') {
    const { rows } = await query(
      "SELECT id, auth_id, full_name, email, phone, role, created_at FROM profiles WHERE role IN ('admin', 'staff') ORDER BY created_at"
    );
    allUsers = rows ?? [];
  }

  const [staffPermissions, lbpRate] = await Promise.all([
    getStaffPermissions(),
    getLbpRate(),
  ]);

  return (
    <SettingsClient
      profile={profile}
      userId={user.id}
      allUsers={allUsers}
      staffPermissions={staffPermissions}
      initialLbpRate={lbpRate}
    />
  );
}
