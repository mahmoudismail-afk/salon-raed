'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, Check, X, Scissors } from 'lucide-react';
import { createPlan, updatePlan, deletePlan } from '@/lib/actions/plans';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import CurrencyInput from '@/components/ui/CurrencyInput';
import { useCurrency } from '@/contexts/CurrencyContext';

interface Plan {
  id: string; name: string; description?: string;
  price: number; duration_days: number;
  features?: string[]; is_active: boolean; created_at: string;
}

const EMPTY_PLAN = { name: '', description: '', price: '', duration_days: '30', features: '', is_active: true };

export default function PlansClient({ plans: initialPlans }: { plans: Plan[] }) {
  const router = useRouter();
  const { format } = useCurrency();
  const [plans, setPlans] = useState(initialPlans);
  const [modalOpen, setModalOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_PLAN);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState('');

  function openNew() { setEditPlan(null); setForm(EMPTY_PLAN); setSaveError(''); setModalOpen(true); }
  function openEdit(p: Plan) {
    setEditPlan(p);
    setForm({
      name: p.name, description: p.description ?? '',
      price: String(p.price), duration_days: String(p.duration_days),
      features: (p.features ?? []).join(', '), is_active: p.is_active,
    });
    setSaveError('');
    setModalOpen(true);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const val = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((prev) => ({ ...prev, [e.target.name]: val }));
  }

  async function handleSave() {
    if (!form.name || !form.price || !form.duration_days) {
      setSaveError('Plan name, price, and duration are required.');
      return;
    }
    setSaveError('');
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description || null,
      price: Number(form.price),
      duration_days: Number(form.duration_days),
      features: form.features ? form.features.split(',').map((f) => f.trim()).filter(Boolean) : [],
      is_active: form.is_active,
    };

    if (editPlan) {
      const { data, error } = await updatePlan(editPlan.id, payload);
      if (error) { setSaveError(error); setSaving(false); return; }
      if (data) setPlans((prev) => prev.map((p) => p.id === editPlan.id ? data : p));
    } else {
      const { data, error } = await createPlan(payload);
      if (error) { setSaveError(error); setSaving(false); return; }
      if (data) setPlans((prev) => [...prev, data]);
    }
    setModalOpen(false);
    setSaving(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    await deletePlan(deleteId);
    setPlans((prev) => prev.filter((p) => p.id !== deleteId));
    setDeleteId(null);
    setDeleting(false);
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Membership Plans</h1>
          <p className="page-subtitle">{plans.length} plan{plans.length !== 1 ? 's' : ''} configured at Salon Raed</p>
        </div>
        <button className="btn btn-primary" onClick={openNew} id="add-plan-btn">
          <Plus size={16} /> New Plan
        </button>
      </div>

      <div className="grid-3" style={{ alignItems: 'start' }}>
        {plans.map((p) => (
          <div key={p.id} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
            {/* Active ribbon */}
            {p.is_active && (
              <div style={{ position: 'absolute', top: 12, right: 12 }}>
                <span className="badge badge-success">Active</span>
              </div>
            )}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.875rem' }}>
                <Scissors size={22} style={{ color: 'var(--primary-light)' }} />
              </div>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{p.name}</h3>
              {p.description && <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{p.description}</p>}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {format(p.price)}
              </span>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}> / {p.duration_days} days</span>
            </div>

            {(p.features ?? []).length > 0 && (
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '1.25rem' }}>
                {p.features!.map((f) => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    <Check size={13} style={{ color: 'var(--success)', flexShrink: 0 }} /> {f}
                  </li>
                ))}
              </ul>
            )}

            <div className="divider" style={{ margin: '1rem 0' }} />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => openEdit(p)}>
                <Edit size={14} /> Edit
              </button>
              <button className="btn btn-danger btn-sm btn-icon" onClick={() => setDeleteId(p.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {plans.length === 0 && (
          <div className="card empty-state" style={{ gridColumn: '1 / -1' }}>
            <div className="empty-state-icon"><Scissors size={28} /></div>
            <h3 style={{ color: 'var(--text-primary)' }}>No plans yet</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Create your first membership plan.</p>
            <button className="btn btn-primary btn-sm" onClick={openNew}>Create Plan</button>
          </div>
        )}
      </div>

      {/* Plan Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
        title={editPlan ? 'Edit Plan' : 'New Membership Plan'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className={`btn btn-primary ${saving ? 'btn-loading' : ''}`} onClick={handleSave} disabled={saving} id="save-plan-btn">
              {saving ? <span className="spinner" /> : null}
              {saving ? 'Saving...' : 'Save Plan'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {saveError && (
            <div className="alert alert-danger">
              <span>{saveError}</span>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Plan Name <span className="required">*</span></label>
            <input name="name" type="text" className="form-input" placeholder="e.g. Premium Monthly"
              value={form.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input name="description" type="text" className="form-input" placeholder="Short description"
              value={form.description} onChange={handleChange} />
          </div>
          <div className="grid-2" style={{ gap: '0.875rem' }}>
            <div className="form-group">
              <label className="form-label">Price <span className="required">*</span></label>
              <CurrencyInput
                valueUsd={form.price}
                onChange={val => setForm(prev => ({ ...prev, price: val }))}
                id="plan-price"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Duration (days) <span className="required">*</span></label>
              <input name="duration_days" type="number" min="1" className="form-input"
                placeholder="30" value={form.duration_days} onChange={handleChange} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Features</label>
            <input name="features" type="text" className="form-input"
              placeholder="Gym access, All classes, Sauna (comma separated)"
              value={form.features} onChange={handleChange} />
            <span className="form-hint">Separate features with commas.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <input type="checkbox" id="plan-active" name="is_active"
              checked={form.is_active as boolean} onChange={handleChange}
              style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
            <label htmlFor="plan-active" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>Active (visible for assignment)</label>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Delete Plan" loading={deleting}
        message="Are you sure you want to delete this plan? Members with this plan assigned will keep their existing memberships."
        confirmLabel="Delete Plan"
      />
    </>
  );
}
