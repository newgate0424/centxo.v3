import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { verifyAdminToken } from '@/lib/admin-auth'

// GET - Fetch all goals (public - for dashboard)
export async function GET() {
    try {
        const goals = await prisma.dashboardGoal.findMany({
            orderBy: { tabId: 'asc' }
        })

        // Convert to object keyed by tabId
        const goalsMap: Record<number, any> = {}
        for (const goal of goals) {
            goalsMap[goal.tabId] = {
                cover: goal.cover,
                cpm: goal.cpm,
                deposit: goal.deposit,
                loss: goal.loss,
                repeat: goal.repeat,
                child: goal.child,
                costPerDeposit: goal.costPerDeposit,
            }
        }

        // Fill in defaults for missing tabs
        for (let tabId = 1; tabId <= 4; tabId++) {
            if (!goalsMap[tabId]) {
                goalsMap[tabId] = {
                    cover: 0,
                    cpm: 0,
                    deposit: 0,
                    loss: 0,
                    repeat: 0,
                    child: 0,
                    costPerDeposit: 0,
                }
            }
        }

        return NextResponse.json({ goals: goalsMap })
    } catch (error) {
        console.error('Error fetching goals:', error)
        return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 })
    }
}

// POST - Update goals (admin only)
export async function POST(request: Request) {
    try {
        // Verify admin authentication
        const cookieStore = await cookies()
        const token = cookieStore.get('admin_token')?.value

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const isValid = await verifyAdminToken(token)
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
        }

        const body = await request.json()
        const { tabId, goals } = body

        if (!tabId || !goals) {
            return NextResponse.json({ error: 'Missing tabId or goals' }, { status: 400 })
        }

        // Upsert goal for the specified tab
        const updatedGoal = await prisma.dashboardGoal.upsert({
            where: { tabId: Number(tabId) },
            create: {
                tabId: Number(tabId),
                cover: Number(goals.cover) || 0,
                cpm: Number(goals.cpm) || 0,
                deposit: Number(goals.deposit) || 0,
                loss: Number(goals.loss) || 0,
                repeat: Number(goals.repeat) || 0,
                child: Number(goals.child) || 0,
                costPerDeposit: Number(goals.costPerDeposit) || 0,
            },
            update: {
                cover: Number(goals.cover) || 0,
                cpm: Number(goals.cpm) || 0,
                deposit: Number(goals.deposit) || 0,
                loss: Number(goals.loss) || 0,
                repeat: Number(goals.repeat) || 0,
                child: Number(goals.child) || 0,
                costPerDeposit: Number(goals.costPerDeposit) || 0,
            },
        })

        return NextResponse.json({ success: true, goal: updatedGoal })
    } catch (error) {
        console.error('Error updating goals:', error)
        return NextResponse.json({ error: 'Failed to update goals' }, { status: 500 })
    }
}
