'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Shield, Key } from 'lucide-react';

export function SecuritySettings() {
    const { t } = useLanguage();
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: '',
    });

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-foreground mb-1">
                    {t('settings.security', 'Security')}
                </h2>
                <p className="text-sm text-muted-foreground">
                    Manage your password and security settings
                </p>
            </div>

            {/* Change Password Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Key className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Change Password</h3>
                </div>

                <div className="space-y-4 pl-7">
                    <div className="space-y-2">
                        <Label htmlFor="current-password">Current Password</Label>
                        <Input
                            id="current-password"
                            type="password"
                            value={passwords.current}
                            onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                            className="max-w-md"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                            id="new-password"
                            type="password"
                            value={passwords.new}
                            onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                            className="max-w-md"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <Input
                            id="confirm-password"
                            type="password"
                            value={passwords.confirm}
                            onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                            className="max-w-md"
                        />
                    </div>

                    <Button className="mt-4">
                        Update Password
                    </Button>
                </div>
            </div>

            <Separator />

            {/* Two-Factor Authentication */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Two-Factor Authentication</h3>
                </div>

                <div className="pl-7">
                    <p className="text-sm text-muted-foreground mb-4">
                        Add an extra layer of security to your account by enabling two-factor authentication.
                    </p>
                    <Button variant="outline">
                        Enable 2FA
                    </Button>
                </div>
            </div>

            <Separator />

            {/* Active Sessions */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Active Sessions</h3>
                <div className="pl-7">
                    <p className="text-sm text-muted-foreground mb-4">
                        Manage and log out your active sessions on other browsers and devices.
                    </p>
                    <Button variant="outline" className="text-destructive hover:text-destructive">
                        Log Out Other Sessions
                    </Button>
                </div>
            </div>
        </div>
    );
}
