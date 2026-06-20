'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Currency, DEFAULT_LBP_RATE, formatCurrencyAuto, formatUSD, formatLBP, usdToLbp } from '@/lib/currency';
import { getLbpRate } from '@/lib/actions/settings';

interface CurrencyContextValue {
  currency: Currency;
  lbpRate: number;
  setCurrency: (c: Currency) => void;
  /** Re-fetch the LBP rate from the DB (call this after saving a new rate) */
  refreshRate: () => Promise<void>;
  /** Format a USD amount using the current currency preference */
  format: (amountUsd: number) => string;
  /** Format showing both currencies, e.g. "$50 / ل.ل 4,475,000" */
  formatBoth: (amountUsd: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: 'USD',
  lbpRate: DEFAULT_LBP_RATE,
  setCurrency: () => {},
  refreshRate: async () => {},
  format: (v) => `$${v}`,
  formatBoth: (v) => `$${v}`,
});

async function fetchRateFromDb(): Promise<number> {
  try {
    return await getLbpRate();
  } catch {}
  return DEFAULT_LBP_RATE;
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('USD');
  const [lbpRate, setLbpRate] = useState(DEFAULT_LBP_RATE);
  const mounted = useRef(true);

  // Load currency preference from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('currency_pref') as Currency | null;
      if (saved === 'USD' || saved === 'LBP') setCurrencyState(saved);
    } catch {}
  }, []);

  const refreshRate = useCallback(async () => {
    const rate = await fetchRateFromDb();
    if (mounted.current) setLbpRate(rate);
  }, []);

  // Fetch LBP rate on mount
  useEffect(() => {
    mounted.current = true;
    refreshRate();
    return () => { mounted.current = false; };
  }, [refreshRate]);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    try { localStorage.setItem('currency_pref', c); } catch {}
  }, []);

  const format = useCallback(
    (amountUsd: number) => formatCurrencyAuto(amountUsd, currency, lbpRate),
    [currency, lbpRate]
  );

  const formatBoth = useCallback(
    (amountUsd: number) => {
      return `${formatUSD(amountUsd)}  /  ${formatLBP(usdToLbp(amountUsd, lbpRate))}`;
    },
    [lbpRate]
  );

  return (
    <CurrencyContext.Provider value={{ currency, lbpRate, setCurrency, refreshRate, format, formatBoth }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
