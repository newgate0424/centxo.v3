'use client';

import { ConnectionsSettings } from '@/components/settings/connections-settings';
import { SettingsPageLayout } from '@/components/settings/settings-page-layout';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ConnectionsSettingsPage() {
    const { t } = useLanguage();

    return (
        <SettingsPageLayout
            title={t('settings.connections', 'Connections')}
            subtitle={t('settings.connectionsSubtitle', 'Manage your connected accounts and integrations')}
        >
            <ConnectionsSettings />
        </SettingsPageLayout>
    );
}
