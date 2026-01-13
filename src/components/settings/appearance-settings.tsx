'use client';

import { useState } from 'react';
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
    const { colors, setPrimaryColor, setBackgroundColor, resetColors } = useThemeColor();
    const [compactMode, setCompactMode] = useState(false);

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

    const backgroundColors = [
        { name: 'Slate', value: '#f8fafc', darkValue: '#0f172a' },
        { name: 'Gray', value: '#f9fafb', darkValue: '#111827' },
        { name: 'Zinc', value: '#fafafa', darkValue: '#18181b' },
        { name: 'Neutral', value: '#f5f5f5', darkValue: '#171717' },
        { name: 'Stone', value: '#fafaf9', darkValue: '#1c1917' },
    ];

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Header */}
            {/* Header removed - moved to layout */}

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

            {/* Background Color Selection */}
            <div className="space-y-4">
                <div>
                    <Label className="text-base font-medium">Background Color</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                        Customize the background color ({theme === 'dark' ? 'Dark' : 'Light'} Mode)
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    {backgroundColors.map((bg) => {
                        const value = theme === 'dark' ? bg.darkValue : bg.value;
                        return (
                            <button
                                key={bg.name}
                                onClick={() => setBackgroundColor(value)}
                                className={cn(
                                    "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all",
                                    colors.background === value ? "border-primary" : "border-gray-200 dark:border-gray-700 hover:scale-110"
                                )}
                                style={{ backgroundColor: value }}
                                title={bg.name}
                            >
                                {colors.background === value && <Check className={cn("h-4 w-4", theme === 'dark' ? "text-white" : "text-black")} />}
                            </button>
                        );
                    })}
                    <Popover>
                        <PopoverTrigger asChild>
                            <button
                                className={cn(
                                    "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all bg-gradient-to-br from-gray-100 to-gray-400 dark:from-gray-800 dark:to-black",
                                    !backgroundColors.find(c => (theme === 'dark' ? c.darkValue : c.value) === colors.background) ? "border-primary" : "border-transparent hover:scale-110"
                                )}
                            >
                                {!backgroundColors.find(c => (theme === 'dark' ? c.darkValue : c.value) === colors.background) && <Check className="h-4 w-4 text-primary" />}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-3">
                            <div className="space-y-2">
                                <h4 className="font-medium leading-none">Custom Background</h4>
                                <input
                                    type="color"
                                    value={colors.background}
                                    onChange={(e) => setBackgroundColor(e.target.value)}
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

            {/* Save/Reset Buttons */}
            <div className="pt-4 flex gap-4">
                <Button onClick={resetColors} variant="outline" className="w-full sm:w-auto">
                    Reset Defaults
                </Button>
                {/* Save is instant now, but we'll keep the button visually or remove it if not needed. 
                    The plan had a save button. We can keep it or remove it since it's instant.
                    Let's change it to just "Reset" since changes are applied instantly.
                */}
            </div>
        </div>
    );
}

