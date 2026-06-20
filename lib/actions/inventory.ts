'use server';

import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createInventoryItem(payload: any) {
  try {
    const { rows } = await query(
      'INSERT INTO inventory_items (name, category, price, stock_quantity, low_stock_threshold) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [payload.name, payload.category, payload.price, payload.stock_quantity, payload.low_stock_threshold]
    );
    revalidatePath('/inventory');
    return { data: rows[0] };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function updateInventoryItem(id: string, payload: any) {
  try {
    const { rows } = await query(
      'UPDATE inventory_items SET name = $1, category = $2, price = $3, stock_quantity = $4, low_stock_threshold = $5 WHERE id = $6 RETURNING *',
      [payload.name, payload.category, payload.price, payload.stock_quantity, payload.low_stock_threshold, id]
    );
    revalidatePath('/inventory');
    return { data: rows[0] };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function deleteInventoryItem(id: string) {
  try {
    await query('DELETE FROM inventory_items WHERE id = $1', [id]);
    revalidatePath('/inventory');
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function recordInventoryTransaction(payload: any, newStockQuantity: number) {
  try {
    // 1. Update stock
    await query('UPDATE inventory_items SET stock_quantity = $1 WHERE id = $2', [newStockQuantity, payload.item_id]);
    // 2. Record transaction
    const { rows } = await query(
      'INSERT INTO inventory_transactions (item_id, type, quantity, total_amount, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [payload.item_id, payload.type, payload.quantity, payload.total_amount, payload.notes || null]
    );
    revalidatePath('/inventory');
    return { data: rows[0] };
  } catch (err: any) {
    return { error: err.message };
  }
}
