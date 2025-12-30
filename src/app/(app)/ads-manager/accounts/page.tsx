'use client';

import { useSession } from 'next-auth/react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AccountsTab } from "@/components/campaigns/AccountsTab";
import { useState } from 'react';

export default function AdsManagerAccountsPage() {
    const { data: session } = useSession();
    const { t } = useLanguage();
    // We need a refresh trigger state as required by AccountsTab
    const [accountsRefreshTrigger, setAccountsRefreshTrigger] = useState(0);
    const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());

    return (
        <div className="p-4 md:p-6 lg:p-8 h-[calc(100vh-4rem)] flex flex-col">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">{t('adsManager.accounts', 'Ad Accounts')}</h1>
                    <p className="text-muted-foreground">{t('adsManager.accountsSubtitle', 'Manage your connected ad accounts')}</p>
                </div>
            </div>

            <div className="flex-1 overflow-hidden bg-background/50 backdrop-blur-sm">
                <AccountsTab
                    refreshTrigger={accountsRefreshTrigger}
                    selectedIds={selectedAccountIds}
                    onSelectionChange={setSelectedAccountIds}
                />
            </div>
        </div>
    );
}
