'use client';

import { useSession } from 'next-auth/react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { TeamSettings } from './team-settings';

export function ConnectionsSettings() {
    const { t } = useLanguage();
    const { data: session } = useSession();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (session?.user) {
            setLoading(false);
        }
    }, [session]);

    if (loading) {
        return (
            <div className="space-y-6 max-w-4xl">
                <div>
                    <h2 className="text-2xl font-bold text-foreground mb-1">
                        {t('settings.team', 'Team')}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {t('settings.teamSubtitle', "Manage your team's Facebook accounts")}
                    </p>
                </div>
                <div className="flex items-center justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-foreground mb-1">
                    {t('settings.team', 'Team')}
                </h2>
                <p className="text-sm text-muted-foreground">
                    {t('settings.teamSubtitle', "Manage your team's Facebook accounts")}
                </p>
            </div>

            {/* Team Settings */}
            <TeamSettings />
        </div>
    );
}
