import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { query } from '@/lib/db';
import { getStaffPermissions } from '@/lib/actions/settings';

/**
 * Call at the top of any server page/layout to require a specific role.
 * Redirects to /dashboard with a reason query param if the user doesn't have access.
 */
export async function requireRole(requiredRole: 'admin' | 'staff') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { rows } = await query(
    'SELECT role FROM profiles WHERE auth_id = $1 LIMIT 1',
    [user.id]
  );
  const profile = rows[0];

  if (!profile) {
    redirect('/login?error=account-disabled');
  }

  const role = profile.role;

  if (requiredRole === 'admin' && role !== 'admin') {
    redirect('/dashboard?access=denied');
  }

  return role;
}

/**
 * Call at the top of any server page to require a specific permission.
 * Admins always have all permissions. Staff are checked against the DB.
 */
export async function requirePermission(permissionKey: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { rows } = await query(
    'SELECT role FROM profiles WHERE auth_id = $1 LIMIT 1',
    [user.id]
  );
  const profile = rows[0];

  if (!profile) {
    redirect('/login?error=account-disabled');
  }

  const role = profile.role;

  if (role === 'admin') return role;

  const staffPerms = await getStaffPermissions();
  if (!staffPerms.includes(permissionKey)) {
    redirect('/dashboard?access=denied');
  }

  return role;
}
