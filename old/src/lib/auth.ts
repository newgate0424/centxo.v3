import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import FacebookProvider from "next-auth/providers/facebook"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { db } from "@/lib/db"
import { compare } from "bcryptjs"
import { logActivity } from "@/lib/activity-log"
import { Adapter, AdapterUser, AdapterAccount } from "next-auth/adapters"

// Custom adapter that sets role to 'host' for new users
function CustomPrismaAdapter(): Adapter {
    const prismaAdapter = PrismaAdapter(db)

    return {
        ...prismaAdapter,
        createUser: async (data: Omit<AdapterUser, "id">) => {
            // Check if user already exists (was pre-created by host adding to team or registered with email/password)
            const existingUser = await db.user.findUnique({
                where: { email: data.email! }
            })

            if (existingUser) {
                // User was pre-created or registered, update with OAuth data and return
                const updatedUser = await db.user.update({
                    where: { id: existingUser.id },
                    data: {
                        name: existingUser.name || data.name, // Keep existing name if set
                        image: existingUser.image || data.image, // Keep existing image if set
                        emailVerified: data.emailVerified || existingUser.emailVerified,
                    }
                })
                return updatedUser as AdapterUser
            }

            // For new user via OAuth, check whitelist before creating
            const allowedEmail = await (db as any).allowedEmail.findUnique({
                where: { email: data.email!.toLowerCase() }
            })

            if (!allowedEmail) {
                console.log(`[Adapter] Email not in whitelist, rejecting user creation: ${data.email}`)
                throw new Error('Email not allowed')
            }

            // New user - create with role 'host' and default permissions
            const user = await db.user.create({
                data: {
                    ...data,
                    role: 'host', // New users who sign up are always host
                    permissions: ['view_admanager', 'view_google_sheets'], // Default permissions
                }
            })
            return user as AdapterUser
        },
        // Override linkAccount to handle existing users properly
        linkAccount: async (account: AdapterAccount) => {
            // Check if account already exists
            const existingAccount = await db.account.findUnique({
                where: {
                    provider_providerAccountId: {
                        provider: account.provider,
                        providerAccountId: account.providerAccountId
                    }
                }
            })

            if (existingAccount) {
                // Account already linked, update tokens
                await db.account.update({
                    where: { id: existingAccount.id },
                    data: {
                        access_token: account.access_token,
                        expires_at: account.expires_at,
                        refresh_token: account.refresh_token,
                        scope: account.scope,
                        id_token: account.id_token,
                        token_type: account.token_type,
                    }
                })
                return existingAccount as AdapterAccount
            }

            // Create new account link
            const newAccount = await db.account.create({
                data: {
                    userId: account.userId,
                    type: account.type,
                    provider: account.provider,
                    providerAccountId: account.providerAccountId,
                    access_token: account.access_token,
                    expires_at: account.expires_at,
                    refresh_token: account.refresh_token,
                    scope: account.scope,
                    id_token: account.id_token,
                    token_type: account.token_type,
                    session_state: account.session_state as string | undefined,
                }
            })
            return newAccount as AdapterAccount
        }
    }
}


