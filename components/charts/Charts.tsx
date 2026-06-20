'use client';

import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { type Currency } from '@/lib/currency';

/* ── Shared tooltip style ── */
const tooltipStyle = {
  backgroundColor: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--text-primary)',
  fontSize: '0.8125rem',
};

const tooltipLabelStyle = { color: 'var(--text-primary)' };
const tooltipItemStyle  = { color: 'var(--text-primary)' };

/* ── Revenue Area Chart ── */
interface RevenueChartProps {
  data: { month: string; revenue: number }[];
  currency?: Currency;
  lbpRate?: number;
}
export function RevenueChart({ data, currency = 'USD', lbpRate = 89500 }: RevenueChartProps) {
  const isLBP = currency === 'LBP';
  const sym = isLBP ? 'ل.ل' : '$';
  const axisFormatter = (v: number) =>
    isLBP
      ? v >= 1_000_000 ? `${sym}${(v / 1_000_000).toFixed(1)}M` : `${sym}${(v / 1000).toFixed(0)}k`
      : v >= 1000 ? `${sym}${(v / 1000).toFixed(0)}k` : `${sym}${v}`;
  const tooltipFormatter = (val: number) =>
    isLBP
      ? [`${sym} ${Math.round(val).toLocaleString()}`, 'Revenue']
      : [`$${val.toLocaleString()}`, 'Revenue'];

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#6c63ff" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#6c63ff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false}
          tickFormatter={axisFormatter} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          formatter={tooltipFormatter}
        />
        <Area type="monotone" dataKey="revenue" stroke="#6c63ff" strokeWidth={2.5}
          fill="url(#revenueGrad)" dot={false} activeDot={{ r: 5, fill: '#6c63ff' }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ── Member Growth Bar Chart ── */
interface MemberGrowthChartProps {
  data: { month: string; members: number }[];
}
export function MemberGrowthChart({ data }: MemberGrowthChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          formatter={(val: number) => [val, 'New Members']}
          cursor={{ fill: 'rgba(108,99,255,0.08)' }}
        />
        <Bar dataKey="members" fill="#06b6d4" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ── Plan Distribution Bar Chart ── */
const BAR_COLORS = ['#6c63ff', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

interface PlanDistributionChartProps {
  data: { name: string; value: number }[];
}
export function PlanDistributionChart({ data }: PlanDistributionChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          formatter={(val: number) => [val, 'Members']}
          cursor={{ fill: 'rgba(108,99,255,0.08)' }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {data.map((_, i) => (
            <Cell key={`cell-${i}`} fill={BAR_COLORS[i % BAR_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ── Weekly Revenue Bar Chart ── */
interface WeeklyRevenueChartProps {
  data: { day: string; revenue: number }[];
  currency?: Currency;
  lbpRate?: number;
}
export function WeeklyRevenueChart({ data, currency = 'USD', lbpRate = 89500 }: WeeklyRevenueChartProps) {
  const isLBP = currency === 'LBP';
  const sym = isLBP ? 'ل.ل' : '$';

  const axisFormatter = (v: number) =>
    isLBP
      ? v >= 1_000_000 ? `${sym}${(v / 1_000_000).toFixed(1)}M` : `${sym}${(v / 1000).toFixed(0)}k`
      : v >= 1000 ? `${sym}${(v / 1000).toFixed(0)}k` : `${sym}${v}`;

  const tooltipFormatter = (val: number) =>
    isLBP
      ? [`${sym} ${Math.round(val).toLocaleString()}`, 'Revenue']
      : [`$${val.toLocaleString()}`, 'Revenue'];

  // Find today's index by label
  const todayIdx = data.findIndex(d => d.day === 'Today');

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="weekBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#6c63ff" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#6c63ff" stopOpacity={0.4} />
          </linearGradient>
          <linearGradient id="weekBarToday" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#10b981" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.45} />
          </linearGradient>
          <linearGradient id="weekBarFuture" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#6c63ff" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#6c63ff" stopOpacity={0.08} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fill: '#64748b', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={axisFormatter}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          formatter={tooltipFormatter}
          cursor={{ fill: 'rgba(108,99,255,0.08)' }}
        />
        <Bar dataKey="revenue" radius={[5, 5, 0, 0]} maxBarSize={48}>
          {data.map((entry, i) => {
            const isToday = entry.day === 'Today';
            const isFuture = todayIdx !== -1 && i > todayIdx;
            return (
              <Cell
                key={`week-cell-${i}`}
                fill={isToday ? 'url(#weekBarToday)' : isFuture ? 'url(#weekBarFuture)' : 'url(#weekBarGrad)'}
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ── Today's Revenue — Hourly Bar Chart ── */
interface DailyRevenueChartProps {
  data: { hour: string; revenue: number }[];
}
export function DailyRevenueChart({ data }: DailyRevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="dailyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.9} />
            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.5} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis
          dataKey="hour"
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval={2}
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${v >= 1000 ? `${v / 1000}k` : v}`}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          formatter={(val: number) => [`$${val.toLocaleString()}`, 'Revenue']}
          cursor={{ fill: 'rgba(6,182,212,0.08)' }}
        />
        <Bar dataKey="revenue" fill="url(#dailyGrad)" radius={[3, 3, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}


