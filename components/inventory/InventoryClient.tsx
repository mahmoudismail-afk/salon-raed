'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Package, ShoppingCart, TrendingUp, TrendingDown,
  AlertTriangle, Pencil, Trash2, RefreshCcw, CheckCircle, AlertCircle, Filter,
} from 'lucide-react';
import { createInventoryItem, updateInventoryItem, deleteInventoryItem, recordInventoryTransaction } from '@/lib/actions/inventory';
import { formatDate } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import CurrencyInput from '@/components/ui/CurrencyInput';
import { useCurrency } from '@/contexts/CurrencyContext';

export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  cost_price: number;
  sell_price: number;
  stock_qty: number;
  low_stock_threshold: number;
  is_active: boolean;
  created_at: string;
};

export type InventoryTransaction = {
  id: string;
  item_id: string;
  type: 'sale' | 'restock';
  quantity: number;
  unit_price: number;
  total_amount: number;
  notes?: string | null;
  created_at: string;
  inventory_items?: { name: string };
};

const CATEGORIES = ['drinks', 'snacks', 'supplements', 'other'];
const EMPTY_ITEM = { name: '', category: 'drinks', cost_price: '', sell_price: '', stock_qty: '', low_stock_threshold: '5' };
const EMPTY_TXN = { type: 'sale' as 'sale' | 'restock', quantity: '1', notes: '' };

