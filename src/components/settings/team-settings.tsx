'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Crown, User as UserIcon, Trash2, Facebook } from 'lucide-react';
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

interface TeamMember {
    id: string;
    facebookUserId: string;
    facebookName: string;
    facebookEmail?: string;
    role: string;
    addedAt: string;
}

interface TeamData {
    host: {
        id: string;
        name: string;
        email: string;
        image?: string;
        role: string;
    };
    members: TeamMember[];
}

export function TeamSettings() {
    const { t } = useLanguage();
    const { data: session } = useSession();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [teamData, setTeamData] = useState<TeamData | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
    const [isRemoving, setIsRemoving] = useState(false);

    useEffect(() => {
        fetchTeamMembers();
    }, []);

    const fetchTeamMembers = async () => {
        try {
            const response = await fetch('/api/team/members');
            if (response.ok) {
                const data = await response.json();
                setTeamData(data);
            }
        } catch (error) {
            console.error('Error fetching team members:', error);
            toast({
                title: "Error",
                description: "Failed to load team members",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAddMember = async () => {
        setIsAdding(true);
        try {
            const response = await fetch('/api/team/add-member');
            if (response.ok) {
                const data = await response.json();
                // Redirect to Facebook OAuth
                window.location.href = data.authUrl;
            } else {
                throw new Error('Failed to initiate OAuth');
            }
        } catch (error) {
            console.error('Error adding member:', error);
            toast({
                title: "Error",
                description: "Failed to add team member",
                variant: "destructive",
            });
            setIsAdding(false);
        }
    };

    const handleRemoveMember = async () => {
        if (!memberToRemove) return;

        setIsRemoving(true);
        try {
            const response = await fetch(`/api/team/remove-member/${memberToRemove.id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                toast({
                    title: "Success",
                    description: "Team member removed successfully",
                });
                // Refresh team members
                await fetchTeamMembers();
            } else {
                throw new Error('Failed to remove member');
            }
        } catch (error) {
            console.error('Error removing member:', error);
            toast({
                title: "Error",
                description: "Failed to remove team member",
                variant: "destructive",
            });
        } finally {
            setIsRemoving(false);
            setMemberToRemove(null);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 max-w-4xl">
                <div className="flex items-center justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header - Removed as requested */}

            {/* Team Host */}
            <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    {t('settings.team.owner', 'Team Owner (Google Account)')}
                </h3>
                <Card className="p-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center overflow-hidden">
                            {teamData?.host.image ? (
                                <img src={teamData.host.image} alt={teamData.host.name || 'Host'} className="w-full h-full object-cover" />
                            ) : (
                                <svg className="w-8 h-8" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                            )}
                        </div>
                        <div className="flex-1">
                            <h4 className="font-semibold text-base">{teamData?.host.name}</h4>
                            <p className="text-sm text-muted-foreground">{teamData?.host.email}</p>
                        </div>
                        <div className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                            {t('settings.team.ownerBadge', 'Owner')}
                        </div>
                    </div>
                </Card>
            </div>

            {/* Team Members */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <UserIcon className="h-5 w-5" />
                        {t('settings.team.members', 'Facebook Accounts')} ({teamData?.members.length || 0})
                    </h3>
                    <Button
                        onClick={handleAddMember}
                        disabled={isAdding}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {isAdding ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Connecting...
                            </>
                        ) : (
                            <>
                                <Facebook className="h-4 w-4 mr-2" />
                                {t('settings.team.add', 'Add Facebook Account')}
                            </>
                        )}
                    </Button>
                </div>

                {teamData?.members.length === 0 ? (
                    <Card className="p-8">
                        <div className="text-center text-muted-foreground">
                            <Facebook className="h-12 w-12 mx-auto mb-3 opacity-50 text-blue-600" />
                            <p>{t('settings.team.noAccounts', 'No Facebook accounts added yet')}</p>
                            <p className="text-sm mt-1">{t('settings.team.noAccountsDesc', 'Add Facebook accounts to manage multiple ad accounts')}</p>
                        </div>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {teamData?.members.map((member) => (
                            <Card key={member.id} className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white">
                                            <Facebook className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-base">{member.facebookName}</h4>
                                            {member.facebookEmail && (
                                                <p className="text-sm text-muted-foreground">{member.facebookEmail}</p>
                                            )}
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {t('settings.team.added', 'Added: ')} {new Date(member.addedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/5"
                                        onClick={() => setMemberToRemove(member)}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        {t('settings.team.remove', 'Remove')}
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Remove Member Confirmation Dialog */}
            <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('settings.team.removeConfirmTitle', 'Remove team member?')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('settings.team.removeConfirmDesc', 'Are you sure you want to remove {name} from your team? This will revoke access to their Facebook account data.').replace('{name}', memberToRemove?.facebookName || '')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isRemoving}>{t('launch.cancel', 'Cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRemoveMember}
                            disabled={isRemoving}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {isRemoving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Removing...
                                </>
                            ) : (
                                t('settings.team.remove', 'Remove')
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
