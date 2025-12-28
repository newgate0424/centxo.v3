"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Settings, LogOut, Menu, Megaphone, Rocket, CreditCard } from "lucide-react"
import { cn } from "@/lib/utils"
import { signOut } from "next-auth/react"
import { useLanguage } from "@/contexts/LanguageContext"

interface AppSidebarProps {
    isCollapsed: boolean
    toggleSidebar: () => void
    onMobileClose?: () => void
    isMobile?: boolean
}

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, translationKey: 'nav.dashboard' },
    { name: "Ads Manager", href: "/ads-manager", icon: Megaphone, translationKey: 'nav.adsManager' },
    { name: "Launch (New)", href: "/launch-new", icon: Rocket, translationKey: 'nav.launchNew' },
    { name: "Launch Campaign", href: "/launch", icon: Rocket, translationKey: 'nav.launchOriginal' },
    { name: "Settings", href: "/settings", icon: Settings, translationKey: 'nav.settings' },
]

export default function AppSidebar({ isCollapsed, toggleSidebar, onMobileClose, isMobile = false }: AppSidebarProps) {
    const pathname = usePathname()
    const { t, language } = useLanguage()
    // Strip locale prefix for navigation comparison
    const pathnameWithoutLocale = pathname.replace(/^\/(en|th)/, '') || '/'

    return (
        <div className={cn(
            "flex flex-col h-full",
            "transition-all duration-300 ease-out",
            isCollapsed ? "w-16" : "w-64",
            isMobile ? "bg-background/95 backdrop-blur-xl border-r w-64" : "bg-transparent"
        )}>
            {/* Logo Area */}
            <div className={cn(
                "flex items-center h-20 px-6 transition-all duration-300",
                isCollapsed ? "justify-center px-0" : "justify-between"
            )}>
                {/* Logo - Text hidden on collapse */}
                <Link href="/dashboard" className={cn(
                    "flex items-center gap-3 transition-opacity duration-200",
                    isCollapsed ? "hidden" : "opacity-100"
                )}>
                    <img src="/centxo-logo.png" alt="Centxo" className="w-8 h-8 rounded-xl" />
                    <span className="font-outfit font-bold text-xl tracking-tight">Centxo</span>
                </Link>

                {/* Logo Icon Only for Collapsed */}
                {isCollapsed && (
                    <img src="/centxo-logo.png" alt="Centxo" className="w-10 h-10 rounded-xl" />
                )}
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-6 px-4">
                <nav className="space-y-2">
                    {navigation.map((item) => {
                        const isActive = pathnameWithoutLocale === item.href || pathnameWithoutLocale.startsWith(item.href + '/')

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onMobileClose}
                                className={cn(
                                    "flex items-center py-3 text-sm font-medium rounded-xl transition-all duration-200 group relative overflow-hidden",
                                    isActive
                                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                                        : "text-muted-foreground hover:bg-white/50 dark:hover:bg-white/10 hover:text-foreground",
                                    isCollapsed ? "justify-center px-0 w-12 mx-auto" : "px-4"
                                )}
                                title={isCollapsed ? item.name : undefined}
                            >
                                <item.icon
                                    className={cn(
                                        "h-5 w-5 flex-shrink-0 transition-transform duration-200",
                                        isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary",
                                        !isCollapsed && "mr-3",
                                        !isCollapsed && isActive && "scale-110"
                                    )}
                                />
                                {!isCollapsed && (
                                    <span className="relative z-10">
                                        {t(item.translationKey ?? item.name, item.name)}
                                    </span>
                                )}
                            </Link>
                        )
                    })}
                </nav>
            </div>

            {/* Footer / User / Collapse Toggle */}
            <div className="p-4 mt-auto space-y-2">
                {!isMobile && (
                    <button
                        onClick={toggleSidebar}
                        className={cn(
                            "flex items-center justify-center w-full py-2 rounded-xl text-muted-foreground hover:bg-white/50 dark:hover:bg-white/10 transition-colors",
                            isCollapsed ? "px-0 w-12 mx-auto" : "px-4"
                        )}
                    >
                        <Menu size={20} />
                    </button>
                )}

                <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className={cn(
                        "flex items-center w-full py-3 text-sm font-medium text-destructive/80 hover:text-destructive rounded-xl hover:bg-destructive/10 transition-all",
                        isCollapsed ? "justify-center px-0 w-12 mx-auto" : "px-4"
                    )}
                    title={isCollapsed ? t('header.logout', 'Log out') : undefined}
                >
                    <LogOut className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
                    {!isCollapsed && t('header.logout', 'Log out')}
                </button>
            </div>
        </div>
    )
}
