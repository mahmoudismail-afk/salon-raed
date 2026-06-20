'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, DollarSign, AlertCircle, Trash2, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { createPayment, softDeletePayment, restorePayment } from '@/lib/actions/payments';
import { formatDate } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import CurrencyInput from '@/components/ui/CurrencyInput';
import { useCurrency } from '@/contexts/CurrencyContext';

const METHODS = ['cash', 'card', 'bank_transfer', 'other'];

function methodLabel(m: string) {
  return m.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PaymentsClient({
  payments: initial,
  deletedPayments: initialDeleted,
  members,
}: {
  payments: any[];
  deletedPayments: any[];
  members: any[];
}) {
  const router = useRouter();
  const { format } = useCurrency();
  const [payments, setPayments] = useState(initial);
  const [deletedPayments, setDeletedPayments] = useState(initialDeleted);
  const [showDeleted, setShowDeleted] = useState(false);

  // Add modal
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    member_id: '', payer_name: '', amount: '', payment_method: 'cash',
    payment_date: new Date().toISOString().split('T')[0], notes: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Delete / restore
  const [paymentToDelete, setPaymentToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoringId] = useState<string | null>(null);

  const filteredMembers = members.filter((m) =>
    (m.profile?.full_name ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRevenue = payments.reduce((s, p) => s + Number(p.amount), 0);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function resetModal() {
    setForm({ member_id: '', payer_name: '', amount: '', payment_method: 'cash', payment_date: new Date().toISOString().split('T')[0], notes: '' });
    setSearchTerm('');
    setError('');
  }

  async function handleSave() {
    if (!form.amount) { setError('Amount is required.'); return; }
    setError(''); setSaving(true);

    let notesValue = form.notes || null;
    if (!form.member_id && form.payer_name.trim()) {
      notesValue = form.notes
        ? `[Payer: ${form.payer_name.trim()}] ${form.notes}`
        : `[Payer: ${form.payer_name.trim()}]`;
    }

    const insertPayload: any = {
      amount: Number(form.amount),
      payment_method: form.payment_method,
      payment_date: form.payment_date,
      notes: notesValue,
    };
    if (form.member_id) insertPayload.member_id = form.member_id;

    const { data, error: err } = await createPayment(insertPayload);

    if (err) { setError(err); setSaving(false); return; }
    if (data) setPayments((prev) => [data, ...prev]);
    setModalOpen(false);
    setSaving(false);
    resetModal();
    router.refresh();
  }

  async function handleDelete() {
    if (!paymentToDelete) return;
    setDeleting(true);
    const now = new Date().toISOString();
    const { error: err } = await softDeletePayment(paymentToDelete.id);

    if (err) { setDeleting(false); return; }

    const deleted = { ...paymentToDelete, deleted_at: now };
    setPayments((prev) => prev.filter((p) => p.id !== paymentToDelete.id));
    setDeletedPayments((prev) => [deleted, ...prev]);
    setPaymentToDelete(null);
    setDeleting(false);
  }

  async function handleRestore(payment: any) {
    setRestoringId(payment.id);
    const { error: err } = await restorePayment(payment.id);

    if (!err) {
      const restored = { ...payment, deleted_at: null };
      setDeletedPayments((prev) => prev.filter((p) => p.id !== payment.id));
      setPayments((prev) => [restored, ...prev]);
    }
    setRestoringId(null);
  }

  function getPayerName(p: any) {
    if (p.member?.profile?.full_name) return p.member.profile.full_name;
    if (p.notes) {
      const match = p.notes.match(/^\[Payer: (.+?)\]/);
      if (match) return match[1];
    }
    return '—';
  }

  function PaymentRow({ p, showDelete }: { p: any; showDelete: boolean }) {
    const displayNotes = p.notes ? p.notes.replace(/^\[Payer: .+?\]\s*/, '') : '—';
    return (
      <tr key={p.id}>
        <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{getPayerName(p)}</td>
        <td style={{ color: 'var(--success)', fontWeight: 600 }}>
          {format(Number(p.amount))}
        </td>
        <td><span className="badge badge-neutral">{methodLabel(p.payment_method)}</span></td>
        <td>{formatDate(p.payment_date)}</td>
        <td style={{ color: 'var(--text-muted)' }}>{displayNotes || '—'}</td>
        <td>
          {showDelete ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-icon"
              style={{ color: 'var(--danger)' }}
              onClick={() => setPaymentToDelete(p)}
              title="Delete payment"
            >
              <Trash2 size={15} />
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--primary-light)', fontSize: '0.8rem' }}
              onClick={() => handleRestore(p)}
              disabled={restoring === p.id}
              title="Restore payment"
            >
              <RotateCcw size={13} />
              {restoring === p.id ? 'Restoring...' : 'Restore'}
            </button>
          )}
        </td>
      </tr>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="page-subtitle">Total collected: <strong style={{ color: 'var(--success)' }}>{format(totalRevenue)}</strong></p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)} id="add-payment-btn">
          <Plus size={16} /> Record Payment
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid-stats" style={{ marginBottom: '1.5rem' }}>
        {METHODS.map((method) => {
          const total = payments.filter((p) => p.payment_method === method).reduce((s, p) => s + Number(p.amount), 0);
          return (
            <div key={method} className="stat-card">
              <p className="stat-label">{methodLabel(method)}</p>
              <p className="stat-value" style={{ fontSize: '1.5rem' }}>{format(total)}</p>
            </div>
          );
        })}
      </div>

      {/* Active Payments Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table className="table" id="payments-table">
            <thead>
              <tr>
                <th>Member</th><th>Amount</th><th>Method</th><th>Date</th><th>Notes</th><th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No payments recorded yet.</td></tr>
              )}
              {payments.map((p) => <PaymentRow key={p.id} p={p} showDelete={true} />)}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deleted Payments Section */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <button
          type="button"
          onClick={() => setShowDeleted((v) => !v)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '1rem 1.25rem', background: 'none', border: 'none',
            cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.95rem',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Trash2 size={16} style={{ color: 'var(--danger)' }} />
            Deleted Payments
            <span className="badge badge-neutral" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
              {deletedPayments.length}
            </span>
          </span>
          {showDeleted ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showDeleted && (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Member</th><th>Amount</th><th>Method</th><th>Date</th><th>Notes</th><th style={{ width: 100 }}></th>
                </tr>
              </thead>
              <tbody>
                {deletedPayments.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No deleted payments.</td></tr>
                )}
                {deletedPayments.map((p) => <PaymentRow key={p.id} p={p} showDelete={false} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Record Payment"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className={`btn btn-primary ${saving ? 'btn-loading' : ''}`} onClick={handleSave} disabled={saving} id="save-payment-btn">
              {saving ? <span className="spinner" /> : <DollarSign size={15} />}
              {saving ? 'Saving...' : 'Record Payment'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && <div className="alert alert-danger"><AlertCircle size={15} />{error}</div>}

          {/* Name field */}
          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">Name <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>(optional — type any name or pick a member)</span></label>
            <input
              type="text"
              className="form-input"
              placeholder="Search member or type any name..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowDropdown(true);
                setForm((prev) => ({ ...prev, member_id: '', payer_name: e.target.value }));
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            />
            {showDropdown && filteredMembers.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                borderRadius: '0.5rem', marginTop: '0.25rem', maxHeight: 200, overflowY: 'auto',
                boxShadow: 'var(--shadow-lg)'
              }}>
                {filteredMembers.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => {
                      setForm((prev) => ({ ...prev, member_id: m.id, payer_name: '' }));
                      setSearchTerm(m.profile?.full_name ?? '');
                      setShowDropdown(false);
                    }}
                    style={{
                      padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                      color: form.member_id === m.id ? 'var(--primary)' : 'var(--text-primary)'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {m.profile?.full_name ?? 'Unknown'}
                  </div>
                ))}
              </div>
            )}
            {form.member_id && (
              <p style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '0.25rem' }}>✓ Linked to member record</p>
            )}
          </div>
          <div className="grid-2" style={{ gap: '0.875rem' }}>
            <div className="form-group">
              <label className="form-label">Amount <span className="required">*</span></label>
              <CurrencyInput
                valueUsd={form.amount}
                onChange={(val) => setForm(prev => ({ ...prev, amount: val }))}
                id="payment-amount"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select name="payment_method" className="form-input" value={form.payment_method} onChange={handleChange}>
                {METHODS.map((m) => <option key={m} value={m}>{methodLabel(m)}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Payment Date</label>
            <input name="payment_date" type="date" className="form-input" value={form.payment_date} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input name="notes" type="text" className="form-input" placeholder="e.g. Monthly renewal" value={form.notes} onChange={handleChange} />
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!paymentToDelete}
        onClose={() => setPaymentToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Payment"
        message={`Are you sure you want to delete the payment of ${paymentToDelete ? format(paymentToDelete.amount) : ''}? You can restore it later from the Deleted Payments section.`}
        confirmLabel="Delete"
        loading={deleting}
      />
    </>
  );
}
