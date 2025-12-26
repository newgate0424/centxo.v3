import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSheetData, parseSheetRow, SHEET_NAMES } from '@/lib/google-sheets-sync';

// POST /api/sync/sheets - ซิงค์ข้อมูลจาก Google Sheets (FAST VERSION)
export async function POST(request: NextRequest) {
    try {
        console.log('Starting Google Sheets sync (optimized)...');
        const startTime = Date.now();

        // ดึงข้อมูลจาก request body (ถ้ามี)
        const body = await request.json().catch(() => ({}));
        const sheetNames = body.sheets || SHEET_NAMES;

        const results = {
            success: [] as { sheet: string; records: number }[],
            failed: [] as { sheet: string; error: string }[],
            totalRecords: 0,
            totalInserted: 0,
            totalUpdated: 0,
        };

        // ซิงค์แต่ละชีตแบบ parallel
        const syncPromises = sheetNames.map(async (sheetName: string) => {
            try {
                console.log(`[${sheetName}] Starting sync...`);
                const sheetStartTime = Date.now();

                // ดึงข้อมูลจาก Google Sheets
                const sheetData = await getSheetData(sheetName);

                if (sheetData.length === 0) {
                    return {
                        success: false,
                        sheet: sheetName,
                        error: 'No data found in sheet',
                        records: 0
                    };
                }

                // แปลงข้อมูลทั้งหมด
                const validRows = sheetData
                    .map(row => parseSheetRow(row, sheetName))
                    .filter(data => data.team && data.adser);

                console.log(`[${sheetName}] Found ${validRows.length} valid rows`);

                if (validRows.length === 0) {
                    return {
                        success: false,
                        sheet: sheetName,
                        error: 'No valid rows found',
                        records: 0
                    };
                }

                // ใช้ Transaction เพื่อความเร็ว: Delete ทั้งหมดแล้ว Insert ใหม่
                await (prisma as any).$transaction(async (tx: any) => {
                    // ลบข้อมูลเก่าของ sheet นี้
                    await tx.syncData.deleteMany({
                        where: { sheetName }
                    });

                    // Insert ข้อมูลใหม่ทั้งหมด (Bulk Insert)
                    // ต้องแบ่ง batch เพราะ MySQL มี limit
                    const BATCH_SIZE = 500;
                    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
                        const batch = validRows.slice(i, i + BATCH_SIZE);
                        await tx.syncData.createMany({
                            data: batch,
                            skipDuplicates: true,
                        });
                    }
                }, {
                    timeout: 60000, // 60 seconds timeout
                });

                const elapsed = Date.now() - sheetStartTime;
                console.log(`[${sheetName}] Completed in ${elapsed}ms (${validRows.length} rows)`);

                return {
                    success: true,
                    sheet: sheetName,
                    records: validRows.length,
                    inserted: validRows.length,
                    updated: 0
                };

            } catch (sheetError) {
                console.error(`[${sheetName}] Error:`, sheetError);
                return {
                    success: false,
                    sheet: sheetName,
                    error: sheetError instanceof Error ? sheetError.message : 'Unknown error',
                    records: 0
                };
            }
        });

        // รอทุก sheet sync เสร็จ
        const syncResults = await Promise.all(syncPromises);

        // รวบรวมผลลัพธ์
        for (const result of syncResults) {
            if (result.success) {
                results.success.push({ sheet: result.sheet, records: result.records });
                results.totalRecords += result.records;
                results.totalInserted += result.inserted || 0;
                results.totalUpdated += result.updated || 0;
            } else {
                results.failed.push({ sheet: result.sheet, error: result.error || 'Unknown error' });
            }
        }

        const totalElapsed = Date.now() - startTime;
        console.log(`Sync completed in ${totalElapsed}ms`);

        return NextResponse.json({
            message: `Sync completed in ${(totalElapsed / 1000).toFixed(2)}s`,
            results,
        });
    } catch (error) {
        console.error('Sync error:', error);
        return NextResponse.json(
            {
                error: 'Failed to sync data',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

// GET /api/sync/sheets - ดูสถานะการซิงค์ล่าสุด
export async function GET(request: NextRequest) {
    try {
        // ดึงสถิติข้อมูลแบบ parallel
        const stats = await Promise.all(
            SHEET_NAMES.map(async (sheetName) => {
                const [count, latest] = await Promise.all([
                    (prisma as any).syncData.count({ where: { sheetName } }),
                    (prisma as any).syncData.findFirst({
                        where: { sheetName },
                        orderBy: { updatedAt: 'desc' },
                        select: { updatedAt: true },
                    })
                ]);

                return {
                    sheet: sheetName,
                    recordCount: count,
                    lastUpdated: latest?.updatedAt || null,
                };
            })
        );

        return NextResponse.json({
            stats,
            totalRecords: stats.reduce((sum, s) => sum + s.recordCount, 0),
        });
    } catch (error) {
        console.error('Get sync status error:', error);
        return NextResponse.json(
            {
                error: 'Failed to get sync status',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
