import cron from 'node-cron'
import { db } from './db'
import { getGoogleSheetsClient } from './google-auth'
import { getAdAccounts, getCampaignsWithDeliveryStatus, getAdSetsWithDeliveryStatus, getAds, getInsights } from './facebook'
import { refreshAccessToken } from './google-auth'

// Helper function to convert column letter to index (A=0, B=1, ..., AA=26)
function getColumnIndex(colLetter: string): number {
    let column = 0;
    const upper = colLetter.toUpperCase();
    for (let i = 0; i < upper.length; i++) {
        column += (upper.charCodeAt(i) - 64) * Math.pow(26, upper.length - i - 1);
    }
    return column - 1;
}

// Helper function to get yesterday's date in a specific timezone
function getYesterdayInTimezone(timezone?: string): { date: Date, dateStr: string, displayStr: string } {
    let now: Date

    if (timezone) {
        try {
            // Get current time in the target timezone
            const tzTimeStr = new Date().toLocaleString('en-US', { timeZone: timezone })
            now = new Date(tzTimeStr)
        } catch {
            console.error(`Invalid timezone: ${timezone}, using server time`)
            now = new Date()
        }
    } else {
        now = new Date()
    }

    // Subtract one day to get yesterday
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)

    // Format for Facebook API (YYYY-MM-DD)
    const yyyy = yesterday.getFullYear()
    const mm = String(yesterday.getMonth() + 1).padStart(2, '0')
    const dd = String(yesterday.getDate()).padStart(2, '0')
    const dateStr = `${yyyy}-${mm}-${dd}`

    // Format for display in sheet (DD/MM/YYYY)
    const displayStr = `${dd}/${mm}/${yyyy}`

    return { date: yesterday, dateStr, displayStr }
}

export function initScheduler() {
    console.log('Initializing Scheduler...')

    // Run every 15 minutes to check for jobs (0, 15, 30, 45)
    cron.schedule('*/15 * * * *', async () => {
        console.log('Running scheduled export check...')
        await runExportJobs()
    })
}

