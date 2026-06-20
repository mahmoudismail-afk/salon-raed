'use client';

import { useEffect, useRef } from 'react';

/**
 * Invisible component that auto-refreshes the dashboard every 5 minutes
 * to keep daily/weekly revenue current. Uses a hard reload to avoid
 * Next.js 15 RSC payload mismatch ("unexpected response from server").
 */
export default function DashboardRefresher() {
  const mountedMonth = useRef(new Date().getMonth());

  useEffect(() => {
    const interval = setInterval(() => {
      // Always do a full hard reload — avoids RSC hydration mismatches
      window.location.reload();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  return null;
}
