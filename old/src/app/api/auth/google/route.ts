import { NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/google-auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = getAuthUrl()
    return NextResponse.redirect(url)
}
