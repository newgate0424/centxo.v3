'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

type Theme = 'light' | 'dark' | 'system';

export function AppearanceSettings() {
    const { t } = useLanguage();
    const [theme, setTheme] = useState<Theme>('system');
    const [compactMode, setCompactMode] = useState(false);

    const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
        { value: 'light', label: 'Light', icon: <Sun className="h-4 w-4" /> },
        { value: 'dark', label: 'Dark', icon: <Moon className="h-4 w-4" /> },
        { value: 'system', label: 'System', icon: <Monitor className="h-4 w-4" /> },
    ];

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-foreground mb-1">
                    {t('settings.appearance', 'Appearance')}
                </h2>
                <p className="text-sm text-muted-foreground">
                    Customize the appearance of the application
                </p>
            </div>

            {/* Theme Selection */}
            <div className="space-y-4">
                <div>
                    <Label className="text-base font-medium">Theme</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                        Select your preferred theme
                    </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    {themes.map((themeOption) => (
                        <button
                            key={themeOption.value}
                            onClick={() => setTheme(themeOption.value)}
                            className={cn(
                                'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                                theme === themeOption.value
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/50'
                            )}
                        >
                            {themeOption.icon}
                            <span className="text-sm font-medium">{themeOption.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <Separator />

            {/* Compact Mode */}
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <Label htmlFor="compact-mode" className="text-base font-medium">
                        Compact Mode
                    </Label>
                    <p className="text-sm text-muted-foreground">
                        Reduce spacing and padding for a more compact interface
                    </p>
                </div>
                <Switch
                    id="compact-mode"
                    checked={compactMode}
                    onCheckedChange={setCompactMode}
                />
            </div>

            <Separator />

            {/* Save Button */}
            <div className="pt-4">
                <Button>
                    Save Preferences
                </Button>
            </div>
        </div>
    );
}
