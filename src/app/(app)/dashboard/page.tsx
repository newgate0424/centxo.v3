'use client';

import { useState, useEffect, useMemo } from "react";
import { DollarSign, MessageSquare, TrendingUp, Zap, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAdAccount } from '@/contexts/AdAccountContext';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function DashboardPage() {
  const { data: session } = useSession();
  const { selectedAccounts } = useAdAccount();
  const { t, language } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState({
    totalSpend: 0,
    totalMessages: 0,
    avgCostPerMessage: 0,
    activeCampaigns: 0,
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
  }, [session, selectedAccounts]);

  const fetchStats = async () => {
    try {
      setLoading(true);

      if (selectedAccounts.length === 0) {
        setStats({
          totalSpend: 0,
          totalMessages: 0,
          avgCostPerMessage: 0,
          activeCampaigns: 0,
        });
        setLoading(false);
        return;
      }

      const adAccountIds = selectedAccounts.map(a => a.id).join(',');
      const response = await fetch(`/api/dashboard/stats?adAccountId=${adAccountIds}`);

      if (response.ok) {
        const data = await response.json();
        setStats({
          totalSpend: data.totalSpend || 0,
          totalMessages: data.totalMessages || 0,
          avgCostPerMessage: data.avgCostPerMessage || 0,
          activeCampaigns: data.activeCampaigns || 0,
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

  const statCards = useMemo(() => [
    {
      title: t('dashboard.totalSpend', 'Total Spend'),
      value: `$${stats.totalSpend.toFixed(2)}`,
      icon: DollarSign,
      color: "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400"
    },
    {
      title: t('dashboard.totalMessages', 'Total Messages'),
      value: stats.totalMessages.toLocaleString(),
      icon: MessageSquare,
      color: "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400"
    },
    {
      title: t('dashboard.averageCPC', 'Avg Cost/Message'),
      value: `$${stats.avgCostPerMessage.toFixed(3)}`,
      icon: TrendingUp,
      color: "bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400"
    },
    {
      title: t('dashboard.activeCampaigns', 'Active Campaigns'),
      value: stats.activeCampaigns,
      icon: Zap,
      color: "bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400"
    },
  ], [stats, t, language]);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-outfit font-bold text-foreground tracking-tight">{t('dashboard.title', 'Dashboard')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('dashboard.subtitle', 'Monitor your campaign performance')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white/50 dark:bg-black/20 backdrop-blur-sm border rounded-lg px-3 py-1.5 text-sm text-muted-foreground shadow-sm">
            Selected: <span className="font-semibold text-foreground">{mounted ? selectedAccounts.length : 0} Accounts</span>
          </div>
          <Link href="/launch">
            <Button className="shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow">
              <Zap className="mr-2 h-4 w-4" />
              New Campaign
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="glass-card p-6 hover:translate-y-[-2px] transition-all duration-300 group"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-muted-foreground">{card.title}</h3>
                <div className={`p-2.5 rounded-xl ${card.color} bg-opacity-10 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="text-3xl font-outfit font-bold tracking-tight text-foreground">{card.value}</p>
              {/* Placeholder for trend - can be real data later */}
              <div className="flex items-center mt-2 text-xs text-green-500 font-medium">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span>+12.5%</span>
                <span className="text-muted-foreground ml-1 font-normal">from last month</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Active Campaigns - Takes 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-outfit tracking-tight">{t('dashboard.recentCampaigns', 'Recent Campaigns')}</h2>
            <Link href="/campaigns" className="text-sm text-primary hover:text-primary/80 font-medium flex items-center transition-colors">
              {t('dashboard.viewAll', 'View All')} <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              {campaigns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                    <Zap className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground">No active campaigns</h3>
                  <p className="text-muted-foreground max-w-sm mt-2 mb-6">
                    Ready to scale? Launch your first AI-powered ad campaign in minutes.
                  </p>
                  <Link href="/launch">
                    <Button>Create Campaign</Button>
                  </Link>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/20">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Campaign</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Spend</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {campaigns.map((campaign) => (
                      <tr key={campaign.id} className="group hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                            {campaign.name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Created {new Date(campaign.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${campaign.status === 'ACTIVE'
                            ? 'bg-green-500/10 text-green-600 border-green-500/20'
                            : campaign.status === 'PAUSED'
                              ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                              : 'bg-slate-500/10 text-slate-600 border-slate-500/20'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${campaign.status === 'ACTIVE' ? 'bg-green-500' :
                              campaign.status === 'PAUSED' ? 'bg-yellow-500' : 'bg-slate-500'
                              }`} />
                            {campaign.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-foreground">
                          ${campaign.metrics?.spend?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/campaigns/${campaign.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions / Sidebar - Takes 1/3 width */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold font-outfit tracking-tight">Quick Actions</h2>

          <div className="grid gap-4">
            <div className="glass-card p-5 hover:border-primary/50 transition-colors cursor-pointer group">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-blue-500/10 text-blue-600 group-hover:text-blue-500 transition-colors">
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Optimize</h3>
                  <p className="text-sm text-muted-foreground mt-1">Run AI analysis on active ads to improve ROI</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-5 hover:border-primary/50 transition-colors cursor-pointer group">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-purple-500/10 text-purple-600 group-hover:text-purple-500 transition-colors">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Analytics Report</h3>
                  <p className="text-sm text-muted-foreground mt-1">Download monthly performance summary</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-5 hover:border-primary/50 transition-colors cursor-pointer group">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-orange-500/10 text-orange-600 group-hover:text-orange-500 transition-colors">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Connect Assets</h3>
                  <p className="text-sm text-muted-foreground mt-1">Manage Facebook Pages and Instagram accounts</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
