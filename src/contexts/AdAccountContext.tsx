'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

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
}

interface Page {
  id: string;
  name: string;
  access_token?: string;
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

  // Loading states
  loading: boolean;
  error: string | null;
  refreshData: (force?: boolean) => Promise<void>;
}

// Create context with proper initial value
const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

// Cache duration in milliseconds (10 minutes)
const CACHE_DURATION = 10 * 60 * 1000;

export function ConfigProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();

  // Rate Limit Circuit Breaker State
  const [isRateLimited, setIsRateLimited] = useState(false);

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

  const [adAccounts, setAdAccounts] = useState<AdAccount[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('adPilotCache');
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
        const cached = localStorage.getItem('adPilotCache');
        if (cached) {
          return JSON.parse(cached).pages || [];
        }
      } catch (e) { }
    }
    return [];
  });

  const [lastFetched, setLastFetched] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('adPilotCache');
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
  const saveToCache = (accounts: AdAccount[], p: Page[], timestamp: number) => {
    localStorage.setItem('adPilotCache', JSON.stringify({ accounts, pages: p, timestamp }));
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
  const fetchAdAccounts = async () => {
    if (isRateLimited) {
      console.warn("Request blocked by circuit breaker (Rate Limited)");
      if (adAccounts.length > 0) return adAccounts;
      throw new Error("System is cooling down from API rate limits. Please try again in 15 minutes.");
    }

    try {
      const res = await fetch('/api/facebook/ad-accounts');
      if (!res.ok) {
        if (adAccounts.length > 0) {
          try { await handleApiError(res); } catch (e) { console.warn(e); }
          return adAccounts;
        }
        await handleApiError(res);
      }
      const data = await res.json();
      const accounts = data.accounts || [];
      setAdAccounts(accounts);

      // Validate and fix selectedAccounts
      // Check if current selectedAccounts are still valid
      const validSelectedAccounts = selectedAccounts.filter(selected =>
        accounts.some((acc: AdAccount) => acc.id === selected.id)
      );

      // If no valid selections or selectedAccounts is empty, auto-select all
      if (validSelectedAccounts.length === 0 && accounts.length > 0) {
        console.log('Auto-selecting all ad accounts');
        setSelectedAccounts(accounts);
      } else if (validSelectedAccounts.length !== selectedAccounts.length) {
        // Some selections were invalid, update to only valid ones
        console.log('Updating to valid ad accounts only');
        setSelectedAccounts(validSelectedAccounts);
      }

      return accounts;
    } catch (error) {
      console.error("Error fetching ad accounts:", error);
      throw error;
    }
  };

  // Fetch pages
  const fetchPages = async () => {
    if (isRateLimited) {
      if (pages.length > 0) return pages;
      return [];
    }

    try {
      const res = await fetch('/api/facebook/pages');
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

      if (selectedPages.length === 0 && p.length > 0) {
        setSelectedPages(p);
      }
      return p;
    } catch (error) {
      console.error("Error fetching pages:", error);
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
      const [accounts, p] = await Promise.all([
        fetchAdAccounts(),
        fetchPages()
      ]);

      const newTime = Date.now();
      setLastFetched(newTime);

      if (accounts && p) {
        saveToCache(accounts, p, newTime);
      } else {
        saveToCache(adAccounts, pages, newTime);
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
    if ((session as any)?.accessToken) {
      refreshData(false);
    }
  }, [(session as any)?.accessToken]);

  const setSelectedAccounts = (accounts: AdAccount[]) => {
    setSelectedAccountsState(accounts);
    localStorage.setItem('selectedAdAccounts', JSON.stringify(accounts));
  };

  const setSelectedPages = (p: Page[]) => {
    setSelectedPagesState(p);
    localStorage.setItem('selectedPages', JSON.stringify(p));
  };

  const toggleAccount = (account: AdAccount) => {
    const isSelected = selectedAccounts.some(acc => acc.id === account.id);
    let newSelected: AdAccount[];

    if (isSelected) {
      newSelected = selectedAccounts.filter(acc => acc.id !== account.id);
    } else {
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
        loading,
        error,
        refreshData
      }}
    >
      {children}
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
