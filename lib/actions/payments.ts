'use server';

import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createPayment(payload: any) {
  try {
    const { rows } = await query(
      'INSERT INTO payments (member_id, amount, payment_method, payment_date, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [payload.member_id || null, payload.amount, payload.payment_method, payload.payment_date, payload.notes || null]
    );
    // Fetch member full name
    let memberName = null;
    if (payload.member_id) {
      const { rows: memberRows } = await query(
        'SELECT p.full_name FROM members m LEFT JOIN profiles p ON m.profile_id = p.id WHERE m.id = $1',
        [payload.member_id]
      );
      if (memberRows.length > 0) memberName = memberRows[0].full_name;
    }

    const data = rows[0];
    data.member = { profile: { full_name: memberName } };

    revalidatePath('/payments');
    return { data };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function softDeletePayment(id: string) {
  try {
    const now = new Date().toISOString();
    await query('UPDATE payments SET deleted_at = $1 WHERE id = $2', [now, id]);
    revalidatePath('/payments');
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function restorePayment(id: string) {
  try {
    await query('UPDATE payments SET deleted_at = NULL WHERE id = $1', [id]);
    revalidatePath('/payments');
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}
