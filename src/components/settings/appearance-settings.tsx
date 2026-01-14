'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useThemeColor } from '@/contexts/ThemeColorContext';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Monitor, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type Theme = 'light' | 'dark' | 'system';

export function AppearanceSettings() {
    const { t } = useLanguage();
    const { theme, setTheme } = useTheme();
    const { colors, setPrimaryColor, resetColors } = useThemeColor();
    const [compactMode, setCompactMode] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return null
    }

    const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
        { value: 'light', label: t('settings.appearance.theme.light', 'Light'), icon: <Sun className="h-4 w-4" /> },
        { value: 'dark', label: t('settings.appearance.theme.dark', 'Dark'), icon: <Moon className="h-4 w-4" /> },
        { value: 'system', label: t('settings.appearance.theme.system', 'System'), icon: <Monitor className="h-4 w-4" /> },
    ];

    const primaryColors = [
        { name: 'Blue', value: '#3b82f6' },
        { name: 'Purple', value: '#a855f7' },
        { name: 'Green', value: '#22c55e' },
        { name: 'Orange', value: '#f97316' },
        { name: 'Red', value: '#ef4444' },
        { name: 'Pink', value: '#ec4899' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            {/* Header removed - moved to layout */}

            {/* Main Container */}
            <div className="p-6 md:p-8 border border-border/60 rounded-2xl bg-card/40 shadow-sm space-y-6">
                {/* Theme Selection */}
                <div className="space-y-4">
                    <div>
                        <Label className="text-base font-medium">{t('settings.appearance.theme', 'Theme')}</Label>
                        <p className="text-sm text-muted-foreground mb-3">
                            {t('settings.appearance.themeDesc', 'Select your preferred theme')}
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

                {/* Primary Color Selection */}
                <div className="space-y-4">
                    <div>
                        <Label className="text-base font-medium">Main Theme Color</Label>
                        <p className="text-sm text-muted-foreground mb-3">
                            Select your primary theme color
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {primaryColors.map((color) => (
                            <button
                                key={color.value}
                                onClick={() => setPrimaryColor(color.value)}
                                className={cn(
                                    "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all",
                                    colors.primary === color.value ? "border-primary" : "border-transparent hover:scale-110"
                                )}
                                style={{ backgroundColor: color.value }}
                            >
                                {colors.primary === color.value && <Check className="h-4 w-4 text-white" />}
                            </button>
                        ))}

                        <Popover>
                            <PopoverTrigger asChild>
                                <button
                                    className={cn(
                                        "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500",
                                        !primaryColors.find(c => c.value === colors.primary) ? "border-primary" : "border-transparent hover:scale-110"
                                    )}
                                >
                                    {!primaryColors.find(c => c.value === colors.primary) && <Check className="h-4 w-4 text-white" />}
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-3">
                                <div className="space-y-2">
                                    <h4 className="font-medium leading-none">Custom Color</h4>
                                    <input
                                        type="color"
                                        value={colors.primary}
                                        onChange={(e) => setPrimaryColor(e.target.value)}
                                        className="h-10 w-full cursor-pointer"
                                    />
                                </div>
                            </PopoverContent>
                        </Popover>

                    </div>
                </div>



                <Separator />

                {/* Compact Mode */}
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label htmlFor="compact-mode" className="text-base font-medium">
                            {t('settings.appearance.compact', 'Compact Mode')}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            {t('settings.appearance.compactDesc', 'Reduce spacing and padding for a more compact interface')}
                        </p>
                    </div>
                    <Switch
                        id="compact-mode"
                        checked={compactMode}
                        onCheckedChange={setCompactMode}
                    />
                </div>

                <Separator />

                {/* Language Selection */}
                <div className="space-y-4">
                    <div>
                        <Label className="text-base font-medium">{t('settings.language', 'Language')}</Label>
                        <p className="text-sm text-muted-foreground mb-3">
                            {t('settings.languageDesc', 'Select your preferred language')}
                        </p>
                    </div>

                    <LanguageSelector />
                </div>

                <Separator />

                {/* Save/Reset Buttons */}
                <div className="pt-4 flex gap-4">
                    <Button onClick={resetColors} variant="outline" className="w-full sm:w-auto">
                        Reset Defaults
                    </Button>
                </div>
            </div>
        </div>
    );
}

function LanguageSelector() {
    const { language, setLanguage, t } = useLanguage();

    const languages = [
        { code: 'en', name: 'English', flag: '🇺🇸' },
        { code: 'th', name: 'ไทย', flag: '🇹🇭' },
    ];

    return (
        <div className="grid grid-cols-2 gap-3">
            {languages.map((lang) => (
                <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code as 'en' | 'th')}
                    className={cn(
                        'flex items-center gap-3 p-4 rounded-lg border-2 transition-all',
                        language === lang.code
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                    )}
                >
                    <span className="text-2xl">{lang.flag}</span>
                    <span className="text-sm font-medium">{lang.name}</span>
                    {language === lang.code && <Check className="h-4 w-4 ml-auto text-primary" />}
                </button>
            ))}
        </div>
    );
}
