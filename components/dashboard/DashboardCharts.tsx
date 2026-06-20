'use client';

import { RevenueChart, MemberGrowthChart, PlanDistributionChart, WeeklyRevenueChart } from '@/components/charts/Charts';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatCurrencyAuto } from '@/lib/currency';

interface DashboardChartsProps {
  weeklyChartData: { day: string; revenue: number }[];
  revenueData:     { month: string; revenue: number }[];
  memberGrowthData: { month: string; members: number }[];
  planData:        { name: string; value: number }[];
}

export default function DashboardCharts({
  weeklyChartData, revenueData, memberGrowthData, planData,
}: DashboardChartsProps) {
  const { currency, lbpRate } = useCurrency();

  // Convert revenue data to the current currency for display
  const convertedRevenueData = revenueData.map(d => ({
    ...d,
    revenue: currency === 'LBP' ? Math.round(d.revenue * lbpRate) : d.revenue,
  }));

  const currencyFormatter = (val: number) =>
    formatCurrencyAuto(currency === 'LBP' ? val / lbpRate : val, currency, lbpRate);

  // Convert weekly data to current currency
  const convertedWeeklyData = weeklyChartData.map(d => ({
    ...d,
    revenue: currency === 'LBP' ? Math.round(d.revenue * lbpRate) : d.revenue,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Weekly Revenue — full width */}
      <div className="chart-card">
        <div className="chart-card-header">
          <div>
            <p className="chart-card-title">Weekly Revenue</p>
            <p className="chart-card-subtitle">Daily breakdown for the current week — today highlighted in green ({currency})</p>
          </div>
        </div>
        <WeeklyRevenueChart data={convertedWeeklyData} currency={currency} lbpRate={lbpRate} />
      </div>

      {/* Monthly Revenue — full width */}
      <div className="chart-card">
        <div className="chart-card-header">
          <div>
            <p className="chart-card-title">Revenue Overview</p>
            <p className="chart-card-subtitle">Monthly revenue for the last 6 months ({currency})</p>
          </div>
        </div>
        <RevenueChart data={convertedRevenueData} currency={currency} lbpRate={lbpRate} />
      </div>

      {/* Member Growth + Plan Distribution */}
      <div className="chart-grid-2">
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <p className="chart-card-title">Member Growth</p>
              <p className="chart-card-subtitle">New members per month</p>
            </div>
          </div>
          <MemberGrowthChart data={memberGrowthData} />
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <p className="chart-card-title">Plan Distribution</p>
              <p className="chart-card-subtitle">Active memberships by plan</p>
            </div>
          </div>
          {planData.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No active memberships yet</p>
            </div>
          ) : (
            <PlanDistributionChart data={planData} />
          )}
        </div>
      </div>

    </div>
  );
}
