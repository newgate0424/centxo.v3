'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Type definitions
interface AdAccount {
  id: string;
  name: string;
  account_id: string;
  currency?: string;
  account_status?: number;
  disable_reason?: number;
  spend_cap?: string | number;
  amount_spent?: string | number;
  business_name?: string;
  _source?: {
    teamMemberId?: string;
    facebookName?: string;
    facebookUserId?: string;
  };
}

interface Page {
  id: string;
  name: string;
  access_token?: string;
  business_name?: string;
  picture?: {
    data: {
      url: string;
    }
  };
  _source?: {
    teamMemberId?: string;
    facebookName?: string;
    facebookUserId?: string;
  };
}

interface Business {
  id: string;
  name: string;
  profile_picture_uri?: string;
  verification_status?: string;
  permitted_roles?: string[];
  permitted_tasks?: string[];
  _source?: {
    teamMemberId?: string;
    facebookName?: string;
    facebookUserId?: string;
  };
}

interface ConfigContextType {
  // Ad Accounts
  selectedAccounts: AdAccount[];
  setSelectedAccounts: (accounts: AdAccount[]) => void;
  toggleAccount: (account: AdAccount) => void;
  currentAccount: AdAccount | null;
  setCurrentAccount: (account: AdAccount) => void;
  adAccounts: AdAccount[];

  // Pages
  selectedPages: Page[];
  setSelectedPages: (pages: Page[]) => void;
  togglePage: (page: Page) => void;
  pages: Page[];

  // Businesses
  selectedBusinesses: Business[];
  setSelectedBusinesses: (businesses: Business[]) => void;
  toggleBusiness: (business: Business) => void;
  businesses: Business[];

  // Loading states
  loading: boolean;
  error: string | null;
  refreshData: (force?: boolean) => Promise<void>;
}

// Create context with proper initial value
const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

// Cache duration in milliseconds (1 minute)
const CACHE_DURATION = 1 * 60 * 1000;

