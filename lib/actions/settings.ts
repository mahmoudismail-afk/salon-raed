'use server';

import { createClient } from '@supabase/supabase-js';
import { query } from '@/lib/db';
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';
  
  return createClient(url, key);
}

export async function createStaffAccount(data: {
  username: string;
  password: string;
  fullName: string;
  phone: string;
  role: 'staff' | 'admin';
}) {
  const supabaseAdmin = getAdminClient();
  const email = `${data.username.trim()}@salonraed.local`;

  const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: data.password,
    email_confirm: true,
    user_metadata: { full_name: data.fullName, phone: data.phone, role: data.role },
  });

  if (createError) return { error: createError.message };

  // Update profile role (the trigger creates the profile with role from metadata)
  if (user.user) {
    await query(
      'UPDATE profiles SET role = $1, full_name = $2, phone = $3 WHERE auth_id = $4',
      [data.role, data.fullName, data.phone, user.user.id]
    );
  }

  return { success: true };
}

export async function deleteUser(profileId: string, authId?: string | null) {
  if (!profileId) return { error: 'No profile ID provided' };
  
  const supabaseAdmin = getAdminClient();
  
  // Delete the profile first
  try {
    await query('DELETE FROM profiles WHERE id = $1', [profileId]);
  } catch (err: any) {
    return { error: `Profile deletion failed: ${err.message}` };
  }

  // Then try to delete the auth user (if an authId exists)
  if (authId) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(authId);
    // If the auth user was already deleted from the dashboard, ignore the "User not found" error
    if (error && !error.message.toLowerCase().includes('user not found')) {
      return { error: `Auth deletion failed: ${error.message}` };
    }
  }
  
  return { success: true };
}

export async function updateProfile(profileId: string, data: { full_name: string; phone: string }) {
  try {
    await query(
      'UPDATE profiles SET full_name = $1, phone = $2 WHERE id = $3',
      [data.full_name, data.phone, profileId]
    );
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function getStaffPermissions(): Promise<string[]> {
  try {
    const { rows } = await query(
      "SELECT value FROM system_settings WHERE key = $1 LIMIT 1",
      ['staff_permissions']
    );
    let val = rows[0]?.value;
    if (typeof val === 'string') {
      try {
        val = JSON.parse(val);
      } catch (e) {
        // ignore
      }
    }
    return Array.isArray(val) ? val : ['dashboard', 'members', 'checkins', 'classes'];
  } catch (err) {
    console.error("Error fetching staff permissions directly:", err);
    return ['dashboard', 'members', 'checkins', 'classes'];
  }
}

export async function saveStaffPermissions(permissions: string[]) {
  try {
    // We store jsonb string representation
    const jsonStr = JSON.stringify(permissions);
    await query(
      "INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
      ['staff_permissions', jsonStr]
    );
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function getLbpRate(): Promise<number> {
  try {
    const { rows } = await query(
      "SELECT value FROM system_settings WHERE key = $1 LIMIT 1",
      ['lbp_rate']
    );
    const rate = Number(rows[0]?.value);
    return !isNaN(rate) && rate > 0 ? rate : 89500;
  } catch (err) {
    console.error("Error fetching LBP rate directly:", err);
    return 89500;
  }
}

export async function saveLbpRate(rate: number) {
  try {
    await query(
      "INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
      ['lbp_rate', String(rate)]
    );
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}
