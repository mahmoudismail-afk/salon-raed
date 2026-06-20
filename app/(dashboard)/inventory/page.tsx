import { query } from '@/lib/db';
import InventoryClient from '@/components/inventory/InventoryClient';
import { requirePermission } from '@/lib/auth-guard';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Inventory & Shop' };

export default async function InventoryPage() {
  await requirePermission('inventory');

  const [itemsRes, transactionsRes] = await Promise.all([
    query('SELECT * FROM inventory_items ORDER BY created_at DESC'),
    query(`
      SELECT t.*, i.name as item_name 
      FROM inventory_transactions t 
      LEFT JOIN inventory_items i ON t.item_id = i.id 
      ORDER BY t.created_at DESC
    `),
  ]);

  const items = itemsRes.rows;
  const transactions = transactionsRes.rows.map(r => ({
    ...r,
    inventory_items: { name: r.item_name }
  }));

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
          Inventory & Shop
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Manage products, track stock, record sales and restocks.
        </p>
      </div>
      <InventoryClient
        initialItems={items ?? []}
        initialTransactions={transactions ?? []}
      />
    </div>
  );
}
