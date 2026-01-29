import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import AuthProvider from '@/app/providers/auth-provider';
import { AdAccountProvider } from '@/contexts/AdAccountContext';
import { ThemeProvider } from '@/components/theme-provider';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeColorProvider } from '@/contexts/ThemeColorContext';
import './globals.css';

// Use system fonts as fallback during build
const fontVariables = '--font-roboto:system-ui,arial,sans-serif; --font-sarabun:system-ui,arial,sans-serif; --font-inter:system-ui,arial,sans-serif;';

export const metadata: Metadata = {
    title: 'Centxo - Advanced Ad Management',
    description: 'Scale your advertising campaigns with AI automation',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className="min-h-screen bg-background text-foreground antialiased font-sans">
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange={false}
                    storageKey="adpilot-theme"
                >
                    <LanguageProvider>
                        <ThemeColorProvider>
                            <AuthProvider>
                                <AdAccountProvider>
                                    {children}
                                </AdAccountProvider>
                            </AuthProvider>
                            <Toaster />
                            <SonnerToaster />
                        </ThemeColorProvider>
                    </LanguageProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