async function runExportJobs() {
    try {
        const now = new Date()
        const serverHour = now.getHours()
        const serverMinute = now.getMinutes()

        // Find configs that are enabled
        const configs = await db.exportConfig.findMany({
            where: {
                autoExportEnabled: true
            }
        })

        for (const config of configs) {
            try {
                // Check if due
                let isDue = false

                if (config.exportFrequency === 'daily') {
                    let currentHour = serverHour
                    let currentMinute = serverMinute

                    // Adjust for timezone if enabled
                    if (config.useAdAccountTimezone && config.adAccountTimezone) {
                        try {
                            // Get time in target timezone
                            const tzTimeStr = new Date().toLocaleString('en-US', { timeZone: config.adAccountTimezone })
                            const tzDate = new Date(tzTimeStr)
                            currentHour = tzDate.getHours()
                            currentMinute = tzDate.getMinutes()
                        } catch {
                            console.error(`Invalid timezone ${config.adAccountTimezone} for config ${config.id}, falling back to server time`)
                        }
                    }

                    const targetHour = config.exportHour ?? 9
                    const targetMinute = config.exportMinute ?? 0

                    // Check if time matches (allow 14 minute window since we run every 15 mins)
                    // We check if we are in the same hour and the minute difference is small
                    if (currentHour === targetHour) {
                        const minuteDiff = Math.abs(currentMinute - targetMinute)
                        if (minuteDiff < 14) {
                            isDue = true
                        }
                    }

                    // Prevent double export in same day: check lastExportAt
                    if (isDue && config.lastExportAt) {
                        const lastExport = new Date(config.lastExportAt)
                        // Check if last export was less than 12 hours ago (simple debounce)
                        const hoursSinceLast = (now.getTime() - lastExport.getTime()) / (1000 * 60 * 60)
                        if (hoursSinceLast < 12) {
                            isDue = false
                        }
                    }

                } else if (config.exportFrequency === 'hourly') {
                    const lastExport = config.lastExportAt ? new Date(config.lastExportAt) : new Date(0)
                    const hoursSinceLast = (now.getTime() - lastExport.getTime()) / (1000 * 60 * 60)
                    if (hoursSinceLast >= (config.exportInterval || 6)) isDue = true
                }

                if (!isDue) continue

                console.log(`Processing export config: ${config.id} (${config.name})`)

                // Get User for tokens
                const user = await db.user.findUnique({
                    where: { id: config.userId },
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
                    console.error(`User ${config.userId} missing Google Account`)
                    continue
                }

                if (!googleAccount.refresh_token) {
                    console.error(`User ${config.userId} missing Google Refresh Token`)
                    continue
                }

                if (!fbToken) {
                    console.error(`User ${config.userId} missing Facebook Ad Token`)
                    continue
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
                            refresh_token: googleTokens.refresh_token || undefined
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
                    console.error('Error parsing accountIds in scheduler:', e)
                    accountIds = []
                }

                if (!accountIds || accountIds.length === 0) {
                    console.log('No accounts selected for export')
                    continue
                }

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let data: any[] = []

                // Calculate yesterday's date based on ad account timezone (for complete data after midnight)
                const timezone = config.useAdAccountTimezone && config.adAccountTimezone
                    ? config.adAccountTimezone
                    : undefined
                const { dateStr: yesterdayStr, displayStr: yesterdayDisplayStr } = getYesterdayInTimezone(timezone)

                // Date range for Facebook API - pull yesterday's data (complete data)
                const dateRange = {
                    from: yesterdayStr,
                    to: yesterdayStr
                }

                console.log(`[${config.name}] Fetching data for: ${yesterdayStr} (timezone: ${timezone || 'server'})`)

                if (config.dataType === 'accounts') {
                    const allAccounts = await getAdAccounts(fbToken)
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    data = allAccounts.filter((acc: any) => accountIds.includes(acc.id))
                } else {
                    // Helper to merge insights
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const mergeInsights = (items: any[], insights: any[]) => {
                        const insightsMap = new Map(insights.map(i => [i.id, i]))
                        return items.map(item => ({
                            ...item,
                            ...(insightsMap.get(item.id) || {})
                        }))
                    }

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
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        data = results.flat() as any[]
                    } else if (config.dataType === 'ads') {
                        const promises = accountIds.map(async (id: string) => {
                            const [items, insights] = await Promise.all([
                                getAds(fbToken, `act_${id}`),
                                getInsights(fbToken, `act_${id}`, 'ad', dateRange)
                            ])
                            return mergeInsights(items, insights)
                        })
                        const results = await Promise.all(promises)
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        data = results.flat() as any[]
                    }
                }

                if (data.length === 0) {
                    console.log(`[${config.name}] No data to export for ${yesterdayStr}`)
                    continue
                }

                // Prepare Rows - Use yesterday's date for the sheet
                const rows: string[][] = []
                const dateForSheet = yesterdayDisplayStr // Use yesterday's date (DD/MM/YYYY) for the sheet
                const mapping = JSON.parse(config.columnMapping)

                for (const item of data) {
                    // Calculate max column index
                    let maxColIndex = 0
                    Object.values(mapping).forEach((colLetter) => {
                        if (colLetter !== 'skip') {
                            const colIndex = getColumnIndex(colLetter as string)
                            if (colIndex > maxColIndex) maxColIndex = colIndex
                        }
                    })
                    maxColIndex = Math.max(maxColIndex + 1, 26)

                    const rowData = new Array(maxColIndex).fill('')

                    if (config.includeDate) {
                        rowData[0] = dateForSheet // A - Yesterday's date
                    }

                    Object.entries(mapping).forEach(([key, colLetter]) => {
                        if (colLetter === 'skip') return
                        const colIndex = getColumnIndex(colLetter as string)
                        if (colIndex >= 0 && colIndex < maxColIndex) {
                            // Get value from item
                            let value = item[key]

                            // Format value (spend, etc)
                            if (['spend', 'budget', 'spendCap'].includes(key) && value) {
                                // Basic formatting
                                value = parseFloat(value).toFixed(2)
                            }

                            rowData[colIndex] = String(value || '')
                        }
                    })

                    // Trim trailing empty strings to avoid huge ranges
                    let lastIndex = -1
                    for (let i = 0; i < rowData.length; i++) {
                        if (rowData[i] !== '') lastIndex = i
                    }

                    rows.push(rowData.slice(0, lastIndex + 1))
                }

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

                        console.log(`[${config.name}] Last row with data in column A: ${lastRow}, Writing to row: ${nextRow}`)

                        // Write starting from column A at the next empty row
                        await googleClient.spreadsheets.values.update({
                            spreadsheetId: config.spreadsheetId,
                            range: `${config.sheetName}!A${nextRow}`,
                            valueInputOption: 'USER_ENTERED',
                            requestBody: {
                                values: rows
                            }
                        })

                        console.log(`[${config.name}] Append success: ${rows.length} rows written to row ${nextRow}`)
                    } catch (error: unknown) {
                        console.error(`[${config.name}] Error in append mode:`, error)
                        throw error // Re-throw to trigger the error handling below
                    }
                } else {
                    // Replace mode - clear and write from top
                    try {
                        await googleClient.spreadsheets.values.clear({
                            spreadsheetId: config.spreadsheetId,
                            range: `${config.sheetName}!A:Z`
                        })
                    } catch {
                        console.log(`[${config.name}] Sheet may be empty, proceeding with update`)
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

                console.log(`Export success for ${config.name}`)

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (error: any) {
                console.error(`Export failed for ${config.name}:`, error)
                await db.exportConfig.update({
                    where: { id: config.id },
                    data: {
                        lastExportAt: now,
                        lastExportStatus: 'failed',
                        lastExportError: error.message
                    }
                })
            }
        }
    } catch (error) {
        console.error('Error in runExportJobs:', error)
    }
}