export const authOptions: NextAuthOptions = {
    debug: true,
    adapter: CustomPrismaAdapter(),
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login",
    },
    useSecureCookies: process.env.NODE_ENV === "production",
    cookies: {
        sessionToken: {
            name: process.env.NODE_ENV === "production"
                ? `__Secure-next-auth.session-token`
                : `next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === "production",
            },
        },
    },
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code",
                    scope: "openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file",
                },
            },
        }),
        FacebookProvider({
            clientId: process.env.FACEBOOK_APP_ID!,
            clientSecret: process.env.FACEBOOK_APP_SECRET!,
            allowDangerousEmailAccountLinking: true,
            authorization: {
                params: {
                    scope: "email,public_profile,ads_read,ads_management,pages_read_engagement,pages_show_list,pages_messaging,pages_manage_metadata",
                },
            },
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null
                }

                const user = await db.user.findUnique({
                    where: {
                        email: credentials.email,
                    },
                })

                if (!user || !user.password) {
                    return null
                }

                const isPasswordValid = await compare(
                    credentials.password,
                    user.password
                )

                if (!isPasswordValid) {
                    return null
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                }
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            const email = user.email || profile?.email

            // For OAuth providers (Facebook/Google), always allow sign in
            // allowDangerousEmailAccountLinking is enabled, so adapter will handle linking
            // to existing users regardless of OAuth email address
            if (account?.provider === 'facebook' || account?.provider === 'google') {
                console.log(`[Auth] OAuth sign in - Provider: ${account.provider}, Email: ${email}, allowing...`)
                return true
            }

            // For credentials login (email/password)
            if (!email) {
                console.log('[Auth] No email found, rejecting sign in')
                return false
            }

            // Check if user exists
            const existingUser = await db.user.findUnique({
                where: { email: email.toLowerCase() }
            })
            if (existingUser) {
                console.log(`[Auth] Credentials login - user exists: ${email}`)
                return true
            }

            // Check whitelist for new users
            const allowedEmail = await (db as any).allowedEmail.findUnique({
                where: { email: email.toLowerCase() }
            })

            if (!allowedEmail) {
                console.log(`[Auth] Email not in whitelist: ${email}`)
                return '/login?error=EmailNotAllowed'
            }

            console.log(`[Auth] New user email allowed: ${email}`)
            return true
        },
        async redirect({ url, baseUrl }) {
            // Always use NEXTAUTH_URL in production if set
            const productionUrl = process.env.NEXTAUTH_URL || baseUrl

            // Prevent localhost URLs in production
            const finalUrl = productionUrl.includes('localhost') && process.env.NEXTAUTH_URL
                ? process.env.NEXTAUTH_URL
                : productionUrl

            // If url is relative, prepend the production URL
            if (url.startsWith("/")) {
                // If redirecting to root, go to dashboard instead
                if (url === "/") {
                    return `${finalUrl}/dashboard`
                }
                return `${finalUrl}${url}`
            }
            // If url is a full URL
            else {
                try {
                    const urlObj = new URL(url)
                    const baseObj = new URL(finalUrl)

                    // If same origin, check if root path
                    if (urlObj.origin === baseObj.origin) {
                        if (urlObj.pathname === "/") {
                            return `${finalUrl}/dashboard`
                        }
                        return url
                    }
                } catch (e) {
                    // Invalid URL, redirect to dashboard
                    return `${finalUrl}/dashboard`
                }
            }

            // Default: redirect to dashboard
            return `${finalUrl}/dashboard`
        },
        async session({ session, token }) {
            return {
                ...session,
                user: {
                    ...session.user,
                    id: token.id as string,
                    name: token.name as string | undefined,
                    role: token.role as string,
                    image: token.picture as string | undefined,
                },
            }
        },
        async jwt({ token, user, account, profile, trigger, session }) {
            // Handle session update (when user updates profile)
            if (trigger === 'update' && session) {
                // Update token with new data from session
                if (session.name) token.name = session.name
                if (session.image) token.picture = session.image
                return token
            }

            if (user) {
                token.id = user.id
                // Fetch role from database
                const dbUser = await db.user.findUnique({
                    where: { id: user.id },
                    select: { role: true, email: true, name: true, image: true }
                })
                // New users (OAuth) are host by default
                // If user was appointed by a host (admin/staff), keep that role
                token.role = dbUser?.role || 'host'
                token.name = dbUser?.name || user.name

                // Log login activity
                logActivity({
                    userId: user.id,
                    userEmail: dbUser?.email || user.email || '',
                    userName: dbUser?.name || user.name,
                    action: 'login',
                    details: { provider: account?.provider || 'credentials' }
                });

                // Get image from user object (from DB or OAuth)
                if (user.image) {
                    token.picture = user.image
                }
            }
            // Get image from Google profile on sign in
            if (account?.provider === "google" && profile) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                token.picture = (profile as any).picture

                // FORCE UPDATE: Save the new tokens to the database
                // NextAuth doesn't always update the Account table on re-login, so we do it manually
                // to ensure we capture the new Refresh Token and Scopes.
                if (user) {
                    try {
                        await db.account.updateMany({
                            where: {
                                userId: user.id,
                                provider: 'google'
                            },
                            data: {
                                access_token: account.access_token,
                                expires_at: account.expires_at,
                                refresh_token: account.refresh_token, // Only present if prompt="consent" was used
                                scope: account.scope,
                                id_token: account.id_token,
                                token_type: account.token_type
                            }
                        })
                    } catch (e) {
                        console.error("Failed to update Google tokens in DB:", e)
                    }
                }
            }
            // Get image from Facebook profile on sign in
            if (account?.provider === "facebook" && profile) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const fbProfile = profile as any
                token.picture = fbProfile.picture?.data?.url || fbProfile.picture

                // Exchange short-lived token for long-lived token (60 days)
                if (user && account.access_token) {
                    try {
                        console.log('[Auth] Exchanging Facebook short-lived token for long-lived token...')
                        
                        const exchangeUrl = `https://graph.facebook.com/v21.0/oauth/access_token?` +
                            `grant_type=fb_exchange_token&` +
                            `client_id=${process.env.FACEBOOK_APP_ID}&` +
                            `client_secret=${process.env.FACEBOOK_APP_SECRET}&` +
                            `fb_exchange_token=${account.access_token}`
                        
                        const response = await fetch(exchangeUrl)
                        const data = await response.json()
                        
                        let longLivedToken = account.access_token
                        let expiresAt = account.expires_at
                        
                        if (data.access_token) {
                            longLivedToken = data.access_token
                            // data.expires_in is in seconds (60 days = ~5184000 seconds)
                            expiresAt = Math.floor(Date.now() / 1000) + (data.expires_in || 5184000)
                            console.log('[Auth] Got long-lived token, expires in:', data.expires_in, 'seconds')
                        } else {
                            console.error('[Auth] Failed to exchange token:', data)
                        }
                        
                        // Update Account table with long-lived token
                        await db.account.updateMany({
                            where: {
                                userId: user.id,
                                provider: 'facebook'
                            },
                            data: {
                                access_token: longLivedToken,
                                expires_at: expiresAt,
                            }
                        })
                        
                        // Also save to User.facebookAdToken for easy access
                        await db.user.update({
                            where: { id: user.id },
                            data: {
                                facebookAdToken: longLivedToken,
                                facebookName: fbProfile.name || null
                            }
                        })
                        
                        console.log('[Auth] Facebook tokens saved successfully')
                    } catch (e) {
                        console.error("[Auth] Failed to exchange/update Facebook tokens:", e)
                    }
                }
            }
            return token
        },
    },
}
