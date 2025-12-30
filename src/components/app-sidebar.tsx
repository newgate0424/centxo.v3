"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Settings, LogOut, Menu, Megaphone, Rocket, Sparkles, ChevronRight, ChevronDown, Layers } from "lucide-react"
import { useState } from "react"

import { cn } from "@/lib/utils"
import { signOut } from "next-auth/react"
import { useLanguage } from "@/contexts/LanguageContext"

interface AppSidebarProps {
    isCollapsed: boolean
    toggleSidebar: () => void
    onMobileClose?: () => void
    isMobile?: boolean
}

// Define Navigation Structure
type NavItem = {
    name: string
    href: string
    icon?: any
    translationKey?: string
    isChild?: boolean
}

type NavGroup = {
    label?: string
    items: (NavItem | {
        name: string
        icon: any
        translationKey?: string
        children: NavItem[]
    })[]
}

const navStructure: NavGroup[] = [
    {
        label: "Platform",
        items: [
            { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, translationKey: 'nav.dashboard' },
            {
                name: "Campaigns",
                icon: Layers,
                translationKey: 'nav.campaigns',
                children: [
                    { name: "Automation (V2)", href: "/automation-campaignsv2", icon: Sparkles, translationKey: 'nav.automationV2', isChild: true },
                    { name: "Automation (Legacy)", href: "/automation-campaigns", icon: Sparkles, translationKey: 'nav.automation', isChild: true },
                    { name: "Launch Wizard", href: "/launch-new", icon: Rocket, translationKey: 'nav.launchNew', isChild: true },
                    { name: "Classic Launch", href: "/launch", icon: Rocket, translationKey: 'nav.launchOriginal', isChild: true },
                ]
            },
            {
                name: "Ads Manager",
                icon: Megaphone,
                translationKey: 'nav.adsManager',
                children: [
                    { name: "Campaigns", href: "/ads-manager/campaigns", icon: LayoutDashboard, translationKey: 'adsManager.campaigns', isChild: true },
                    { name: "Accounts", href: "/ads-manager/accounts", icon: Megaphone, translationKey: 'adsManager.accounts', isChild: true },
                ]
            },
        ]
    },
    {
        items: [
            {
                name: "Settings",
                icon: Settings,
                translationKey: 'nav.settings',
                children: [
                    { name: "General", href: "/settings/general", icon: Settings, translationKey: 'settings.general', isChild: true },
                    { name: "Ad Accounts", href: "/settings/ad-accounts", icon: Megaphone, translationKey: 'settings.adAccounts', isChild: true },
                    { name: "Billing", href: "/settings/billing", icon: Settings, translationKey: 'settings.billing', isChild: true },
                    { name: "Integrations", href: "/settings/integrations", icon: Sparkles, translationKey: 'settings.integrations', isChild: true },
                ]
            }
        ]
    }
]

