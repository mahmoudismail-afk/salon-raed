'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  DollarSign,
  History,
  ChevronLeft,
  ChevronRight,
  Settings,
  LogOut,
  Scissors,
  Shield,
  Receipt,
  ShoppingCart,
  Sun,
  Moon,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import CurrencyToggle from '@/components/ui/CurrencyToggle';
import { useTheme } from '@/components/ui/ThemeProvider';

const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Dashboard', icon: LayoutDashboard, id: 'dashboard' },
  { href: '/members',    label: 'Members',   icon: Users,           id: 'members' },
  { href: '/payments',   label: 'Payments',  icon: DollarSign,      id: 'payments' },
  { href: '/plans',      label: 'Plans',     icon: CreditCard,      id: 'plans' },
  { href: '/expenses',   label: 'Expenses',  icon: Receipt,         id: 'expenses' },
  { href: '/inventory',  label: 'Inventory', icon: ShoppingCart,    id: 'inventory' },
  { href: '/history',    label: 'History',   icon: History,         id: 'history' },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
  role?: string;
  staffPermissions?: string[];
}

export default function Sidebar({ mobileOpen, onClose, role = 'staff', staffPermissions = [] }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();

  const isAdmin = role === 'admin';

  const visibleItems = NAV_ITEMS.filter(
    (item) => isAdmin || staffPermissions.includes(item.id)
  );

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    // Sign out locally (clears the browser cookie)
    await supabase.auth.signOut();
    // Hard redirect so Cloudflare edge middleware sees the cleared session immediately.
    window.location.href = '/login';
  }

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Scissors size={22} />
        </div>
        {!collapsed && <span className="sidebar-logo-text">Salon Raed</span>}
      </div>

      {/* Currency Toggle */}
      <div style={{ padding: collapsed ? '0.5rem' : '0.25rem 1rem 0.5rem' }}>
        <CurrencyToggle collapsed={collapsed} />
      </div>

      {/* Collapse toggle */}
      <button
        className="sidebar-toggle"
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        id="sidebar-toggle-btn"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Role badge */}
      {!collapsed && (
        <div style={{ padding: '0.5rem 1rem', marginBottom: '0.25rem' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.08em', padding: '0.2rem 0.6rem', borderRadius: 9999,
            background: isAdmin ? 'rgba(108,99,255,0.15)' : 'rgba(16,185,129,0.12)',
            color: isAdmin ? 'var(--primary-light)' : 'var(--success)',
          }}>
            <Shield size={10} />
            {isAdmin ? 'Admin' : 'Staff'}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav">
        {!collapsed && <span className="sidebar-section-label">Main Menu</span>}
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              onClick={() => onClose?.()}
              className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
              title={collapsed ? label : undefined}
            >
              <Icon size={20} className="sidebar-link-icon" />
              {!collapsed && <span>{label}</span>}
              {isActive && !collapsed && <span className="sidebar-active-dot" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="sidebar-bottom">
        {!collapsed && <span className="sidebar-section-label">Account</span>}

        <Link
          href="/settings"
          className={`sidebar-link ${pathname.startsWith('/settings') ? 'sidebar-link-active' : ''}`}
          title={collapsed ? 'Settings' : undefined}
          id="settings-link"
        >
          <Settings size={20} className="sidebar-link-icon" />
          {!collapsed && <span>Settings</span>}
        </Link>
        <button
          className="sidebar-link sidebar-logout"
          onClick={handleLogout}
          disabled={loggingOut}
          title={collapsed ? 'Log out' : undefined}
          id="logout-btn"
        >
          <LogOut size={20} className="sidebar-link-icon" />
          {!collapsed && <span>{loggingOut ? 'Logging out...' : 'Log out'}</span>}
        </button>
      </div>
    </aside>
  );
}
