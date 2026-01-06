'use client';

import { useSession } from 'next-auth/react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AccountsTab } from "@/components/campaigns/AccountsTab";
import { useState, useEffect } from 'react';
import { Search, RefreshCw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NoFacebookAccountsPrompt } from '@/components/NoFacebookAccountsPrompt';

export default function AdsManagerAccountsPage() {
    const { data: session } = useSession();
    const { t } = useLanguage();
    const [accountsRefreshTrigger, setAccountsRefreshTrigger] = useState(0);
    const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [hasTeamMembers, setHasTeamMembers] = useState<boolean | null>(null);

    // Check if user has team members
    useEffect(() => {
        const checkTeamMembers = async () => {
            try {
                const response = await fetch('/api/team/members');
                if (response.ok) {
                    const data = await response.json();
                    setHasTeamMembers(data.members && data.members.length > 0);
                }
            } catch (error) {
                console.error('Error checking team members:', error);
                setHasTeamMembers(false);
            }
        };

        if (session?.user) {
            checkTeamMembers();
        }
    }, [session]);

    const handleRefresh = () => {
        setLoading(true);
        setAccountsRefreshTrigger(prev => prev + 1);
        setTimeout(() => setLoading(false), 1000);
    };

    // Show loading state while checking
    if (hasTeamMembers === null) {
        return (
            <div className="h-full p-4 md:p-6 lg:p-8 flex items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    // Show prompt if no team members
    if (!hasTeamMembers) {
        return (
            <div className="h-full p-4 md:p-6 lg:p-8">
                <NoFacebookAccountsPrompt />
            </div>
        );
    }

    return (
        <div className="h-full p-4 md:p-6 lg:p-8 flex flex-col overflow-hidden">
            <div className="w-full flex flex-col h-full">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between flex-shrink-0">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('adsManager.accounts', 'Ad Accounts')}</h1>
                        <p className="text-gray-600 dark:text-gray-400">{t('adsManager.accountsSubtitle', 'Manage your connected ad accounts')}</p>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="mb-4 flex flex-col sm:flex-row gap-3 flex-shrink-0">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('accounts.search', 'Search accounts...')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                        />
                    </div>

                    {/* Refresh Button */}
                    <Button
                        onClick={handleRefresh}
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
                            console.log('Export data');
                        }}
                    >
                        <Download className="h-4 w-4" />
                        {t('campaigns.export', 'Export')}
                    </Button>
                </div>

                {/* Table Content */}
                <AccountsTab
                    refreshTrigger={accountsRefreshTrigger}
                    selectedIds={selectedAccountIds}
                    onSelectionChange={setSelectedAccountIds}
                    searchQuery={searchQuery}
                />
            </div>
        </div>
    );
}
