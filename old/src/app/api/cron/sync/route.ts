import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSheetData, parseSheetRow, SHEET_NAMES } from '@/lib/google-sheets-sync';

// Secret key for cron authentication (optional - add to .env)
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * GET /api/cron/sync
 * Endpoint สำหรับ cron job - ซิงค์ข้อมูลทั้งหมดจาก Google Sheets
 * 
 * Usage: 
 * - https://your-domain.com/api/cron/sync
 * - https://your-domain.com/api/cron/sync?secret=YOUR_CRON_SECRET (if CRON_SECRET is set)
 */
export async function GET(request: NextRequest) {
    try {
        // Optional: Check secret key for security
        if (CRON_SECRET) {
            const { searchParams } = new URL(request.url);
            const secret = searchParams.get('secret');
            if (secret !== CRON_SECRET) {
                return NextResponse.json(
                    { error: 'Unauthorized - Invalid secret' },
                    { status: 401 }
                );
            }
        }

        console.log('[CRON] Starting Google Sheets sync...');
        const startTime = Date.now();

        const results = {
            success: [] as { sheet: string; records: number }[],
            failed: [] as { sheet: string; error: string }[],
            totalRecords: 0,
        };

        // ซิงค์แต่ละชีตแบบ parallel
        const syncPromises = SHEET_NAMES.map(async (sheetName: string) => {
            try {
                console.log(`[CRON][${sheetName}] Starting sync...`);
                const sheetStartTime = Date.now();

                // ดึงข้อมูลจาก Google Sheets
                const sheetData = await getSheetData(sheetName);

                if (sheetData.length === 0) {
                    return {
                        success: false,
                        sheet: sheetName,
                        error: 'No data found',
                        records: 0
                    };
                }

                // แปลงข้อมูลทั้งหมด
                const validRows = sheetData
                    .map(row => parseSheetRow(row, sheetName))
                    .filter(data => data.team && data.adser);

                if (validRows.length === 0) {
                    return {
                        success: false,
                        sheet: sheetName,
                        error: 'No valid rows',
                        records: 0
                    };
                }

                // Transaction: Delete all then Insert new
                await (prisma as any).$transaction(async (tx: any) => {
                    await tx.syncData.deleteMany({
                        where: { sheetName }
                    });

                    const BATCH_SIZE = 500;
                    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
                        const batch = validRows.slice(i, i + BATCH_SIZE);
                        await tx.syncData.createMany({
                            data: batch,
                            skipDuplicates: true,
                        });
                    }
                }, {
                    timeout: 60000,
                });

                const elapsed = Date.now() - sheetStartTime;
                console.log(`[CRON][${sheetName}] Done in ${elapsed}ms (${validRows.length} rows)`);

                return {
                    success: true,
                    sheet: sheetName,
                    records: validRows.length
                };

            } catch (sheetError) {
                console.error(`[CRON][${sheetName}] Error:`, sheetError);
                return {
                    success: false,
                    sheet: sheetName,
                    error: sheetError instanceof Error ? sheetError.message : 'Unknown error',
                    records: 0
                };
            }
        });

        const syncResults = await Promise.all(syncPromises);

        for (const result of syncResults) {
            if (result.success) {
                results.success.push({ sheet: result.sheet, records: result.records });
                results.totalRecords += result.records;
            } else {
                results.failed.push({ sheet: result.sheet, error: result.error || 'Unknown' });
            }
        }

        const totalElapsed = Date.now() - startTime;
        console.log(`[CRON] Sync completed in ${totalElapsed}ms`);

        return NextResponse.json({
            ok: true,
            message: `Synced ${results.totalRecords} records in ${(totalElapsed / 1000).toFixed(2)}s`,
            results,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[CRON] Sync error:', error);
        return NextResponse.json(
            {
                ok: false,
                error: 'Sync failed',
                details: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            },
            { status: 500 }
        );
    }
}
