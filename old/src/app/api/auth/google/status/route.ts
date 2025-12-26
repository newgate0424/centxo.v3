import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const account = await db.account.findFirst({
        where: {
            userId: session.user.id,
            provider: 'google'
        }
    })

    let googleProfile = {
        name: session.user.name,
        email: session.user.email,
        picture: session.user.image
    }

    if (account && account.access_token) {
        try {
            // Fetch actual Google profile to show correct connected account info
            const res = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
                headers: { Authorization: `Bearer ${account.access_token}` }
            })
            if (res.ok) {
                const data = await res.json()
                googleProfile = {
                    name: data.name,
                    email: data.email,
                    picture: data.picture
                }
            }
        } catch (error) {
            console.error('Error fetching Google profile:', error)
        }
    }

    return NextResponse.json({
        isConnected: !!account,
        email: googleProfile.email,
        name: googleProfile.name,
        picture: googleProfile.picture
    })
}
