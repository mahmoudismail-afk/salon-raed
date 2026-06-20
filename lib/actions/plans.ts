'use server';

import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createPlan(payload: any) {
  try {
    const { rows } = await query(
      'INSERT INTO membership_plans (name, description, price, duration_days, features, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [payload.name, payload.description || null, payload.price, payload.duration_days, payload.features || [], payload.is_active]
    );
    revalidatePath('/plans');
    return { data: rows[0] };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function updatePlan(id: string, payload: any) {
  try {
    const { rows } = await query(
      'UPDATE membership_plans SET name = $1, description = $2, price = $3, duration_days = $4, features = $5, is_active = $6 WHERE id = $7 RETURNING *',
      [payload.name, payload.description || null, payload.price, payload.duration_days, payload.features || [], payload.is_active, id]
    );
    revalidatePath('/plans');
    return { data: rows[0] };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function deletePlan(id: string) {
  try {
    await query('DELETE FROM membership_plans WHERE id = $1', [id]);
    revalidatePath('/plans');
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}
