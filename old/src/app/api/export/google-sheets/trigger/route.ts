import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { refreshAccessToken, getGoogleSheetsClient } from '@/lib/google-auth'
import { getAdAccounts, getCampaignsWithDeliveryStatus, getAdSetsWithDeliveryStatus, getAds, getInsights } from '@/lib/facebook'

// Helper function to convert column letter to index (A=0, B=1, ..., AA=26)
function getColumnIndex(colLetter: string): number {
    let column = 0;
    const upper = colLetter.toUpperCase();
    for (let i = 0; i < upper.length; i++) {
        column += (upper.charCodeAt(i) - 64) * Math.pow(26, upper.length - i - 1);
    }
    return column - 1;
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { configId } = body

        if (!configId) {
            return NextResponse.json({ error: 'Config ID required' }, { status: 400 })
        }

        const config = await db.exportConfig.findUnique({
            where: { id: configId }
        })

        if (!config) {
            return NextResponse.json({ error: 'Config not found' }, { status: 404 })
        }

        if (config.userId !== session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // --- Logic duplicated from scheduler.ts (Refactor recommended) ---
        // For now, we'll copy-paste to ensure it works immediately, 
        // but ideally we should extract this to a shared function in lib/export-service.ts

        const user = await db.user.findUnique({
            where: { id: session.user.id },
            include: {
                accounts: {
                    where: {
                        provider: { in: ['google', 'facebook'] }
                    }
                }
            }
        })

        const googleAccount = user?.accounts.find(a => a.provider === 'google')
        const facebookAccount = user?.accounts.find(a => a.provider === 'facebook')
        const fbToken = user?.facebookAdToken || facebookAccount?.access_token

        if (!googleAccount) {
            return NextResponse.json({ error: 'Google Account not connected. Please sign in with Google.' }, { status: 400 })
        }

        if (!googleAccount.refresh_token) {
            return NextResponse.json({ error: 'Google Refresh Token missing. Please sign out and sign in again to grant permissions.' }, { status: 400 })
        }

        if (!fbToken) {
            return NextResponse.json({ error: 'Facebook Ad Token missing. Please connect your Facebook account.' }, { status: 400 })
        }

        // Refresh Google Token
        const googleTokens = await refreshAccessToken(googleAccount.refresh_token)

        // Update access token in DB
        if (googleTokens.access_token) {
            await db.account.update({
                where: { id: googleAccount.id },
                data: {
                    access_token: googleTokens.access_token,
                    expires_at: googleTokens.expiry_date ? Math.floor(googleTokens.expiry_date / 1000) : undefined,
                    refresh_token: googleTokens.refresh_token || undefined // Update if new one provided
                }
            })
        }

        const googleClient = getGoogleSheetsClient(googleTokens.access_token!)

        // Fetch Ad Data
        let accountIds: string[] = []
        try {
            if (Array.isArray(config.accountIds)) {
                accountIds = config.accountIds
            } else if (typeof config.accountIds === 'string') {
                accountIds = JSON.parse(config.accountIds)
            }
        } catch (e) {
            console.error('Error parsing accountIds:', e)
            accountIds = []
        }

        if (!accountIds || accountIds.length === 0) {
            return NextResponse.json({ error: 'No accounts selected' }, { status: 400 })
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let data: any[] = []


        if (config.dataType === 'accounts') {
            const allAccounts = await getAdAccounts(fbToken)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data = allAccounts.filter((acc: any) => accountIds.includes(acc.id))
        } else {
            // Helper to merge insights
            const mergeInsights = (items: any[], insights: any[]) => {
                const insightsMap = new Map(insights.map(i => [i.id, i]))
                return items.map(item => ({
                    ...item,
                    ...(insightsMap.get(item.id) || {})
                }))
            }

            // Extract dateRange from body if present
            const dateRange = body.dateRange

            if (config.dataType === 'campaigns') {
                const promises = accountIds.map(async (id: string) => {
                    const [items, insights] = await Promise.all([
                        getCampaignsWithDeliveryStatus(fbToken, `act_${id}`),
                        getInsights(fbToken, `act_${id}`, 'campaign', dateRange)
                    ])
                    return mergeInsights(items, insights)
                })
                const results = await Promise.all(promises)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                data = results.flat() as any[]
            } else if (config.dataType === 'adsets') {
                const promises = accountIds.map(async (id: string) => {
                    const [items, insights] = await Promise.all([
                        getAdSetsWithDeliveryStatus(fbToken, `act_${id}`),
                        getInsights(fbToken, `act_${id}`, 'adset', dateRange)
                    ])
                    return mergeInsights(items, insights)
                })
                const results = await Promise.all(promises)
                data = results.flat()
            } else if (config.dataType === 'ads') {
                // Fetch account names first
                const accounts = await getAdAccounts(fbToken)
                const accountMap = new Map(accounts.map((a: any) => [a.id, a.name]))

                const promises = accountIds.map(async (id: string) => {
                    const [items, insights] = await Promise.all([
                        getAds(fbToken, `act_${id}`),
                        getInsights(fbToken, `act_${id}`, 'ad', dateRange)
                    ])
                    const merged = mergeInsights(items, insights)
                    const accountName = accountMap.get(id) || ''
                    return merged.map(item => ({ ...item, accountName }))
                })
                const results = await Promise.all(promises)
                data = results.flat()
            }
        }

        if (data.length === 0) {
            return NextResponse.json({ message: 'No data to export', count: 0 })
        }

        // Prepare Rows
        const now = new Date()
        const rows: string[][] = []

        // Determine date string to use: from dateRange if available (Manual export), otherwise today (Auto export)
        let dateStr = ''
        if (body.dateRange && body.dateRange.from) {
            const [y, m, d] = body.dateRange.from.split('-')
            dateStr = `${d}/${m}/${y}`
        } else {
            dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
        }

        const mapping = JSON.parse(config.columnMapping)

        console.log('Column Mapping:', mapping)
        console.log('Include Date:', config.includeDate)

        for (const item of data) {
            // Check if row has any valid statistics
            const statsFields = [
                'reach', 'impressions', 'postEngagements', 'clicks',
                'newMessagingContacts', 'spend', 'costPerNewMessagingContact',
                'videoAvgTimeWatched', 'videoPlays', 'video3SecWatched',
                'videoP25Watched', 'videoP50Watched', 'videoP75Watched',
                'videoP95Watched', 'videoP100Watched'
            ]

            const isAllStatsEmpty = statsFields.every(key => {
                const val = item[key]
                if (val === undefined || val === null) return true
                if (typeof val === 'number' && val === 0) return true
                if (typeof val === 'string' && (val === '0' || val === '0.00' || val === '')) return true
                return false
            })

            if (isAllStatsEmpty) continue

            // Calculate the maximum column index from mapping
            let maxColIndex = 0
            Object.values(mapping).forEach((colLetter) => {
                if (colLetter !== 'skip') {
                    const colIndex = getColumnIndex(colLetter as string)
                    if (colIndex > maxColIndex) maxColIndex = colIndex
                }
            })

            // Add buffer for safety
            maxColIndex = Math.max(maxColIndex + 1, 26)

            const rowData = new Array(maxColIndex).fill('')

            if (config.includeDate) {
                rowData[0] = dateStr
            }

            Object.entries(mapping).forEach(([key, colLetter]) => {
                if (colLetter === 'skip') return
                const colIndex = getColumnIndex(colLetter as string)
                if (colIndex >= 0 && colIndex < maxColIndex) {
                    let value = item[key]
                    if (key === 'videoAvgTimeWatched') {
                        const val = value ? parseFloat(value) : 0
                        if (val === 0 && !value) {
                            value = '-'
                        } else {
                            const m = Math.floor(val / 60)
                            const s = Math.floor(val % 60)
                            value = `${String(m).padStart(2, '0')}.${String(s).padStart(2, '0')}`
                        }
                    } else if (['spend', 'budget', 'spendCap'].includes(key) && value) {
                        value = parseFloat(value).toFixed(2)
                    }

                    // Debug log
                    if (rows.length === 0) {
                        console.log(`Mapping ${key} -> Column ${colLetter} (index ${colIndex}), value:`, value)
                    }

                    rowData[colIndex] = String(value || '')
                }
            })

            // Keep the full row to maintain column alignment
            rows.push(rowData)
        }

        console.log('First row data:', rows[0])
        console.log('Total rows to export:', rows.length)

        // Append to Sheets - Find the next empty row in column A and write there
        if (config.appendMode) {
            try {
                // Get existing data to find the last row with data in column A
                const existingData = await googleClient.spreadsheets.values.get({
                    spreadsheetId: config.spreadsheetId,
                    range: `${config.sheetName}!A:A`
                })

                const lastRow = existingData.data.values?.length || 0
                const nextRow = lastRow + 1

                console.log('Last row with data in column A:', lastRow)
                console.log('Writing to row:', nextRow)

                // Write starting from column A at the next empty row
                await googleClient.spreadsheets.values.update({
                    spreadsheetId: config.spreadsheetId,
                    range: `${config.sheetName}!A${nextRow}`,
                    valueInputOption: 'USER_ENTERED',
                    requestBody: {
                        values: rows
                    }
                })

                console.log(`Append success: ${rows.length} rows written to row ${nextRow}`)
            } catch (error: any) {
                console.error('Error in append mode:', error.message)
                throw new Error(`Failed to append data: ${error.message}`)
            }
        } else {
            // Replace mode - clear and write from top
            try {
                await googleClient.spreadsheets.values.clear({
                    spreadsheetId: config.spreadsheetId,
                    range: `${config.sheetName}!A:Z`
                })
            } catch (error) {
                console.log('Sheet may be empty, proceeding with update')
            }

            await googleClient.spreadsheets.values.update({
                spreadsheetId: config.spreadsheetId,
                range: `${config.sheetName}!A1`,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: rows
                }
            })
        }

        // Update status
        await db.exportConfig.update({
            where: { id: config.id },
            data: {
                lastExportAt: now,
                lastExportStatus: 'success',
                lastExportRows: rows.length,
                lastExportError: null
            }
        })

        return NextResponse.json({ success: true, count: rows.length })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Manual export failed:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
