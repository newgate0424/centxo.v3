'use client';

import { ConfigForm } from '@/components/config-form';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SettingsAdAccountsPage() {
    const { t } = useLanguage();

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-foreground mb-2">{t('settings.adAccounts', 'Ad Accounts')}</h1>
                <p className="text-muted-foreground">{t('settings.adAccountsSubtitle', 'Manage your advertising accounts and pages')}</p>
            </div>

            <div className="glass-card p-6">
                <ConfigForm />
            </div>
        </div>
    );
}
