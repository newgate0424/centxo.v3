'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Edit2, Trash2, Play, Pause, Loader2, Search, Filter, RefreshCw, Download, Plus, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAdAccount } from '@/contexts/AdAccountContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DatePickerWithRange } from '@/components/DateRangePicker';
import { DateRange } from 'react-day-picker';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

interface Campaign {
  id: string;
  name: string;
  status: string;
  spend: number;
  messages: number;
  costPerMessage: number;
  dailyBudget: number;
  lifetimeBudget?: number;
  createdAt: string;
  adAccountId?: string;
  results?: number;
  costPerResult?: number;
  budget?: number;
  reach?: number;
  impressions?: number;
  postEngagements?: number;
  clicks?: number;
  messagingContacts?: number;
  amountSpent?: number;
  currency?: string;
}

interface AdSet {
  id: string;
  name: string;
  status: string;
  campaignId: string;
  dailyBudget: number;
  lifetimeBudget: number;
  optimizationGoal: string;
  billingEvent: string;
  bidAmount: number;
  targeting?: any;
  createdAt: string;
  adAccountId?: string;
  results?: number;
  costPerResult?: number;
  budget?: number;
  reach?: number;
  impressions?: number;
  postEngagements?: number;
  clicks?: number;
  messagingContacts?: number;
  amountSpent?: number;
  currency?: string;
}

interface Ad {
  id: string;
  name: string;
  status: string;
  adsetId: string;
  campaignId: string;
  creativeId: string;
  creativeName: string;
  title: string;
  body: string;
  imageUrl: string | null;
  targeting?: any;
  createdAt: string;
  adAccountId?: string;
  pageId?: string | null;
  pageName?: string;
  results?: number;
  costPerResult?: number;
  budget?: number;
  reach?: number;
  impressions?: number;
  postEngagements?: number;
  clicks?: number;
  messagingContacts?: number;
  amountSpent?: number;
}