export function ConfigProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const router = useRouter(); // Added useRouter

  // Rate Limit Circuit Breaker State
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [userPlan, setUserPlan] = useState<string>('FREE');
  const [isLimitDialogOpen, setIsLimitDialogOpen] = useState(false); // Added new state

  useEffect(() => {
    if (session?.user) {
      fetch('/api/user/plan')
        .then(async (res) => {
          if (!res.ok) {
            const text = await res.text();
            console.error('Failed to fetch plan:', res.status, text.substring(0, 100)); // Log first 100 chars
            return { plan: 'FREE' };
          }
          return res.json();
        })
        .then(data => setUserPlan(data.plan || 'FREE'))
        .catch(err => {
          console.error('Error fetching plan:', err);
          setUserPlan('FREE');
        });
    }
  }, [session]);

  const getPlanLimit = (plan: string) => {
    switch (plan) {
      case 'PRO': return 50;
      case 'PLUS': return 20;
      // Default to FREE plan
      default: return 10;
    }
  };

  // Initialize state from localStorage immediately to prevent race conditions
  const [selectedAccounts, setSelectedAccountsState] = useState<AdAccount[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('selectedAdAccounts');
        return saved ? JSON.parse(saved) : [];
      } catch (e) { return []; }
    }
    return [];
  });

  const [selectedPages, setSelectedPagesState] = useState<Page[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('selectedPages');
        return saved ? JSON.parse(saved) : [];
      } catch (e) { return []; }
    }
    return [];
  });

  const [selectedBusinesses, setSelectedBusinessesState] = useState<Business[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('selectedBusinesses');
        return saved ? JSON.parse(saved) : [];
      } catch (e) { return []; }
    }
    return [];
  });

  const [adAccounts, setAdAccounts] = useState<AdAccount[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('adPilotCache_v4');
        if (cached) {
          return JSON.parse(cached).accounts || [];
        }
      } catch (e) { }
    }
    return [];
  });

  const [pages, setPages] = useState<Page[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('adPilotCache_v4');
        if (cached) {
          return JSON.parse(cached).pages || [];
        }
      } catch (e) { }
    }
    return [];
  });

  const [businesses, setBusinesses] = useState<Business[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('adPilotCache_v4');
        if (cached) {
          return JSON.parse(cached).businesses || [];
        }
      } catch (e) { }
    }
    return [];
  });

  const [lastFetched, setLastFetched] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('adPilotCache_v4');
        if (cached) {
          return JSON.parse(cached).timestamp || 0;
        }
      } catch (e) { }
    }
    return 0;
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if we have valid cache on mount to stop loading immediately
  useEffect(() => {
    const now = Date.now();
    if (lastFetched > 0 && (now - lastFetched < CACHE_DURATION)) {
      setLoading(false);
    }
  }, [lastFetched]);

  // Check Rate Limit on Mount
  useEffect(() => {
    const cooldown = localStorage.getItem('rateLimitCooldown');
    if (cooldown && parseInt(cooldown) > Date.now()) {
      setIsRateLimited(true);
      console.warn('API Rate Limit active. Requests paused until:', new Date(parseInt(cooldown)).toLocaleTimeString());
    }
  }, []);

  // Persist cache helper
  const saveToCache = (accounts: AdAccount[], p: Page[], b: Business[], timestamp: number) => {
    localStorage.setItem('adPilotCache_v4', JSON.stringify({ accounts, pages: p, businesses: b, timestamp }));
  };

  const handleApiError = async (response: Response) => {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || errorData.error || `Request failed: ${response.status}`;

    // Check for Facebook Rate Limit Codes
    const code = errorData.error?.code;
    if (response.status === 400 || code === 80004 || code === 17 || code === 32 || code === 613) {
      console.error("RATE LIMIT DETECTED. Activating circuit breaker for 15 minutes.");
      const cooldownUntil = Date.now() + (15 * 60 * 1000);
      localStorage.setItem('rateLimitCooldown', cooldownUntil.toString());
      setIsRateLimited(true);
    }

    throw new Error(errorMessage);
  };

  // Fetch ad accounts
  const fetchAdAccounts = async (force: boolean = false) => {
    if (isRateLimited) {
      console.warn("Request blocked by circuit breaker (Rate Limited)");
      if (adAccounts.length > 0) return adAccounts;
      throw new Error("System is cooling down from API rate limits. Please try again in 15 minutes.");
    }

    try {
      // Use team-based endpoint instead of old MetaAccount endpoint
      const url = force ? '/api/team/ad-accounts?refresh=true' : '/api/team/ad-accounts';
      const res = await fetch(url);
      if (!res.ok) {
        if (adAccounts.length > 0) {
          try { await handleApiError(res); } catch (e) { console.warn(e); }
          return adAccounts;
        }
        await handleApiError(res);
      }
      const data = await res.json();
      const accounts = data.accounts || [];
      console.log('[AdAccountContext] Fetched ad accounts:', accounts.length, accounts);
      setAdAccounts(accounts);

      // Validate and fix selectedAccounts
      // Check if current selectedAccounts are still valid
      const validSelectedAccounts = selectedAccounts.filter(selected =>
        accounts.some((acc: AdAccount) => acc.id === selected.id)
      );

      // Check if user has ever saved a selection (even an empty one)
      // If localStorage returns null, it means no selection has ever been made (first visit)
      const hasSavedSelection = typeof window !== 'undefined' && localStorage.getItem('selectedAdAccounts') !== null;

      // If no valid selections AND (user hasn't saved anything OR user previously selected accounts that are now invalid/gone)
      // We want to auto-select ALL only if it's the first visit (no saved selection)
      // OR if we want to fallback to all when selected accounts are lost?
      // User request: "If I deselect all, it currently auto-selects all. I want it to stay empty."
      // So we must NOT auto-select if hasSavedSelection is true (even if list is empty).

      if (validSelectedAccounts.length === 0 && accounts.length > 0 && !hasSavedSelection) {
        console.log('Auto-selecting all ad accounts (First Visit)');
        setSelectedAccounts(accounts);
      } else if (validSelectedAccounts.length !== selectedAccounts.length) {
        // Some selections were invalid (removed from FB?), update to only valid ones
        // If validSelectedAccounts is empty here, it means all selected accounts are gone.
        // We update to empty list, which is correct behavior (don't force all).
        console.log('Updating selected accounts to valid subset', validSelectedAccounts);
        setSelectedAccounts(validSelectedAccounts);
      }

      return accounts;
    } catch (error) {
      console.error("Error fetching ad accounts:", error);
      throw error;
    }
  };

  // Fetch pages
  const fetchPages = async (force: boolean = false) => {
    if (isRateLimited) {
      if (pages.length > 0) return pages;
      return [];
    }

    try {
      // Use team-based endpoint instead of old MetaAccount endpoint
      const url = force ? '/api/team/pages?refresh=true' : '/api/team/pages';
      const res = await fetch(url);
      if (!res.ok) {
        if (pages.length > 0) {
          try { await handleApiError(res); } catch (e) { console.warn(e); }
          return pages;
        }
        await handleApiError(res);
      }
      const data = await res.json();
      const p = data.pages || [];
      setPages(p);

      // Auto-select pages logic similar to accounts...
      const validSelectedPages = selectedPages.filter(selected =>
        p.some((page: Page) => page.id === selected.id)
      );

      const hasSavedSelection = typeof window !== 'undefined' && localStorage.getItem('selectedPages') !== null;

      if (validSelectedPages.length === 0 && p.length > 0 && !hasSavedSelection) {
        setSelectedPages(p);
      } else if (validSelectedPages.length !== selectedPages.length) {
        setSelectedPages(validSelectedPages);
      }
      return p;
    } catch (error) {
      console.error("Error fetching pages:", error);
      throw error;
    }
  };

  // Fetch businesses
  const fetchBusinesses = async (force: boolean = false) => {
    if (isRateLimited) {
      if (businesses.length > 0) return businesses;
      return [];
    }

    try {
      const url = force ? '/api/team/businesses?refresh=true' : '/api/team/businesses';
      const res = await fetch(url);
      if (!res.ok) {
        if (businesses.length > 0) {
          try { await handleApiError(res); } catch (e) { console.warn(e); }
          return businesses;
        }
        await handleApiError(res);
      }
      const data = await res.json();
      const b = data.businesses || [];
      setBusinesses(b);

      // Auto-select if first load and no selection
      if (selectedBusinesses.length === 0 && b.length > 0) {
        // Just an example logic, typically maybe we don't auto-select businesses?
        // Let's keep it empty by default for now unless user wants otherwise.
      }
      return b;
    } catch (error) {
      console.error("Error fetching businesses:", error);
      throw error;
    }
  };

  // Refresh function exposed to context
  const refreshData = async (force: boolean = false) => {
    const now = Date.now();
    if (!force && lastFetched > 0 && (now - lastFetched < CACHE_DURATION)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [accounts, p, b] = await Promise.all([
        fetchAdAccounts(force),
        fetchPages(force),
        fetchBusinesses(force)
      ]);

      const newTime = Date.now();
      setLastFetched(newTime);

      if (accounts && p && b) {
        saveToCache(accounts, p, b, newTime);
      } else {
        saveToCache(adAccounts, pages, businesses, newTime);
      }

    } catch (err) {
      console.error("Error refreshing data:", err);
      if (adAccounts.length === 0) {
        setError(err instanceof Error ? err.message : "Failed to refresh data");
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    console.log('[AdAccountContext] useEffect triggered, session:', session?.user?.email);
    if (session?.user) {
      console.log('[AdAccountContext] Calling refreshData');
      refreshData(false);
    }
  }, [session?.user?.email]);

  const setSelectedAccounts = (accounts: AdAccount[]) => {
    const limit = getPlanLimit(userPlan);
    if (accounts.length > limit) {
      // alert(`Your current plan (${userPlan}) allows only ${limit} ad account(s). Please upgrade to add more.`);
      // We will just slice it for set, but ideally we warn. 
      // Since this is often called by auto-select, we might just cap it silently or log.
      // But for manual selection, we need to block.
      // Let's assume this setter is used for state updates, so we cap it.
      accounts = accounts.slice(0, limit);
    }
    setSelectedAccountsState(accounts);
    localStorage.setItem('selectedAdAccounts', JSON.stringify(accounts));
  };

  const setSelectedPages = (p: Page[]) => {
    setSelectedPagesState(p);
    localStorage.setItem('selectedPages', JSON.stringify(p));
  };

  const setSelectedBusinesses = (b: Business[]) => {
    setSelectedBusinessesState(b);
    localStorage.setItem('selectedBusinesses', JSON.stringify(b));
  };

  const toggleAccount = (account: AdAccount) => {
    const isSelected = selectedAccounts.some(acc => acc.id === account.id);
    let newSelected: AdAccount[];
    const limit = getPlanLimit(userPlan);

    if (isSelected) {
      newSelected = selectedAccounts.filter(acc => acc.id !== account.id);
    } else {
      if (selectedAccounts.length >= limit) {
        setIsLimitDialogOpen(true);
        return;
      }
      newSelected = [...selectedAccounts, account];
    }

    setSelectedAccounts(newSelected);
  };

  const togglePage = (page: Page) => {
    const isSelected = selectedPages.some(p => p.id === page.id);
    let newSelected: Page[];

    if (isSelected) {
      newSelected = selectedPages.filter(p => p.id !== page.id);
    } else {
      newSelected = [...selectedPages, page];
    }

    setSelectedPages(newSelected);
  };

  const toggleBusiness = (business: Business) => {
    const isSelected = selectedBusinesses.some(b => b.id === business.id);
    let newSelected: Business[];

    if (isSelected) {
      newSelected = selectedBusinesses.filter(b => b.id !== business.id);
    } else {
      newSelected = [...selectedBusinesses, business];
    }

    setSelectedBusinesses(newSelected);
  };

  return (
    <ConfigContext.Provider
      value={{
        selectedAccounts,
        setSelectedAccounts,
        currentAccount: selectedAccounts[0] || null,
        setCurrentAccount: (account) => {
          if (account) {
            if (!selectedAccounts.some(a => a.id === account.id)) {
              setSelectedAccounts([...selectedAccounts, account]);
            }
          }
        },
        toggleAccount,
        adAccounts,
        selectedPages,
        setSelectedPages,
        togglePage,
        pages,
        selectedBusinesses,
        setSelectedBusinesses,
        toggleBusiness,
        businesses,
        loading,
        error,
        refreshData
      }}
    >
      {children}
      <AlertDialog open={isLimitDialogOpen} onOpenChange={setIsLimitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Plan Limit Reached</AlertDialogTitle>
            <AlertDialogDescription>
              Your "{userPlan}" plan is limited to <span className="font-bold text-foreground">{getPlanLimit(userPlan)}</span> ad account(s).
              Please upgrade your plan to select more accounts and unlock advanced features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                setIsLimitDialogOpen(false);
                router.push('/pricing');
              }}
            >
              Upgrade Plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return context;
}

// Backward compatibility - export as useAdAccount
export const useAdAccount = useConfig;
export const AdAccountProvider = ConfigProvider;
