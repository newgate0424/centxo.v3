'use client';

import { AppearanceSettings } from '@/components/settings/appearance-settings';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AppearanceSettingsPage() {
    const { t } = useLanguage();

    return (
        <div className="flex flex-col h-full">
            {/* Content Box - Centered */}
            <div className="flex-1 w-full max-w-5xl mx-auto p-6 md:p-10">
                <div className="border border-border rounded-xl bg-card shadow-sm overflow-hidden">
                    <div className="h-full overflow-y-auto px-6 md:px-8 lg:px-10 py-6 md:py-8">
                        <div className="space-y-0.5 mb-6">
                            <h2 className="text-xl md:text-2xl font-bold tracking-tight">{t('settings.appearance', 'Appearance')}</h2>
                            <p className="text-sm md:text-base text-muted-foreground">
                                {t('settings.appearanceDesc', 'Customize the look and feel of your application.')}
                            </p>
                        </div>
                        <div className="my-6 h-[1px] bg-border" />
                        <AppearanceSettings />
                    </div>
                </div>
            </div>
        </div>
    );
}
