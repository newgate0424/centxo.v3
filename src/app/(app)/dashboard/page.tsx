"use client";

import { useState, useEffect, useMemo } from "react";
import { DollarSign, MessageSquare, TrendingUp, Zap, ChevronRight, Activity, Calendar as CalendarIcon, Filter } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAdAccount } from '@/contexts/AdAccountContext';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DatePickerWithRange as DateRangePicker } from "@/components/DateRangePicker";
import { DateRange } from "react-day-picker";
import { subDays, format } from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export default function DashboardPage() {
  const { data: session } = useSession();
  const { selectedAccounts } = useAdAccount();
  const { t, language } = useLanguage();
  const [mounted, setMounted] = useState(false);

  // Date Range State (Default Last 30 Days)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date()
  });

  const [stats, setStats] = useState({
    totalSpend: 0,
    totalMessages: 0,
    totalRevenue: 0,
    totalRoas: 0,
    avgCostPerMessage: 0,
    activeCampaigns: 0,
    chartData: [] as any[],
    changes: {
      spend: 0,
      messages: 0,
      revenue: 0,
      roas: 0
    }
  });

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (session?.user && selectedAccounts.length > 0) {
      fetchStats();
      fetchCampaigns();
    }
  }, [session, selectedAccounts, dateRange]);

  const fetchStats = async () => {
    try {
      setLoading(true);

      if (selectedAccounts.length === 0) {
        setStats({
          totalSpend: 0,
          totalMessages: 0,
          totalRevenue: 0,
          totalRoas: 0,
          avgCostPerMessage: 0,
          activeCampaigns: 0,
          chartData: [],
          changes: { spend: 0, messages: 0, revenue: 0, roas: 0 }
        });
        setLoading(false);
        return;
      }

      const adAccountIds = selectedAccounts.map(a => a.id).join(',');

      // Format dates for API
      let dateParams = '';
      if (dateRange?.from && dateRange?.to) {
        dateParams = `&startDate=${format(dateRange.from, 'yyyy-MM-dd')}&endDate=${format(dateRange.to, 'yyyy-MM-dd')}`;
      }

      const response = await fetch(`/api/dashboard/stats?adAccountId=${adAccountIds}${dateParams}`);

      if (response.ok) {
        const data = await response.json();
        setStats({
          totalSpend: data.totalSpend || 0,
          totalMessages: data.totalMessages || 0,
          totalRevenue: data.totalRevenue || 0,
          totalRoas: data.totalRoas || 0,
          avgCostPerMessage: data.avgCostPerMessage || 0,
          activeCampaigns: data.activeCampaigns || 0,
          chartData: data.chartData || [],
          changes: data.changes || { spend: 0, messages: 0, revenue: 0, roas: 0 }
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      if (selectedAccounts.length === 0) {
        setCampaigns([]);
        return;
      }

      const adAccountIds = selectedAccounts.map(a => a.id).join(',');
      const response = await fetch(`/api/campaigns?adAccountId=${adAccountIds}`);

      if (response.ok) {
        const data = await response.json();
        // Take top 5 recent campaigns
        setCampaigns(data.campaigns.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const formatTrend = (value: number) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getTrendColor = (value: number, inverse = false) => {
    if (value === 0) return "text-muted-foreground";
    if (inverse) {
      return value > 0 ? "text-red-500" : "text-green-500";
    }
    return value > 0 ? "text-green-500" : "text-red-500";
  };

  const statCards = useMemo(() => [
    {
      title: t('landing.dashboard.spend', 'Total Spend'),
      value: `฿${stats.totalSpend.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      icon: DollarSign,
      color: "text-blue-600 dark:text-blue-400 bg-blue-100/50 dark:bg-blue-900/20",
      trend: formatTrend(stats.changes.spend),
      trendColor: getTrendColor(stats.changes.spend, true) // Spend increase is usually "bad" (red) unless ROI is high, but standard is red for cost increase
    },
    {
      title: t('landing.dashboard.revenue', 'Revenue'),
      value: `฿${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      icon: Activity,
      color: "text-green-600 dark:text-green-400 bg-green-100/50 dark:bg-green-900/20",
      trend: formatTrend(stats.changes.revenue),
      trendColor: getTrendColor(stats.changes.revenue)
    },
    {
      title: t('landing.dashboard.roas', 'ROAS'),
      value: `${stats.totalRoas.toFixed(2)}x`,
      icon: TrendingUp,
      color: "text-purple-600 dark:text-purple-400 bg-purple-100/50 dark:bg-purple-900/20",
      trend: formatTrend(stats.changes.roas),
      trendColor: getTrendColor(stats.changes.roas)
    },
    {
      title: t('dashboard.messages', 'Messages'),
      value: stats.totalMessages.toLocaleString('en-US'),
      icon: MessageSquare,
      color: "text-blue-600 dark:text-blue-400 bg-blue-100/50 dark:bg-blue-900/20",
      trend: formatTrend(stats.changes.messages),
      trendColor: getTrendColor(stats.changes.messages)
    }
  ], [stats, t, language]);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-outfit font-bold text-foreground tracking-tight">{t('dashboard.title', 'Dashboard')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('dashboard.subtitle', 'Monitor your campaign performance')}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Date Picker */}
          <DateRangePicker
            date={dateRange}
            setDate={setDateRange}
          />

          <Link href="/launch-new">
            <Button className="w-full sm:w-auto shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow">
              <Zap className="mr-2 h-4 w-4" />
              New Campaign
            </Button>
          </Link>
        </div>
      </div>

      {/* Selected Accounts Indicator */}
      <div className="bg-white/50 dark:bg-black/20 backdrop-blur-sm border rounded-lg px-4 py-2 text-sm text-muted-foreground shadow-sm flex items-center w-fit">
        <Filter className="h-4 w-4 mr-2 opacity-70" />
        Selected: <span className="font-semibold text-foreground ml-1">{mounted ? selectedAccounts.length : 0} Accounts</span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="glass-card p-6 hover:translate-y-[-2px] transition-all duration-300 group hover:border-primary/20"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-muted-foreground">{card.title}</h3>
                <div className={`p-2.5 rounded-xl ${card.color} transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-outfit font-bold tracking-tight text-foreground">{card.value}</p>
              </div>
              {/* Placeholder for trend - can be real data later */}
              <div className={`flex items-center mt-2 text-xs font-medium ${card.trendColor}`}>
                <TrendingUp className="h-3 w-3 mr-1" />
                <span>{card.trend}</span>
                <span className="text-muted-foreground ml-1 font-normal opacity-70">vs prev period</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid: Chart & Campaigns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Chart Section - Takes 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 md:p-8 h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-foreground">Performance Overview</h3>
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  <span className="text-muted-foreground">Spend</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  <span className="text-muted-foreground">Revenue</span>
                </div>
              </div>
            </div>

            <div className="flex-1 w-full min-h-0">
              {stats.chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={stats.chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      tickFormatter={(str) => {
                        const date = new Date(str);
                        return format(date, 'MMM dd');
                      }}
                      minTickGap={30}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      tickFormatter={(val) => `฿${val.toLocaleString()}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                      }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="spend"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorSpend)"
                      name="Spend"
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#22c55e"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                      name="Revenue"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                  <Activity className="h-8 w-8 mb-2 opacity-50" />
                  <p>No data available for this period</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions / Recent Campaigns Column - Takes 1/3 width */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-outfit tracking-tight">{t('dashboard.recentCampaigns', 'Recent Campaigns')}</h2>
            <Link href="/ads-manager" className="text-sm text-primary hover:text-primary/80 font-medium flex items-center transition-colors">
              {t('dashboard.viewAll', 'View All')} <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="p-0">
              {campaigns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mb-3">
                    <Zap className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-medium text-foreground">No active campaigns</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">
                    Launch your first AI-powered ad campaign.
                  </p>
                  <Link href="/launch-new">
                    <Button size="sm">Create Campaign</Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between group">
                      <div className="min-w-0 flex-1 mr-4">
                        <div className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
                          {campaign.name}
                        </div>
                        <div className="flex items-center mt-1.5 gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${campaign.status === 'ACTIVE'
                            ? 'bg-green-500/10 text-green-600 border-green-500/20'
                            : campaign.status === 'PAUSED'
                              ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                              : 'bg-slate-500/10 text-slate-600 border-slate-500/20'
                            }`}>
                            {campaign.status}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Created {new Date(campaign.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Link href={`/ads-manager/${campaign.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-foreground mb-4 flex items-center">
              <Zap className="h-4 w-4 mr-2 text-yellow-500" /> Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-1.5 hover:border-primary/50 hover:bg-primary/5">
                <DollarSign className="h-5 w-5 text-green-500" />
                <span className="text-xs">Add Funds</span>
              </Button>
              <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-1.5 hover:border-primary/50 hover:bg-primary/5">
                <MessageSquare className="h-5 w-5 text-blue-500" />
                <span className="text-xs">Auto-Reply</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
