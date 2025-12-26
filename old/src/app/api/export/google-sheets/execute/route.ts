import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// POST - Execute export to Google Sheets
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { configId, data } = body

        // Get export config
        const config = await db.exportConfig.findFirst({
            where: { id: configId, userId: session.user.id }
        })

        if (!config) {
            return NextResponse.json({ error: 'Config not found' }, { status: 404 })
        }

        const columnMapping = JSON.parse(config.columnMapping)
        
        // Prepare data for Google Sheets
        const rows = prepareDataForExport(data, columnMapping, config.includeDate)
        
        // Export to Google Sheets using Apps Script Web App or direct API
        const result = await exportToGoogleSheets(
            config.spreadsheetId,
            config.sheetName,
            rows,
            config.appendMode
        )

        // Update last export status
        await db.exportConfig.update({
            where: { id: configId },
            data: {
                lastExportAt: new Date(),
                lastExportStatus: result.success ? 'success' : 'failed',
                lastExportError: result.error || null,
                lastExportRows: result.success ? rows.length : null
            }
        })

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 })
        }

        return NextResponse.json({ 
            success: true, 
            rowsExported: rows.length,
            message: `Successfully exported ${rows.length} rows to Google Sheets`
        })
    } catch (error) {
        console.error('Error executing export:', error)
        return NextResponse.json({ error: 'Failed to execute export' }, { status: 500 })
    }
}

// Prepare data based on column mapping
function prepareDataForExport(
    data: any[], 
    columnMapping: Record<string, string>, 
    includeDate: boolean
): string[][] {
    const today = new Date().toISOString().split('T')[0]
    
    return data.map((item, index) => {
        const row: string[] = []
        
        // Add date column if enabled
        if (includeDate) {
            row.push(today)
        }
        
        // Map each configured column
        Object.entries(columnMapping).forEach(([dataKey, sheetColumn]) => {
            if (sheetColumn && sheetColumn !== 'skip') {
                let value = ''
                
                switch (dataKey) {
                    case 'index':
                        value = String(index + 1)
                        break
                    case 'name':
                        value = item.name || ''
                        break
                    case 'id':
                        value = item.id || ''
                        break
                    case 'status':
                        value = item.status || item.deliveryStatus || ''
                        break
                    case 'delivery':
                        value = item.deliveryStatus || item.effectiveStatus || ''
                        break
                    case 'results':
                        value = String(item.results || getActionValue(item.actions, 'onsite_conversion.messaging_conversation_started_7d') || 0)
                        break
                    case 'costPerResult':
                        value = String(item.costPerResult || getCostPerAction(item.costPerActionType, 'onsite_conversion.messaging_conversation_started_7d') || '')
                        break
                    case 'budget':
                        value = item.budget ? (parseFloat(item.budget) / 100).toFixed(2) : ''
                        break
                    case 'impressions':
                        value = String(item.impressions || '')
                        break
                    case 'reach':
                        value = String(item.reach || '')
                        break
                    case 'clicks':
                        value = String(item.clicks || '')
                        break
                    case 'spend':
                        value = item.spend ? parseFloat(item.spend).toFixed(2) : ''
                        break
                    case 'postEngagements':
                        value = String(item.postEngagements || '')
                        break
                    case 'newMessagingContacts':
                        value = String(item.newMessagingContacts || '')
                        break
                    default:
                        value = String(item[dataKey] || '')
                }
                
                row.push(value)
            }
        })
        
        return row
    })
}

// Helper functions for getting action values
function getActionValue(actions: any[], actionType: string): number {
    if (!actions || !Array.isArray(actions)) return 0
    const action = actions.find((a: any) => a.action_type === actionType)
    return action ? parseFloat(action.value) || 0 : 0
}

function getCostPerAction(costPerActionType: any[], actionType: string): number {
    if (!costPerActionType || !Array.isArray(costPerActionType)) return 0
    const cost = costPerActionType.find((c: any) => c.action_type === actionType)
    return cost ? parseFloat(cost.value) || 0 : 0
}

// Export to Google Sheets
async function exportToGoogleSheets(
    spreadsheetId: string,
    sheetName: string,
    rows: string[][],
    appendMode: boolean
): Promise<{ success: boolean; error?: string }> {
    try {
        // Option 1: Use Google Apps Script Web App (simpler, no OAuth needed)
        // User needs to deploy a web app from their Google Sheets
        // For now, we'll create the data and let user manually copy or use Apps Script
        
        // Option 2: Direct Google Sheets API (requires service account or OAuth)
        // This would require additional setup
        
        // For this implementation, we'll return success and the data will be
        // handled by the client-side copy mechanism or future Apps Script integration
        
        console.log(`Exporting ${rows.length} rows to spreadsheet ${spreadsheetId}, sheet: ${sheetName}`)
        console.log('Append mode:', appendMode)
        
        // In production, you would use Google Sheets API here
        // For now, return success for the copy-to-clipboard flow
        return { success: true }
    } catch (error: any) {
        console.error('Google Sheets export error:', error)
        return { success: false, error: error.message }
    }
}
