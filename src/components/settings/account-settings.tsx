'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Trash2, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

export function AccountSettings() {
    const { t } = useLanguage();
    const { data: session, update } = useSession();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        displayName: '',
        email: '',
        role: '',
    });
    const [profileImage, setProfileImage] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showRemoveDialog, setShowRemoveDialog] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (session?.user) {
            setFormData({
                displayName: session.user.name || '',
                email: session.user.email || '',
                role: 'Host (Owner)',
            });
            setProfileImage(session.user.image || '');
        }
    }, [session]);

    const getInitials = (name: string) => {
        if (!name) return '??';
        const names = name.split(' ');
        if (names.length > 1) {
            return names[0][0] + names[names.length - 1][0];
        }
        return name.substring(0, 2);
    };

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            toast({
                title: "Invalid file type",
                description: "Please upload a JPEG, PNG, GIF, or WebP image.",
                variant: "destructive",
            });
            return;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast({
                title: "File too large",
                description: "Please upload an image smaller than 5MB.",
                variant: "destructive",
            });
            return;
        }

        setIsUploading(true);

        try {
            // Create FormData for upload
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/user/upload-avatar', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to upload image');
            }

            const data = await response.json();
            setProfileImage(data.imageUrl);

            // Update session
            await update({
                ...session,
                user: {
                    ...session?.user,
                    image: data.imageUrl,
                },
            });

            toast({
                title: "Success",
                description: "Profile photo updated successfully.",
            });
        } catch (error) {
            console.error('Error uploading photo:', error);
            toast({
                title: "Error",
                description: "Failed to upload photo. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemovePhoto = async () => {
        setIsUploading(true);
        try {
            const response = await fetch('/api/user/remove-avatar', {
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error('Failed to remove image');
            }

            setProfileImage('');

            // Update session
            await update({
                ...session,
                user: {
                    ...session?.user,
                    image: null,
                },
            });

            toast({
                title: "Success",
                description: "Profile photo removed successfully.",
            });
        } catch (error) {
            console.error('Error removing photo:', error);
            toast({
                title: "Error",
                description: "Failed to remove photo. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
            setShowRemoveDialog(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await fetch('/api/user/update', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: formData.displayName,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update profile');
            }

            // Update session
            await update({
                ...session,
                user: {
                    ...session?.user,
                    name: formData.displayName,
                },
            });

            setHasChanges(false);

            toast({
                title: "Success",
                description: "Profile updated successfully.",
            });
        } catch (error) {
            console.error('Error updating profile:', error);
            toast({
                title: "Error",
                description: "Failed to update profile. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleNameChange = (value: string) => {
        setFormData({ ...formData, displayName: value });
        setHasChanges(value !== session?.user?.name);
    };

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-foreground mb-1">
                    {t('settings.accountSettings', 'Account Settings')}
                </h2>
                <p className="text-sm text-muted-foreground">
                    {t('settings.accountSubtitle', 'Manage your account information and preferences')}
                </p>
            </div>

            {/* Profile Photo Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-6">
                    <div className="relative">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={profileImage} alt={formData.displayName} />
                            <AvatarFallback className="text-lg bg-orange-100 text-orange-700">
                                {getInitials(formData.displayName)}
                            </AvatarFallback>
                        </Avatar>
                        {isUploading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                                <Loader2 className="h-6 w-6 text-white animate-spin" />
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-xl font-semibold">
                            {formData.displayName || 'User'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {formData.email}
                        </div>
                        <div className="flex gap-2 mt-1">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                onChange={handlePhotoChange}
                                className="hidden"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                            >
                                <Camera className="h-4 w-4" />
                                {t('settings.profile.changePhoto', 'Change Photo')}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 text-destructive hover:text-destructive"
                                onClick={() => setShowRemoveDialog(true)}
                                disabled={isUploading || !profileImage}
                            >
                                <Trash2 className="h-4 w-4" />
                                {t('settings.profile.removePhoto', 'Remove Photo')}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('settings.profile.supports', 'Supports JPEG, PNG, GIF, WebP (Max 5MB)')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
                {/* Display Name */}
                <div className="space-y-2">
                    <Label htmlFor="displayName" className="text-sm font-medium">
                        {t('settings.profile.displayName', 'Display Name')}
                    </Label>
                    <Input
                        id="displayName"
                        value={formData.displayName}
                        onChange={(e) => handleNameChange(e.target.value)}
                        className="max-w-md"
                    />
                    <p className="text-xs text-muted-foreground">
                        {t('settings.profile.displayNameNote', 'This name will be displayed in the system and emails sent to you')}
                    </p>
                </div>

                {/* Email */}
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                        {t('settings.profile.email', 'Email')}
                    </Label>
                    <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        disabled
                        className="max-w-md bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                        {t('settings.profile.emailNote', 'Email cannot be changed')}
                    </p>
                </div>

                {/* Role */}
                <div className="space-y-2">
                    <Label htmlFor="role" className="text-sm font-medium">
                        {t('settings.profile.role', 'Role')}
                    </Label>
                    <Input
                        id="role"
                        value={formData.role}
                        disabled
                        className="max-w-md bg-muted"
                    />
                </div>


            </div>

            {/* Save Button */}
            <div className="pt-4">
                <Button
                    className="bg-cyan-500 hover:bg-cyan-600 text-white"
                    onClick={handleSave}
                    disabled={!hasChanges || isSaving}
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        t('settings.saveChanges', 'Save Changes')
                    )}
                </Button>
            </div>

            {/* Remove Photo Confirmation Dialog */}
            <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove profile photo?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove your profile photo? Your initials will be displayed instead.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRemovePhoto}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
