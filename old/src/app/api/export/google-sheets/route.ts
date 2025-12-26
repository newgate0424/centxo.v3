import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET - Fetch all export configs for user
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const configs = await db.exportConfig.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ configs })
    } catch (error) {
        console.error('Error fetching export configs:', error)
        return NextResponse.json({ error: 'Failed to fetch configs' }, { status: 500 })
    }
}

// POST - Create new export config
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const {
            name,
            spreadsheetUrl,
            spreadsheetName,
            sheetName,
            dataType,
            columnMapping,
            autoExportEnabled,
            exportFrequency,
            exportHour,
            exportMinute,
            exportInterval,
            appendMode,
            includeDate,
            accountIds,
            adAccountTimezone,
            useAdAccountTimezone
        } = body

        // Extract spreadsheet ID from URL
        const spreadsheetId = extractSpreadsheetId(spreadsheetUrl)
        if (!spreadsheetId) {
            return NextResponse.json({ error: 'Invalid Google Sheets URL' }, { status: 400 })
        }

        const config = await db.exportConfig.create({
            data: {
                userId: session.user.id,
                name,
                spreadsheetUrl,
                spreadsheetId,
                spreadsheetName,
                sheetName,
                dataType,
                columnMapping: JSON.stringify(columnMapping),
                autoExportEnabled: autoExportEnabled || false,
                exportFrequency,
                exportHour,
                exportMinute,
                exportInterval,
                appendMode: appendMode ?? true,
                includeDate: includeDate ?? true,
                accountIds: accountIds ? JSON.stringify(accountIds) : '[]',
                adAccountTimezone,
                useAdAccountTimezone: useAdAccountTimezone || false
            }
        })

        return NextResponse.json({ config, success: true })
    } catch (error) {
        console.error('Error creating export config:', error)
        return NextResponse.json({ error: 'Failed to create config' }, { status: 500 })
    }
}

// PUT - Update export config
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { id, ...updateData } = body

        // Verify ownership
        const existing = await db.exportConfig.findFirst({
            where: { id, userId: session.user.id }
        })

        if (!existing) {
            return NextResponse.json({ error: 'Config not found' }, { status: 404 })
        }

        // Extract spreadsheet ID if URL changed
        if (updateData.spreadsheetUrl) {
            updateData.spreadsheetId = extractSpreadsheetId(updateData.spreadsheetUrl)
        }

        // Stringify column mapping if provided
        if (updateData.columnMapping) {
            updateData.columnMapping = JSON.stringify(updateData.columnMapping)
        }

        // Stringify accountIds if provided
        if (updateData.accountIds) {
            updateData.accountIds = JSON.stringify(updateData.accountIds)
        }

        const config = await db.exportConfig.update({
            where: { id },
            data: updateData
        })

        return NextResponse.json({ config, success: true })
    } catch (error) {
        console.error('Error updating export config:', error)
        return NextResponse.json({ error: 'Failed to update config' }, { status: 500 })
    }
}

// DELETE - Remove export config
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Config ID required' }, { status: 400 })
        }

        // Verify ownership
        const existing = await db.exportConfig.findFirst({
            where: { id, userId: session.user.id }
        })

        if (!existing) {
            return NextResponse.json({ error: 'Config not found' }, { status: 404 })
        }

        await db.exportConfig.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting export config:', error)
        return NextResponse.json({ error: 'Failed to delete config' }, { status: 500 })
    }
}

// Helper to extract spreadsheet ID from Google Sheets URL
function extractSpreadsheetId(url: string): string | null {
    try {
        // Format: https://docs.google.com/spreadsheets/d/{spreadsheetId}/edit
        const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
        return match ? match[1] : null
    } catch {
        return null
    }
}
