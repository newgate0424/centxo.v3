'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Separator } from '@/components/ui/separator';

interface SettingsPageLayoutProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}

export function SettingsPageLayout({ title, subtitle, children }: SettingsPageLayoutProps) {
    return (
        <div className="h-full p-6 md:p-10 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="space-y-0.5">
                <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
                {subtitle && (
                    <p className="text-muted-foreground">
                        {subtitle}
                    </p>
                )}
            </div>
            <Separator className="my-6" />
            <div className="flex-1 lg:max-w-3xl">
                {children}
            </div>
        </div>
    );
}
