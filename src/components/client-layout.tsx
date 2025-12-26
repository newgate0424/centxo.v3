"use client"

import { useState, useEffect } from "react"
import AppSidebar from "@/components/app-sidebar"
import AppHeader from "@/components/app-header"
import { cn } from "@/lib/utils"

interface ClientLayoutProps {
    children: React.ReactNode
    defaultCollapsed?: boolean
}

export default function ClientLayout({ children, defaultCollapsed = false }: ClientLayoutProps) {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    // Sync with valid cookie on mount if needed, but rely on defaultCollapsed for initial render
    useEffect(() => {
        // Optional: Keep localStorage as backup or legacy support?
        // Better to just stick to one source of truth -> Cookie
    }, [])

    const toggleSidebar = () => {
        const newState = !isCollapsed
        setIsCollapsed(newState)
        document.cookie = `sidebar:state=${newState}; path=/; max-age=31536000` // 1 year
    }

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen)
    }

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false)
    }

    return (
        <div className="flex h-screen overflow-hidden bg-background relative selection:bg-primary/20">
            {/* Ambient Background Gradient */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] opacity-50 dark:opacity-20 animate-pulse" style={{ animationDuration: '4s' }} />
                <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-accent/30 blur-[100px] opacity-60 dark:opacity-20" />
            </div>

            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
                    onClick={closeMobileMenu}
                />
            )}

            {/* Mobile Sidebar */}
            <div className={cn(
                "fixed md:hidden z-50 h-full",
                "transition-transform duration-300 ease-out",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <AppSidebar
                    isCollapsed={false}
                    toggleSidebar={toggleSidebar}
                    onMobileClose={closeMobileMenu}
                    isMobile={true}
                />
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden md:block z-30 relative">
                <AppSidebar
                    isCollapsed={isCollapsed}
                    toggleSidebar={toggleSidebar}
                />
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col flex-1 overflow-hidden relative z-10">
                <AppHeader onMobileMenuToggle={toggleMobileMenu} />

                <main className="flex-1 overflow-hidden p-0 md:p-2 lg:p-4 pt-0">
                    <div className="flex-1 h-full overflow-hidden rounded-none md:rounded-2xl border-none md:border border-white/20 bg-white/30 dark:bg-black/10 backdrop-blur-sm shadow-sm md:mr-2 lg:mr-4">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
