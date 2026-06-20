'use server';

import { createClient } from '@supabase/supabase-js';
import { query } from '@/lib/db';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
  );
}

export async function registerAdmin(data: { username: string; password: string; fullName: string; phone: string }) {
  try {
    const supabaseAdmin = getAdminClient();
    const emailToAuth = `${data.username.trim()}@salonraed.local`;

    const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
      email: emailToAuth,
      password: data.password,
      email_confirm: true, // This is the magic key that skips email confirmation
      user_metadata: {
        full_name: data.fullName,
        phone: data.phone,
        role: 'admin',
      },
    });

    if (error) {
      return { error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to create account.' };
  }
}

export async function getUserRole(authId: string) {
  try {
    const { rows } = await query(
      'SELECT role FROM profiles WHERE auth_id = $1 LIMIT 1',
      [authId]
    );
    return { data: rows[0] || null };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Change password for the currently logged-in user using the admin SDK.
 * This is reliable on Cloudflare Workers because it doesn't depend on
 * browser session cookies being forwarded correctly.
 */
export async function changePassword(authId: string, newPassword: string) {
  try {
    if (!newPassword || newPassword.length < 6) {
      return { error: 'Password must be at least 6 characters.' };
    }
    const supabaseAdmin = getAdminClient();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(authId, {
      password: newPassword,
    });
    if (error) return { error: error.message };
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to update password.' };
  }
}

/**
 * Sign out the user server-side by revoking their session.
 * Returns success/error — the caller should then do a hard redirect to /login.
 */
export async function serverSignOut(authId: string) {
  try {
    const supabaseAdmin = getAdminClient();
    // Sign out all sessions for this user
    await supabaseAdmin.auth.admin.signOut(authId);
    return { success: true };
  } catch (err: any) {
    // Even if this fails, we still want the client to redirect to /login
    return { success: true };
  }
}
