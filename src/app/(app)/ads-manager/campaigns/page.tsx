'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Edit2, Trash2, Play, Pause, Loader2, Search, Filter, RefreshCw, Download, Plus, X, ExternalLink, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { ChevronDown } from "lucide-react";

import { showCustomToast, showErrorToast, showWarningToast } from "@/utils/custom-toast";


import { toast } from "sonner";


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
  effectiveStatus?: string;
  configuredStatus?: string;
  spendCap?: number;
  issuesInfo?: any[];
  adSets?: { effectiveStatus: string; ads?: { effectiveStatus: string }[] }[];
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
  effectiveStatus?: string;
  configuredStatus?: string;
  issuesInfo?: any[];
  ads?: { effectiveStatus: string }[];
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
  postLink?: string | null;
  effectiveStatus?: string;
  configuredStatus?: string;
  issuesInfo?: any[];
}

export default function CampaignsPage() {
  const { data: session } = useSession();
  const { selectedAccounts, adAccounts } = useAdAccount();
  const { t, language } = useLanguage();

  // 1. Data State
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Local Account Selection for this view (will load from localStorage after mount)
  const [viewSelectedAccountIds, setViewSelectedAccountIds] = useState<Set<string>>(new Set());
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);


  // Initialize viewSelectedAccountIds with global selection when component mounts (optional, or start empty)
  // User requested: if no account selected at accounts tab (local), cannot go to other tabs.
  // We can default to empty or global. Let's default to empty to force explicit selection as per "like C:\Users... project" reference which often implies strict flow.
  // However, usually it's good UX to pre-select if we already have global.
  // Let's stick to: Start empty? No, better to sync with global initially?
  // User said: "Check box at accounts tab is not related to Config page".
  // This implies they start independent. Let's init with empty.
  // Wait, if users see everything empty they might be confused.
  // Let's initialize with ALL loaded accounts? Or Empty?
  // "If not select... cannot go". Implies empty start.

  // Load selected accounts from localStorage after mount (avoid hydration mismatch)
  // Load selected accounts from localStorage after mount (avoid hydration mismatch)
  // If no saved state, default to ALL selected accounts (better UX than empty)
  useEffect(() => {
    if (!isMounted) return;
    const saved = localStorage.getItem('campaigns_selected_accounts');
    if (saved) {
      try {
        const accountIds = new Set<string>(JSON.parse(saved));
        setViewSelectedAccountIds(accountIds);
      } catch (e) {
        // Invalid data, ignore
      }
    } else if (selectedAccounts.length > 0) {
      // Default to ALL if nothing saved
      setViewSelectedAccountIds(new Set(selectedAccounts.map(a => a.id)));
    }
  }, [selectedAccounts, isMounted]); // Run once when mounted or accounts load

  // Save selected accounts to localStorage whenever it changes
  // Save selected accounts to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && isMounted) {
      localStorage.setItem('campaigns_selected_accounts', JSON.stringify(Array.from(viewSelectedAccountIds)));
    }
  }, [viewSelectedAccountIds, isMounted]);

  // 2. UI State (will load from localStorage after mount)
  const [activeTab, setActiveTab] = useState<'campaigns' | 'adsets' | 'ads'>('campaigns');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'completed' | 'rejected' | 'with_issues' | 'in_review'>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });

  // Load date range from localStorage after mount
  useEffect(() => {
    const saved = localStorage.getItem('campaigns_date_range');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.from && parsed.to) {
          setDateRange({
            from: new Date(parsed.from),
            to: new Date(parsed.to)
          });
        }
      } catch (e) {
        // Invalid data
      }
    }
  }, []);

  // Save date range to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && dateRange?.from && dateRange?.to) {
      localStorage.setItem('campaigns_date_range', JSON.stringify({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString()
      }));
    }
  }, [dateRange]);
  const [expandedCell, setExpandedCell] = useState<string | null>(null);

  // Load active tab from localStorage after mount (avoid hydration mismatch)
  useEffect(() => {
    const saved = localStorage.getItem('campaigns_active_tab');
    if (saved && ['campaigns', 'adsets', 'ads'].includes(saved)) {
      setActiveTab(saved as 'campaigns' | 'adsets' | 'ads');
    }
  }, []);

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('campaigns_active_tab', activeTab);
    }
  }, [activeTab]);

  const handleTabChange = (tab: 'campaigns' | 'adsets' | 'ads') => {
    if (viewSelectedAccountIds.size === 0) {
      showWarningToast(t('campaigns.alert.selectAccount', 'Please select at least one account'));
      return;
    }
    setActiveTab(tab);
  };

  // Auto-select accounts and switch tab when coming from launch page
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');

    // If we have a tab parameter and accounts from global context
    if (tabParam && selectedAccounts.length > 0) {
      // Auto-select all accounts from global context
      if (viewSelectedAccountIds.size === 0) {
        const accountIds = new Set(selectedAccounts.map(acc => acc.id));
        setViewSelectedAccountIds(accountIds);
      }

      // Switch to the requested tab (after accounts are selected)
      if (viewSelectedAccountIds.size > 0 && ['campaigns', 'adsets', 'ads'].includes(tabParam)) {
        setActiveTab(tabParam as 'campaigns' | 'adsets' | 'ads');
      }
    }
  }, [selectedAccounts, viewSelectedAccountIds.size]);



  // Sorting state
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: 'asc' | 'desc' | null;
  }>({ key: null, direction: null });

  // 3. Selection State
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
  const [selectedAdSetIds, setSelectedAdSetIds] = useState<Set<string>>(new Set());
  const [selectedAdIds, setSelectedAdIds] = useState<Set<string>>(new Set());

  // 4. Filtered Data Logic (must be after state definitions)
  // 4. Filtered Data Logic (must be after state definitions)

  // Helper functions for detailed status
  // Extended interface for Account checking
  interface DetailedAdAccount {
    id: string;
    account_status?: number; // 1=Active, 2=Disabled, etc.
    disable_reason?: number;
    spend_cap?: string | number;
    amount_spent?: string | number;
  }

  // Type for status return
  type StatusResult = {
    label: string;
    color: string;
    textColor: string;
    type: 'active' | 'paused' | 'completed' | 'rejected' | 'with_issues' | 'in_review' | 'other';
  };

  // Helper functions for detailed status
  const getCampaignStatus = (campaign: Campaign, accountMap: Record<string, DetailedAdAccount>): StatusResult => {
    // 1. Account Level Checks
    const account = campaign.adAccountId ? accountMap[campaign.adAccountId] : undefined;
    if (account) {
      // Account Disabled
      if (account.account_status === 2) {
        return { label: 'Account Disabled', color: 'bg-red-500', textColor: 'text-red-600', type: 'rejected' };
      }
      // Account Spending Limit
      const spendCap = Number(account.spend_cap);
      const amountSpent = Number(account.amount_spent);

      if (spendCap && spendCap > 0 && amountSpent >= spendCap) {
        return { label: 'Spending Limit Reached', color: 'bg-red-500', textColor: 'text-red-600', type: 'with_issues' };
      }
    }

    // 2. Campaign Level Checks
    // Spending Limit Logic (Campaign specific)
    if (campaign.spendCap && campaign.spendCap > 0 && (campaign.amountSpent || 0) >= campaign.spendCap) {
      return { label: 'Spending Limit Reached', color: 'bg-red-500', textColor: 'text-red-600', type: 'with_issues' };
    }

    // Status Logic
    const status = campaign.effectiveStatus || campaign.status;

    // BUBBLE UP STATUS: Check nested Ads for Critical Issues (Rejected / With Issues)
    // Priority: Rejected > With Issues > Ads Off > Active
    if (status === 'ACTIVE' && campaign.adSets) {
      const allAds = campaign.adSets.flatMap(adSet => adSet.ads || []);

      // Check for Rejected Ads
      const hasRejectedAds = allAds.some(ad =>
        ad.effectiveStatus === 'DISAPPROVED'
      );
      if (hasRejectedAds) {
        return { label: 'Rejected', color: 'bg-red-500', textColor: 'text-red-600', type: 'rejected' };
      }

      // Check for With Issues Ads
      const hasIssuesAds = allAds.some(ad =>
        ad.effectiveStatus === 'WITH_ISSUES'
      );
      if (hasIssuesAds) {
        return { label: 'With Issues', color: 'bg-red-500', textColor: 'text-red-600', type: 'with_issues' };
      }
    }

    // Check hierarchy status for Active campaigns
    if (status === 'ACTIVE' && campaign.adSets && campaign.adSets.length > 0) {
      // Inverted Logic: Check if there is ANY active entity. If not, it's Off.

      const activeStatuses = ['ACTIVE', 'IN_PROCESS', 'WITH_ISSUES', 'PENDING_REVIEW', 'PREAPPROVAL', 'ADSET_PAUSED'];
      // Note: ADSET_PAUSED means the ad set is paused, but the ad itself might be enabled. 
      // If we strictly want "Ads Off" meaning the user turned off the ADS, we should look for PAUSED.

      // 1. Check Ad Sets
      // If all ad sets are manually paused by user/system
      const allAdSetsManuallyOff = campaign.adSets.every(a => ['PAUSED', 'ARCHIVED', 'DELETED'].includes(a.effectiveStatus));
      if (allAdSetsManuallyOff) {
        return { label: 'Ad Sets Off', color: 'bg-gray-400', textColor: 'text-gray-600', type: 'paused' };
      }

      // 2. Check Ads
      // We want to detect if the user PAUSED all ads, even if Ad Sets are Active.
      // But usually "Ads Off" means NO active ads running.
      const allAds = campaign.adSets.flatMap(adSet => adSet.ads || []);

      if (allAds.length > 0) {
        // Strict check: Are ALL ads explicitly paused/archived/deleted?
        const allAdsOff = allAds.every(ad =>
          ['PAUSED', 'ARCHIVED', 'DELETED'].includes(ad.effectiveStatus) ||
          (ad.effectiveStatus === 'CAMPAIGN_PAUSED' && status === 'ACTIVE')
        );

        if (allAdsOff) {
          return { label: 'Ads Off', color: 'bg-gray-400', textColor: 'text-gray-600', type: 'paused' };
        }

        // Also check if they are all paused within ACTIVE ad sets
        const activeAdSets = campaign.adSets.filter(as => !['PAUSED', 'ARCHIVED', 'DELETED'].includes(as.effectiveStatus));
        if (activeAdSets.length > 0) {
          const adsInActiveSets = activeAdSets.flatMap(as => as.ads || []);
          // If there are ads in active sets, and ALL of them are paused -> Ads Off
          if (adsInActiveSets.length > 0 && adsInActiveSets.every(ad => ['PAUSED', 'ARCHIVED', 'DELETED'].includes(ad.effectiveStatus))) {
            return { label: 'Ads Off', color: 'bg-gray-400', textColor: 'text-gray-600', type: 'paused' };
          }
        }
      }
    }

    switch (status) {
      case 'ACTIVE':
        return { label: 'Active', color: 'bg-green-500', textColor: 'text-green-600', type: 'active' };
      case 'PAUSED':
        return { label: 'Off', color: 'bg-gray-400', textColor: 'text-gray-600', type: 'paused' };
      case 'DELETED':
      case 'ARCHIVED':
        return { label: 'Completed', color: 'bg-gray-400', textColor: 'text-gray-600', type: 'completed' };
      case 'Pending Settlement':
        return { label: 'Pending Settlement', color: 'bg-orange-500', textColor: 'text-orange-600', type: 'in_review' };
      case 'WITH_ISSUES':
        return { label: 'With Issues', color: 'bg-red-500', textColor: 'text-red-600', type: 'with_issues' };
      case 'DISAPPROVED':
        return { label: 'Rejected', color: 'bg-red-500', textColor: 'text-red-600', type: 'rejected' };
      case 'PENDING_REVIEW':
      case 'IN_PROCESS':
      case 'PREAPPROVAL':
        return { label: 'In Review', color: 'bg-blue-500', textColor: 'text-blue-600', type: 'in_review' };
      default:
        // Check configured status
        if (campaign.configuredStatus === 'PAUSED') {
          return { label: 'Off', color: 'bg-gray-400', textColor: 'text-gray-600', type: 'paused' };
        }
        return { label: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace(/_/g, ' '), color: 'bg-gray-400', textColor: 'text-gray-600', type: 'other' };
    }
  };


  const getAdSetStatus = (adSet: AdSet, accountMap: Record<string, DetailedAdAccount>): StatusResult => {
    // 1. Account Level Checks
    const account = adSet.adAccountId ? accountMap[adSet.adAccountId] : undefined;
    if (account) {
      // Account Disabled
      if (account.account_status === 2) {
        return { label: 'Account Disabled', color: 'bg-red-500', textColor: 'text-red-600', type: 'rejected' };
      }
      // Account Spending Limit
      const spendCap = Number(account.spend_cap);
      const amountSpent = Number(account.amount_spent);

      if (spendCap && spendCap > 0 && amountSpent >= spendCap) {
        return { label: 'Spending Limit Reached', color: 'bg-red-500', textColor: 'text-red-600', type: 'with_issues' };
      }
    }

    const status = adSet.effectiveStatus || adSet.status;

    // BUBBLE UP STATUS: Check nested Ads for Critical Issues (Rejected / With Issues)
    if (status === 'ACTIVE' && adSet.ads) {
      // Check for Rejected Ads
      const hasRejectedAds = adSet.ads.some(ad =>
        ad.effectiveStatus === 'DISAPPROVED'
      );
      if (hasRejectedAds) {
        return { label: 'Rejected', color: 'bg-red-500', textColor: 'text-red-600', type: 'rejected' };
      }

      // Check for With Issues Ads
      const hasIssuesAds = adSet.ads.some(ad =>
        ad.effectiveStatus === 'WITH_ISSUES'
      );
      if (hasIssuesAds) {
        return { label: 'With Issues', color: 'bg-red-500', textColor: 'text-red-600', type: 'with_issues' };
      }
    }

    // Check hierarchy status for Active ad sets
    if (status === 'ACTIVE' && adSet.ads && adSet.ads.length > 0) {
      const allAdsOff = adSet.ads.every(a =>
        ['PAUSED', 'ARCHIVED', 'DELETED'].includes(a.effectiveStatus)
      );
      if (allAdsOff) {
        return { label: 'Ads Off', color: 'bg-gray-400', textColor: 'text-gray-600', type: 'paused' };
      }
    }

    // Check for No Ads (Active but no ads)
    if (status === 'ACTIVE' && (!adSet.ads || adSet.ads.length === 0)) {
      return { label: 'No Ads', color: 'bg-gray-400', textColor: 'text-gray-600', type: 'paused' };
    }

    switch (status) {
      case 'ACTIVE':
        return { label: 'Active', color: 'bg-green-500', textColor: 'text-green-600', type: 'active' };
      case 'PAUSED':
        return { label: 'Off', color: 'bg-gray-400', textColor: 'text-gray-600', type: 'paused' };
      case 'CAMPAIGN_PAUSED':
        return { label: 'Campaign Off', color: 'bg-gray-400', textColor: 'text-gray-600', type: 'paused' };
      case 'DELETED':
      case 'ARCHIVED':
        return { label: 'Completed', color: 'bg-gray-400', textColor: 'text-gray-600', type: 'completed' };
      case 'WITH_ISSUES':
        return { label: 'With Issues', color: 'bg-red-500', textColor: 'text-red-600', type: 'with_issues' };
      case 'DISAPPROVED':
        return { label: 'Rejected', color: 'bg-red-500', textColor: 'text-red-600', type: 'rejected' };
      case 'PENDING_REVIEW':
      case 'IN_PROCESS':
      case 'PREAPPROVAL':
        return { label: 'In Review', color: 'bg-blue-500', textColor: 'text-blue-600', type: 'in_review' };
      default:
        if (adSet.configuredStatus === 'PAUSED') {
          return { label: 'Off', color: 'bg-gray-400', textColor: 'text-gray-600', type: 'paused' };
        }
        return { label: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace(/_/g, ' '), color: 'bg-gray-400', textColor: 'text-gray-600', type: 'other' };
    }
  };

  const getAdStatus = (ad: Ad, account?: DetailedAdAccount): StatusResult => {
    // 1. Check Account Status first using the passed account object
    if (account) {
      if (account.account_status === 2 || account.disable_reason) {
        return { label: 'Account Disabled', color: 'bg-red-500', textColor: 'text-red-600', type: 'rejected' };
      }
      if (account.spend_cap && account.amount_spent && account.amount_spent >= account.spend_cap) {
        return { label: 'Spending Limit Reached', color: 'bg-red-500', textColor: 'text-red-600', type: 'with_issues' };
      }
    }
    const status = ad.effectiveStatus || ad.status;

    switch (status) {
      case 'ACTIVE':
        return { label: 'Active', color: 'bg-green-500', textColor: 'text-green-600', type: 'active' };
      case 'PAUSED':
        return { label: 'Off', color: 'bg-gray-400', textColor: 'text-gray-600', type: 'paused' };
      case 'ADSET_PAUSED':
        return { label: 'Ad Set: Off', color: 'bg-gray-400', textColor: 'text-gray-600', type: 'paused' };
      case 'CAMPAIGN_PAUSED':
        return { label: 'Campaign Off', color: 'bg-gray-400', textColor: 'text-gray-600', type: 'paused' };
      case 'DISAPPROVED':
        return { label: 'Rejected', color: 'bg-red-500', textColor: 'text-red-600', type: 'rejected' };
      case 'WITH_ISSUES':
        return { label: 'With Issues', color: 'bg-red-500', textColor: 'text-red-600', type: 'with_issues' };
      case 'DELETED':
      case 'ARCHIVED':
        return { label: 'Completed', color: 'bg-gray-400', textColor: 'text-gray-600', type: 'completed' };
      case 'PENDING_REVIEW':
      case 'IN_PROCESS':
      case 'PREAPPROVAL':
        return { label: 'In Review', color: 'bg-blue-500', textColor: 'text-blue-600', type: 'in_review' };
      default:
        if (ad.configuredStatus === 'PAUSED') {
          return { label: 'Off', color: 'bg-gray-400', textColor: 'text-gray-600', type: 'paused' };
        }
        return { label: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace(/_/g, ' '), color: 'bg-gray-400', textColor: 'text-gray-600', type: 'other' };
    }
  };

  // Helper functions for detailed status

  // Create account map for efficient status lookups
  const accountMap = selectedAccounts.reduce((acc, curr) => {
    acc[curr.id] = curr;
    return acc;
  }, {} as Record<string, DetailedAdAccount>);

  const filteredCampaigns = campaigns.filter(c => {
    // ... existing filter logic
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || getCampaignStatus(c, accountMap).type === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (!sortConfig.key || !sortConfig.direction) return 0;

    const directionMultiplier = sortConfig.direction === 'asc' ? 1 : -1;

    if (sortConfig.key === 'status') {
      const statusA = getCampaignStatus(a, accountMap).label;
      const statusB = getCampaignStatus(b, accountMap).label;
      return statusA.localeCompare(statusB) * directionMultiplier;
    }

    const valA = a[sortConfig.key as keyof Campaign];
    const valB = b[sortConfig.key as keyof Campaign];

    if (typeof valA === 'number' && typeof valB === 'number') {
      return (valA - valB) * directionMultiplier;
    }
    if (typeof valA === 'string' && typeof valB === 'string') {
      return valA.localeCompare(valB) * directionMultiplier;
    }
    return 0;
  });

  const filteredAdSets = adSets.filter(adSet => {
    // ... existing filter logic ...
    // Campaign filter (if campaigns are selected, show only their adsets)
    if (selectedCampaignIds.size > 0 && !selectedCampaignIds.has(adSet.campaignId)) {
      return false;
    }

    // Search & Status
    const matchesSearch = adSet.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || getAdSetStatus(adSet, accountMap).type === statusFilter;

    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (!sortConfig.key || !sortConfig.direction) return 0;

    const directionMultiplier = sortConfig.direction === 'asc' ? 1 : -1;

    if (sortConfig.key === 'status') {
      const statusA = getAdSetStatus(a, accountMap).label;
      const statusB = getAdSetStatus(b, accountMap).label;
      return statusA.localeCompare(statusB) * directionMultiplier;
    }

    const valA = a[sortConfig.key as keyof AdSet];
    const valB = b[sortConfig.key as keyof AdSet];

    if (typeof valA === 'number' && typeof valB === 'number') {
      return (valA - valB) * directionMultiplier;
    }
    if (typeof valA === 'string' && typeof valB === 'string') {
      return valA.localeCompare(valB) * directionMultiplier;
    }
    return 0;
  });

  // ... (filteredAds remains same)

  // ... (DetailedAdAccount interface remains same)

  // ... (getCampaignStatus remains same)



  const filteredAds = ads.filter(ad => {
    // AdSet filter (if adsets are selected, show only their ads)
    if (selectedAdSetIds.size > 0) {
      if (!selectedAdSetIds.has(ad.adsetId)) return false;
    }
    // Fallback: Campaign filter (if campaigns are selected, show only their ads)
    else if (selectedCampaignIds.size > 0) {
      if (!selectedCampaignIds.has(ad.campaignId)) return false;
    }

    // Search & Status (Basic logic, can be refined to search body/title too)
    const matchesSearch = ad.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ad.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ad.body?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || getAdStatus(ad, accountMap[ad.adAccountId || '']).type === statusFilter;

    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (!sortConfig.key || !sortConfig.direction) return 0;

    const directionMultiplier = sortConfig.direction === 'asc' ? 1 : -1;

    if (sortConfig.key === 'status') {
      const statusA = getAdStatus(a, accountMap[a.adAccountId || '']).label;
      const statusB = getAdStatus(b, accountMap[b.adAccountId || '']).label;
      return statusA.localeCompare(statusB) * directionMultiplier;
    }

    const valA = a[sortConfig.key as keyof Ad];
    const valB = b[sortConfig.key as keyof Ad];

    if (typeof valA === 'number' && typeof valB === 'number') {
      return (valA - valB) * directionMultiplier;
    }
    if (typeof valA === 'string' && typeof valB === 'string') {
      return valA.localeCompare(valB) * directionMultiplier;
    }
    return 0;
  });












  // 4. Sorting Handlers
  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev.key !== key) {
        return { key, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return { key: null, direction: null };
    });
  };

  // Sortable Header Component using Shadcn TableHead
  const SortableHeader = ({
    columnKey,
    label,
    align = 'left',
    className = ''
  }: {
    columnKey: string;
    label: string;
    align?: 'left' | 'right' | 'center';
    className?: string;
  }) => {
    const justifyClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : '';
    const textAlignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

    return (
      <TableHead
        className={`${textAlignClass} cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors ${className}`}
        onClick={() => handleSort(columnKey)}
      >
        <div className={`flex items-center gap-1 ${justifyClass}`}>
          {label}
          {sortConfig.key === columnKey && sortConfig.direction === 'asc' && <ArrowUp className="h-3 w-3" />}
          {sortConfig.key === columnKey && sortConfig.direction === 'desc' && <ArrowDown className="h-3 w-3" />}
          {sortConfig.key !== columnKey && <ArrowUpDown className="h-3 w-3 opacity-30" />}
        </div>
      </TableHead>
    );
  };

  // Generic sort function
  const sortData = <T extends Record<string, any>>(data: T[]): T[] => {
    if (!sortConfig.key || !sortConfig.direction) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key!];
      const bVal = b[sortConfig.key!];

      // Handle null/undefined
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Compare values
      if (aVal === bVal) return 0;
      const comparison = aVal > bVal ? 1 : -1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  };

  // 5. Selection Handlers
  const handleToggleCampaignSelection = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedCampaignIds);
    if (checked) newSelected.add(id); else newSelected.delete(id);
    setSelectedCampaignIds(newSelected);
  };

  const handleToggleAllCampaigns = (checked: boolean) => {
    if (checked) {
      setSelectedCampaignIds(new Set(filteredCampaigns.map(c => c.id)));
    } else {
      setSelectedCampaignIds(new Set());
    }
  };

  const handleToggleAdSetSelection = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedAdSetIds);
    if (checked) newSelected.add(id); else newSelected.delete(id);
    setSelectedAdSetIds(newSelected);
  };

  const handleToggleAllAdSets = (checked: boolean) => {
    if (checked) {
      setSelectedAdSetIds(new Set(filteredAdSets.map(a => a.id)));
    } else {
      setSelectedAdSetIds(new Set());
    }
  };

  const handleToggleAdSelection = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedAdIds);
    if (checked) newSelected.add(id); else newSelected.delete(id);
    setSelectedAdIds(newSelected);
  };

  const handleToggleAllAds = (checked: boolean) => {
    if (checked) {
      setSelectedAdIds(new Set(filteredAds.map(a => a.id)));
    } else {
      setSelectedAdIds(new Set());
    }
  };

  // Track last fetched accounts to prevent unnecessary API calls
  const lastFetchedAccountsRef = useRef<string>('');
  const lastFetchedTabRef = useRef<string>('');
  const lastFetchedDateRangeRef = useRef<string>('');
  const isFetchingRef = useRef(false);

  // Check for refresh param on mount
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const shouldForceRefresh = searchParams?.get('refresh') === 'true';

  useEffect(() => {
    // Only fetch if we have a session.
    // NOTE: fetching Logic depends on TABS.
    // If Tab is Campaigns/AdSets/Ads, it depends on viewSelectedAccountIds
    if (!session?.user || isFetchingRef.current) return;

    // For Accounts tab, we don't fetch campaigns data here (AccountsTab component handles it).
    // We only fetch for the other tabs.


    // If no accounts are configured globally, clear data
    if (selectedAccounts.length === 0) {
      setCampaigns([]);
      setAdSets([]);
      setAds([]);
      setLoading(false);
      return;
    }

    // If local selection is empty (None Selected), don't fetch anything.
    if (viewSelectedAccountIds.size === 0) {
      setCampaigns([]);
      setAdSets([]);
      setAds([]);
      setLoading(false);
      return;
    }

    // Check if accounts OR tab OR date range actually changed
    const currentAccountIds = Array.from(viewSelectedAccountIds).sort().join(',');
    const currentTab = activeTab;
    const currentDateRangeString = dateRange?.from && dateRange?.to
      ? `${dateRange.from.toISOString()}_${dateRange.to.toISOString()}`
      : 'all';

    const accountsChanged = lastFetchedAccountsRef.current !== currentAccountIds;
    const tabChanged = lastFetchedTabRef.current !== currentTab;
    const dateChanged = lastFetchedDateRangeRef.current !== currentDateRangeString;

    const hasChanged = accountsChanged || tabChanged || dateChanged;

    if (!hasChanged && !shouldForceRefresh) {
      // Neither accounts nor tab nor date changed, and no forced refresh requested
      return;
    }

    // Update last fetched accounts, tab, and date
    lastFetchedAccountsRef.current = currentAccountIds;
    lastFetchedTabRef.current = currentTab;
    lastFetchedDateRangeRef.current = currentDateRangeString;

    // Fetch data based on active tab
    const fetchData = async () => {
      // If forced refresh OR date changed, pass refresh=true to API (to clear cache)
      const refreshParam = shouldForceRefresh || dateChanged;

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
  }, [session, viewSelectedAccountIds, activeTab, dateRange, shouldForceRefresh]);





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

      // Fetch campaigns from all selected accounts in one go
      // Fetch campaigns from specific selected accounts
      // If none selected locally, we already returned early above.
      const targetIds = Array.from(viewSelectedAccountIds);

      if (targetIds.length === 0) {
        setLoading(false);
        isFetchingRef.current = false;
        return;
      }

      const adAccountIds = targetIds.join(',');

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

        const formattedCampaigns = (data.campaigns || []).map((c: any) => ({
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
          effectiveStatus: c.effectiveStatus,
          configuredStatus: c.configuredStatus,
          spendCap: c.spendCap,
          issuesInfo: c.issuesInfo,
          adSets: c.adSets || [],
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

      const targetIds = Array.from(viewSelectedAccountIds);

      if (targetIds.length === 0) {
        setLoading(false);
        isFetchingRef.current = false;
        return;
      }

      const adAccountIds = targetIds.join(',');

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

        const formattedAdSets = (data.adsets || []).map((a: any) => ({
          ...a,
          createdAt: a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '-',
          // Ensure metrics exist with defaults
          spend: a.metrics?.spend || 0,
          messages: a.metrics?.messages || 0,
          costPerMessage: a.metrics?.costPerMessage || 0,
          results: a.metrics?.results || 0,
          costPerResult: a.metrics?.costPerResult || 0,
          budget: a.metrics?.budget || 0,
          reach: a.metrics?.reach || 0,
          impressions: a.metrics?.impressions || 0,
          postEngagements: a.metrics?.postEngagements || 0,
          clicks: a.metrics?.clicks || 0,
          messagingContacts: a.metrics?.messagingContacts || 0,
          amountSpent: a.metrics?.amountSpent || 0,
          effectiveStatus: a.effectiveStatus,
          configuredStatus: a.configuredStatus,
          issuesInfo: a.issuesInfo,
          ads: a.ads || [],
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

      const targetIds = Array.from(viewSelectedAccountIds);

      if (targetIds.length === 0) {
        setLoading(false);
        isFetchingRef.current = false;
        return;
      }

      const adAccountIds = targetIds.join(',');

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

        const formattedAds = (data.ads || []).map((ad: any) => ({
          ...ad,
          createdAt: new Date(ad.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          postLink: ad.postLink,
          amountSpent: ad.metrics?.amountSpent || 0,
          results: ad.metrics?.results || 0,
          costPerResult: ad.metrics?.costPerResult || 0,
          budget: ad.budget || 0,
          reach: ad.metrics?.reach || 0,
          impressions: ad.metrics?.impressions || 0,
          postEngagements: ad.metrics?.postEngagements || 0,
          clicks: ad.metrics?.clicks || 0,
          messagingContacts: ad.metrics?.messagingContacts || 0,
          effectiveStatus: ad.effectiveStatus,
          configuredStatus: ad.configuredStatus,
          issuesInfo: ad.issuesInfo,
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
        showErrorToast(error.error || t('campaigns.error.toggle', 'Failed to toggle campaign status'));
      }
    } catch (error) {
      // Revert on error
      setCampaigns(prev =>
        prev.map(c => c.id === campaignId ? { ...c, status: currentStatus } : c)
      );
      console.error('Error toggling campaign:', error);
      showErrorToast(t('campaigns.error.toggle', 'Failed to toggle campaign status'));
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
        showErrorToast(error.error || 'Failed to toggle ad set status');
      }
    } catch (error) {
      // Revert on error
      setAdSets(prev =>
        prev.map(a => a.id === adSetId ? { ...a, status: currentStatus } : a)
      );
      console.error('Error toggling ad set:', error);
      showErrorToast('Failed to toggle ad set status');
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
        showErrorToast(error.error || 'Failed to toggle ad status');
      }
    } catch (error) {
      // Revert on error
      setAds(prev =>
        prev.map(a => a.id === adId ? { ...a, status: currentStatus } : a)
      );
      console.error('Error toggling ad:', error);
      showErrorToast('Failed to toggle ad status');
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm(t('campaigns.deleteConfirm', 'Are you sure you want to delete this campaign?'))) return;
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
      const ageMax = targeting.age_max || t('campaigns.targeting.noLimit', '65+');
      parts.push(`${t('campaigns.targeting.age', 'Age')}: ${ageMin}-${ageMax}`);
    }

    // Countries
    if (targeting.geo_locations?.countries && targeting.geo_locations.countries.length > 0) {
      const countries = targeting.geo_locations.countries.join(', ');
      parts.push(`${t('campaigns.targeting.country', 'Country')}: ${countries}`);
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
        parts.push(`${t('campaigns.targeting.interests', 'Interests')}: ${interests.slice(0, 3).join(', ')}${interests.length > 3 ? '...' : ''}`);
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
      const ageMax = targeting.age_max || t('campaigns.targeting.noLimit', '65+');
      parts.push(`${t('campaigns.targeting.age', 'Age')}: ${ageMin}-${ageMax}`);
    }

    // Countries
    if (targeting.geo_locations?.countries && targeting.geo_locations.countries.length > 0) {
      const countries = targeting.geo_locations.countries.join(', ');
      parts.push(`${t('campaigns.targeting.country', 'Country')}: ${countries}`);
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
        parts.push(`${t('campaigns.targeting.interests', 'Interests')}: ${interests.join(', ')}`);
      }
    }

    return parts.length > 0 ? parts.join('\n') : '-';
  };

  const handleCreateCampaign = () => {
    // TODO: Implement create campaign logic
    console.log('Create campaign');
  };

  return (
    <div className="h-full p-4 md:p-6 lg:p-8 flex flex-col overflow-hidden">
      <div className="w-full flex flex-col h-full">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('campaigns.title', 'All Campaigns')}</h1>
            <p className="text-gray-600 dark:text-gray-400">{t('campaigns.subtitle', 'Manage and optimize your campaigns')}</p>
          </div>


          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[250px] justify-between bg-white dark:bg-zinc-950">
                  <div className="flex items-center gap-2 truncate">
                    <span>
                      {!isMounted ? t('campaigns.selectAccount', 'Select Account') : (
                        viewSelectedAccountIds.size === selectedAccounts.length
                          ? t('campaigns.allAccounts', 'All Accounts')
                          : viewSelectedAccountIds.size === 0
                            ? t('campaigns.selectAccount', 'Select Account')
                            : `${viewSelectedAccountIds.size} ${t('common.selected', 'Selected')}`
                      )}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0 rounded-xl" align="start">
                <div className="p-2 border-b">
                  <div
                    className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-sm cursor-pointer"
                    onClick={(e) => {
                      // Prevent double toggle if clicking directly on the checkbox
                      if ((e.target as HTMLElement).getAttribute('role') === 'checkbox') return;

                      const isChecked = selectedAccounts.length > 0 && viewSelectedAccountIds.size === selectedAccounts.length;
                      if (!isChecked) {
                        // Select All
                        setViewSelectedAccountIds(new Set(selectedAccounts.map(a => a.id)));
                      } else {
                        // Deselect All (None)
                        setViewSelectedAccountIds(new Set());
                      }
                    }}
                  >
                    <Checkbox
                      id="select-all"
                      checked={selectedAccounts.length > 0 && viewSelectedAccountIds.size === selectedAccounts.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          // Select All
                          setViewSelectedAccountIds(new Set(selectedAccounts.map(a => a.id)));
                        } else {
                          // Deselect All (None)
                          setViewSelectedAccountIds(new Set());
                        }
                      }}
                    />
                    <label
                      htmlFor="select-all"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t('campaigns.allAccounts', 'All Accounts')}
                    </label>
                  </div>
                </div>
                <ScrollArea className="h-[200px]">
                  <div className="p-2">
                    {selectedAccounts.length === 0 ? (
                      <div className="p-2 text-sm text-center text-muted-foreground">
                        {t('campaigns.noConfiguredAccounts', 'No accounts configured in Settings')}
                      </div>
                    ) : (
                      selectedAccounts.map((account) => {
                        const isChecked = viewSelectedAccountIds.has(account.id);

                        return (
                          <div
                            key={account.id}
                            className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-sm cursor-pointer"
                            onClick={(e) => {
                              // Prevent double toggle if clicking directly on the checkbox
                              if ((e.target as HTMLElement).getAttribute('role') === 'checkbox') return;

                              let newSet = new Set(viewSelectedAccountIds);
                              if (!isChecked) {
                                newSet.add(account.id);
                              } else {
                                newSet.delete(account.id);
                              }
                              setViewSelectedAccountIds(newSet);
                            }}
                          >
                            <Checkbox
                              id={`account-${account.id}`}
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                let newSet = new Set(viewSelectedAccountIds);
                                if (checked) {
                                  newSet.add(account.id);
                                } else {
                                  newSet.delete(account.id);
                                }
                                setViewSelectedAccountIds(newSet);
                              }}
                            />
                            <div className="flex flex-col flex-1 truncate">
                              <label
                                htmlFor={`account-${account.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-gray-900 dark:text-gray-100"
                              >
                                {account.name}
                              </label>
                              <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                ID: {account.account_id}
                              </span>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>

            <Button onClick={handleCreateCampaign} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              {t('campaigns.newCampaign', 'New Campaign')}
            </Button>
          </div>


        </div>

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
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            />
          </div>

          {/* Date Range Picker */}
          <DatePickerWithRange
            date={dateRange}
            setDate={setDateRange}
          />

          {/* Filter by Status */}
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as any)}
          >
            <SelectTrigger className="w-[180px] bg-white dark:bg-zinc-950 rounded-lg">
              <SelectValue placeholder={t('campaigns.filter.allStatus', 'All Status')} />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">{t('campaigns.filter.allStatus', 'All Status')}</SelectItem>
              <SelectItem value="active">{t('campaigns.filter.active', 'Active')}</SelectItem>
              <SelectItem value="paused">{t('campaigns.filter.paused', 'Paused')}</SelectItem>
              <SelectItem value="completed">{t('campaigns.filter.completed', 'Completed')}</SelectItem>
              <SelectItem value="rejected">{t('campaigns.filter.rejected', 'Rejected')}</SelectItem>
              <SelectItem value="with_issues">{t('campaigns.filter.withIssues', 'With Issues')}</SelectItem>
              <SelectItem value="in_review">{t('campaigns.filter.inReview', 'In Review')}</SelectItem>
            </SelectContent>
          </Select>

          {/* Refresh Button */}
          <Button
            onClick={() => {
              if (activeTab === 'campaigns') fetchCampaigns();
              else if (activeTab === 'adsets') fetchAdSets();
              else if (activeTab === 'ads') fetchAds();
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
          <div>
            <nav className="-mb-px flex gap-2">

              <button
                onClick={() => handleTabChange('campaigns')}
                className={`${activeTab === 'campaigns'
                  ? 'border-gray-200 dark:border-zinc-800 border-b-transparent text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-zinc-900 font-semibold'
                  : 'border-gray-200 dark:border-zinc-800 border-b-gray-200 dark:border-b-zinc-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50/50 dark:hover:bg-zinc-800/30'
                  } w-[250px] py-3 px-4 border border-b font-medium text-sm transition-all flex items-center gap-2 rounded-t-xl -mb-px`}
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
                onClick={() => handleTabChange('adsets')}
                className={`${activeTab === 'adsets'
                  ? 'border-gray-200 dark:border-zinc-800 border-b-transparent text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-zinc-900 font-semibold'
                  : 'border-gray-200 dark:border-zinc-800 border-b-gray-200 dark:border-b-zinc-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50/50 dark:hover:bg-zinc-800/30'
                  } w-[250px] py-3 px-4 border border-b font-medium text-sm transition-all flex items-center justify-start rounded-t-xl -mb-px`}
              >
                <span className="flex items-center gap-2">
                  {t('campaigns.tabs.adSets', 'Ad sets')}
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
                </span>
              </button>
              <button
                onClick={() => handleTabChange('ads')}
                className={`${activeTab === 'ads'
                  ? 'border-gray-200 dark:border-zinc-800 border-b-transparent text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-zinc-900 font-semibold'
                  : 'border-gray-200 dark:border-zinc-800 border-b-gray-200 dark:border-b-zinc-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50/50 dark:hover:bg-zinc-800/30'
                  } w-[250px] py-3 px-4 border border-b font-medium text-sm transition-all flex items-center justify-start rounded-t-xl -mb-px`}
              >
                <span className="flex items-center gap-2">
                  {t('campaigns.tabs.ads', 'Ads')}
                  {selectedAdIds.size > 0 && (
                    <>
                      <span className="flex-1" />
                      <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                        Selected {selectedAdIds.size}
                        <span
                          onClick={(e) => { e.stopPropagation(); setSelectedAdIds(new Set()); }}
                          className="hover:bg-blue-200 rounded-full p-0.5 transition-colors cursor-pointer"
                          title="Clear selection"
                        >
                          <X className="h-3 w-3" />
                        </span>
                      </span>
                    </>
                  )}
                </span>
              </button>
            </nav>
          </div>
        </div>



        {/* Campaigns List */}
        {
          activeTab === 'campaigns' && (
            <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 overflow-hidden flex-1 flex flex-col min-h-0 rounded-tr-xl rounded-b-xl">
              <>
                <div className="overflow-auto flex-1 [&>div]:overflow-visible">
                  <Table className="w-full min-w-max">
                    <TableHeader className="bg-gray-50 dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 sticky top-0 z-50">
                      <TableRow>
                        <TableHead className="px-3 py-2 text-center w-12">
                          <div className="flex justify-center">
                            <Checkbox
                              checked={campaigns.length > 0 && selectedCampaignIds.size === campaigns.length}
                              onCheckedChange={handleToggleAllCampaigns}
                              aria-label="Select all campaigns"
                              className={selectedCampaignIds.size > 0 && selectedCampaignIds.size < campaigns.length ? "data-[state=checked]:bg-blue-600" : ""}
                            />
                          </div>
                        </TableHead>
                        <TableHead className="text-center w-20">{t('campaigns.columns.toggle', 'Active')}</TableHead>
                        <TableHead className="max-w-[280px]">{t('campaigns.columns.adAccount', 'Ad Acc')}</TableHead>
                        <TableHead
                          className="max-w-[280px] cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center gap-1">
                            {t('campaigns.columns.name', 'Campaign')}
                            {sortConfig.key === 'name' && sortConfig.direction === 'asc' && <ArrowUp className="h-3 w-3" />}
                            {sortConfig.key === 'name' && sortConfig.direction === 'desc' && <ArrowDown className="h-3 w-3" />}
                            {sortConfig.key !== 'name' && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                          </div>
                        </TableHead>
                        <TableHead
                          className="max-w-[280px] cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                          onClick={() => handleSort('status')}
                        >
                          <div className="flex items-center gap-1">
                            {t('campaigns.columns.status', 'Status')}
                            {sortConfig.key === 'status' && sortConfig.direction === 'asc' && <ArrowUp className="h-3 w-3" />}
                            {sortConfig.key === 'status' && sortConfig.direction === 'desc' && <ArrowDown className="h-3 w-3" />}
                            {sortConfig.key !== 'status' && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                          </div>
                        </TableHead>
                        <TableHead
                          className="text-right max-w-[280px] cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                          onClick={() => handleSort('results')}
                        >
                          <div className="flex items-center justify-end gap-1">
                            {t('campaigns.columns.results', 'Results')}
                            {sortConfig.key === 'results' && sortConfig.direction === 'asc' && <ArrowUp className="h-3 w-3" />}
                            {sortConfig.key === 'results' && sortConfig.direction === 'desc' && <ArrowDown className="h-3 w-3" />}
                            {sortConfig.key !== 'results' && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                          </div>
                        </TableHead>
                        <SortableHeader columnKey="costPerResult" label={t('campaigns.columns.costPerResult', 'Cost per result')} align="right" className="max-w-[280px]" />
                        <SortableHeader columnKey="budget" label={t('campaigns.columns.budget', 'Budget')} align="right" className="max-w-[280px]" />
                        <SortableHeader columnKey="reach" label={t('campaigns.columns.reach', 'Reach')} align="right" className="max-w-[280px]" />
                        <SortableHeader columnKey="impressions" label={t('campaigns.columns.impressions', 'Impressions')} align="right" className="max-w-[280px]" />
                        <SortableHeader columnKey="postEngagements" label={t('campaigns.columns.postEngagements', 'Post engagements')} align="right" className="max-w-[280px]" />
                        <SortableHeader columnKey="clicks" label={t('campaigns.columns.clicks', 'Clicks (all)')} align="right" className="max-w-[280px]" />
                        <SortableHeader columnKey="messagingContacts" label={t('campaigns.columns.messagingContacts', 'Messaging contacts')} align="right" className="max-w-[280px]" />
                        <TableHead
                          className="text-right max-w-[280px] cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                          onClick={() => handleSort('amountSpent')}
                        >
                          <div className="flex items-center justify-end gap-1">
                            {t('campaigns.columns.amountSpent', 'Amount spent')}
                            {sortConfig.key === 'amountSpent' && sortConfig.direction === 'asc' && <ArrowUp className="h-3 w-3" />}
                            {sortConfig.key === 'amountSpent' && sortConfig.direction === 'desc' && <ArrowDown className="h-3 w-3" />}
                            {sortConfig.key !== 'amountSpent' && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                          </div>
                        </TableHead>
                        <SortableHeader columnKey="createdAt" label={t('campaigns.columns.created', 'Created')} align="left" className="max-w-[280px]" />
                        <TableHead className="text-right max-w-[280px]">{t('campaigns.columns.actions', 'Actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 10 }).map((_, i) => (
                          <TableRow key={i} className="animate-pulse">
                            <TableCell className="px-3 py-2 text-center w-12"><div className="h-5 w-5 bg-gray-200 dark:bg-zinc-800 rounded-[6px] mx-auto"></div></TableCell>
                            <TableCell><div className="h-4 w-8 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-32"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-48"></div></TableCell>
                            <TableCell><div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded-full w-16"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-16 ml-auto"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-16 ml-auto"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-16 ml-auto"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-16 ml-auto"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-16 ml-auto"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-16 ml-auto"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-16 ml-auto"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-16 ml-auto"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-16 ml-auto"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-24"></div></TableCell>
                            <TableCell><div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-24 ml-auto"></div></TableCell>
                          </TableRow>
                        ))
                      ) : filteredCampaigns.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={16} className="text-center py-16">
                            <p className="text-gray-600 dark:text-gray-400 mb-4">{campaigns.length === 0 ? t('campaigns.noCampaigns', 'No campaigns yet') : t('campaigns.noMatch', 'No campaigns match your filters')}</p>
                            {campaigns.length === 0 && (
                              <Link href="/launch">
                                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                                  {t('campaigns.createFirst', 'Create Your First Campaign')}
                                </Button>
                              </Link>
                            )}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredCampaigns.map((campaign, index) => (
                          <TableRow key={campaign.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors border-b border-gray-200 dark:border-zinc-800 cursor-pointer" onClick={() => handleToggleCampaignSelection(campaign.id, !selectedCampaignIds.has(campaign.id))}>
                            <TableCell
                              className="px-3 py-2 text-center text-sm text-gray-600 dark:text-gray-400"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={selectedCampaignIds.has(campaign.id)}
                                  onCheckedChange={(checked) => handleToggleCampaignSelection(campaign.id, checked as boolean)}
                                  aria-label={`Select campaign ${campaign.name}`}
                                  className="rounded-md"
                                />
                              </div>
                            </TableCell>

                            <TableCell className="px-4 py-2 text-center" onClick={(e) => e.stopPropagation()}>
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
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
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
                                <PopoverContent className="w-96 max-h-64 overflow-auto bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800" align="start">
                                  <div className="text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">{t('campaigns.tooltips.adAccount', 'Ad Account')}</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">{getAdAccountName(campaign.adAccountId)}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('campaigns.tooltips.openMeta', 'Click to open in Meta Ads Manager')}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
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
                                <PopoverContent className="w-96 max-h-64 overflow-auto bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800" align="start">
                                  <div className="text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">{t('campaigns.tooltips.campaignName', 'Campaign Name')}</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{campaign.name}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>

                            <TableCell className="px-4 py-2 text-sm">
                              {(() => {


                                const status = getCampaignStatus(campaign, accountMap);
                                return (
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${status.color}`} />
                                    <span className={`text-sm font-medium ${status.textColor}`}>
                                      {status.label}
                                    </span>
                                  </div>
                                );
                              })()}
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                    {campaign.results?.toLocaleString() ?? '-'}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64" align="start">
                                  <div className="text-sm font-medium mb-2">Results</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">{campaign.results?.toLocaleString() ?? '-'}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                    {campaign.costPerResult ? `$${campaign.costPerResult.toFixed(2)}` : '-'}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64" align="start">
                                  <div className="text-sm font-medium mb-2">Cost per result</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">{campaign.costPerResult ? `$${campaign.costPerResult.toFixed(2)}` : '-'}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">
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
                                            <span className="text-xs text-gray-500 dark:text-gray-400">Campaign {budgetType}</span>
                                            <span className="font-medium">{formatCurrency(budget, campaign.currency)}</span>
                                          </div>
                                        );
                                      }
                                      return (
                                        <div className="flex flex-col items-end">
                                          <span className="text-xs text-gray-500 dark:text-gray-400">Ad Set Budget</span>
                                          <span className="text-gray-400">-</span>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64" align="start">
                                  <div className="text-sm font-medium mb-2">{t('campaigns.tooltips.budgetInfo', 'Budget Information')}</div>
                                  {campaign.dailyBudget && campaign.dailyBudget > 0 && (
                                    <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                                      <span className="font-medium">{t('campaigns.tooltips.campaignDaily', 'Campaign Daily:')}</span> {formatCurrency(campaign.dailyBudget, campaign.currency)}
                                    </div>
                                  )}
                                  {campaign.lifetimeBudget && campaign.lifetimeBudget > 0 && (
                                    <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                                      <span className="font-medium">{t('campaigns.tooltips.campaignLifetime', 'Campaign Lifetime:')}</span> {formatCurrency(campaign.lifetimeBudget, campaign.currency)}
                                    </div>
                                  )}
                                  {(!campaign.dailyBudget || campaign.dailyBudget === 0) && (!campaign.lifetimeBudget || campaign.lifetimeBudget === 0) && (
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                      {t('campaigns.tooltips.noBudget', 'No campaign budget set.\nBudget is managed at ad set level.').split('\n').map((line, i) => (
                                        <span key={i} className="block">{line}</span>
                                      ))}
                                    </div>
                                  )}
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                    {campaign.reach?.toLocaleString() ?? '-'}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64" align="start">
                                  <div className="text-sm font-medium mb-2">Reach</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">{campaign.reach?.toLocaleString() ?? '-'}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                    {campaign.impressions?.toLocaleString() ?? '-'}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64" align="start">
                                  <div className="text-sm font-medium mb-2">Impressions</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">{campaign.impressions?.toLocaleString() ?? '-'}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                    {campaign.postEngagements?.toLocaleString() ?? '-'}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64" align="start">
                                  <div className="text-sm font-medium mb-2">Post engagements</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">{campaign.postEngagements?.toLocaleString() ?? '-'}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                    {campaign.clicks?.toLocaleString() ?? '-'}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64" align="start">
                                  <div className="text-sm font-medium mb-2">Clicks (all)</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">{campaign.clicks?.toLocaleString() ?? '-'}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                    {campaign.messagingContacts?.toLocaleString() ?? '-'}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64" align="start">
                                  <div className="text-sm font-medium mb-2">Messaging contacts</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">{campaign.messagingContacts?.toLocaleString() ?? '-'}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                    {campaign.amountSpent ? `$${campaign.amountSpent.toFixed(2)}` : '-'}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64" align="start">
                                  <div className="text-sm font-medium mb-2">Amount spent</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">{campaign.amountSpent ? `$${campaign.amountSpent.toFixed(2)}` : '-'}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                    {campaign.createdAt}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64" align="start">
                                  <div className="text-sm font-medium mb-2">Created</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">{campaign.createdAt}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleToggleCampaign(campaign.id, campaign.status)}
                                  className="inline-flex items-center justify-center p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title={campaign.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                                >
                                  {campaign.status === 'ACTIVE' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                </button>
                                <button
                                  className="inline-flex items-center justify-center p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCampaign(campaign.id)}
                                  className="inline-flex items-center justify-center p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            </div >
          )
        }

        {/* Ad Sets Tab */}
        {
          activeTab === 'adsets' && (
            <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 overflow-hidden flex-1 flex flex-col min-h-0 rounded-tr-xl rounded-b-xl">
              <>
                <div className="overflow-auto flex-1 [&>div]:overflow-visible">
                  <Table className="w-full min-w-max">
                    <TableHeader className="bg-gray-50 dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 sticky top-0 z-50">
                      <TableRow>
                        <TableHead className="px-3 py-2 text-center w-12">
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
                        </TableHead>
                        <TableHead className="text-center w-20">{t('campaigns.columns.toggle', 'Active')}</TableHead>
                        <TableHead className="max-w-[280px]">{t('campaigns.columns.adAccount', 'Ad Acc')}</TableHead>
                        <SortableHeader columnKey="name" label={t('campaigns.columns.adSetName', 'Ad Set Name')} align="left" className="max-w-[280px]" />
                        <SortableHeader columnKey="target" label={t('campaigns.columns.target', 'Target')} align="left" className="max-w-[280px]" />
                        <SortableHeader columnKey="status" label={t('campaigns.columns.status', 'Status')} align="left" className="max-w-[280px]" />
                        <SortableHeader columnKey="results" label={t('campaigns.columns.results', 'Results')} align="right" className="max-w-[280px]" />
                        <SortableHeader columnKey="costPerResult" label={t('campaigns.columns.costPerResult', 'Cost per result')} align="right" className="max-w-[280px]" />
                        <SortableHeader columnKey="budget" label={t('campaigns.columns.budget', 'Budget')} align="right" className="max-w-[280px]" />
                        <SortableHeader columnKey="reach" label={t('campaigns.columns.reach', 'Reach')} align="right" className="max-w-[280px]" />
                        <SortableHeader columnKey="impressions" label={t('campaigns.columns.impressions', 'Impressions')} align="right" className="max-w-[280px]" />
                        <SortableHeader columnKey="postEngagements" label={t('campaigns.columns.postEngagements', 'Post engagements')} align="right" className="max-w-[280px]" />
                        <SortableHeader columnKey="clicks" label={t('campaigns.columns.clicks', 'Clicks (all)')} align="right" className="max-w-[280px]" />
                        <SortableHeader columnKey="messagingContacts" label={t('campaigns.columns.messagingContacts', 'Messaging contacts')} align="right" className="max-w-[280px]" />
                        <SortableHeader columnKey="amountSpent" label={t('campaigns.columns.amountSpent', 'Amount spent')} align="right" className="max-w-[280px]" />
                        <SortableHeader columnKey="dailyBudget" label={t('launch.dailyBudget', 'Daily Budget')} align="right" className="max-w-[280px]" />
                        <SortableHeader columnKey="optimization" label={t('campaigns.columns.optimization', 'Optimization')} align="left" className="max-w-[280px]" />
                        <SortableHeader columnKey="bidAmount" label={t('campaigns.columns.bidAmount', 'Bid Amount')} align="right" className="max-w-[280px]" />
                        <SortableHeader columnKey="createdAt" label={t('campaigns.columns.created', 'Created')} align="left" className="max-w-[280px]" />
                        <TableHead className="text-right max-w-[280px]">{t('campaigns.columns.actions', 'Actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 10 }).map((_, i) => (
                          <TableRow key={i} className="animate-pulse">
                            <TableCell className="px-3 py-2 text-center w-12"><div className="h-5 w-5 bg-gray-200 dark:bg-zinc-800 rounded-[6px] mx-auto"></div></TableCell>
                            <TableCell><div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded-full w-11 mx-auto"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-32"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-48"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-40"></div></TableCell>
                            <TableCell><div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded-full w-16"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-16 ml-auto"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-16 ml-auto"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-16 ml-auto"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-16 ml-auto"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-16 ml-auto"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-16 ml-auto"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-16 ml-auto"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-16 ml-auto"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-16 ml-auto"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-20 ml-auto"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-32"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-16 ml-auto"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-24"></div></TableCell>
                            <TableCell><div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-24 ml-auto"></div></TableCell>
                          </TableRow>
                        ))
                      ) : filteredAdSets.filter(a => {
                        const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase());
                        const matchesStatus = statusFilter === 'all' ||
                          (statusFilter === 'active' && a.status === 'ACTIVE') ||
                          (statusFilter === 'paused' && a.status === 'PAUSED');
                        return matchesSearch && matchesStatus;
                      }).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={20} className="text-center py-16">
                            <p className="text-gray-600 dark:text-gray-400 mb-4">{filteredAdSets.length === 0 ? 'No ad sets found' : 'No ad sets match your filters'}</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAdSets.filter(a => {
                          const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase());
                          const matchesStatus = statusFilter === 'all' ||
                            (statusFilter === 'active' && a.status === 'ACTIVE') ||
                            (statusFilter === 'paused' && a.status === 'PAUSED');
                          return matchesSearch && matchesStatus;
                        }).map((adSet, index) => (
                          <TableRow key={adSet.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer" onClick={() => handleToggleAdSetSelection(adSet.id, !selectedAdSetIds.has(adSet.id))}>
                            <TableCell
                              className="px-3 py-2 text-center text-sm text-gray-600 dark:text-gray-400"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={selectedAdSetIds.has(adSet.id)}
                                  onCheckedChange={(checked) => handleToggleAdSetSelection(adSet.id, checked as boolean)}
                                  aria-label={`Select ad set ${adSet.name}`}
                                  className="rounded-md"
                                />
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-center" onClick={(e) => e.stopPropagation()}>
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
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
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
                                  <div className="text-sm font-medium mb-2">{t('campaigns.tooltips.adAccount', 'Ad Account')}</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">{getAdAccountName(adSet.adAccountId)}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('campaigns.tooltips.openMeta', 'Click to open in Meta Ads Manager')}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
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
                                  <div className="text-sm font-medium mb-2">{t('campaigns.tooltips.adSetName', 'Ad Set Name')}</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{adSet.name}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-1 text-sm text-gray-600 dark:text-gray-400">
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
                                  <div className="text-sm font-medium mb-2">{t('campaigns.columns.target', 'Target')}</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{formatTargetingFull(adSet.targeting)}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm">
                              {(() => {
                                const status = getAdSetStatus(adSet, accountMap);
                                return (
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${status.color}`} />
                                    <span className={`text-sm font-medium ${status.textColor}`}>
                                      {status.label}
                                    </span>
                                  </div>
                                );
                              })()}
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                    {adSet.results?.toLocaleString() ?? '-'}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64" align="start">
                                  <div className="text-sm font-medium mb-2">Results</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">{adSet.results?.toLocaleString() ?? '-'}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                    {adSet.costPerResult ? `$${adSet.costPerResult.toFixed(2)}` : '-'}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64" align="start">
                                  <div className="text-sm font-medium mb-2">Cost per result</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">{adSet.costPerResult ? `$${adSet.costPerResult.toFixed(2)}` : '-'}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                    {adSet.budget ? `$${adSet.budget.toFixed(2)}` : '-'}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64" align="start">
                                  <div className="text-sm font-medium mb-2">Budget</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">{adSet.budget ? `$${adSet.budget.toFixed(2)}` : '-'}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                    {adSet.reach?.toLocaleString() ?? '-'}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64" align="start">
                                  <div className="text-sm font-medium mb-2">Reach</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">{adSet.reach?.toLocaleString() ?? '-'}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                    {adSet.impressions?.toLocaleString() ?? '-'}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64" align="start">
                                  <div className="text-sm font-medium mb-2">Impressions</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">{adSet.impressions?.toLocaleString() ?? '-'}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                    {adSet.postEngagements?.toLocaleString() ?? '-'}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64" align="start">
                                  <div className="text-sm font-medium mb-2">Post engagements</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">{adSet.postEngagements?.toLocaleString() ?? '-'}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                    {adSet.clicks?.toLocaleString() ?? '-'}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64" align="start">
                                  <div className="text-sm font-medium mb-2">Clicks (all)</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">{adSet.clicks?.toLocaleString() ?? '-'}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                    {adSet.messagingContacts?.toLocaleString() ?? '-'}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64" align="start">
                                  <div className="text-sm font-medium mb-2">Messaging contacts</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">{adSet.messagingContacts?.toLocaleString() ?? '-'}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                    {adSet.amountSpent ? `$${adSet.amountSpent.toFixed(2)}` : '-'}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64" align="start">
                                  <div className="text-sm font-medium mb-2">Amount spent</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">{adSet.amountSpent ? `$${adSet.amountSpent.toFixed(2)}` : '-'}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                    ${adSet.dailyBudget > 0 ? adSet.dailyBudget.toFixed(2) : adSet.lifetimeBudget.toFixed(2)}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64" align="start">
                                  <div className="text-sm font-medium mb-2">{adSet.dailyBudget > 0 ? t('launch.dailyBudget', 'Daily Budget') : t('launch.lifetimeBudget', 'Lifetime Budget')}</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">${adSet.dailyBudget > 0 ? adSet.dailyBudget.toFixed(2) : adSet.lifetimeBudget.toFixed(2)}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="truncate cursor-pointer hover:text-blue-600" title={adSet.optimizationGoal}>
                                    {adSet.optimizationGoal}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-96 max-h-64 overflow-auto" align="start">
                                  <div className="text-sm font-medium mb-2">{t('campaigns.columns.optimization', 'Optimization Goal')}</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">{adSet.optimizationGoal}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                    ${adSet.bidAmount.toFixed(2)}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64" align="start">
                                  <div className="text-sm font-medium mb-2">Bid Amount</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">${adSet.bidAmount.toFixed(2)}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                    {adSet.createdAt}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64" align="start">
                                  <div className="text-sm font-medium mb-2">Created</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">{adSet.createdAt}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  className="inline-flex items-center justify-center p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title={adSet.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                                >
                                  {adSet.status === 'ACTIVE' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                </button>
                                <button
                                  className="inline-flex items-center justify-center p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  className="inline-flex items-center justify-center p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            </div>
          )
        }

        {/* Ads Tab */}
        {
          activeTab === 'ads' && (
            <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 overflow-hidden flex-1 flex flex-col min-h-0 rounded-tr-xl rounded-b-xl">
              <>
                <div className="overflow-auto flex-1 [&>div]:overflow-visible">
                  <Table className="w-full min-w-max">
                    <TableHeader className="bg-gray-50 dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 sticky top-0 z-50">
                      <TableRow>
                        <TableHead className="px-3 py-2 text-center w-12">
                          <div className="flex justify-center">
                            <Checkbox
                              checked={ads.length > 0 && selectedAdIds.size === ads.length}
                              onCheckedChange={handleToggleAllAds}
                              aria-label="Select all ads"
                              className={selectedAdIds.size > 0 && selectedAdIds.size < ads.length ? "data-[state=checked]:bg-blue-600" : ""}
                            />
                          </div>
                        </TableHead>
                        <TableHead className="text-center w-20">{t('campaigns.columns.toggle', 'Active')}</TableHead>
                        <TableHead className="max-w-[280px]">{t('campaigns.columns.adAccount', 'Ad Acc')}</TableHead>
                        <SortableHeader columnKey="page" label={t('campaigns.columns.page', 'Page')} align="left" className="max-w-[280px]" />
                        <SortableHeader columnKey="name" label={t('campaigns.columns.adName', 'Ad Name')} align="left" className="max-w-[280px]" />
                        <SortableHeader columnKey="target" label={t('campaigns.columns.target', 'Target')} align="left" className="max-w-[280px]" />
                        <SortableHeader columnKey="status" label={t('campaigns.columns.status', 'Status')} align="left" className="max-w-[280px]" />
                        <SortableHeader columnKey="results" label={t('campaigns.columns.results', 'Results')} align="right" className="max-w-[280px]" />
                        <SortableHeader columnKey="costPerResult" label={t('campaigns.columns.costPerResult', 'Cost per result')} align="right" className="max-w-[280px]" />
                        <SortableHeader columnKey="budget" label={t('campaigns.columns.budget', 'Budget')} align="right" className="max-w-[280px]" />
                        <SortableHeader columnKey="reach" label={t('campaigns.columns.reach', 'Reach')} align="right" className="max-w-[280px]" />
                        <SortableHeader columnKey="impressions" label={t('campaigns.columns.impressions', 'Impressions')} align="right" className="max-w-[280px]" />
                        <SortableHeader columnKey="postEngagements" label={t('campaigns.columns.postEngagements', 'Post engagements')} align="right" className="max-w-[280px]" />
                        <SortableHeader columnKey="clicks" label={t('campaigns.columns.clicks', 'Clicks (all)')} align="right" className="max-w-[280px]" />
                        <SortableHeader columnKey="messagingContacts" label={t('campaigns.columns.messagingContacts', 'Messaging contacts')} align="right" className="max-w-[280px]" />
                        <SortableHeader columnKey="amountSpent" label={t('campaigns.columns.amountSpent', 'Amount spent')} align="right" className="max-w-[280px]" />
                        <SortableHeader columnKey="title" label={t('campaigns.columns.title', 'Title')} align="left" className="max-w-[280px]" />
                        <SortableHeader columnKey="body" label={t('campaigns.columns.body', 'Body')} align="left" className="max-w-[280px]" />
                        <SortableHeader columnKey="createdAt" label={t('campaigns.columns.created', 'Created')} align="left" className="max-w-[280px]" />
                        <TableHead className="text-right max-w-[280px]">{t('campaigns.columns.actions', 'Actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 10 }).map((_, i) => (
                          <TableRow key={i} className="animate-pulse">
                            <TableCell className="px-3 py-2 text-center w-12"><div className="h-5 w-5 bg-gray-200 dark:bg-zinc-800 rounded-[6px] mx-auto"></div></TableCell>
                            <TableCell><div className="h-4 w-8 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-32"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-32"></div></TableCell>
                            <TableCell className="px-4 py-2">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gray-200 dark:bg-zinc-800 rounded"></div>
                                <div className="flex-1 space-y-2">
                                  <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-48"></div>
                                  <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded w-32"></div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-32"></div></TableCell>
                            <TableCell><div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded-full w-16"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-16 ml-auto"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-16 ml-auto"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-16 ml-auto"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-16 ml-auto"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-16 ml-auto"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-16 ml-auto"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-16 ml-auto"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-16 ml-auto"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-16 ml-auto"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-24"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-32"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-24"></div></TableCell>
                            <TableCell><div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-24 ml-auto"></div></TableCell>
                          </TableRow>
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
                        <TableRow>
                          <TableCell colSpan={20} className="text-center py-16">
                            <p className="text-gray-600 dark:text-gray-400 mb-4">{ads.length === 0 ? 'No ads found' : 'No ads match your filters'}</p>
                          </TableCell>
                        </TableRow>
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
                          <TableRow key={ad.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer" onClick={() => handleToggleAdSelection(ad.id, !selectedAdIds.has(ad.id))}>
                            <TableCell className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={selectedAdIds.has(ad.id)}
                                  onCheckedChange={(checked) => handleToggleAdSelection(ad.id, checked as boolean)}
                                  aria-label={`Select ${ad.name}`}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-center" onClick={(e) => e.stopPropagation()}>
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
                            </TableCell>

                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
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
                                  <div className="text-sm text-gray-700 dark:text-gray-300">{getAdAccountName(ad.adAccountId)}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Click to open in Meta Ads Manager</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                              <div style={{ maxWidth: '280px' }}>
                                <div
                                  className="truncate cursor-pointer hover:text-blue-600 hover:underline"
                                  title={ad.pageName}
                                  onClick={() => ad.pageId && window.open(`https://www.facebook.com/${ad.pageId}`, '_blank')}
                                >
                                  {ad.pageName || '-'}
                                </div>
                                {ad.pageId && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate" title={ad.pageId}>
                                    ID: {ad.pageId}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-2">
                              <div className="flex items-center gap-3">
                                {ad.imageUrl ? (
                                  <img
                                    src={ad.imageUrl}
                                    alt={ad.name}
                                    className="w-12 h-12 object-cover rounded border border-gray-200 dark:border-zinc-800"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-gray-100 rounded border border-gray-200 dark:border-zinc-800 flex items-center justify-center">
                                    <span className="text-xs text-gray-400">No Image</span>
                                  </div>
                                )}
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <div
                                      className="flex flex-col min-w-0 cursor-pointer group"
                                      style={{ maxWidth: '280px' }}
                                    >
                                      <div className="flex items-center gap-2">
                                        <div className="text-sm text-gray-900 dark:text-gray-100 truncate hover:text-blue-600" title={ad.name}>
                                          {ad.name}
                                        </div>
                                        {ad.postLink && (
                                          <div
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              window.open(ad.postLink!, '_blank');
                                            }}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-0.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded"
                                            title="View Post"
                                          >
                                            <ExternalLink className="w-3.5 h-3.5 text-gray-400 hover:text-blue-600" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate" title={ad.id}>
                                        ID: {ad.id}
                                      </div>
                                    </div>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-96 max-h-64 overflow-auto" align="start">
                                    <div className="text-sm font-medium mb-2">Ad Name</div>
                                    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ad.name}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">ID: {ad.id}</div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-1 text-sm text-gray-600 dark:text-gray-400">
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
                                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{formatTargetingFull(ad.targeting)}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm">
                              {(() => {
                                const status = getAdStatus(ad, accountMap && ad.adAccountId ? accountMap[ad.adAccountId] : undefined);
                                return (
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${status.color}`} />
                                    <span className={`text-sm font-medium ${status.textColor}`}>
                                      {status.label}
                                    </span>
                                  </div>
                                );
                              })()}
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                    {ad.results?.toLocaleString() ?? '-'}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64" align="start">
                                  <div className="text-sm font-medium mb-2">Results</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">{ad.results?.toLocaleString() ?? '-'}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                    {ad.costPerResult ? `$${ad.costPerResult.toFixed(2)}` : '-'}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64" align="start">
                                  <div className="text-sm font-medium mb-2">Cost per result</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">{ad.costPerResult ? `$${ad.costPerResult.toFixed(2)}` : '-'}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                    {ad.budget ? `$${ad.budget.toFixed(2)}` : '-'}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64" align="start">
                                  <div className="text-sm font-medium mb-2">Budget</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">{ad.budget ? `$${ad.budget.toFixed(2)}` : '-'}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                    {ad.reach?.toLocaleString() ?? '-'}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64" align="start">
                                  <div className="text-sm font-medium mb-2">Reach</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">{ad.reach?.toLocaleString() ?? '-'}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                    {ad.impressions?.toLocaleString() ?? '-'}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64" align="start">
                                  <div className="text-sm font-medium mb-2">Impressions</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">{ad.impressions?.toLocaleString() ?? '-'}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                    {ad.postEngagements?.toLocaleString() ?? '-'}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64" align="start">
                                  <div className="text-sm font-medium mb-2">Post engagements</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">{ad.postEngagements?.toLocaleString() ?? '-'}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                    {ad.clicks?.toLocaleString() ?? '-'}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64" align="start">
                                  <div className="text-sm font-medium mb-2">Clicks (all)</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">{ad.clicks?.toLocaleString() ?? '-'}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                    {ad.messagingContacts?.toLocaleString() ?? '-'}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64" align="start">
                                  <div className="text-sm font-medium mb-2">Messaging contacts</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">{ad.messagingContacts?.toLocaleString() ?? '-'}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                    {ad.amountSpent ? `$${ad.amountSpent.toFixed(2)}` : '-'}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64" align="start">
                                  <div className="text-sm font-medium mb-2">Amount spent</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">{ad.amountSpent ? `$${ad.amountSpent.toFixed(2)}` : '-'}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="truncate cursor-pointer hover:text-blue-600" title={ad.title}>
                                    {ad.title}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-96 max-h-64 overflow-auto" align="start">
                                  <div className="text-sm font-medium mb-2">Title</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ad.title}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>

                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="truncate cursor-pointer hover:text-blue-600" style={{ maxWidth: '280px' }} title={ad.body}>
                                    {ad.body}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-96 max-h-64 overflow-auto" align="start">
                                  <div className="text-sm font-medium mb-2">Body</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ad.body}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="cursor-pointer hover:text-blue-600 whitespace-nowrap">
                                    {ad.createdAt}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64" align="start">
                                  <div className="text-sm font-medium mb-2">Created</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">{ad.createdAt}</div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  className="inline-flex items-center justify-center p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title={ad.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                                >
                                  {ad.status === 'ACTIVE' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                </button>
                                <button
                                  className="inline-flex items-center justify-center p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  className="inline-flex items-center justify-center p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            </div>
          )
        }

      </div >
    </div >
  );
}
