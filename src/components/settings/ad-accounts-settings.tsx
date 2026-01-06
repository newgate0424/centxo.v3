'use client';

import { ConfigForm } from '@/components/config-form';
import { useLanguage } from '@/contexts/LanguageContext';
import { useConfig } from '@/contexts/AdAccountContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Facebook, Loader2 } from 'lucide-react';

export function AdAccountsSettings() {
    const { t } = useLanguage();
    const { adAccounts, pages, loading } = useConfig();

    // Check if Meta is connected by checking if we have any data
    const isMetaConnected = adAccounts.length > 0 || pages.length > 0;

    const handleConnect = () => {
        // Redirect to Meta OAuth
        window.location.href = '/api/auth/signin/facebook?callbackUrl=/settings?section=ad-accounts';
    };

    if (loading) {
        return (
            <div className="space-y-6 max-w-4xl">
                <div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">
                        {t('settings.adAccounts', 'Ad Accounts')}
                    </h2>
                    <p className="text-muted-foreground">
                        {t('settings.adAccountsSubtitle', 'Manage your advertising accounts and pages')}
                    </p>
                </div>
                <div className="flex items-center justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    if (!isMetaConnected) {
        return (
            <div className="space-y-6 max-w-4xl">
                <div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">
                        {t('settings.adAccounts', 'Ad Accounts')}
                    </h2>
                    <p className="text-muted-foreground">
                        {t('settings.adAccountsSubtitle', 'Manage your advertising accounts and pages')}
                    </p>
                </div>

                <Card className="p-12">
                    <div className="flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                            <Facebook className="h-8 w-8 text-blue-600" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold">Connect Meta Business Account</h3>
                            <p className="text-muted-foreground max-w-md">
                                Connect your Meta Business account to manage ad accounts and pages
                            </p>
                        </div>
                        <Button
                            size="lg"
                            className="bg-blue-600 hover:bg-blue-700 text-white mt-4"
                            onClick={handleConnect}
                        >
                            <Facebook className="h-5 w-5 mr-2" />
                            Connect Meta Business
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl">
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
