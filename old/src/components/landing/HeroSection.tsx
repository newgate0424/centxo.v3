"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import Link from "next/link"
import { Card } from "@/components/ui/card"

export default function HeroSection() {
    const { t } = useLanguage()

    return (
        <section className="relative pt-32 pb-24 overflow-hidden bg-white">
            {/* Soft Gradient Background */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-white to-white -z-10"></div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 flex flex-col items-center text-center">

                {/* Badge */}
                <div className="inline-flex items-center gap-2 bg-white border border-gray-200 shadow-sm rounded-full px-4 py-1.5 mb-8 animate-fade-in-up">
                    <span className="flex h-2 w-2 rounded-full bg-blue-600"></span>
                    <span className="text-sm font-medium text-gray-700">{t.landing.hero.badge}</span>
                </div>

                {/* Headline - Clean & Big */}
                <h1 className="text-5xl md:text-7xl font-bold text-gray-900 tracking-tight mb-6 leading-tight max-w-4xl animate-fade-in-up delay-100">
                    {t.landing.hero.headline} <br className="hidden md:block" />
                    <span className="text-blue-600">
                        {t.landing.hero.headlineHighlight}
                    </span>
                </h1>

                {/* Subheadline - Readable width */}
                <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-up delay-200">
                    {t.landing.hero.subheadline}
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 animate-fade-in-up delay-300 w-full sm:w-auto">
                    <Link href="/register" className="w-full sm:w-auto">
                        <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-500/20 transition-all hover:scale-105">
                            {t.landing.hero.startTrial} <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                    </Link>
                    <Button variant="outline" size="lg" className="w-full sm:w-auto h-14 px-8 text-lg bg-white hover:bg-gray-50 text-gray-700 border-gray-200 rounded-full transition-all hover:scale-105">
                        {t.landing.hero.viewDemo}
                    </Button>
                </div>

                {/* Dashboard Preview Card - "Glassmorphic" feel */}
                <div className="relative w-full max-w-5xl mx-auto animate-fade-in-up delay-500">
                    {/* Glow effect behind */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-2xl blur-2xl opacity-50"></div>

                    <Card className="relative bg-white/80 backdrop-blur-xl border border-gray-200/50 shadow-2xl rounded-2xl overflow-hidden aspect-[16/9] md:aspect-[16/8] lg:aspect-[21/9] flex flex-col">
                        {/* Mock Browser/App Header */}
                        <div className="h-10 border-b border-gray-100 bg-gray-50/50 flex items-center px-4 gap-2">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-400/20"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-400/20"></div>
                                <div className="w-3 h-3 rounded-full bg-green-400/20"></div>
                            </div>
                        </div>

                        {/* Mock Dashboard Content */}
                        <div className="flex-1 p-6 md:p-8 bg-gray-50/30 flex gap-6">
                            {/* Sidebar Mock */}
                            <div className="hidden md:flex flex-col gap-3 w-16 lg:w-48">
                                <div className="h-8 w-full bg-blue-100/50 rounded-lg animate-pulse"></div>
                                <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse"></div>
                                <div className="h-4 w-2/3 bg-gray-100 rounded animate-pulse"></div>
                                <div className="h-4 w-4/5 bg-gray-100 rounded animate-pulse"></div>
                            </div>

                            {/* Main Content Mock */}
                            <div className="flex-1 flex flex-col gap-6">
                                {/* Header Mock */}
                                <div className="flex justify-between items-center">
                                    <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
                                    <div className="h-8 w-24 bg-blue-600/10 rounded-full animate-pulse"></div>
                                </div>

                                {/* Stats Grid Mock */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                        <div className="text-sm text-gray-500 mb-1">{t.landing.hero.totalSpent}</div>
                                        <div className="text-2xl font-bold text-gray-900">$12,450</div>
                                        <div className="h-1 w-full bg-green-100 mt-2 rounded-full overflow-hidden">
                                            <div className="h-full w-2/3 bg-green-500"></div>
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                        <div className="text-sm text-gray-500 mb-1">{t.landing.hero.roas}</div>
                                        <div className="text-2xl font-bold text-gray-900">4.2x</div>
                                        <div className="h-1 w-full bg-blue-100 mt-2 rounded-full overflow-hidden">
                                            <div className="h-full w-4/5 bg-blue-500"></div>
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                        <div className="text-sm text-gray-500 mb-1">{t.landing.hero.conversions}</div>
                                        <div className="text-2xl font-bold text-gray-900">842</div>
                                        <div className="h-1 w-full bg-purple-100 mt-2 rounded-full overflow-hidden">
                                            <div className="h-full w-1/2 bg-purple-500"></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Chart Area Mock */}
                                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-4 relative overflow-hidden">
                                    <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-blue-50 to-transparent"></div>
                                    <div className="h-full w-full flex items-end gap-2 px-4 pb-2">
                                        {[40, 60, 45, 70, 55, 80, 65, 90, 75, 50, 60, 85].map((h, i) => (
                                            <div key={i} className="flex-1 bg-blue-100 rounded-t-sm relative group">
                                                <div className="absolute bottom-0 w-full bg-blue-500 rounded-t-sm transition-all duration-1000" style={{ height: `${h}%` }}></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </section>
    )
}