export default function AppSidebar({ isCollapsed, toggleSidebar, onMobileClose, isMobile = false }: AppSidebarProps) {
    const pathname = usePathname()
    const { t } = useLanguage()
    // Strip locale prefix for navigation comparison
    const pathnameWithoutLocale = pathname.replace(/^\/(en|th)/, '') || '/'

    // State for Collapsed Groups
    // Default open: "Campaigns"
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
        "Campaigns": true
    })

    const toggleGroup = (groupName: string) => {
        if (isCollapsed) return // Don't toggle in collapsed mode
        setOpenGroups(prev => ({
            ...prev,
            [groupName]: !prev[groupName]
        }))
    }

    return (
        <div className={cn(
            "flex flex-col h-full",
            "transition-all duration-300 ease-out",
            isCollapsed ? "w-16" : "w-64",
            isMobile ? "bg-background/95 backdrop-blur-xl border-r w-64" : "bg-transparent"
        )}>
            {/* Logo Area */}
            <div className={cn(
                "flex items-center h-16 transition-all duration-300",
                isCollapsed ? "justify-center px-0" : "px-6"
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
            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
                {navStructure.map((group, groupIndex) => (
                    <div key={groupIndex} className="space-y-1">
                        {/* Group Label */}
                        {!isCollapsed && group.label && (
                            <h4 className="px-3 text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider mb-2">
                                {group.label}
                            </h4>
                        )}

                        <nav className="space-y-1">
                            {group.items.map((item: any, itemIndex) => {
                                // 1. Parent Item with Children
                                if (item.children) {
                                    const isOpen = openGroups[item.name] || false
                                    const isAnyChildActive = item.children.some((child: any) =>
                                        pathnameWithoutLocale === child.href || pathnameWithoutLocale.startsWith(child.href + '/')
                                    )

                                    return (
                                        <div key={item.name}>
                                            <button
                                                onClick={() => toggleGroup(item.name)}
                                                className={cn(
                                                    "w-full flex items-center justify-between py-2 px-3 text-sm font-medium rounded-lg transition-colors group select-none",
                                                    isAnyChildActive ? "text-primary bg-primary/5" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                                                    isCollapsed && "justify-center px-0"
                                                )}
                                                title={isCollapsed ? item.name : undefined}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <item.icon className={cn("h-4 w-4", isAnyChildActive ? "text-primary" : "text-muted-foreground")} />
                                                    {!isCollapsed && <span>{t(item.translationKey, item.name)}</span>}
                                                </div>
                                                {!isCollapsed && (
                                                    <ChevronRight className={cn(
                                                        "h-3 w-3 text-muted-foreground/50 transition-transform duration-200",
                                                        isOpen && "rotate-90"
                                                    )} />
                                                )}
                                            </button>

                                            {/* Nested Items */}
                                            {!isCollapsed && isOpen && (
                                                <div className="mt-1 ml-4 pl-3 border-l border-border/40 space-y-1">
                                                    {item.children.map((child: any) => {
                                                        const isActive = pathnameWithoutLocale === child.href || pathnameWithoutLocale.startsWith(child.href + '/')
                                                        return (
                                                            <Link
                                                                key={child.href}
                                                                href={child.href}
                                                                onClick={onMobileClose}
                                                                className={cn(
                                                                    "block py-1.5 px-3 text-sm rounded-md transition-colors",
                                                                    isActive
                                                                        ? "text-primary font-medium bg-primary/5"
                                                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                                                                )}
                                                            >
                                                                {t(child.translationKey, child.name)}
                                                            </Link>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )
                                }

                                // 2. Single Link Item
                                const isActive = pathnameWithoutLocale === item.href || pathnameWithoutLocale.startsWith(item.href + '/')

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={onMobileClose}
                                        className={cn(
                                            "flex items-center py-2 px-3 text-sm font-medium rounded-lg transition-colors group relative",
                                            isActive
                                                ? "bg-primary text-primary-foreground shadow-sm"
                                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                                            isCollapsed ? "justify-center px-0 w-10 mx-auto" : ""
                                        )}
                                        title={isCollapsed ? item.name : undefined}
                                    >
                                        <item.icon
                                            className={cn(
                                                "h-4 w-4 flex-shrink-0 transition-transform",
                                                isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground",
                                                !isCollapsed && "mr-3"
                                            )}
                                        />
                                        {!isCollapsed && (
                                            <span>
                                                {t(item.translationKey ?? item.name, item.name)}
                                            </span>
                                        )}
                                    </Link>
                                )
                            })}
                        </nav>
                    </div>
                ))}
            </div>

            {/* Footer / User / Collapse Toggle */}
            <div className="p-3 mt-auto border-t border-border/30">
                {!isMobile && (
                    <button
                        onClick={toggleSidebar}
                        className={cn(
                            "flex items-center justify-center w-full py-2 rounded-lg text-muted-foreground hover:bg-muted/50 transition-colors mb-1",
                            isCollapsed ? "px-0 w-10 mx-auto" : "px-3"
                        )}
                        title={isCollapsed ? "Expand" : "Collapse"}
                    >
                        <Menu size={18} />
                    </button>
                )}

                <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className={cn(
                        "flex items-center w-full py-2 text-sm font-medium text-destructive/80 hover:text-destructive rounded-lg hover:bg-destructive/10 transition-all",
                        isCollapsed ? "justify-center px-0 w-10 mx-auto" : "px-3"
                    )}
                    title={isCollapsed ? t('header.logout', 'Log out') : undefined}
                >
                    <LogOut className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
                    {!isCollapsed && t('header.logout', 'Log out')}
                </button>
            </div>
        </div>
    )
}
