"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Globe } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLanguage } from "@/contexts/LanguageContext"
import { LogoStatic } from "@/components/Logo"

export default function Navbar() {
    const { language, setLanguage, t } = useLanguage()

    return (
        <nav className="sticky top-0 z-50 w-full bg-blue-50/80 backdrop-blur-md border-b border-blue-100/50">
            <div className="flex items-center justify-between px-6 py-4 max-w-[1400px] mx-auto w-full">
                <div className="flex items-center gap-12">
                    <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                        <LogoStatic size="md" />
                    </Link>
                </div>



                <div className="flex items-center space-x-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-blue-600">
                                <Globe className="w-4 h-4" />
                                <span className="uppercase">{language}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setLanguage('en')}>
                                English
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setLanguage('th')}>
                                ไทย
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="h-6 w-px bg-gray-200 mx-2"></div>

                    <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-blue-600">
                        {t.landing.navbar.signIn}
                    </Link>
                    <Link href="/register">
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 py-2 text-sm font-medium shadow-md shadow-blue-500/20">
                            {t.landing.navbar.getStarted}
                        </Button>
                    </Link>
                </div>
            </div>
        </nav>
    )
}
