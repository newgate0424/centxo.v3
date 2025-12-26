"use client"

import { useState, useEffect, useMemo } from "react"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import { User } from "next-auth"
import { useTheme } from "@/contexts/ThemeContext"
import { Role } from "@/lib/permissions"
import { cn } from "@/lib/utils"

interface DashboardLayoutProps {
    children: React.ReactNode
    user?: User & {
        id: string
    }
    userRole?: Role | null
}

export default function DashboardLayout({ children, user, userRole = null }: DashboardLayoutProps) {
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const { primaryIntensity } = useTheme()

    const headerBackground = useMemo(() => {
        // Map intensity 60-140 to 0-1
        const scale = Math.min(Math.max((primaryIntensity - 60) / 80, 0), 1)

        // At low intensity, keep color saturated and just add white; at high, add depth with black
        const startBlend = 65 + scale * 20 // 65% -> 85%
        const endBlendLow = 70 + scale * 10 // 70% -> 80% when low
        const endBlendHigh = 70 + scale * 25 // 70% -> 95% when high

        const mixTop = `color-mix(in oklab, var(--primary) ${startBlend}%, white)`
        const mixBottom = scale < 0.35
            ? `color-mix(in oklab, var(--primary) ${endBlendLow}%, white)`
            : `color-mix(in oklab, var(--primary) ${endBlendHigh}%, black)`

        const opacity = 0.7 + scale * 0.25 // 0.7 -> 0.95

        return {
            background: `linear-gradient(135deg, ${mixTop} 0%, ${mixBottom} 100%)`,
            opacity,
        }
    }, [primaryIntensity])

    useEffect(() => {
        const savedState = localStorage.getItem('sidebarCollapsed')
        if (savedState) {
            setIsCollapsed(JSON.parse(savedState))
        }
    }, [])

    const toggleSidebar = () => {
        const newState = !isCollapsed
        setIsCollapsed(newState)
        localStorage.setItem('sidebarCollapsed', JSON.stringify(newState))
    }

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen)
    }

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false)
    }

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={closeMobileMenu}
                />
            )}

            {/* Mobile Sidebar Overlay */}
            <div className={cn(
                "fixed md:hidden z-50 h-full",
                "transition-transform duration-300 ease-in-out",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <Sidebar
                    isCollapsed={false}
                    toggleSidebar={toggleSidebar}
                    userRole={userRole}
                    onMobileClose={closeMobileMenu}
                    isMobile={true}
                />
            </div>

            {/* Main Container */}
            <div className="flex flex-col flex-1 overflow-hidden bg-slate-50 relative">
                {/* Tall Background with Primary Color (reacts to intensity slider) */}
                <div className="absolute top-0 left-0 right-0 h-64 z-0" style={headerBackground} />

                <div className="relative z-10 flex flex-col h-full">
                    <Header
                        user={user}
                        onMobileMenuToggle={toggleMobileMenu}
                    />
                    <main className="flex-1 overflow-hidden px-4 pb-4 pt-0">
                        <div className="flex h-full gap-4">
                            {/* Desktop Sidebar - inside main content */}
                            <div className="hidden md:block">
                                <Sidebar
                                    isCollapsed={isCollapsed}
                                    toggleSidebar={toggleSidebar}
                                    userRole={userRole}
                                />
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-hidden flex flex-col">
                                <div className="flex-1 overflow-y-auto">
                                    {children}
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    )
}
