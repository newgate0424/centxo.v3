import { NextRequest, NextResponse } from 'next/server'
import { getTokens, oauth2Client } from '@/lib/google-auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { google } from 'googleapis'

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
        return NextResponse.json({ error }, { status: 400 })
    }

    if (!code) {
        return NextResponse.json({ error: 'No code provided' }, { status: 400 })
    }

    try {
        const tokens = await getTokens(code)

        // Get user info
        oauth2Client.setCredentials(tokens)
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
        const userInfo = await oauth2.userinfo.get()

        // Save refresh token and user info
        await db.user.update({
            where: { id: session.user.id },
            data: {
                googleRefreshToken: tokens.refresh_token, // Only present on first consent or prompt: 'consent'
                googleEmail: userInfo.data.email,
                googleName: userInfo.data.name
            }
        })

        // Return HTML that closes the popup and notifies the parent window
        return new NextResponse(`
            <html>
                <script>
                    window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, window.location.origin);
                    window.close();
                </script>
                <body>
                    <h1>Authentication Successful</h1>
                    <p>You can close this window now.</p>
                </body>
            </html>
        `, {
            headers: { 'Content-Type': 'text/html' }
        })

    } catch (error) {
        console.error('Google Auth Error:', error)
        return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
    }
}