export default function CampaignsPage() {
  const { data: session } = useSession();
  const { selectedAccounts } = useAdAccount();
  const { t, language } = useLanguage();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection State
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
  const [selectedAdSetIds, setSelectedAdSetIds] = useState<Set<string>>(new Set());

  // Filtered Data Logic
  const filteredAdSets = adSets.filter(adSet => {
    // If no campaigns selected, show all (or respect other filters like search/status)
    if (selectedCampaignIds.size === 0) return true;
    return selectedCampaignIds.has(adSet.campaignId);
  });

  const filteredAds = ads.filter(ad => {
    // 1. If AdSets are selected, filter by those AdSets.
    if (selectedAdSetIds.size > 0) {
      return selectedAdSetIds.has(ad.adsetId);
    }
    // 2. If NO AdSets selected, but Campaigns ARE selected, filter by the visible AdSets.
    if (selectedCampaignIds.size > 0) {
      return selectedCampaignIds.has(ad.campaignId);
    }
    // 3. If NOTHING selected, show all.
    return true;
  });

  const handleToggleCampaignSelection = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedCampaignIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedCampaignIds(newSelected);
  };

  const handleToggleAllCampaigns = (checked: boolean) => {
    if (checked) {
      // Select visible campaigns (respecting current search/status filters)
      const currentFilteredCampaigns = campaigns.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' ||
          (statusFilter === 'active' && c.status === 'ACTIVE') ||
          (statusFilter === 'paused' && c.status === 'PAUSED');
        return matchesSearch && matchesStatus;
      });
      setSelectedCampaignIds(new Set(currentFilteredCampaigns.map(c => c.id)));
    } else {
      setSelectedCampaignIds(new Set());
    }
  };

  const handleToggleAdSetSelection = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedAdSetIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedAdSetIds(newSelected);
  };

  const handleToggleAllAdSets = (checked: boolean) => {
    if (checked) {
      // Filtered AdSets are already computed based on campaign selection
      const currentVisibleAdSets = filteredAdSets.filter(a => {
        const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' ||
          (statusFilter === 'active' && a.status === 'ACTIVE') ||
          (statusFilter === 'paused' && a.status === 'PAUSED');
        return matchesSearch && matchesStatus;
      });
      setSelectedAdSetIds(new Set(currentVisibleAdSets.map(a => a.id)));
    } else {
      setSelectedAdSetIds(new Set());
    }
  };


  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'campaigns' | 'adsets' | 'ads'>('campaigns');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && c.status === 'ACTIVE') ||
      (statusFilter === 'paused' && c.status === 'PAUSED');
    return matchesSearch && matchesStatus;
  });
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(subDays(new Date(), 30)),
    to: endOfDay(new Date()),
  });
  const [expandedCell, setExpandedCell] = useState<string | null>(null);

  // Track last fetched accounts to prevent unnecessary API calls
  const lastFetchedAccountsRef = useRef<string>('');
  const lastFetchedTabRef = useRef<string>('');
  const isFetchingRef = useRef(false);

  // Check for refresh param on mount
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const shouldForceRefresh = searchParams?.get('refresh') === 'true';

  useEffect(() => {
    // Only fetch if we have a session and accounts, and not already fetching
    if (!session?.user || selectedAccounts.length === 0 || isFetchingRef.current) {
      if (selectedAccounts.length === 0) {
        setCampaigns([]);
        setAdSets([]);
        setAds([]);
        setLoading(false);
      }
      return;
    }

    // Check if accounts OR tab actually changed
    const currentAccountIds = selectedAccounts.map(a => a.id).sort().join(',');
    const currentTab = activeTab;

    const hasChanged = lastFetchedAccountsRef.current !== currentAccountIds || lastFetchedTabRef.current !== currentTab;

    if (!hasChanged && !shouldForceRefresh) {
      // Neither accounts nor tab changed, and no forced refresh requested
      return;
    }

    // Update last fetched accounts and tab
    lastFetchedAccountsRef.current = currentAccountIds;
    lastFetchedTabRef.current = currentTab;

    // Fetch data based on active tab
    const fetchData = async () => {
      // If forced refresh, pass refresh=true to API
      const refreshParam = shouldForceRefresh;

      if (activeTab === 'campaigns') {
        await fetchCampaigns(refreshParam);
      } else if (activeTab === 'adsets') {
        await fetchAdSets(refreshParam);
      } else if (activeTab === 'ads') {
        await fetchAds(refreshParam);
      }

      // Clean up URL if refresh param exists
      if (shouldForceRefresh) {
        const url = new URL(window.location.href);
        url.searchParams.delete('refresh');
        window.history.replaceState({}, '', url.toString());
      }
    };

    fetchData();
    fetchData();
  }, [session, selectedAccounts, activeTab, dateRange, shouldForceRefresh]);

  // DEBUG: Check filtering state
  useEffect(() => {
    console.log('--- DEBUG FILTERING ---');
    console.log('Selected Campaign IDs:', Array.from(selectedCampaignIds));
    console.log('Total AdSets:', adSets.length);
    if (adSets.length > 0) {
      console.log('Sample AdSet CampaignId:', adSets[0].campaignId, 'Type:', typeof adSets[0].campaignId);
    }
    console.log('Filtered AdSets Count:', filteredAdSets.length);
  }, [selectedCampaignIds, adSets, filteredAdSets]);

  // Polling for real-time updates every 15 seconds
  useEffect(() => {
    if (!session?.user || selectedAccounts.length === 0) return;

    const pollInterval = setInterval(() => {
      if (document.hidden) return; // Don't poll if tab is hidden

      if (activeTab === 'campaigns') {
        fetchCampaigns(false, true); // silent refresh
      } else if (activeTab === 'adsets') {
        fetchAdSets(false, true); // silent refresh
      } else if (activeTab === 'ads') {
        fetchAds(false, true); // silent refresh
      }
    }, 15000);

    return () => clearInterval(pollInterval);
  }, [session, selectedAccounts, activeTab, dateRange]);

  const fetchCampaigns = async (forceRefresh = false, silent = false) => {
    if (isFetchingRef.current) return; // Prevent concurrent requests

    try {
      isFetchingRef.current = true;
      if (!silent) setLoading(true);

      if (selectedAccounts.length === 0) {
        setError('Please select at least one ad account');
        setLoading(false);
        isFetchingRef.current = false;
        return;
      }

      // Fetch campaigns from all selected accounts in one go
      const adAccountIds = selectedAccounts.map(a => a.id).join(',');

      // Build URL with date range
      let url = `/api/campaigns?adAccountId=${adAccountIds}`;
      if (dateRange?.from && dateRange?.to) {
        url += `&dateFrom=${dateRange.from.toISOString()}&dateTo=${dateRange.to.toISOString()}`;
      }

      if (forceRefresh) {
        url += '&refresh=true';
      }

      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();

        const formattedCampaigns = data.campaigns.map((c: any) => ({
          ...c,
          createdAt: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '-',
          spend: c.metrics?.spend || 0,
          messages: c.metrics?.messages || 0,
          costPerMessage: c.metrics?.costPerMessage || 0,
          results: c.metrics?.results || 0,
          costPerResult: c.metrics?.costPerResult || 0,
          budget: c.metrics?.budget || 0,
          reach: c.metrics?.reach || 0,
          impressions: c.metrics?.impressions || 0,
          postEngagements: c.metrics?.postEngagements || 0,
          clicks: c.metrics?.clicks || 0,
          messagingContacts: c.metrics?.messagingContacts || 0,
          amountSpent: c.metrics?.amountSpent || 0,
        }));

        setCampaigns(formattedCampaigns);
      } else {
        const data = await response.json();
        if (!silent) setError(data.error || 'Failed to fetch campaigns');
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      if (!silent) setError(err instanceof Error ? err.message : 'Failed to load campaigns');
    } finally {
      if (!silent) setLoading(false);
      isFetchingRef.current = false;
    }
  };

  const fetchAdSets = async (forceRefresh = false, silent = false) => {
    if (isFetchingRef.current) return; // Prevent concurrent requests

    try {
      isFetchingRef.current = true;
      if (!silent) setLoading(true);

      if (selectedAccounts.length === 0) {
        setError('Please select at least one ad account');
        setLoading(false);
        isFetchingRef.current = false;
        return;
      }

      const adAccountIds = selectedAccounts.map(a => a.id).join(',');

      // Build URL with date range
      let url = `/api/adsets?adAccountId=${adAccountIds}`;
      if (dateRange?.from && dateRange?.to) {
        url += `&dateFrom=${dateRange.from.toISOString()}&dateTo=${dateRange.to.toISOString()}`;
      }

      if (forceRefresh) {
        url += '&refresh=true';
      }

      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();

        const formattedAdSets = data.adSets.map((adSet: any) => ({
          ...adSet,
          createdAt: new Date(adSet.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          campaignId: String(adSet.campaignId), // Force string to match state
        }));

        setAdSets(formattedAdSets);
      } else {
        const data = await response.json();
        if (!silent) setError(data.error || 'Failed to fetch ad sets');
      }
    } catch (err) {
      console.error('Error fetching ad sets:', err);
      if (!silent) setError(err instanceof Error ? err.message : 'Failed to load ad sets');
    } finally {
      if (!silent) setLoading(false);
      isFetchingRef.current = false;
    }
  };

  const fetchAds = async (forceRefresh = false, silent = false) => {
    if (isFetchingRef.current) return; // Prevent concurrent requests

    try {
      isFetchingRef.current = true;
      if (!silent) setLoading(true);

      if (selectedAccounts.length === 0) {
        setError('Please select at least one ad account');
        setLoading(false);
        isFetchingRef.current = false;
        return;
      }

      const adAccountIds = selectedAccounts.map(a => a.id).join(',');

      // Build URL with date range
      let url = `/api/ads?adAccountId=${adAccountIds}`;
      if (dateRange?.from && dateRange?.to) {
        url += `&dateFrom=${dateRange.from.toISOString()}&dateTo=${dateRange.to.toISOString()}`;
      }

      if (forceRefresh) {
        url += '&refresh=true';
      }

      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();

        const formattedAds = data.ads.map((ad: any) => ({
          ...ad,
          createdAt: new Date(ad.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
        }));

        setAds(formattedAds);
      } else {
        const data = await response.json();
        if (!silent) setError(data.error || 'Failed to fetch ads');
      }
    } catch (err) {
      console.error('Error fetching ads:', err);
      if (!silent) setError(err instanceof Error ? err.message : 'Failed to load ads');
    } finally {
      if (!silent) setLoading(false);
      isFetchingRef.current = false;
    }
  };


  const handleToggleCampaign = async (campaignId: string, currentStatus: string) => {
    // Optimistic update
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setCampaigns(prev =>
      prev.map(c => c.id === campaignId ? { ...c, status: newStatus } : c)
    );

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/toggle`, {
        method: 'POST',
      });

      if (!response.ok) {
        // Revert on error
        setCampaigns(prev =>
          prev.map(c => c.id === campaignId ? { ...c, status: currentStatus } : c)
        );
        const error = await response.json();
        alert(error.error || 'Failed to toggle campaign status');
      }
    } catch (error) {
      // Revert on error
      setCampaigns(prev =>
        prev.map(c => c.id === campaignId ? { ...c, status: currentStatus } : c)
      );
      console.error('Error toggling campaign:', error);
      alert('Failed to toggle campaign status');
    }
  };

  const handleToggleAdSet = async (adSetId: string, currentStatus: string) => {
    // Optimistic update
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setAdSets(prev =>
      prev.map(a => a.id === adSetId ? { ...a, status: newStatus } : a)
    );

    try {
      const response = await fetch(`/api/adsets/${adSetId}/toggle`, {
        method: 'POST',
      });

      if (!response.ok) {
        // Revert on error
        setAdSets(prev =>
          prev.map(a => a.id === adSetId ? { ...a, status: currentStatus } : a)
        );
        const error = await response.json();
        alert(error.error || 'Failed to toggle ad set status');
      }
    } catch (error) {
      // Revert on error
      setAdSets(prev =>
        prev.map(a => a.id === adSetId ? { ...a, status: currentStatus } : a)
      );
      console.error('Error toggling ad set:', error);
      alert('Failed to toggle ad set status');
    }
  };

  const handleToggleAd = async (adId: string, currentStatus: string) => {
    // Optimistic update
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setAds(prev =>
      prev.map(a => a.id === adId ? { ...a, status: newStatus } : a)
    );

    try {
      const response = await fetch(`/api/ads/${adId}/toggle`, {
        method: 'POST',
      });

      if (!response.ok) {
        // Revert on error
        setAds(prev =>
          prev.map(a => a.id === adId ? { ...a, status: currentStatus } : a)
        );
        const error = await response.json();
        alert(error.error || 'Failed to toggle ad status');
      }
    } catch (error) {
      // Revert on error
      setAds(prev =>
        prev.map(a => a.id === adId ? { ...a, status: currentStatus } : a)
      );
      console.error('Error toggling ad:', error);
      alert('Failed to toggle ad status');
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    // TODO: Implement delete
    console.log('Delete campaign:', campaignId);
  };

  // Helper function to get ad account name from ID
  const getAdAccountName = (adAccountId?: string) => {
    if (!adAccountId) return '-';
    const account = selectedAccounts.find(acc => acc.id === adAccountId);
    return account ? account.name : adAccountId.replace('act_', '');
  };

  // Helper function to get full ad account ID for Meta links
  const getAdAccountIdForMeta = (adAccountId?: string) => {
    if (!adAccountId) return '';
    const account = selectedAccounts.find(acc => acc.id === adAccountId);
    return account ? account.account_id : adAccountId;
  };

  // Helper function to format currency
  const formatCurrency = (amount: number, currency?: string) => {
    const curr = currency || 'USD';
    const currencySymbols: Record<string, string> = {
      'USD': '$',
      'THB': '฿',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'CNY': '¥',
      'KRW': '₩',
      'SGD': 'S$',
      'MYR': 'RM',
      'PHP': '₱',
      'VND': '₫',
      'IDR': 'Rp',
    };

    const symbol = currencySymbols[curr] || curr + ' ';
    return `${symbol}${amount.toFixed(2)}`;
  };

  // Helper function to format targeting data
  const formatTargeting = (targeting: any) => {
    if (!targeting) return '-';

    const parts = [];

    // Age
    if (targeting.age_min || targeting.age_max) {
      const ageMin = targeting.age_min || '18';
      const ageMax = targeting.age_max || '65+';
      parts.push(`อายุ: ${ageMin}-${ageMax}`);
    }

    // Countries
    if (targeting.geo_locations?.countries && targeting.geo_locations.countries.length > 0) {
      const countries = targeting.geo_locations.countries.join(', ');
      parts.push(`ประเทศ: ${countries}`);
    }

    // Interests
    if (targeting.flexible_spec && targeting.flexible_spec.length > 0) {
      const interests: string[] = [];
      targeting.flexible_spec.forEach((spec: any) => {
        if (spec.interests) {
          spec.interests.forEach((interest: any) => {
            if (interest.name) interests.push(interest.name);
          });
        }
      });
      if (interests.length > 0) {
        parts.push(`ความสนใจ: ${interests.slice(0, 3).join(', ')}${interests.length > 3 ? '...' : ''}`);
      }
    }

    return parts.length > 0 ? parts.join('\n') : '-';
  };

  // Helper function to format targeting data (full version for popover)
  const formatTargetingFull = (targeting: any) => {
    if (!targeting) return '-';

    const parts = [];

    // Age
    if (targeting.age_min || targeting.age_max) {
      const ageMin = targeting.age_min || '18';
      const ageMax = targeting.age_max || '65+';
      parts.push(`อายุ: ${ageMin}-${ageMax}`);
    }

    // Countries
    if (targeting.geo_locations?.countries && targeting.geo_locations.countries.length > 0) {
      const countries = targeting.geo_locations.countries.join(', ');
      parts.push(`ประเทศ: ${countries}`);
    }

    // Interests (all interests, not limited to 3)
    if (targeting.flexible_spec && targeting.flexible_spec.length > 0) {
      const interests: string[] = [];
      targeting.flexible_spec.forEach((spec: any) => {
        if (spec.interests) {
          spec.interests.forEach((interest: any) => {
            if (interest.name) interests.push(interest.name);
          });
        }
      });
      if (interests.length > 0) {
        parts.push(`ความสนใจ: ${interests.join(', ')}`);
      }
    }

    return parts.length > 0 ? parts.join('\n') : '-';
  };

  return (
    <div className="h-full p-4 md:p-6 lg:p-8 flex flex-col overflow-hidden">
      <div className="w-full flex flex-col h-full">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('campaigns.title', 'All Campaigns')}</h1>
            <p className="text-gray-600">{t('campaigns.subtitle', 'Manage and optimize your campaigns')}</p>
          </div>
          <Link href="/launch">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              {t('campaigns.newCampaign', 'New Campaign')}
            </Button>
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex-shrink-0">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Toolbar */}
        <div className="mb-4 flex flex-col sm:flex-row gap-3 flex-shrink-0">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('campaigns.search', 'Search campaigns...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            />
          </div>

          {/* Date Range Picker */}
          <DatePickerWithRange
            date={dateRange}
            setDate={setDateRange}
          />

          {/* Filter by Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'paused')}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white"
          >
            <option value="all">{t('campaigns.filter.allStatus', 'All Status')}</option>
            <option value="active">{t('campaigns.filter.active', 'Active')}</option>
            <option value="paused">{t('campaigns.filter.paused', 'Paused')}</option>
          </select>

          {/* Refresh Button */}
          <Button
            onClick={() => {
              if (activeTab === 'campaigns') fetchCampaigns();
              else if (activeTab === 'adsets') fetchAdSets();
              else fetchAds();
            }}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('campaigns.refresh', 'Refresh')}
          </Button>

          {/* Export Button */}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              // TODO: Implement export functionality
              console.log('Export data');
            }}
          >
            <Download className="h-4 w-4" />
            {t('campaigns.export', 'Export')}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex gap-2">
              <button
                onClick={() => setActiveTab('campaigns')}
                className={`${activeTab === 'campaigns'
                  ? 'border-gray-200 border-b-white text-primary bg-white -mb-px'
                  : 'border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  } w-[250px] py-3 px-3 border font-medium text-sm transition-colors flex items-center gap-2 rounded-t-lg`}
              >
                <span>{t('campaigns.tabs.campaigns', 'Campaigns')}</span>
                {selectedCampaignIds.size > 0 && (
                  <>
                    <span className="flex-1" />
                    <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                      Selected {selectedCampaignIds.size}
                      <span
                        onClick={(e) => { e.stopPropagation(); setSelectedCampaignIds(new Set()); }}
                        className="hover:bg-blue-200 rounded-full p-0.5 transition-colors cursor-pointer"
                        title="Clear selection"
                      >
                        <X className="h-3 w-3" />
                      </span>
                    </span>
                  </>
                )}
              </button>
              <button
                onClick={() => setActiveTab('adsets')}
                className={`${activeTab === 'adsets'
                  ? 'border-gray-200 border-b-white text-primary bg-white -mb-px'
                  : 'border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  } w-[250px] py-3 px-3 border font-medium text-sm transition-colors flex items-center gap-2 rounded-t-lg`}
              >
                <span>{t('campaigns.tabs.adsets', 'Ad Sets')}</span>
                {selectedAdSetIds.size > 0 && (
                  <>
                    <span className="flex-1" />
                    <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                      Selected {selectedAdSetIds.size}
                      <span
                        onClick={(e) => { e.stopPropagation(); setSelectedAdSetIds(new Set()); }}
                        className="hover:bg-blue-200 rounded-full p-0.5 transition-colors cursor-pointer"
                        title="Clear selection"
                      >
                        <X className="h-3 w-3" />
                      </span>
                    </span>
                  </>
                )}
              </button>
              <button
                onClick={() => setActiveTab('ads')}
                className={`${activeTab === 'ads'
                  ? 'border-gray-200 border-b-white text-primary bg-white -mb-px'
                  : 'border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  } w-[250px] py-3 px-3 border font-medium text-sm transition-colors flex items-center justify-start rounded-t-lg`}
              >
                {t('campaigns.tabs.ads', 'Ads')}
              </button>
            </nav>
          </div>
        </div>

        {/* Campaigns List */}
        <div className="bg-white border border-gray-200 border-t-0 overflow-hidden flex-1 flex flex-col min-h-0 rounded-tl-none rounded-tr-xl rounded-b-lg">{activeTab === 'campaigns' && (
          <>
            <div className="overflow-auto flex-1 border-t border-gray-200 rounded-tr-xl">
              <table className="w-full min-w-max">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 rounded-tr-xl">
                  <tr>
                    <th className="px-3 py-2 text-center text-sm font-semibold text-gray-900 w-12 border-r border-gray-200"></th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-900 w-20 border-r border-gray-200">ปิด/เปิด</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Ad Acc</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Campaign</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Status</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Results</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Cost per result</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Budget</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Reach</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Impressions</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Post engagements</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Clicks (all)</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Messaging contacts</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Amount spent</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Created</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 max-w-[280px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 border-b border-gray-200">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-3 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-4"></div></td>
                        <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 w-8 bg-gray-200 rounded-full mx-auto"></div></td>
                        <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                        <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-48"></div></td>
                        <td className="px-4 py-2 border-r border-gray-200"><div className="h-6 bg-gray-200 rounded-full w-16"></div></td>
                        <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                        <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                        <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                        <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                        <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                        <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                        <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                        <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                        <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                        <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                        <td className="px-2 py-2"><div className="h-6 bg-gray-200 rounded w-24 ml-auto"></div></td>
                      </tr>
                    ))
                  ) : filteredCampaigns.length === 0 ? (
                    <tr>
                      <td colSpan={16} className="text-center py-16">
                        <p className="text-gray-600 mb-4">{campaigns.length === 0 ? 'No campaigns yet' : 'No campaigns match your filters'}</p>
                        {campaigns.length === 0 && (
                          <Link href="/launch">
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                              Create Your First Campaign
                            </Button>
                          </Link>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredCampaigns.map((campaign, index) => (
                      <tr key={campaign.id} className="hover:bg-gray-50 transition-colors border-b border-gray-200">
                        <td
                          className="px-3 py-2 text-center text-sm text-gray-600 border-r border-gray-200 cursor-pointer hover:bg-gray-100"
                          onClick={() => handleToggleCampaignSelection(campaign.id, !selectedCampaignIds.has(campaign.id))}
                        >
                          <div className="flex justify-center">
                            <Checkbox
                              checked={selectedCampaignIds.has(campaign.id)}
                              onCheckedChange={(checked) => handleToggleCampaignSelection(campaign.id, checked as boolean)}
                              aria-label={`Select campaign ${campaign.name}`}
                              className="rounded-md"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center border-r border-gray-200">
                          <button
                            onClick={() => handleToggleCampaign(campaign.id, campaign.status)}
                            className={`group relative inline-flex h-4 w-8 items-center rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${campaign.status === 'ACTIVE'
                              ? 'bg-gradient-to-r from-green-400 to-green-500 shadow-md shadow-green-200 focus:ring-green-400'
                              : 'bg-gray-300 hover:bg-gray-400 focus:ring-gray-400'
                              }`}
                            title={campaign.status === 'ACTIVE' ? 'Click to pause' : 'Click to resume'}
                          >
                            <span
                              className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow-lg transition-all duration-300 ease-in-out group-hover:scale-110 ${campaign.status === 'ACTIVE' ? 'translate-x-[18px]' : 'translate-x-0.5'
                                }`}
                            />
                          </button>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200">
                          <Popover>
                            <PopoverTrigger asChild>
                              <div
                                className="truncate cursor-pointer hover:text-blue-600 hover:underline"
                                title={getAdAccountName(campaign.adAccountId)}
                                onClick={() => window.open(`https://business.facebook.com/adsmanager/manage/campaigns?act=${getAdAccountIdForMeta(campaign.adAccountId)}`, '_blank')}
                              >
                                {getAdAccountName(campaign.adAccountId)}
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-96 max-h-64 overflow-auto" align="start">
                              <div className="text-sm font-medium mb-2">Ad Account</div>
                              <div className="text-sm text-gray-700">{getAdAccountName(campaign.adAccountId)}</div>
                              <div className="text-xs text-gray-500 mt-1">Click to open in Meta Ads Manager</div>
                            </PopoverContent>
                          </Popover>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 border-r border-gray-200">
                          <Popover>
                            <PopoverTrigger asChild>
                              <div
                                className="truncate cursor-pointer hover:text-blue-600"
                                style={{ maxWidth: '280px' }}
                                title={campaign.name}
                              >
                                {campaign.name}
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-96 max-h-64 overflow-auto" align="start">
                              <div className="text-sm font-medium mb-2">Campaign Name</div>
                              <div className="text-sm text-gray-700 whitespace-pre-wrap">{campaign.name}</div>
                            </PopoverContent>
                          </Popover>
                        </td>
                        <td className="px-4 py-2 text-sm border-r border-gray-200">
                          <div className="inline-flex items-center gap-2">
                            <span className={`inline-block w-2 h-2 rounded-full ${campaign.status === 'ACTIVE'
                              ? 'bg-green-500'
                              : campaign.status === 'PAUSED'
                                ? 'bg-yellow-500'
                                : 'bg-gray-400'
                              }`}></span>
                            <span className="text-sm text-gray-900">
                              {campaign.status === 'ACTIVE' ? 'Active' : campaign.status === 'PAUSED' ? 'Paused' : campaign.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600 text-right border-r border-gray-200">
                          <Popover>
                            <PopoverTrigger asChild>
                              <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                {campaign.results?.toLocaleString() ?? '-'}
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-64" align="start">
                              <div className="text-sm font-medium mb-2">Results</div>
                              <div className="text-sm text-gray-700">{campaign.results?.toLocaleString() ?? '-'}</div>
                            </PopoverContent>
                          </Popover>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600 text-right border-r border-gray-200">
                          <Popover>
                            <PopoverTrigger asChild>
                              <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                {campaign.costPerResult ? `$${campaign.costPerResult.toFixed(2)}` : '-'}
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-64" align="start">
                              <div className="text-sm font-medium mb-2">Cost per result</div>
                              <div className="text-sm text-gray-700">{campaign.costPerResult ? `$${campaign.costPerResult.toFixed(2)}` : '-'}</div>
                            </PopoverContent>
                          </Popover>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600 text-right border-r border-gray-200">
                          <Popover>
                            <PopoverTrigger asChild>
                              <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                {(() => {
                                  const daily = campaign.dailyBudget || 0;
                                  const lifetime = campaign.lifetimeBudget || 0;
                                  const budget = daily > 0 ? daily : lifetime > 0 ? lifetime : 0;
                                  const budgetType = daily > 0 ? 'Daily' : lifetime > 0 ? 'Lifetime' : '';

                                  if (budget > 0) {
                                    return (
                                      <div className="flex flex-col items-end">
                                        <span className="text-xs text-gray-500">Campaign {budgetType}</span>
                                        <span className="font-medium">{formatCurrency(budget, campaign.currency)}</span>
                                      </div>
                                    );
                                  }
                                  return (
                                    <div className="flex flex-col items-end">
                                      <span className="text-xs text-gray-500">Ad Set Budget</span>
                                      <span className="text-gray-400">-</span>
                                    </div>
                                  );
                                })()}
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-64" align="start">
                              <div className="text-sm font-medium mb-2">Budget Information</div>
                              {campaign.dailyBudget && campaign.dailyBudget > 0 && (
                                <div className="text-sm text-gray-700 mb-1">
                                  <span className="font-medium">Campaign Daily:</span> {formatCurrency(campaign.dailyBudget, campaign.currency)}
                                </div>
                              )}
                              {campaign.lifetimeBudget && campaign.lifetimeBudget > 0 && (
                                <div className="text-sm text-gray-700 mb-1">
                                  <span className="font-medium">Campaign Lifetime:</span> {formatCurrency(campaign.lifetimeBudget, campaign.currency)}
                                </div>
                              )}
                              {(!campaign.dailyBudget || campaign.dailyBudget === 0) && (!campaign.lifetimeBudget || campaign.lifetimeBudget === 0) && (
                                <div className="text-sm text-gray-500">
                                  No campaign budget set.<br />
                                  Budget is managed at ad set level.
                                </div>
                              )}
                            </PopoverContent>
                          </Popover>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600 text-right border-r border-gray-200">
                          <Popover>
                            <PopoverTrigger asChild>
                              <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                {campaign.reach?.toLocaleString() ?? '-'}
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-64" align="start">
                              <div className="text-sm font-medium mb-2">Reach</div>
                              <div className="text-sm text-gray-700">{campaign.reach?.toLocaleString() ?? '-'}</div>
                            </PopoverContent>
                          </Popover>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600 text-right border-r border-gray-200">
                          <Popover>
                            <PopoverTrigger asChild>
                              <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                {campaign.impressions?.toLocaleString() ?? '-'}
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-64" align="start">
                              <div className="text-sm font-medium mb-2">Impressions</div>
                              <div className="text-sm text-gray-700">{campaign.impressions?.toLocaleString() ?? '-'}</div>
                            </PopoverContent>
                          </Popover>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600 text-right border-r border-gray-200">
                          <Popover>
                            <PopoverTrigger asChild>
                              <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                {campaign.postEngagements?.toLocaleString() ?? '-'}
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-64" align="start">
                              <div className="text-sm font-medium mb-2">Post engagements</div>
                              <div className="text-sm text-gray-700">{campaign.postEngagements?.toLocaleString() ?? '-'}</div>
                            </PopoverContent>
                          </Popover>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600 text-right border-r border-gray-200">
                          <Popover>
                            <PopoverTrigger asChild>
                              <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                {campaign.clicks?.toLocaleString() ?? '-'}
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-64" align="start">
                              <div className="text-sm font-medium mb-2">Clicks (all)</div>
                              <div className="text-sm text-gray-700">{campaign.clicks?.toLocaleString() ?? '-'}</div>
                            </PopoverContent>
                          </Popover>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600 text-right border-r border-gray-200">
                          <Popover>
                            <PopoverTrigger asChild>
                              <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                {campaign.messagingContacts?.toLocaleString() ?? '-'}
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-64" align="start">
                              <div className="text-sm font-medium mb-2">Messaging contacts</div>
                              <div className="text-sm text-gray-700">{campaign.messagingContacts?.toLocaleString() ?? '-'}</div>
                            </PopoverContent>
                          </Popover>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600 text-right border-r border-gray-200">
                          <Popover>
                            <PopoverTrigger asChild>
                              <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                {campaign.amountSpent ? `$${campaign.amountSpent.toFixed(2)}` : '-'}
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-64" align="start">
                              <div className="text-sm font-medium mb-2">Amount spent</div>
                              <div className="text-sm text-gray-700">{campaign.amountSpent ? `$${campaign.amountSpent.toFixed(2)}` : '-'}</div>
                            </PopoverContent>
                          </Popover>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200">
                          <Popover>
                            <PopoverTrigger asChild>
                              <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                {campaign.createdAt}
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-64" align="start">
                              <div className="text-sm font-medium mb-2">Created</div>
                              <div className="text-sm text-gray-700">{campaign.createdAt}</div>
                            </PopoverContent>
                          </Popover>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleToggleCampaign(campaign.id, campaign.status)}
                              className="inline-flex items-center justify-center p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title={campaign.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                            >
                              {campaign.status === 'ACTIVE' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </button>
                            <button
                              className="inline-flex items-center justify-center p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCampaign(campaign.id)}
                              className="inline-flex items-center justify-center p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

          {/* Ad Sets Tab */}
          {activeTab === 'adsets' && (
            <>
              <div className="overflow-auto flex-1">
                <table className="w-full min-w-max">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 text-center text-sm font-semibold text-gray-900 w-12 border-r border-gray-200">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={
                              filteredAdSets.length > 0 &&
                              selectedAdSetIds.size === filteredAdSets.length
                            }
                            onCheckedChange={(checked) => handleToggleAllAdSets(checked as boolean)}
                            aria-label="Select all ad sets"
                            className="rounded-md"
                          />
                        </div>
                      </th>
                      <th className="px-4 py-2 text-center text-sm font-semibold text-gray-900 w-20 border-r border-gray-200">ปิด/เปิด</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Ad Acc</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Ad Set Name</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Target</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Status</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Results</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Cost per result</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Budget</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Reach</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Impressions</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Post engagements</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Clicks (all)</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Messaging contacts</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Amount spent</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Daily Budget</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Optimization</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Bid Amount</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Created</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 max-w-[280px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 border-b border-gray-200">
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="px-3 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-8"></div></td>
                          <td className="px-4 py-2 border-r border-gray-200"><div className="h-6 bg-gray-200 rounded-full w-11 mx-auto"></div></td>
                          <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                          <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-48"></div></td>
                          <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-40"></div></td>
                          <td className="px-4 py-2 border-r border-gray-200"><div className="h-6 bg-gray-200 rounded-full w-16"></div></td>
                          <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                          <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                          <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                          <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                          <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                          <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                          <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                          <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                          <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                          <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-20 ml-auto"></div></td>
                          <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                          <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                          <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                          <td className="px-2 py-2"><div className="h-6 bg-gray-200 rounded w-24 ml-auto"></div></td>
                        </tr>
                      ))
                    ) : filteredAdSets.filter(a => {
                      const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase());
                      const matchesStatus = statusFilter === 'all' ||
                        (statusFilter === 'active' && a.status === 'ACTIVE') ||
                        (statusFilter === 'paused' && a.status === 'PAUSED');
                      return matchesSearch && matchesStatus;
                    }).length === 0 ? (
                      <tr>
                        <td colSpan={20} className="text-center py-16">
                          <p className="text-gray-600 mb-4">{filteredAdSets.length === 0 ? 'No ad sets found' : 'No ad sets match your filters'}</p>
                        </td>
                      </tr>
                    ) : (
                      filteredAdSets.filter(a => {
                        const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase());
                        const matchesStatus = statusFilter === 'all' ||
                          (statusFilter === 'active' && a.status === 'ACTIVE') ||
                          (statusFilter === 'paused' && a.status === 'PAUSED');
                        return matchesSearch && matchesStatus;
                      }).map((adSet, index) => (
                        <tr key={adSet.id} className="hover:bg-gray-50 transition-colors">
                          <td
                            className="px-3 py-2 text-center text-sm text-gray-600 border-r border-gray-200 cursor-pointer hover:bg-gray-100"
                            onClick={() => handleToggleAdSetSelection(adSet.id, !selectedAdSetIds.has(adSet.id))}
                          >
                            <div className="flex justify-center">
                              <Checkbox
                                checked={selectedAdSetIds.has(adSet.id)}
                                onCheckedChange={(checked) => handleToggleAdSetSelection(adSet.id, checked as boolean)}
                                aria-label={`Select ad set ${adSet.name}`}
                                className="rounded-md"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-2 text-center border-r border-gray-200">
                            <button
                              onClick={() => handleToggleAdSet(adSet.id, adSet.status)}
                              className={`group relative inline-flex h-4 w-8 items-center rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${adSet.status === 'ACTIVE'
                                ? 'bg-gradient-to-r from-green-400 to-green-500 shadow-md shadow-green-200 focus:ring-green-400'
                                : 'bg-gray-300 hover:bg-gray-400 focus:ring-gray-400'
                                }`}
                              title={adSet.status === 'ACTIVE' ? 'Click to pause' : 'Click to resume'}
                            >
                              <span
                                className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow-lg transition-all duration-300 ease-in-out group-hover:scale-110 ${adSet.status === 'ACTIVE' ? 'translate-x-[18px]' : 'translate-x-0.5'
                                  }`}
                              />
                            </button>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200">
                            <Popover>
                              <PopoverTrigger asChild>
                                <div
                                  className="truncate cursor-pointer hover:text-blue-600 hover:underline"
                                  title={getAdAccountName(adSet.adAccountId)}
                                  onClick={() => window.open(`https://business.facebook.com/adsmanager/manage/adsets?act=${getAdAccountIdForMeta(adSet.adAccountId)}`, '_blank')}
                                >
                                  {getAdAccountName(adSet.adAccountId)}
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-96 max-h-64 overflow-auto" align="start">
                                <div className="text-sm font-medium mb-2">Ad Account</div>
                                <div className="text-sm text-gray-700">{getAdAccountName(adSet.adAccountId)}</div>
                                <div className="text-xs text-gray-500 mt-1">Click to open in Meta Ads Manager</div>
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 border-r border-gray-200">
                            <Popover>
                              <PopoverTrigger asChild>
                                <div
                                  className="truncate cursor-pointer hover:text-blue-600"
                                  style={{ maxWidth: '280px' }}
                                  title={adSet.name}
                                >
                                  {adSet.name}
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-96 max-h-64 overflow-auto" align="start">
                                <div className="text-sm font-medium mb-2">Ad Set Name</div>
                                <div className="text-sm text-gray-700 whitespace-pre-wrap">{adSet.name}</div>
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="px-4 py-1 text-sm text-gray-600 border-r border-gray-200">
                            <Popover>
                              <PopoverTrigger asChild>
                                <div
                                  className="whitespace-pre-line text-xs line-clamp-3 cursor-pointer hover:text-blue-600"
                                  style={{ maxWidth: '280px' }}
                                  title={formatTargeting(adSet.targeting)}
                                >
                                  {formatTargeting(adSet.targeting)}
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-96 max-h-64 overflow-auto" align="start">
                                <div className="text-sm font-medium mb-2">Target</div>
                                <div className="text-sm text-gray-700 whitespace-pre-wrap">{formatTargetingFull(adSet.targeting)}</div>
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="px-4 py-2 text-sm border-r border-gray-200">
                            <div className="inline-flex items-center gap-2">
                              <span className={`inline-block w-2 h-2 rounded-full ${adSet.status === 'ACTIVE'
                                ? 'bg-green-500'
                                : adSet.status === 'PAUSED'
                                  ? 'bg-yellow-500'
                                  : 'bg-gray-400'
                                }`}></span>
                              <span className="text-sm text-gray-900">
                                {adSet.status === 'ACTIVE' ? 'Active' : adSet.status === 'PAUSED' ? 'Paused' : adSet.status}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 text-right border-r border-gray-200">
                            <Popover>
                              <PopoverTrigger asChild>
                                <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                  {adSet.results?.toLocaleString() ?? '-'}
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-64" align="start">
                                <div className="text-sm font-medium mb-2">Results</div>
                                <div className="text-sm text-gray-700">{adSet.results?.toLocaleString() ?? '-'}</div>
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 text-right border-r border-gray-200">
                            <Popover>
                              <PopoverTrigger asChild>
                                <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                  {adSet.costPerResult ? `$${adSet.costPerResult.toFixed(2)}` : '-'}
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-64" align="start">
                                <div className="text-sm font-medium mb-2">Cost per result</div>
                                <div className="text-sm text-gray-700">{adSet.costPerResult ? `$${adSet.costPerResult.toFixed(2)}` : '-'}</div>
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 text-right border-r border-gray-200">
                            <Popover>
                              <PopoverTrigger asChild>
                                <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                  {adSet.budget ? `$${adSet.budget.toFixed(2)}` : '-'}
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-64" align="start">
                                <div className="text-sm font-medium mb-2">Budget</div>
                                <div className="text-sm text-gray-700">{adSet.budget ? `$${adSet.budget.toFixed(2)}` : '-'}</div>
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 text-right border-r border-gray-200">
                            <Popover>
                              <PopoverTrigger asChild>
                                <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                  {adSet.reach?.toLocaleString() ?? '-'}
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-64" align="start">
                                <div className="text-sm font-medium mb-2">Reach</div>
                                <div className="text-sm text-gray-700">{adSet.reach?.toLocaleString() ?? '-'}</div>
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 text-right border-r border-gray-200">
                            <Popover>
                              <PopoverTrigger asChild>
                                <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                  {adSet.impressions?.toLocaleString() ?? '-'}
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-64" align="start">
                                <div className="text-sm font-medium mb-2">Impressions</div>
                                <div className="text-sm text-gray-700">{adSet.impressions?.toLocaleString() ?? '-'}</div>
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 text-right border-r border-gray-200">
                            <Popover>
                              <PopoverTrigger asChild>
                                <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                  {adSet.postEngagements?.toLocaleString() ?? '-'}
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-64" align="start">
                                <div className="text-sm font-medium mb-2">Post engagements</div>
                                <div className="text-sm text-gray-700">{adSet.postEngagements?.toLocaleString() ?? '-'}</div>
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 text-right border-r border-gray-200">
                            <Popover>
                              <PopoverTrigger asChild>
                                <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                  {adSet.clicks?.toLocaleString() ?? '-'}
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-64" align="start">
                                <div className="text-sm font-medium mb-2">Clicks (all)</div>
                                <div className="text-sm text-gray-700">{adSet.clicks?.toLocaleString() ?? '-'}</div>
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 text-right border-r border-gray-200">
                            <Popover>
                              <PopoverTrigger asChild>
                                <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                  {adSet.messagingContacts?.toLocaleString() ?? '-'}
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-64" align="start">
                                <div className="text-sm font-medium mb-2">Messaging contacts</div>
                                <div className="text-sm text-gray-700">{adSet.messagingContacts?.toLocaleString() ?? '-'}</div>
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 text-right border-r border-gray-200">
                            <Popover>
                              <PopoverTrigger asChild>
                                <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                  {adSet.amountSpent ? `$${adSet.amountSpent.toFixed(2)}` : '-'}
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-64" align="start">
                                <div className="text-sm font-medium mb-2">Amount spent</div>
                                <div className="text-sm text-gray-700">{adSet.amountSpent ? `$${adSet.amountSpent.toFixed(2)}` : '-'}</div>
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 text-right border-r border-gray-200">
                            <Popover>
                              <PopoverTrigger asChild>
                                <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                  ${adSet.dailyBudget > 0 ? adSet.dailyBudget.toFixed(2) : adSet.lifetimeBudget.toFixed(2)}
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-64" align="start">
                                <div className="text-sm font-medium mb-2">{adSet.dailyBudget > 0 ? 'Daily Budget' : 'Lifetime Budget'}</div>
                                <div className="text-sm text-gray-700">${adSet.dailyBudget > 0 ? adSet.dailyBudget.toFixed(2) : adSet.lifetimeBudget.toFixed(2)}</div>
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200">
                            <Popover>
                              <PopoverTrigger asChild>
                                <div className="truncate cursor-pointer hover:text-blue-600" title={adSet.optimizationGoal}>
                                  {adSet.optimizationGoal}
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-96 max-h-64 overflow-auto" align="start">
                                <div className="text-sm font-medium mb-2">Optimization Goal</div>
                                <div className="text-sm text-gray-700">{adSet.optimizationGoal}</div>
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 text-right border-r border-gray-200">
                            <Popover>
                              <PopoverTrigger asChild>
                                <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                  ${adSet.bidAmount.toFixed(2)}
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-64" align="start">
                                <div className="text-sm font-medium mb-2">Bid Amount</div>
                                <div className="text-sm text-gray-700">${adSet.bidAmount.toFixed(2)}</div>
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200">
                            <Popover>
                              <PopoverTrigger asChild>
                                <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                  {adSet.createdAt}
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-64" align="start">
                                <div className="text-sm font-medium mb-2">Created</div>
                                <div className="text-sm text-gray-700">{adSet.createdAt}</div>
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                className="inline-flex items-center justify-center p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title={adSet.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                              >
                                {adSet.status === 'ACTIVE' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                              </button>
                              <button
                                className="inline-flex items-center justify-center p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                className="inline-flex items-center justify-center p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Ads Tab */}
          {activeTab === 'ads' && (
            <>
              <div className="overflow-auto flex-1">
                <table className="w-full min-w-max">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                    <tr>
                      {/* Removed Index Header */}
                      <th className="px-4 py-2 text-center text-sm font-semibold text-gray-900 w-20 border-r border-gray-200">ปิด/เปิด</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Ad Acc</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Page</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Ad Name</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Target</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Status</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Results</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Cost per result</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Budget</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Reach</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Impressions</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Post engagements</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Clicks (all)</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Messaging contacts</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Amount spent</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Title</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Body</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">Created</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 max-w-[280px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 border-b border-gray-200">
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="px-3 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-8"></div></td>
                          <td className="px-4 py-2 border-r border-gray-200"><div className="h-6 bg-gray-200 rounded-full w-11 mx-auto"></div></td>
                          <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                          <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                          <td className="px-4 py-2 border-r border-gray-200">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-200 rounded"></div>
                              <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-48"></div>
                                <div className="h-3 bg-gray-200 rounded w-32"></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-40"></div></td>
                          <td className="px-4 py-2 border-r border-gray-200"><div className="h-6 bg-gray-200 rounded-full w-16"></div></td>
                          <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-40"></div></td>
                          <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-56"></div></td>
                          <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                          <td className="px-2 py-2"><div className="h-6 bg-gray-200 rounded w-24 ml-auto"></div></td>
                        </tr>
                      ))
                    ) : ads.filter(a => {
                      const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        a.body?.toLowerCase().includes(searchQuery.toLowerCase());
                      const matchesStatus = statusFilter === 'all' ||
                        (statusFilter === 'active' && a.status === 'ACTIVE') ||
                        (statusFilter === 'paused' && a.status === 'PAUSED');
                      return matchesSearch && matchesStatus;
                    }).length === 0 ? (
                      <tr>
                        <td colSpan={20} className="text-center py-16">
                          <p className="text-gray-600 mb-4">{ads.length === 0 ? 'No ads found' : 'No ads match your filters'}</p>
                        </td>
                      </tr>
                    ) : (
                      filteredAds.filter(a => {
                        const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.body?.toLowerCase().includes(searchQuery.toLowerCase());
                        const matchesStatus = statusFilter === 'all' ||
                          (statusFilter === 'active' && a.status === 'ACTIVE') ||
                          (statusFilter === 'paused' && a.status === 'PAUSED');
                        return matchesSearch && matchesStatus;
                      }).map((ad, index) => (
                        <tr key={ad.id} className="hover:bg-gray-50 transition-colors">
                          {/* Removed Index Column */}
                          <td className="px-4 py-2 text-center border-r border-gray-200">
                            <button
                              onClick={() => handleToggleAd(ad.id, ad.status)}
                              className={`group relative inline-flex h-4 w-8 items-center rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${ad.status === 'ACTIVE'
                                ? 'bg-gradient-to-r from-green-400 to-green-500 shadow-md shadow-green-200 focus:ring-green-400'
                                : 'bg-gray-300 hover:bg-gray-400 focus:ring-gray-400'
                                }`}
                              title={ad.status === 'ACTIVE' ? 'Click to pause' : 'Click to resume'}
                            >
                              <span
                                className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow-lg transition-all duration-300 ease-in-out group-hover:scale-110 ${ad.status === 'ACTIVE' ? 'translate-x-[18px]' : 'translate-x-0.5'
                                  }`}
                              />
                            </button>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200">
                            <Popover>
                              <PopoverTrigger asChild>
                                <div
                                  className="truncate cursor-pointer hover:text-blue-600 hover:underline"
                                  title={getAdAccountName(ad.adAccountId)}
                                  onClick={() => window.open(`https://business.facebook.com/adsmanager/manage/ads?act=${getAdAccountIdForMeta(ad.adAccountId)}`, '_blank')}
                                >
                                  {getAdAccountName(ad.adAccountId)}
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-96 max-h-64 overflow-auto" align="start">
                                <div className="text-sm font-medium mb-2">Ad Account</div>
                                <div className="text-sm text-gray-700">{getAdAccountName(ad.adAccountId)}</div>
                                <div className="text-xs text-gray-500 mt-1">Click to open in Meta Ads Manager</div>
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200">
                            <div style={{ maxWidth: '280px' }}>
                              <div
                                className="truncate cursor-pointer hover:text-blue-600 hover:underline"
                                title={ad.pageName}
                                onClick={() => ad.pageId && window.open(`https://www.facebook.com/${ad.pageId}`, '_blank')}
                              >
                                {ad.pageName || '-'}
                              </div>
                              {ad.pageId && (
                                <div className="text-xs text-gray-500 truncate" title={ad.pageId}>
                                  ID: {ad.pageId}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2 border-r border-gray-200">
                            <div className="flex items-center gap-3">
                              {ad.imageUrl ? (
                                <img
                                  src={ad.imageUrl}
                                  alt={ad.name}
                                  className="w-10 h-10 object-cover rounded border border-gray-200"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-10 h-10 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                                  <span className="text-xs text-gray-400">No Image</span>
                                </div>
                              )}
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div
                                    className="flex flex-col min-w-0 cursor-pointer"
                                    style={{ maxWidth: '280px' }}
                                  >
                                    <div className="text-sm text-gray-900 truncate hover:text-blue-600" title={ad.name}>
                                      {ad.name}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate" title={ad.id}>
                                      ID: {ad.id}
                                    </div>
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-96 max-h-64 overflow-auto" align="start">
                                  <div className="text-sm font-medium mb-2">Ad Name</div>
                                  <div className="text-sm text-gray-700 whitespace-pre-wrap">{ad.name}</div>
                                  <div className="text-xs text-gray-500 mt-2">ID: {ad.id}</div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </td>
                          <td className="px-4 py-1 text-sm text-gray-600 border-r border-gray-200">
                            <Popover>
                              <PopoverTrigger asChild>
                                <div
                                  className="whitespace-pre-line text-xs line-clamp-3 cursor-pointer hover:text-blue-600"
                                  style={{ maxWidth: '280px' }}
                                  title={formatTargeting(ad.targeting)}
                                >
                                  {formatTargeting(ad.targeting)}
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-96 max-h-64 overflow-auto" align="start">
                                <div className="text-sm font-medium mb-2">Target</div>
                                <div className="text-sm text-gray-700 whitespace-pre-wrap">{formatTargetingFull(ad.targeting)}</div>
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="px-4 py-2 text-sm border-r border-gray-200">
                            <div className="inline-flex items-center gap-2">
                              <span className={`inline-block w-2 h-2 rounded-full ${ad.status === 'ACTIVE'
                                ? 'bg-green-500'
                                : ad.status === 'PAUSED'
                                  ? 'bg-yellow-500'
                                  : 'bg-gray-400'
                                }`}></span>
                              <span className="text-sm text-gray-900">
                                {ad.status === 'ACTIVE' ? 'Active' : ad.status === 'PAUSED' ? 'Paused' : ad.status}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 text-right border-r border-gray-200">
                            <Popover>
                              <PopoverTrigger asChild>
                                <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                  {ad.results?.toLocaleString() ?? '-'}
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-64" align="start">
                                <div className="text-sm font-medium mb-2">Results</div>
                                <div className="text-sm text-gray-700">{ad.results?.toLocaleString() ?? '-'}</div>
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 text-right border-r border-gray-200">
                            <Popover>
                              <PopoverTrigger asChild>
                                <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                  {ad.costPerResult ? `$${ad.costPerResult.toFixed(2)}` : '-'}
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-64" align="start">
                                <div className="text-sm font-medium mb-2">Cost per result</div>
                                <div className="text-sm text-gray-700">{ad.costPerResult ? `$${ad.costPerResult.toFixed(2)}` : '-'}</div>
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 text-right border-r border-gray-200">
                            <Popover>
                              <PopoverTrigger asChild>
                                <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                  {ad.budget ? `$${ad.budget.toFixed(2)}` : '-'}
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-64" align="start">
                                <div className="text-sm font-medium mb-2">Budget</div>
                                <div className="text-sm text-gray-700">{ad.budget ? `$${ad.budget.toFixed(2)}` : '-'}</div>
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 text-right border-r border-gray-200">
                            <Popover>
                              <PopoverTrigger asChild>
                                <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                  {ad.reach?.toLocaleString() ?? '-'}
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-64" align="start">
                                <div className="text-sm font-medium mb-2">Reach</div>
                                <div className="text-sm text-gray-700">{ad.reach?.toLocaleString() ?? '-'}</div>
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 text-right border-r border-gray-200">
                            <Popover>
                              <PopoverTrigger asChild>
                                <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                  {ad.impressions?.toLocaleString() ?? '-'}
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-64" align="start">
                                <div className="text-sm font-medium mb-2">Impressions</div>
                                <div className="text-sm text-gray-700">{ad.impressions?.toLocaleString() ?? '-'}</div>
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 text-right border-r border-gray-200">
                            <Popover>
                              <PopoverTrigger asChild>
                                <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                  {ad.postEngagements?.toLocaleString() ?? '-'}
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-64" align="start">
                                <div className="text-sm font-medium mb-2">Post engagements</div>
                                <div className="text-sm text-gray-700">{ad.postEngagements?.toLocaleString() ?? '-'}</div>
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 text-right border-r border-gray-200">
                            <Popover>
                              <PopoverTrigger asChild>
                                <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                  {ad.clicks?.toLocaleString() ?? '-'}
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-64" align="start">
                                <div className="text-sm font-medium mb-2">Clicks (all)</div>
                                <div className="text-sm text-gray-700">{ad.clicks?.toLocaleString() ?? '-'}</div>
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 text-right border-r border-gray-200">
                            <Popover>
                              <PopoverTrigger asChild>
                                <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                  {ad.messagingContacts?.toLocaleString() ?? '-'}
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-64" align="start">
                                <div className="text-sm font-medium mb-2">Messaging contacts</div>
                                <div className="text-sm text-gray-700">{ad.messagingContacts?.toLocaleString() ?? '-'}</div>
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 text-right border-r border-gray-200">
                            <Popover>
                              <PopoverTrigger asChild>
                                <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                  {ad.amountSpent ? `$${ad.amountSpent.toFixed(2)}` : '-'}
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-64" align="start">
                                <div className="text-sm font-medium mb-2">Amount spent</div>
                                <div className="text-sm text-gray-700">{ad.amountSpent ? `$${ad.amountSpent.toFixed(2)}` : '-'}</div>
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200">
                            <Popover>
                              <PopoverTrigger asChild>
                                <div className="truncate cursor-pointer hover:text-blue-600" title={ad.title}>
                                  {ad.title}
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-96 max-h-64 overflow-auto" align="start">
                                <div className="text-sm font-medium mb-2">Title</div>
                                <div className="text-sm text-gray-700 whitespace-pre-wrap">{ad.title}</div>
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200">
                            <Popover>
                              <PopoverTrigger asChild>
                                <div
                                  className="cursor-pointer hover:text-blue-600 hover:underline"
                                  style={{ maxWidth: '280px' }}
                                  onClick={() => ad.pageId && window.open(`https://www.facebook.com/${ad.pageId}`, '_blank')}
                                >
                                  <div className="truncate" title={ad.pageName}>
                                    {ad.pageName || '-'}
                                  </div>
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-96 max-h-64 overflow-auto" align="start">
                                <div className="text-sm font-medium mb-2">Page</div>
                                <div className="text-sm text-gray-700">{ad.pageName || '-'}</div>
                                <div className="text-xs text-gray-500 mt-1">Click to open Facebook page</div>
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200">
                            <Popover>
                              <PopoverTrigger asChild>
                                <div className="truncate cursor-pointer hover:text-blue-600" style={{ maxWidth: '280px' }} title={ad.body}>
                                  {ad.body}
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-96 max-h-64 overflow-auto" align="start">
                                <div className="text-sm font-medium mb-2">Body</div>
                                <div className="text-sm text-gray-700 whitespace-pre-wrap">{ad.body}</div>
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200">
                            <Popover>
                              <PopoverTrigger asChild>
                                <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                  {ad.createdAt}
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-64" align="start">
                                <div className="text-sm font-medium mb-2">Created</div>
                                <div className="text-sm text-gray-700">{ad.createdAt}</div>
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                className="inline-flex items-center justify-center p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title={ad.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                              >
                                {ad.status === 'ACTIVE' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                              </button>
                              <button
                                className="inline-flex items-center justify-center p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                className="inline-flex items-center justify-center p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
