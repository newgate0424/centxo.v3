'use client';

import { ConfigForm } from '@/components/config-form';
import { useLanguage } from '@/contexts/LanguageContext';

export function AdAccountsSettings() {
    const { t } = useLanguage();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                    {t('settings.adAccounts', 'Ad Accounts')}
                </h2>
                <p className="text-muted-foreground">
                    {t('settings.adAccountsSubtitle', 'Manage your advertising accounts and pages')}
                </p>
            </div>

            <div className="glass-card p-6">
                <ConfigForm />
            </div>
        </div>
    );
}
