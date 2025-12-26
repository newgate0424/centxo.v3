/**
 * GET/POST /api/ads/spending-limit
 * Manage spending limits for Ad Accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

// Input validation schema
const spendingLimitSchema = z.object({
    accountId: z.string().min(1, "Account ID is required"),
    action: z.enum(['change', 'reset', 'delete']),
    newLimit: z.string().optional(),
});

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const accessToken = (session as any).accessToken;
        if (!accessToken) {
            return NextResponse.json({ error: 'Facebook not connected' }, { status: 400 });
        }

        const body = await request.json();

        // Validate input
        const validationResult = spendingLimitSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json({
                error: 'Invalid input',
                details: validationResult.error.issues
            }, { status: 400 });
        }

        const { accountId, action, newLimit } = validationResult.data;

        // Ensure accountId has act_ prefix
        const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
        const apiUrl = `https://graph.facebook.com/v22.0/${formattedAccountId}`;

        let updateParams: Record<string, string> = { access_token: accessToken };

        switch (action) {
            case 'change':
                if (!newLimit || parseFloat(newLimit) <= 0) {
                    return NextResponse.json({ error: 'Invalid spending limit' }, { status: 400 });
                }
                // Facebook API: spend_cap is in account currency units (not cents)
                updateParams.spend_cap = newLimit.toString();
                break;

            case 'reset':
                // Reset means setting spend_cap_action to RESET
                // This resets the amount_spent counter back to 0, keeping the limit
                updateParams.spend_cap_action = 'reset';
                break;

            case 'delete':
                // To REMOVE the spending limit completely
                // A value of 0 means no spending-cap
                updateParams.spend_cap = '0';
                break;

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        // Update the ad account using Facebook Graph API
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(updateParams).toString()
        });

        const result = await response.json();

        if (result.error) {
            console.error('Facebook API Error:', result.error);
            return NextResponse.json({
                error: result.error.message || 'Facebook API error',
                code: result.error.code
            }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            message: `Spending limit ${action === 'change' ? 'updated' : action === 'reset' ? 'reset' : 'removed'} successfully`,
            data: result
        });

    } catch (error: any) {
        console.error('Error updating spending limit:', error);
        return NextResponse.json({ error: 'Failed to update spending limit' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const accessToken = (session as any).accessToken;
        if (!accessToken) {
            return NextResponse.json({ error: 'Facebook not connected' }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const accountId = searchParams.get('accountId');

        if (!accountId) {
            return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
        }

        // Ensure accountId has act_ prefix
        const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;

        // Fetch account data from Facebook Graph API
        const apiUrl = `https://graph.facebook.com/v22.0/${formattedAccountId}`;
        const params = new URLSearchParams({
            access_token: accessToken,
            fields: 'spend_cap,amount_spent,currency,name'
        });

        const response = await fetch(`${apiUrl}?${params.toString()}`);
        const accountData = await response.json();

        if (accountData.error) {
            return NextResponse.json({
                error: accountData.error.message || 'Facebook API error'
            }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            data: {
                id: accountId,
                name: accountData.name,
                spendCap: accountData.spend_cap ? parseFloat(accountData.spend_cap) / 100 : null,
                amountSpent: accountData.amount_spent ? parseFloat(accountData.amount_spent) / 100 : 0,
                currency: accountData.currency,
            }
        });

    } catch (error: any) {
        console.error('Error fetching spending limit:', error);
        return NextResponse.json({ error: 'Failed to fetch spending limit' }, { status: 500 });
    }
}
