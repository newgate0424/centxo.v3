import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';
import { compare } from 'bcryptjs';
import { createAuditLog } from '@/lib/audit';

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),

    events: {
        async signIn({ user, account, profile, isNewUser }) {
            await createAuditLog({
                userId: user.id,
                action: 'USER_LOGIN',
                details: {
                    provider: account?.provider,
                    isNewUser
                }
            });
        },
    },

    providers: [
        // Email & Password
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('Email and password required');
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                });

                if (!user || !user.password) {
                    throw new Error('Invalid email or password');
                }

                const isPasswordValid = await compare(credentials.password, user.password);

                if (!isPasswordValid) {
                    throw new Error('Invalid email or password');
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                    role: (user as any).role, // Important: Return role from database
                };
            },
        }),

        // Google OAuth
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
            allowDangerousEmailAccountLinking: true,
            authorization: {
                params: {
                    scope: 'openid email profile https://www.googleapis.com/auth/spreadsheets',
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        }),

        // Facebook OAuth
        FacebookProvider({
            clientId: process.env.FACEBOOK_APP_ID || '',
            clientSecret: process.env.FACEBOOK_APP_SECRET || '',
            allowDangerousEmailAccountLinking: true,
            authorization: {
                url: "https://www.facebook.com/v21.0/dialog/oauth",
                params: {
                    scope: process.env.FACEBOOK_SCOPE || 'email,public_profile,ads_read,ads_management,pages_read_engagement,pages_show_list,pages_messaging,pages_manage_metadata,pages_manage_ads,pages_manage_engagement,pages_read_user_content,read_insights,business_management',
                    auth_type: 'rerequest',
                },
            },
            token: "https://graph.facebook.com/oauth/access_token",
            userinfo: {
                url: "https://graph.facebook.com/me",
                params: { fields: "id,name,email,picture" },
            },
            profile(profile) {
                return {
                    id: profile.id,
                    name: profile.name,
                    email: profile.email,
                    image: profile.picture?.data?.url,
                };
            },
        }),
    ],

    pages: {
        signIn: '/login',
        signOut: '/login',
        error: '/login',
        verifyRequest: '/login',
        newUser: '/dashboard',
    },

    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },

    callbacks: {
        async jwt({ token, user, account, trigger }) {
            if (user) {
                token.id = user.id;
                // Type assertion since user comes from adapter or authorize
                token.role = (user as any).role || 'USER';
            }

            // Store Facebook access token in JWT
            if (account?.provider === 'facebook' && account?.access_token) {
                token.accessToken = account.access_token;
            }

            // Handle session update (when linking accounts)
            if (trigger === 'update') {
                // Fetch fresh user data from database
                const dbUser = await prisma.user.findUnique({
                    where: { id: token.id as string },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                        role: true,
                    },
                });

                if (dbUser) {
                    token.name = dbUser.name;
                    token.email = dbUser.email;
                    token.picture = dbUser.image;
                    token.role = dbUser.role;
                }
            }

            return token;
        },

        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
            }
            // Pass access token to session
            if (token.accessToken) {
                (session as any).accessToken = token.accessToken;
            }
            return session;
        },
    },

    secret: process.env.NEXTAUTH_SECRET,
    debug: true, // Temporarily enable for debugging
};
