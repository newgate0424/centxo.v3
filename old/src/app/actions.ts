'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAdAccounts } from '@/lib/facebook';

// ===== Token Management =====

export async function saveFacebookToken(shortLivedToken: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error("Not authenticated");
    }

    const userId = (session.user as any).id;

    // Exchange short-lived token for long-lived token
    let longLivedToken = shortLivedToken;
    let facebookName: string | null = null;
    
    try {
        const exchangeUrl = `https://graph.facebook.com/v21.0/oauth/access_token?` +
            `grant_type=fb_exchange_token&` +
            `client_id=${process.env.NEXT_PUBLIC_FACEBOOK_APP_ID}&` +
            `client_secret=${process.env.FACEBOOK_APP_SECRET}&` +
            `fb_exchange_token=${shortLivedToken}`;

        const response = await fetch(exchangeUrl);
        const data = await response.json();

        if (data.access_token) {
            longLivedToken = data.access_token;
            console.log('[Token Exchange] Got long-lived token, expires in:', data.expires_in, 'seconds');
        }
    } catch (err) {
        console.error('[Token Exchange] Error:', err);
    }
    
    // Get Facebook user name from /me endpoint
    try {
        const meResponse = await fetch(`https://graph.facebook.com/v21.0/me?fields=name&access_token=${longLivedToken}`);
        const meData = await meResponse.json();
        if (meData.name) {
            facebookName = meData.name;
            console.log('[Token Exchange] Got Facebook name:', facebookName);
        }
    } catch (err) {
        console.error('[Token Exchange] Error getting Facebook name:', err);
    }

    // Save token and Facebook name to user
    await prisma.user.update({
        where: { id: userId },
        data: { 
            facebookAdToken: longLivedToken,
            facebookName: facebookName
        }
    });

    return { success: true };
}

// ===== Ad Manager Functions =====

export async function fetchAdAccounts(accessToken: string) {
    try {
        const accounts = await getAdAccounts(accessToken);
        return JSON.parse(JSON.stringify(accounts));
    } catch (error: any) {
        console.error('Failed to fetch ad accounts:', error);
        throw new Error(error.message || 'Failed to fetch ad accounts');
    }
}

// ===== Helper: Get User's Facebook Token =====

async function getUserFacebookToken(userId: string): Promise<string | null> {
    // Get user's own token only (no sharing)
    const user = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { facebookAdToken: true }
    });

    // If user has their own token, use it
    if (user?.facebookAdToken) {
        return user.facebookAdToken;
    }
    
    // Try OAuth token from Account table
    const account = await prisma.account.findFirst({
        where: { userId, provider: "facebook" },
        select: { access_token: true }
    });
    
    if (account?.access_token) {
        return account.access_token;
    }
    
    return null;
}
