'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Lock, KeyRound, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from "@/contexts/LanguageContext"

export function PasswordSetupForm() {
    const { t } = useLanguage()
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasPassword, setHasPassword] = useState(false);

    // Form state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        checkPasswordStatus();
    }, []);

    const checkPasswordStatus = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/settings/password');
            const data = await res.json();

            if (res.ok) {
                setHasPassword(data.hasPassword);
            }
        } catch (error) {
            console.error('Error checking password status:', error);
            toast.error(t.settings.security.password.validation.loadError);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword.length < 6) {
            toast.error(t.settings.security.password.validation.min6);
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error(t.settings.security.password.validation.mismatch);
            return;
        }

        if (hasPassword && !currentPassword) {
            toast.error(t.settings.security.password.validation.currentRequired);
            return;
        }

        try {
            setSaving(true);
            const res = await fetch('/api/settings/password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: hasPassword ? currentPassword : undefined,
                    newPassword
                })
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(t.settings.security.password.validation.success);
                setHasPassword(true);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                toast.error(data.error || t.settings.security.password.validation.error);
            }
        } catch (error) {
            toast.error(t.settings.security.password.validation.error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-center h-20">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Lock className="h-4 w-4" />
                    {hasPassword ? t.settings.security.password.change : t.settings.security.password.set}
                </CardTitle>
                <CardDescription>
                    {hasPassword
                        ? t.settings.security.password.changeDesc
                        : t.settings.security.password.setDesc}
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    {hasPassword && (
                        <div className="space-y-2">
                            <Label htmlFor="current-password">{t.settings.security.password.current}</Label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="current-password"
                                    type="password"
                                    placeholder={t.settings.security.password.placeholders.current}
                                    className="pl-9"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    required={hasPassword}
                                />
                            </div>
                        </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="new-password">{t.settings.security.password.new}</Label>
                            <Input
                                id="new-password"
                                type="password"
                                placeholder={t.settings.security.password.placeholders.new}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                minLength={6}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">{t.settings.security.password.confirm}</Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                placeholder={t.settings.security.password.placeholders.confirm}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                minLength={6}
                                required
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="bg-muted/50 px-6 py-4 flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">
                        {hasPassword
                            ? t.settings.security.password.secureHint
                            : t.settings.security.password.googleNote}
                    </p>
                    <Button type="submit" disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {hasPassword ? t.settings.security.password.save : t.settings.security.password.set}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
