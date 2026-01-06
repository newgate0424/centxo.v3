"use client";

import { useState, useEffect, useMemo } from "react";
import {
  DollarSign, MessageSquare, TrendingUp, Zap, ChevronRight, Activity,
  Filter, Eye, MousePointer2, BarChart3, ShoppingBag, Target
} from "lucide-react";
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
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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
    activeCampaigns: 0,
    chartData: [] as any[],
    changes: {
      spend: 0,
      messages: 0,
      revenue: 0,
      roas: 0
    },
    // Extended Metrics
    extendedStats: {
      impressions: 0,
      clicks: 0, // All Clicks
      linkClicks: 0,
      cpc: 0,
      cpm: 0,
      ctr: 0,
      cpp: 0,
      frequency: 0,
      funnel: {
        viewContent: 0,
        addToCart: 0,
        purchase: 0
      }
    }
  });

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartMetric, setChartMetric] = useState<'spend' | 'impressions' | 'clicks' | 'messages'>('spend');

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

      if (selectedAccounts.length === 0) return;

      const adAccountIds = selectedAccounts.map(a => a.id).join(',');

      // Format dates for API
      let dateParams = '';
      if (dateRange?.from && dateRange?.to) {
        dateParams = `&startDate=${format(dateRange.from, 'yyyy-MM-dd')}&endDate=${format(dateRange.to, 'yyyy-MM-dd')}`;
      }

      const response = await fetch(`/api/dashboard/stats?adAccountId=${adAccountIds}${dateParams}`);

      if (response.ok) {
        const data = await response.json();
        setStats(prev => ({ ...prev, ...data }));
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
      // Fetch specifically for "Top Campaigns" list with summary fields
      const response = await fetch(`/api/campaigns?adAccountId=${adAccountIds}&mode=lite&limit=10`);

      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns);
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

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(val);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(val);
  };

  const kpis = [
    {
      title: t('dashboard.metrics.spend', 'Spend'),
      value: formatCurrency(stats.totalSpend),
      icon: DollarSign,
      color: "text-blue-600 bg-blue-100/50",
      trend: stats.changes.spend
    },
    {
      title: t('dashboard.metrics.revenue', 'Revenue'),
      value: formatCurrency(stats.totalRevenue),
      icon: Activity,
      color: "text-green-600 bg-green-100/50",
      trend: stats.changes.revenue
    },
    {
      title: t('dashboard.metrics.roas', 'ROAS'),
      value: `${stats.totalRoas.toFixed(2)}x`,
      icon: TrendingUp,
      color: "text-purple-600 bg-purple-100/50",
      trend: stats.changes.roas
    },
    {
      title: t('dashboard.metrics.results', 'Results'),
      value: stats.totalMessages.toLocaleString(),
      icon: MessageSquare,
      color: "text-orange-600 bg-orange-100/50",
      trend: stats.changes.messages
    }
  ];

  // Prepare Funnel Data
  const funnelData = [
    { name: t('dashboard.funnel.viewContent', 'View Content'), value: stats.extendedStats.funnel.viewContent, fill: '#3b82f6' },
    { name: t('dashboard.funnel.addToCart', 'Add to Cart'), value: stats.extendedStats.funnel.addToCart, fill: '#8b5cf6' },
    { name: t('dashboard.funnel.purchase', 'Purchase'), value: stats.extendedStats.funnel.purchase, fill: '#22c55e' },
  ];

  // Calculate Conversion Rates between steps
  const convRates = {
    vc_atc: stats.extendedStats.funnel.viewContent > 0
      ? (stats.extendedStats.funnel.addToCart / stats.extendedStats.funnel.viewContent) * 100
      : 0,
    atc_pur: stats.extendedStats.funnel.addToCart > 0
      ? (stats.extendedStats.funnel.purchase / stats.extendedStats.funnel.addToCart) * 100
      : 0
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-outfit font-bold text-foreground tracking-tight">{t('dashboard.title', 'Dashboard')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('dashboard.subtitle', 'Monitor your campaign performance')}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <DateRangePicker date={dateRange} setDate={setDateRange} />
          <Link href="/launch-new">
            <Button className="w-full sm:w-auto shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow">
              <Zap className="mr-2 h-4 w-4" />
              {t('campaigns.newCampaign', 'New Campaign')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Selected Accounts Indicator */}
      <div className="flex items-center gap-2">
        <div className="bg-white/50 dark:bg-black/20 backdrop-blur-sm border rounded-lg px-4 py-2 text-sm text-muted-foreground shadow-sm flex items-center w-fit">
          <Filter className="h-4 w-4 mr-2 opacity-70" />
          Selected: <span className="font-semibold text-foreground ml-1">{mounted ? selectedAccounts.length : 0} Accounts</span>
        </div>
        {stats.activeCampaigns > 0 && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            {stats.activeCampaigns} Active Campaigns
          </Badge>
        )}
      </div>

      {/* 1. Key KPIs - Top Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <div key={index} className="glass-card p-5 hover:translate-y-[-2px] transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">{kpi.title}</span>
                <div className={`p-2 rounded-lg ${kpi.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-outfit">{kpi.value}</span>
                <div className={`flex items-center text-xs font-medium ${getTrendColor(kpi.trend)}`}>
                  {formatTrend(kpi.trend)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Efficiency Metrics - Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('dashboard.metrics.cpm', 'CPM'), value: `฿${stats.extendedStats.cpm.toFixed(2)}`, icon: Eye },
          { label: t('dashboard.metrics.ctr', 'CTR'), value: `${stats.extendedStats.ctr.toFixed(2)}%`, icon: MousePointer2 },
          { label: t('dashboard.metrics.cpc', 'CPC'), value: `฿${stats.extendedStats.cpc.toFixed(2)}`, icon: Target },
          { label: t('dashboard.metrics.cpp', 'Cost Per Purchase'), value: `฿${stats.extendedStats.cpp.toFixed(0)}`, icon: ShoppingBag },
        ].map((metric, i) => (
          <div key={i} className="glass-card p-4 flex flex-col justify-between hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
              <metric.icon className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">{metric.label}</span>
            </div>
            <div className="text-xl font-bold font-outfit">{metric.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3. Trend Chart - Takes 2/3 */}
        <div className="lg:col-span-2 glass-card p-6 h-[450px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg">{t('dashboard.charts.trends', 'Performance Trends')}</h3>
            <Tabs value={chartMetric} onValueChange={(v: any) => setChartMetric(v)} className="w-[400px]">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="spend">Spend</TabsTrigger>
                <TabsTrigger value="cpr">CPR</TabsTrigger>
                <TabsTrigger value="cpm">CPM</TabsTrigger>
                <TabsTrigger value="messages">Msgs</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMain" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(str) => format(new Date(str), 'MMM dd')}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickFormatter={(val) => {
                    if (chartMetric === 'messages') return val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val;
                    return `฿${val}`;
                  }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: any, name: any) => {
                    if (name === 'messages') return [value, 'Messages'];
                    return [`฿${typeof value === 'number' ? value.toFixed(2) : value}`, name.toUpperCase()];
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={chartMetric}
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorMain)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Funnel Visualization - Takes 1/3 */}
        <div className="glass-card p-6 h-[450px] flex flex-col">
          <h3 className="font-bold text-lg mb-6">{t('dashboard.funnel.title', 'Conversion Funnel')}</h3>

          {/* Custom Funnel Visualization */}
          <div className="flex-1 flex flex-col justify-center space-y-6">
            {funnelData.map((step, idx) => (
              <div key={idx} className="relative">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-muted-foreground">{step.name}</span>
                  <span className="font-bold">{step.value.toLocaleString()}</span>
                </div>
                <div className="h-3 w-full bg-muted/40 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(step.value / Math.max(stats.extendedStats.funnel.viewContent, 1)) * 100}%`,
                      backgroundColor: step.fill
                    }}
                  />
                </div>
                {/* Conversion Rate Connector */}
                {idx < funnelData.length - 1 && (
                  <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">
                    ↓ {idx === 0 ? convRates.vc_atc.toFixed(1) : convRates.atc_pur.toFixed(1)}%
                  </div>
                )}
              </div>
            ))}

            {stats.extendedStats.funnel.viewContent === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                No conversion data available for the selected period.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Top Campaigns Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-border/50 flex justify-between items-center">
          <h3 className="font-bold text-lg">{t('dashboard.recentCampaigns', 'Recent Campaigns')}</h3>
          <Link href="/ads-manager/campaigns" className="text-sm text-primary hover:underline">
            {t('dashboard.viewAll', 'View All')}
          </Link>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead>Status</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Results</TableHead>
                <TableHead className="text-right">Cost/Result</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right">ROAS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No active campaigns found.
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((camp) => (
                  <TableRow key={camp.id} className="group">
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`${camp.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}
                      >
                        {camp.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium group-hover:text-primary transition-colors">
                      {camp.name}
                    </TableCell>
                    <TableCell className="text-right">
                      {/* Placeholder logic for per-campaign stats - relying on API aggregation usually */}
                      {/* Dashboard API returns simple campaigns list, we might need to enhance Campaign API for this later, 
                                  but for now we use what we have or placeholders if data isn't in 'lite' mode. 
                                  Actually 'lite' mode currently only returns basics. 
                                  Will display Available data or dashes. */}
                      -
                    </TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell className="text-right">
                      {/* If we have spend data attached */}
                      -
                    </TableCell>
                    <TableCell className="text-right">-</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="bg-muted/20 p-2 text-center text-xs text-muted-foreground">
          * Campaign-level stats require full Ads Manager view.
        </div>
      </div>
    </div>
  );
}
