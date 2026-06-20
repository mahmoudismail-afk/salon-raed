'use server';

import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createExpense(payload: any) {
  try {
    const { rows } = await query(
      'INSERT INTO expenses (type, title, amount, date, notes, is_recurring) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [payload.type, payload.title, payload.amount, payload.date, payload.notes || null, payload.is_recurring]
    );
    revalidatePath('/expenses');
    return { data: rows[0] };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function updateExpense(id: string, payload: any) {
  try {
    const { rows } = await query(
      'UPDATE expenses SET type = $1, title = $2, amount = $3, date = $4, notes = $5, is_recurring = $6 WHERE id = $7 RETURNING *',
      [payload.type, payload.title, payload.amount, payload.date, payload.notes || null, payload.is_recurring, id]
    );
    revalidatePath('/expenses');
    return { data: rows[0] };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function deleteExpense(id: string) {
  try {
    await query('DELETE FROM expenses WHERE id = $1', [id]);
    revalidatePath('/expenses');
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}
