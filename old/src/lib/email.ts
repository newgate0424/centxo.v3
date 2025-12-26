import { Resend } from 'resend'

// Only initialize Resend if API key is available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

interface SendPasswordResetEmailParams {
    email: string
    token: string
}

export async function sendPasswordResetEmail({ email, token }: SendPasswordResetEmailParams) {
    if (!resend) {
        console.error('RESEND_API_KEY is not configured')
        throw new Error('Email service is not configured')
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://adser.net'
    const resetLink = `${baseUrl}/reset-password?token=${token}`

    try {
        const data = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'Adser <noreply@resend.dev>',
            to: email,
            subject: 'Reset your password - Adser',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                        <div style="background-color: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                            <!-- Logo -->
                            <div style="text-align: center; margin-bottom: 32px;">
                                <div style="display: inline-flex; align-items: center; gap: 8px;">
                                    <div style="background-color: #2563eb; padding: 8px; border-radius: 8px;">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                    </div>
                                    <span style="font-size: 24px; font-weight: bold; color: #111827;">ADSER</span>
                                </div>
                            </div>

                            <!-- Content -->
                            <h1 style="color: #111827; font-size: 24px; font-weight: bold; text-align: center; margin-bottom: 16px;">
                                Reset your password
                            </h1>
                            <p style="color: #6b7280; font-size: 16px; text-align: center; margin-bottom: 32px; line-height: 1.6;">
                                We received a request to reset your password. Click the button below to create a new password. This link will expire in 1 hour.
                            </p>

                            <!-- Button -->
                            <div style="text-align: center; margin-bottom: 32px;">
                                <a href="${resetLink}" style="display: inline-block; background-color: #2563eb; color: white; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 12px; text-decoration: none;">
                                    Reset Password
                                </a>
                            </div>

                            <!-- Alternative Link -->
                            <p style="color: #9ca3af; font-size: 14px; text-align: center; margin-bottom: 16px;">
                                Or copy and paste this link into your browser:
                            </p>
                            <p style="color: #2563eb; font-size: 14px; text-align: center; word-break: break-all; margin-bottom: 32px;">
                                ${resetLink}
                            </p>

                            <!-- Footer -->
                            <div style="border-top: 1px solid #e5e7eb; padding-top: 24px;">
                                <p style="color: #9ca3af; font-size: 14px; text-align: center; margin: 0;">
                                    If you didn't request a password reset, you can safely ignore this email.
                                </p>
                            </div>
                        </div>

                        <!-- Bottom Footer -->
                        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
                            © 2025 Adser. All rights reserved.
                        </p>
                    </div>
                </body>
                </html>
            `
        })

        return { success: true, data }
    } catch (error) {
        console.error('Failed to send password reset email:', error)
        return { success: false, error }
    }
}
