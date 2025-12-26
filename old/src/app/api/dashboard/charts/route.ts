import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { format, parseISO, eachDayOfInterval, eachMonthOfInterval, startOfMonth, endOfMonth } from 'date-fns'
import { th } from 'date-fns/locale'

// Team mapping for each tab
const TAB_TEAMS: { [key: string]: string[] } = {
    'lottery': ['สาวอ้อย', 'อลิน', 'อัญญาC', 'อัญญาD'],
    'baccarat': ['สเปชบาร์', 'บาล้าน', 'เอก เหนือมังกร'],
    'horse-racing': ['คิงมหาเฮง', 'ญาดา พารับทรัพย์'],
    'football-area': ['ฟุตบอลแอร์เรีย', 'ฟุตบอลแอร์เรีย(ฮารุ)']
}

/**
 * GET /api/dashboard/charts
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string  
 * - tab: lottery | baccarat | horse-racing | football-area
 * - view: team | adser
 * - period: daily | monthly
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')
        const tab = searchParams.get('tab')
        const view = searchParams.get('view') || 'team'
        const period = searchParams.get('period') || 'daily'

        if (!startDate || !endDate || !tab) {
            return NextResponse.json(
                { error: 'Missing required parameters: startDate, endDate, tab' },
                { status: 400 }
            )
        }

        // Get current exchange rate
        let exchangeRate = 35.0 // Default fallback
        try {
            const rateData = await (prisma as any).exchangeRate.findFirst({
                orderBy: { timestamp: 'desc' }
            })
            if (rateData) {
                exchangeRate = rateData.rate
            }
        } catch (error) {
            console.error('Failed to fetch exchange rate:', error)
        }

        const start = parseISO(startDate)
        const end = parseISO(endDate)
        // Ensure end date covers the full day
        end.setHours(23, 59, 59, 999)

        // ดึงข้อมูลทั้งหมดครั้งเดียว
        const teams = TAB_TEAMS[tab] || []
        if (teams.length === 0) {
            return NextResponse.json({
                success: true,
                data: [],
                period,
                view
            })
        }

        const allData = await (prisma as any).syncData.findMany({
            where: {
                team: { in: teams },
                date: {
                    gte: start,
                    lte: end
                }
            },
            select: {
                team: true,
                adser: true,
                date: true,
                spend: true,
                deposit: true,
                message: true,
                turnoverAdser: true
            },
            orderBy: {
                date: 'asc'
            }
        })

        // สร้างช่วงเวลาตามประเภท (รายวัน/รายเดือน)
        const intervals = period === 'daily'
            ? eachDayOfInterval({ start, end })
            : eachMonthOfInterval({ start, end })

        // กรองเฉพาะช่วงเวลาที่มีข้อมูล (ไม่เกินวันปัจจุบัน)
        const today = new Date()
        const filteredIntervals = intervals.filter(interval => interval <= today)

        const chartData = []

        // Track cumulative values for daily period (สะสมตั้งแต่วันที่ 1)
        const cumulativeByTeam: Record<string, { spend: number; deposit: number; message: number; turnoverAdser: number }> = {}
        const cumulativeByAdser: Record<string, { spend: number; deposit: number; message: number; turnoverAdser: number }> = {}

        for (const interval of filteredIntervals) {
            let periodStart: Date
            let periodEnd: Date

            if (period === 'daily') {
                periodStart = new Date(interval)
                periodStart.setHours(0, 0, 0, 0)
                periodEnd = new Date(interval)
                periodEnd.setHours(23, 59, 59, 999)
            } else {
                periodStart = startOfMonth(interval)
                periodEnd = endOfMonth(interval)
            }

            const periodLabel = period === 'daily'
                ? format(interval, 'dd')
                : format(interval, 'MMM', { locale: th })

            // Get date string for comparison (YYYY-MM-DD)
            const intervalDateStr = format(interval, 'yyyy-MM-dd')

            // กรองข้อมูลสำหรับช่วงเวลานี้ using date string comparison
            const periodRecords = allData.filter((record: any) => {
                // Convert record date to local date string
                const recordDateStr = format(new Date(record.date), 'yyyy-MM-dd')

                if (period === 'daily') {
                    return recordDateStr === intervalDateStr
                } else {
                    // For monthly, check if in same month
                    const recordMonth = recordDateStr.substring(0, 7) // YYYY-MM
                    const intervalMonth = intervalDateStr.substring(0, 7)
                    return recordMonth === intervalMonth
                }
            })

            const periodData: Record<string, any> = {
                period: periodLabel,
                date: intervalDateStr,
                depositAmount: periodRecords.reduce((sum: number, item: any) => sum + (item.deposit || 0), 0)
            }

            if (view === 'all') {
                // aggregate ทั้งหมด
                const daySpend = periodRecords.reduce((sum: number, item: any) => sum + (item.spend || 0), 0)
                const dayDeposit = periodRecords.reduce((sum: number, item: any) => sum + (item.deposit || 0), 0)
                const dayMessage = periodRecords.reduce((sum: number, item: any) => sum + (item.message || 0), 0)
                const dayTurnoverAdser = periodRecords.reduce((sum: number, item: any) => sum + (item.turnoverAdser || 0), 0)

                const key = 'รวม'

                if (period === 'daily') {
                    if (!cumulativeByTeam['all']) {
                        cumulativeByTeam['all'] = { spend: 0, deposit: 0, message: 0, turnoverAdser: 0 }
                    }
                    cumulativeByTeam['all'].spend += daySpend
                    cumulativeByTeam['all'].deposit += dayDeposit
                    cumulativeByTeam['all'].message += dayMessage
                    cumulativeByTeam['all'].turnoverAdser += dayTurnoverAdser

                    const totalSpend = cumulativeByTeam['all'].spend
                    const totalTurnoverAdser = cumulativeByTeam['all'].turnoverAdser

                    const dollarPerCover = totalSpend > 0 && exchangeRate > 0
                        ? (totalTurnoverAdser / exchangeRate) / totalSpend
                        : 0

                    periodData[key] = {
                        cpm: dayMessage > 0 ? parseFloat((daySpend / dayMessage).toFixed(2)) : 0,
                        costPerDeposit: dayDeposit > 0 ? parseFloat((daySpend / dayDeposit).toFixed(2)) : 0,
                        depositAmount: dayDeposit,
                        dollarPerCover: parseFloat(dollarPerCover.toFixed(4)),
                        spend: daySpend,
                        deposit: dayDeposit,
                        turnoverAdser: dayTurnoverAdser
                    }
                } else {
                    const dollarPerCover = daySpend > 0 && exchangeRate > 0
                        ? (dayTurnoverAdser / exchangeRate) / daySpend
                        : 0

                    periodData[key] = {
                        cpm: dayMessage > 0 ? parseFloat((daySpend / dayMessage).toFixed(2)) : 0,
                        costPerDeposit: dayDeposit > 0 ? parseFloat((daySpend / dayDeposit).toFixed(2)) : 0,
                        depositAmount: dayDeposit,
                        dollarPerCover: parseFloat(dollarPerCover.toFixed(4)),
                        spend: daySpend,
                        deposit: dayDeposit,
                        turnoverAdser: dayTurnoverAdser
                    }
                }
            } else if (view === 'team') {
                // aggregate ตามทีม
                for (const team of teams) {
                    const teamRecords = periodRecords.filter((r: any) => r.team === team)

                    const daySpend = teamRecords.reduce((sum: number, item: any) => sum + (item.spend || 0), 0)
                    const dayDeposit = teamRecords.reduce((sum: number, item: any) => sum + (item.deposit || 0), 0)
                    const dayMessage = teamRecords.reduce((sum: number, item: any) => sum + (item.message || 0), 0)
                    const dayTurnoverAdser = teamRecords.reduce((sum: number, item: any) => sum + (item.turnoverAdser || 0), 0)

                    // สะสมสำหรับ daily period (เฉพาะ dollarPerCover)
                    if (period === 'daily') {
                        if (!cumulativeByTeam[team]) {
                            cumulativeByTeam[team] = { spend: 0, deposit: 0, message: 0, turnoverAdser: 0 }
                        }
                        cumulativeByTeam[team].spend += daySpend
                        cumulativeByTeam[team].deposit += dayDeposit
                        cumulativeByTeam[team].message += dayMessage
                        cumulativeByTeam[team].turnoverAdser += dayTurnoverAdser

                        const totalSpend = cumulativeByTeam[team].spend
                        const totalTurnoverAdser = cumulativeByTeam[team].turnoverAdser

                        // dollarPerCover uses cumulative values
                        const dollarPerCover = totalSpend > 0 && exchangeRate > 0
                            ? (totalTurnoverAdser / exchangeRate) / totalSpend
                            : 0

                        periodData[team] = {
                            // CPM and costPerDeposit use daily values
                            cpm: dayMessage > 0 ? parseFloat((daySpend / dayMessage).toFixed(2)) : 0,
                            costPerDeposit: dayDeposit > 0 ? parseFloat((daySpend / dayDeposit).toFixed(2)) : 0,
                            depositAmount: dayDeposit,
                            // dollarPerCover uses cumulative
                            dollarPerCover: parseFloat(dollarPerCover.toFixed(4)),
                            spend: daySpend,
                            deposit: dayDeposit,
                            turnoverAdser: dayTurnoverAdser
                        }
                    } else {
                        // Monthly - ไม่สะสม
                        const dollarPerCover = daySpend > 0 && exchangeRate > 0
                            ? (dayTurnoverAdser / exchangeRate) / daySpend
                            : 0

                        periodData[team] = {
                            cpm: dayMessage > 0 ? parseFloat((daySpend / dayMessage).toFixed(2)) : 0,
                            costPerDeposit: dayDeposit > 0 ? parseFloat((daySpend / dayDeposit).toFixed(2)) : 0,
                            depositAmount: dayDeposit,
                            dollarPerCover: parseFloat(dollarPerCover.toFixed(4)),
                            spend: daySpend,
                            deposit: dayDeposit,
                            turnoverAdser: dayTurnoverAdser
                        }
                    }
                }
            } else {
                // aggregate ตามแอดเซอร์
                // For baccarat/horse-racing: always show team
                // For lottery/football-area: only show team if adser exists in multiple teams
                const adserTeamPairs = periodRecords
                    .filter((r: any) => r.adser)
                    .map((r: any) => ({ adser: r.adser, team: r.team }))

                // Check which adsers exist in multiple teams
                const adserTeamMap: Record<string, Set<string>> = {}
                adserTeamPairs.forEach((p: any) => {
                    if (!adserTeamMap[p.adser]) {
                        adserTeamMap[p.adser] = new Set()
                    }
                    adserTeamMap[p.adser].add(p.team)
                })

                // Check if this tab should always show team name
                const alwaysShowTeam = tab === 'baccarat' || tab === 'horse-racing'

                // Get unique adser-team combinations and create display keys
                const uniquePairs = ([...new Set(adserTeamPairs.map((p: any) => JSON.stringify(p)))] as string[])
                    .map((s: string) => JSON.parse(s))

                for (const pair of uniquePairs) {
                    const { adser, team } = pair
                    // Show team in parentheses only if:
                    // 1. Tab is baccarat or horse-racing (always show team)
                    // 2. Or the same adser exists in multiple teams
                    const showTeam = alwaysShowTeam || adserTeamMap[adser].size > 1
                    const key = showTeam ? `${adser} (${team})` : adser

                    const adserRecords = periodRecords.filter((r: any) => r.adser === adser && r.team === team)

                    const daySpend = adserRecords.reduce((sum: number, item: any) => sum + (item.spend || 0), 0)
                    const dayDeposit = adserRecords.reduce((sum: number, item: any) => sum + (item.deposit || 0), 0)
                    const dayMessage = adserRecords.reduce((sum: number, item: any) => sum + (item.message || 0), 0)
                    const dayTurnoverAdser = adserRecords.reduce((sum: number, item: any) => sum + (item.turnoverAdser || 0), 0)

                    // สะสมสำหรับ daily period (เฉพาะ dollarPerCover)
                    if (period === 'daily') {
                        // Use original key for cumulative tracking to keep data separate
                        const trackingKey = `${adser}___${team}`
                        if (!cumulativeByAdser[trackingKey]) {
                            cumulativeByAdser[trackingKey] = { spend: 0, deposit: 0, message: 0, turnoverAdser: 0 }
                        }
                        cumulativeByAdser[trackingKey].spend += daySpend
                        cumulativeByAdser[trackingKey].deposit += dayDeposit
                        cumulativeByAdser[trackingKey].message += dayMessage
                        cumulativeByAdser[trackingKey].turnoverAdser += dayTurnoverAdser

                        const totalSpend = cumulativeByAdser[trackingKey].spend
                        const totalTurnoverAdser = cumulativeByAdser[trackingKey].turnoverAdser

                        // dollarPerCover uses cumulative values
                        const dollarPerCover = totalSpend > 0 && exchangeRate > 0
                            ? (totalTurnoverAdser / exchangeRate) / totalSpend
                            : 0

                        periodData[key] = {
                            // CPM and costPerDeposit use daily values
                            cpm: dayMessage > 0 ? parseFloat((daySpend / dayMessage).toFixed(2)) : 0,
                            costPerDeposit: dayDeposit > 0 ? parseFloat((daySpend / dayDeposit).toFixed(2)) : 0,
                            depositAmount: dayDeposit,
                            // dollarPerCover uses cumulative
                            dollarPerCover: parseFloat(dollarPerCover.toFixed(4)),
                            spend: daySpend,
                            deposit: dayDeposit,
                            turnoverAdser: dayTurnoverAdser
                        }
                    } else {
                        // Monthly - ไม่สะสม
                        const dollarPerCover = daySpend > 0 && exchangeRate > 0
                            ? (dayTurnoverAdser / exchangeRate) / daySpend
                            : 0

                        periodData[key] = {
                            cpm: dayMessage > 0 ? parseFloat((daySpend / dayMessage).toFixed(2)) : 0,
                            costPerDeposit: dayDeposit > 0 ? parseFloat((daySpend / dayDeposit).toFixed(2)) : 0,
                            depositAmount: dayDeposit,
                            dollarPerCover: parseFloat(dollarPerCover.toFixed(4)),
                            spend: daySpend,
                            deposit: dayDeposit,
                            turnoverAdser: dayTurnoverAdser
                        }
                    }
                }
            }

            chartData.push(periodData)
        }

        return NextResponse.json({
            success: true,
            data: chartData,
            period,
            view
        })

    } catch (error) {
        console.error('Chart data API error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
