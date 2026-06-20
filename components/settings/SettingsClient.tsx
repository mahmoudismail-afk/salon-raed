'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User, Phone, Shield, Trash2, Plus,
  AlertCircle, CheckCircle, Eye, EyeOff, Lock, Settings2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { createStaffAccount, deleteUser, updateProfile, saveStaffPermissions, saveLbpRate } from '@/lib/actions/settings';
import { changePassword } from '@/lib/actions/auth';
import { getInitials, formatDate } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useCurrency } from '@/contexts/CurrencyContext';

export default function SettingsClient({
  profile,
  userId,
  allUsers,
  staffPermissions = ['dashboard', 'members', 'payments', 'plans', 'expenses', 'history'],
  initialLbpRate = 89500,
}: {
  profile: any;
  userId: string;
  allUsers: any[];
  staffPermissions?: string[];
  initialLbpRate?: number;
}) {
  const router = useRouter();
  const isAdmin = profile?.role === 'admin';
  const { refreshRate } = useCurrency();

  // ── Profile form ──
  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name ?? '',
    phone: profile?.phone ?? '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);
    const result = await updateProfile(profile.id, profileForm);
    setProfileMsg(result.error
      ? { type: 'error', text: result.error }
      : { type: 'success', text: 'Profile updated successfully.' }
    );
    setProfileSaving(false);
    router.refresh();
  }

  // ── Password form ──
  const [pwForm, setPwForm] = useState({ password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.password.length < 6) { setPwMsg({ type: 'error', text: 'Password must be at least 6 characters.' }); return; }
    if (pwForm.password !== pwForm.confirm) { setPwMsg({ type: 'error', text: 'Passwords do not match.' }); return; }
    setPwSaving(true);
    setPwMsg(null);
    // Use the server action + admin SDK so it works reliably on Cloudflare Workers
    const result = await changePassword(userId, pwForm.password);
    setPwMsg(result.error
      ? { type: 'error', text: result.error }
      : { type: 'success', text: 'Password changed successfully.' }
    );
    setPwForm({ password: '', confirm: '' });
    setPwSaving(false);
  }

  // ── Create user modal (admin only) ──
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: '', fullName: '', phone: '', password: '', role: 'staff' as 'staff' | 'admin',
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [users, setUsers] = useState(allUsers);

  async function handleCreateUser() {
    if (!createForm.username || !createForm.password || !createForm.fullName) {
      setCreateError('Username, full name, and password are required.');
      return;
    }
    setCreateError('');
    setCreating(true);
    const result = await createStaffAccount(createForm);
    if (result.error) { setCreateError(result.error); setCreating(false); return; }
    setCreateOpen(false);
    setCreating(false);
    setCreateForm({ username: '', fullName: '', phone: '', password: '', role: 'staff' });
    router.refresh();
  }

  // ── Delete user (admin only) ──
  const [userToDelete, setUserToDelete] = useState<{ id: string; auth_id?: string | null } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  async function handleDeleteUser() {
    if (!userToDelete) return;
    setDeleting(true);
    setDeleteError('');
    const result = await deleteUser(userToDelete.id, userToDelete.auth_id);
    
    if (result.error) {
      setDeleteError(result.error);
      setDeleting(false);
      return;
    }
    
    setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
    setUserToDelete(null);
    setDeleting(false);
    router.refresh();
  }

  // ── Staff Permissions (admin only) ──
  const [staffPerms, setStaffPerms] = useState<string[]>(
    Array.isArray(staffPermissions) ? staffPermissions : ['dashboard', 'members', 'payments', 'plans', 'expenses', 'history']
  );
  const [permsSaving, setPermsSaving] = useState(false);
  const [permsMsg, setPermsMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const AVAILABLE_PERMISSIONS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'members',   label: 'Members' },
    { id: 'payments',  label: 'Payments' },
    { id: 'plans',     label: 'Plans' },
    { id: 'expenses',  label: 'Expenses' },
    { id: 'history',   label: 'History' },
  ];

  async function handleSavePermissions() {
    setPermsSaving(true);
    setPermsMsg(null);
    const result = await saveStaffPermissions(staffPerms);
    setPermsMsg(result.error
      ? { type: 'error', text: result.error }
      : { type: 'success', text: 'Permissions updated successfully.' }
    );
    setPermsSaving(false);
    router.refresh();
  }

  function togglePermission(id: string) {
    setStaffPerms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  }

  // ── LBP Exchange Rate (admin only) ──
  const [lbpRateVal, setLbpRateVal] = useState(String(initialLbpRate));
  const [rateSaving, setRateSaving] = useState(false);
  const [rateMsg, setRateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSaveRate() {
    const rate = Number(lbpRateVal);
    if (isNaN(rate) || rate <= 0) { setRateMsg({ type: 'error', text: 'Please enter a valid positive rate.' }); return; }
    setRateSaving(true);
    setRateMsg(null);
    const result = await saveLbpRate(rate);
    if (!result.error) {
      // Immediately update the rate in the global context so all inputs use the new rate
      await refreshRate();
      setRateMsg({ type: 'success', text: `Rate updated to ${rate.toLocaleString()} LBP/USD — all inputs now use this rate.` });
    } else {
      setRateMsg({ type: 'error', text: result.error });
    }
    setRateSaving(false);
  }


  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account and system preferences</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 1fr' : '1fr', gap: '1.5rem', alignItems: 'start' }}
        className="settings-grid">

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Profile section */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="avatar avatar-lg">{getInitials(profile?.full_name ?? 'U')}</div>
              <div>
                <h3 style={{ color: 'var(--text-primary)' }}>{profile?.full_name || 'Unknown'}</h3>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: 9999,
                  background: isAdmin ? 'rgba(108,99,255,0.15)' : 'rgba(16,185,129,0.12)',
                  color: isAdmin ? 'var(--primary-light)' : 'var(--success)',
                }}>
                  <Shield size={11} /> {isAdmin ? 'Admin' : 'Staff'}
                </span>
              </div>
            </div>

            {profileMsg && (
              <div className={`alert ${profileMsg.type === 'success' ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: '1rem' }}>
                {profileMsg.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                {profileMsg.text}
              </div>
            )}

            <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label"><User size={13} style={{ display: 'inline', marginRight: 5 }} />Full Name</label>
                <input
                  type="text" className="form-input"
                  value={profileForm.full_name}
                  onChange={e => setProfileForm(p => ({ ...p, full_name: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label"><Phone size={13} style={{ display: 'inline', marginRight: 5 }} />Phone</label>
                <input
                  type="tel" className="form-input"
                  value={profileForm.phone}
                  onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <button type="submit" className={`btn btn-primary ${profileSaving ? 'btn-loading' : ''}`} disabled={profileSaving}>
                {profileSaving ? <span className="spinner" /> : null}
                {profileSaving ? 'Saving...' : 'Save Profile'}
              </button>
            </form>
          </div>

          {/* Change password */}
          <div className="card">
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Lock size={16} style={{ color: 'var(--primary-light)' }} /> Change Password
            </h4>

            {pwMsg && (
              <div className={`alert ${pwMsg.type === 'success' ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: '1rem' }}>
                {pwMsg.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                {pwMsg.text}
              </div>
            )}

            <form onSubmit={handlePasswordSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'} className="form-input"
                    placeholder="Min 6 characters"
                    value={pwForm.password}
                    onChange={e => setPwForm(p => ({ ...p, password: e.target.value }))}
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input
                  type={showPw ? 'text' : 'password'} className="form-input"
                  placeholder="Repeat new password"
                  value={pwForm.confirm}
                  onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                />
              </div>
              <button type="submit" className={`btn btn-secondary ${pwSaving ? 'btn-loading' : ''}`} disabled={pwSaving}>
                {pwSaving ? <span className="spinner" /> : null}
                {pwSaving ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>

        </div>

        {/* Right column — Admin: User Management and Permissions */}
        {isAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* User Accounts Card */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h4 style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Shield size={16} style={{ color: 'var(--primary-light)' }} /> User Accounts
                </h4>
                <button className="btn btn-primary btn-sm" onClick={() => { setCreateError(''); setCreateOpen(true); }} id="create-user-btn">
                  <Plus size={14} /> Add User
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {users.map((u) => {
                  const uname = u.email?.replace('@amagym.local', '').replace('@salonraed.local', '') ?? '—';
                  const isSelf = u.auth_id === userId;
                  return (
                    <div key={u.id} style={{
                      display: 'flex', alignItems: 'center', gap: '0.875rem',
                      padding: '0.875rem', background: 'var(--bg-base)', borderRadius: 10,
                      border: isSelf ? '1px solid var(--primary-glow)' : '1px solid var(--border-light)',
                    }}>
                      <div className="avatar avatar-sm">{getInitials(u.full_name || uname)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                          {u.full_name || uname}
                          {isSelf && <span style={{ marginLeft: 6, fontSize: '0.7rem', color: 'var(--primary-light)' }}>(you)</span>}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{uname}</p>
                      </div>
                      <span style={{
                        fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 9999,
                        background: u.role === 'admin' ? 'rgba(108,99,255,0.15)' : 'rgba(16,185,129,0.12)',
                        color: u.role === 'admin' ? 'var(--primary-light)' : 'var(--success)',
                      }}>
                        {u.role}
                      </span>
                      {!isSelf && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm btn-icon"
                          style={{ color: 'var(--danger)', flexShrink: 0 }}
                          onClick={() => {
                          setUserToDelete({ id: u.id, auth_id: u.auth_id });
                        }}
                          title="Remove user"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
                {users.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No user accounts found.</p>
                )}
              </div>
            </div>

            {/* Staff Permissions Card */}
            <div className="card">
              <h4 style={{ color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Settings2 size={16} style={{ color: 'var(--primary-light)' }} /> Staff Permissions
              </h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Select which pages staff members are allowed to access. Admins always have access to everything.
              </p>

              {permsMsg && (
                <div className={`alert ${permsMsg.type === 'success' ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: '1rem' }}>
                  {permsMsg.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                  {permsMsg.text}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {AVAILABLE_PERMISSIONS.map(p => (
                  <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem', borderRadius: 8, background: 'var(--bg-base)' }}>
                    <input
                      type="checkbox"
                      checked={staffPerms.includes(p.id)}
                      onChange={() => togglePermission(p.id)}
                      style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
                    />
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{p.label}</span>
                  </label>
                ))}
              </div>

              <button
                className={`btn btn-primary ${permsSaving ? 'btn-loading' : ''}`}
                onClick={handleSavePermissions}
                disabled={permsSaving}
              >
                {permsSaving ? <span className="spinner" /> : null}
                {permsSaving ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>

            {/* LBP Exchange Rate Card */}
            <div className="card">
              <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.1rem' }}>ل.ل</span> USD → LBP Exchange Rate
              </h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Set how many Lebanese Pounds equal 1 US Dollar. Used for all LBP price displays across the system.
              </p>

              {rateMsg && (
                <div className={`alert ${rateMsg.type === 'success' ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: '1rem' }}>
                  {rateMsg.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                  {rateMsg.text}
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">1 USD =</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="number"
                    min="1"
                    step="500"
                    className="form-input"
                    value={lbpRateVal}
                    onChange={e => setLbpRateVal(e.target.value)}
                    style={{ flex: 1 }}
                    id="lbp-rate-input"
                  />
                  <span style={{ fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>ل.ل LBP</span>
                </div>
                <span className="form-hint">Current rate: 1 USD = {Number(lbpRateVal).toLocaleString()} LBP</span>
              </div>

              <button
                className={`btn btn-primary ${rateSaving ? 'btn-loading' : ''}`}
                onClick={handleSaveRate}
                disabled={rateSaving}
                id="save-lbp-rate-btn"
              >
                {rateSaving ? <span className="spinner" /> : null}
                {rateSaving ? 'Saving...' : 'Save Exchange Rate'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create user modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add User Account"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button
              className={`btn btn-primary ${creating ? 'btn-loading' : ''}`}
              onClick={handleCreateUser}
              disabled={creating}
            >
              {creating ? <span className="spinner" /> : <Plus size={15} />}
              {creating ? 'Creating...' : 'Create Account'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {createError && (
            <div className="alert alert-danger"><AlertCircle size={15} /> {createError}</div>
          )}
          <div className="grid-2" style={{ gap: '0.875rem' }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Full Name <span className="required">*</span></label>
              <input type="text" className="form-input" placeholder="Jane Doe"
                value={createForm.fullName}
                onChange={e => setCreateForm(p => ({ ...p, fullName: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Username <span className="required">*</span></label>
              <input type="text" className="form-input" placeholder="jane"
                value={createForm.username}
                onChange={e => setCreateForm(p => ({ ...p, username: e.target.value.toLowerCase().replace(/\s+/g, '') }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input type="tel" className="form-input" placeholder="+1 555 000 0000"
                value={createForm.phone}
                onChange={e => setCreateForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Password <span className="required">*</span></label>
              <input type="password" className="form-input" placeholder="Min 6 characters"
                value={createForm.password}
                onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-input" value={createForm.role}
                onChange={e => setCreateForm(p => ({ ...p, role: e.target.value as 'staff' | 'admin' }))}>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!userToDelete}
        onClose={() => { setUserToDelete(null); setDeleteError(''); }}
        onConfirm={handleDeleteUser}
        title="Remove User"
        message={
          <>
            <p>Are you sure you want to permanently delete this user account? They will no longer be able to log in.</p>
            {deleteError && (
              <div className="alert alert-danger" style={{ marginTop: '1rem', padding: '0.75rem' }}>
                <AlertCircle size={15} /> {deleteError}
              </div>
            )}
          </>
        }
        confirmLabel="Delete Account"
        loading={deleting}
      />
    </>
  );
}
