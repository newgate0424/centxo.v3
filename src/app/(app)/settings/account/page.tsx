'use client';

import { AccountSettings } from '@/components/settings/account-settings';
import { SettingsPageLayout } from '@/components/settings/settings-page-layout';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AccountSettingsPage() {
    const { t } = useLanguage();

    return (
        <SettingsPageLayout
            title={t('settings.accountSettings', 'Account Settings')}
            subtitle={t('settings.accountSubtitle', 'Manage your account information and preferences')}
        >
            <AccountSettings />
        </SettingsPageLayout>
    );
}
