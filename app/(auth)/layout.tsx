import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Barber Shop — Sign In',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      {children}
    </div>
  );
}
