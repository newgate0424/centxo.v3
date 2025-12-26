import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster";
import AuthProvider from '@/app/providers/auth-provider';
import { AdAccountProvider } from '@/contexts/AdAccountContext';
import { ThemeProvider } from '@/components/theme-provider';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Roboto, Sarabun } from 'next/font/google';
import './globals.css';

const roboto = Roboto({ 
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'], 
  variable: '--font-roboto' 
});
const sarabun = Sarabun({ 
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin', 'thai'], 
  variable: '--font-sarabun' 
});

export const metadata: Metadata = {
    title: 'Centxo - Advanced Ad Management',
    description: 'Scale your advertising campaigns with AI automation',
    icons: {
        icon: '/centxo-logo.png',
        shortcut: '/centxo-logo.png',
        apple: '/centxo-logo.png',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`min-h-screen bg-background text-foreground antialiased ${roboto.variable} ${sarabun.variable} font-sans`}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange={false}
                    storageKey="adpilot-theme"
                >
                    <LanguageProvider>
                        <AuthProvider>
                            <AdAccountProvider>
                                {children}
                            </AdAccountProvider>
                        </AuthProvider>
                        <Toaster />
                    </LanguageProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
