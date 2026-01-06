'use client';

import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from 'lucide-react';

export function DeleteAccountSettings() {
    const { t } = useLanguage();
    const { data: session } = useSession();
    const { toast } = useToast();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        try {
            const response = await fetch('/api/user/delete', {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete account');
            }

            toast({
                title: "Account Deleted",
                description: "Your account has been permanently deleted.",
            });

            // Sign out and redirect to home
            await signOut({ callbackUrl: '/' });
        } catch (error) {
            console.error('Error deleting account:', error);
            toast({
                title: "Error",
                description: "Failed to delete account. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
            setShowDeleteDialog(false);
        }
    };

    const canDelete = confirmText === 'DELETE';

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-destructive mb-1">
                    {t('settings.deleteAccount', 'Delete Account')}
                </h2>
                <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all associated data
                </p>
            </div>

            {/* Warning Section */}
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-6">
                <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div className="space-y-3">
                        <h3 className="font-semibold text-destructive">
                            Warning: This action cannot be undone
                        </h3>
                        <p className="text-sm text-foreground">
                            Deleting your account will permanently remove:
                        </p>
                        <ul className="list-disc list-inside text-sm text-foreground space-y-1 ml-2">
                            <li>All campaigns and ad sets</li>
                            <li>Analytics and insights data</li>
                            <li>Personal information and preferences</li>
                            <li>Connected accounts and integrations</li>
                            <li>Billing history and subscription</li>
                        </ul>
                        <p className="text-sm text-foreground font-medium mt-4">
                            This action is irreversible. Please be certain before proceeding.
                        </p>
                    </div>
                </div>
            </div>

            {/* Delete Button */}
            <div className="pt-4">
                <Button
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                    className="bg-destructive hover:bg-destructive/90"
                >
                    Delete My Account
                </Button>
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-destructive">
                            Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-4">
                            <p>
                                This action cannot be undone. This will permanently delete your account
                                and remove all your data from our servers.
                            </p>
                            <div className="space-y-2">
                                <Label htmlFor="confirm-delete" className="text-foreground">
                                    Type <span className="font-mono font-bold">DELETE</span> to confirm:
                                </Label>
                                <Input
                                    id="confirm-delete"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    placeholder="DELETE"
                                    className="font-mono"
                                />
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteAccount}
                            disabled={!canDelete || isDeleting}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {isDeleting ? 'Deleting...' : 'Yes, delete my account'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