export default function InventoryClient({
  initialItems,
  initialTransactions,
}: {
  initialItems: InventoryItem[];
  initialTransactions: InventoryTransaction[];
}) {
  const router = useRouter();
  const { format } = useCurrency();
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>(initialTransactions);
  const [tab, setTab] = useState<'products' | 'transactions'>('products');
  const [filterCategory, setFilterCategory] = useState('');

  // Product modal
  const [itemModal, setItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm] = useState({ ...EMPTY_ITEM });
  const [savingItem, setSavingItem] = useState(false);
  const [itemError, setItemError] = useState('');
  const [deleteItem, setDeleteItem] = useState<InventoryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);

  // Transaction modal
  const [txnModal, setTxnModal] = useState(false);
  const [txnItem, setTxnItem] = useState<InventoryItem | null>(null);
  const [txnForm, setTxnForm] = useState({ ...EMPTY_TXN });
  const [savingTxn, setSavingTxn] = useState(false);
  const [txnError, setTxnError] = useState('');

  // ── Stats ──────────────────────────────────────────────
  const totalRevenue = transactions.filter(t => t.type === 'sale').reduce((s, t) => s + Number(t.total_amount), 0);
  const totalCosts = transactions.filter(t => t.type === 'restock').reduce((s, t) => s + Number(t.total_amount), 0);
  const inventoryProfit = totalRevenue - totalCosts;
  const inventoryValue = items.reduce((s, i) => s + i.stock_qty * Number(i.cost_price), 0);
  const lowStockItems = items.filter(i => i.stock_qty <= i.low_stock_threshold && i.is_active);

  // ── Filtered items ─────────────────────────────────────
  const filteredItems = useMemo(() =>
    items.filter(i => !filterCategory || i.category === filterCategory)
  , [items, filterCategory]);

  // ── Item CRUD ──────────────────────────────────────────
  function openAddItem() {
    setEditingItem(null);
    setItemForm({ ...EMPTY_ITEM });
    setItemError('');
    setItemModal(true);
  }
  function openEditItem(item: InventoryItem) {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      category: item.category,
      cost_price: item.cost_price.toString(),
      sell_price: item.sell_price.toString(),
      stock_qty: item.stock_qty.toString(),
      low_stock_threshold: item.low_stock_threshold.toString(),
    });
    setItemError('');
    setItemModal(true);
  }

  async function handleSaveItem() {
    if (!itemForm.name.trim()) { setItemError('Name is required.'); return; }
    const cost = parseFloat(itemForm.cost_price);
    const sell = parseFloat(itemForm.sell_price);
    const qty = parseInt(itemForm.stock_qty);
    const threshold = parseInt(itemForm.low_stock_threshold);
    if (isNaN(cost) || cost < 0) { setItemError('Enter a valid cost price.'); return; }
    if (isNaN(sell) || sell < 0) { setItemError('Enter a valid sell price.'); return; }
    if (isNaN(qty) || qty < 0) { setItemError('Enter a valid quantity.'); return; }

    setSavingItem(true);
    setItemError('');
    const payload = {
      name: itemForm.name.trim(),
      category: itemForm.category,
      cost_price: cost,
      sell_price: sell,
      stock_qty: qty,
      low_stock_threshold: isNaN(threshold) ? 5 : threshold,
    };

    if (editingItem) {
      const { error } = await updateInventoryItem(editingItem.id, payload);
      if (error) { setItemError(error); setSavingItem(false); return; }
      setItems((prev) => prev.map((i) => i.id === editingItem.id ? { ...i, ...payload } : i));
    } else {
      const { data, error } = await createInventoryItem(payload);
      if (error) { setItemError(error); setSavingItem(false); return; }
      if (data) setItems((prev) => [data, ...prev]);
    }
    setSavingItem(false);
    setItemModal(false);
    router.refresh();
  }

  async function handleDeleteItem() {
    if (!deleteItem) return;
    setDeletingItem(true);
    await deleteInventoryItem(deleteItem.id);
    setItems((prev) => prev.filter((i) => i.id !== deleteItem.id));
    setDeleteItem(null);
    setDeletingItem(false);
    router.refresh();
  }

  // ── Transaction (Sale / Restock) ───────────────────────
  function openTxnModal(item: InventoryItem, type: 'sale' | 'restock') {
    setTxnItem(item);
    setTxnForm({ type, quantity: '1', notes: '' });
    setTxnError('');
    setTxnModal(true);
  }

  async function handleSaveTxn() {
    if (!txnItem) return;
    const qty = parseInt(txnForm.quantity);
    if (isNaN(qty) || qty <= 0) { setTxnError('Quantity must be at least 1.'); return; }
    if (txnForm.type === 'sale' && qty > txnItem.stock_qty) {
      setTxnError(`Not enough stock. Available: ${txnItem.stock_qty}`);
      return;
    }

    setSavingTxn(true);
    setTxnError('');
    const unitPrice = txnForm.type === 'sale' ? txnItem.sell_price : txnItem.cost_price;
    const totalAmount = qty * unitPrice;
    const newStock = txnForm.type === 'sale' ? txnItem.stock_qty - qty : txnItem.stock_qty + qty;

    setItems(prev => prev.map(i => i.id === txnItem.id ? { ...i, stock_qty: newStock } : i));
    setSavingTxn(false);
    setTxnModal(false);
    router.refresh();
  }

  const categoryColor: Record<string, string> = {
    drinks: '#3b82f6',
    snacks: '#f59e0b',
    supplements: '#8b5cf6',
    other: '#6b7280',
  };

  return (
    <>
      {/* Stats */}
      <div className="grid-stats" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Inventory Value', value: format(inventoryValue), icon: Package, color: '#6c63ff', bg: 'rgba(108,99,255,0.15)' },
          { label: 'Shop Revenue', value: format(totalRevenue), icon: TrendingUp, color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
          { label: 'Purchase Costs', value: format(totalCosts), icon: TrendingDown, color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
          { label: 'Shop Profit', value: format(inventoryProfit), icon: ShoppingCart, color: inventoryProfit >= 0 ? '#10b981' : '#ef4444', bg: inventoryProfit >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={20} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{label}</p>
              <p style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Low stock warning */}
      {lowStockItems.length > 0 && (
        <div className="alert" style={{ marginBottom: '1.25rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', borderRadius: 10, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem' }}>
          <AlertTriangle size={16} />
          <span><strong>{lowStockItems.length}</strong> item{lowStockItems.length > 1 ? 's are' : ' is'} low on stock: {lowStockItems.map(i => i.name).join(', ')}</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {(['products', 'transactions'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`btn ${tab === t ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            style={{ textTransform: 'capitalize' }}
          >
            {t === 'products' ? <Package size={14} /> : <RefreshCcw size={14} />}
            {t === 'products' ? 'Products' : 'Transactions'}
          </button>
        ))}
      </div>

      {/* Products Tab */}
      {tab === 'products' && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Filter size={15} style={{ color: 'var(--text-muted)' }} />
              <select className="form-input" style={{ width: 'auto', minWidth: 140, padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}
                value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                <option value="">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}
              </select>
            </div>
            <button className="btn btn-primary btn-sm" onClick={openAddItem} id="add-product-btn">
              <Plus size={15} /> Add Product
            </button>
          </div>

          {filteredItems.length === 0 ? (
            <div className="empty-state" style={{ padding: '3rem' }}>
              <Package size={40} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
              <p style={{ color: 'var(--text-muted)' }}>No products yet. Add your first product.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Cost</th>
                    <th>Sell Price</th>
                    <th>Margin</th>
                    <th>Stock</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(item => {
                    const margin = item.sell_price - item.cost_price;
                    const marginPct = item.cost_price > 0 ? ((margin / item.cost_price) * 100).toFixed(0) : '—';
                    const isLow = item.stock_qty <= item.low_stock_threshold;
                    return (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{item.name}</td>
                        <td>
                          <span className="badge" style={{ background: `${categoryColor[item.category]}20`, color: categoryColor[item.category], textTransform: 'capitalize', border: 'none' }}>
                            {item.category}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>{format(item.cost_price)}</td>
                        <td style={{ color: 'var(--success)', fontWeight: 600 }}>{format(item.sell_price)}</td>
                        <td>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: margin >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                            {format(margin)} ({marginPct}%)
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: isLow ? '#f59e0b' : 'var(--text-primary)' }}>
                            {item.stock_qty}
                            {isLow && <AlertTriangle size={12} style={{ marginLeft: 4, color: '#f59e0b', verticalAlign: 'middle' }} />}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'center' }}>
                            <button className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--success)', border: 'none', fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                              onClick={() => openTxnModal(item, 'sale')} title="Record Sale">
                              Sell
                            </button>
                            <button className="btn btn-sm" style={{ background: 'rgba(108,99,255,0.12)', color: 'var(--primary)', border: 'none', fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                              onClick={() => openTxnModal(item, 'restock')} title="Restock">
                              Restock
                            </button>
                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEditItem(item)} title="Edit"><Pencil size={13} /></button>
                            <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--danger)' }} onClick={() => setDeleteItem(item)} title="Delete"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Transactions Tab */}
      {tab === 'transactions' && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-primary)' }}>
            Transaction History
          </div>
          {transactions.length === 0 ? (
            <div className="empty-state" style={{ padding: '3rem' }}>
              <RefreshCcw size={40} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
              <p style={{ color: 'var(--text-muted)' }}>No transactions yet. Record a sale or restock from the Products tab.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {[...transactions].sort((a, b) => b.created_at.localeCompare(a.created_at)).map(txn => (
                    <tr key={txn.id}>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{formatDate(txn.created_at)}</td>
                      <td style={{ fontWeight: 500 }}>{txn.inventory_items?.name ?? '—'}</td>
                      <td>
                        <span className="badge" style={{
                          background: txn.type === 'sale' ? 'rgba(16,185,129,0.12)' : 'rgba(108,99,255,0.12)',
                          color: txn.type === 'sale' ? 'var(--success)' : 'var(--primary)',
                          border: 'none', textTransform: 'capitalize',
                        }}>
                          {txn.type === 'sale' ? '↑ Sale' : '↓ Restock'}
                        </span>
                      </td>
                      <td>{txn.quantity}</td>
                      <td>{format(txn.unit_price)}</td>
                      <td style={{ fontWeight: 600, color: txn.type === 'sale' ? 'var(--success)' : 'var(--danger)' }}>
                        {txn.type === 'sale' ? '+' : '-'}{format(txn.total_amount)}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{txn.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Product Modal */}
      <Modal isOpen={itemModal} onClose={() => setItemModal(false)} title={editingItem ? 'Edit Product' : 'Add Product'}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setItemModal(false)}>Cancel</button>
          <button className={`btn btn-primary ${savingItem ? 'btn-loading' : ''}`} onClick={handleSaveItem} disabled={savingItem} id="save-product-btn">
            {savingItem ? <span className="spinner" /> : <CheckCircle size={15} />}
            {savingItem ? 'Saving...' : editingItem ? 'Update' : 'Add Product'}
          </button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {itemError && <div className="alert alert-danger"><AlertCircle size={15} /><span>{itemError}</span></div>}
          <div className="grid-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Name <span className="required">*</span></label>
              <input className="form-input" value={itemForm.name} onChange={e => setItemForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Water Bottle" />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input" value={itemForm.category} onChange={e => setItemForm(p => ({ ...p, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Cost Price <span className="required">*</span></label>
              <CurrencyInput
                valueUsd={itemForm.cost_price}
                onChange={val => setItemForm(p => ({ ...p, cost_price: val }))}
                id="item-cost-price"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Sell Price <span className="required">*</span></label>
              <CurrencyInput
                valueUsd={itemForm.sell_price}
                onChange={val => setItemForm(p => ({ ...p, sell_price: val }))}
                id="item-sell-price"
              />
            </div>
          </div>
          <div className="grid-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Current Stock</label>
              <input type="number" min="0" className="form-input" value={itemForm.stock_qty} onChange={e => setItemForm(p => ({ ...p, stock_qty: e.target.value }))} placeholder="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Low Stock Alert At</label>
              <input type="number" min="0" className="form-input" value={itemForm.low_stock_threshold} onChange={e => setItemForm(p => ({ ...p, low_stock_threshold: e.target.value }))} placeholder="5" />
            </div>
          </div>
        </div>
      </Modal>

      {/* Sale/Restock Modal */}
      <Modal isOpen={txnModal} onClose={() => setTxnModal(false)}
        title={txnForm.type === 'sale' ? `Sell — ${txnItem?.name}` : `Restock — ${txnItem?.name}`}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setTxnModal(false)}>Cancel</button>
          <button className={`btn btn-primary ${savingTxn ? 'btn-loading' : ''}`} onClick={handleSaveTxn} disabled={savingTxn} id="confirm-txn-btn">
            {savingTxn ? <span className="spinner" /> : <CheckCircle size={15} />}
            {savingTxn ? 'Saving...' : txnForm.type === 'sale' ? 'Record Sale' : 'Record Restock'}
          </button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {txnError && <div className="alert alert-danger"><AlertCircle size={15} /><span>{txnError}</span></div>}
          {txnItem && (
            <div style={{ background: 'var(--bg-base)', borderRadius: 10, padding: '0.875rem', fontSize: '0.875rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div><p style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Current Stock</p><p style={{ fontWeight: 700 }}>{txnItem.stock_qty}</p></div>
              <div><p style={{ color: 'var(--text-muted)', marginBottom: 2 }}>{txnForm.type === 'sale' ? 'Sell Price' : 'Cost Price'}</p><p style={{ fontWeight: 700, color: 'var(--success)' }}>{format(txnForm.type === 'sale' ? txnItem.sell_price : txnItem.cost_price)}</p></div>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Quantity <span className="required">*</span></label>
            <input type="number" min="1" className="form-input" value={txnForm.quantity} onChange={e => setTxnForm(p => ({ ...p, quantity: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input type="text" className="form-input" value={txnForm.notes} onChange={e => setTxnForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional…" />
          </div>
          {txnItem && txnForm.quantity && !isNaN(parseInt(txnForm.quantity)) && (
            <div style={{ textAlign: 'right', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Total: <strong style={{ color: 'var(--primary)' }}>{format(parseInt(txnForm.quantity) * (txnForm.type === 'sale' ? txnItem.sell_price : txnItem.cost_price))}</strong>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDeleteItem}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteItem?.name}"? All transactions for this product will also be deleted.`}
        confirmLabel="Delete Product"
        loading={deletingItem}
      />
    </>
  );
}
