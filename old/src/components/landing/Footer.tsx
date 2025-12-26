"use client"

import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"
import { LogoStatic } from "@/components/Logo"

export default function Footer() {
    const { t } = useLanguage()

    return (
        <footer className="bg-gray-50 border-t py-12">
            <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
                <div className="mb-4 md:mb-0">
                    <LogoStatic size="md" />
                    <p className="text-sm text-gray-500 mt-2">{t.landing.footer.copyright}</p>
                </div>
                <div className="flex space-x-6">
                    <Link href="/privacy" className="text-gray-500 hover:text-gray-900">{t.landing.footer.privacy}</Link>
                    <Link href="/terms" className="text-gray-500 hover:text-gray-900">{t.landing.footer.terms}</Link>
                    <Link href="/contact" className="text-gray-500 hover:text-gray-900">{t.landing.footer.contact}</Link>
                </div>
            </div>
        </footer>
    )
}
