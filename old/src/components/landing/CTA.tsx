"use client"

import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/LanguageContext"

export default function CTA() {
    const { t } = useLanguage()

    return (
        <section className="py-24 bg-white">
            <div className="max-w-7xl mx-auto px-6">
                <div className="relative rounded-3xl overflow-hidden bg-blue-600 px-6 py-16 md:px-16 md:py-20 text-center">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10">
                        <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
                        </svg>
                    </div>

                    <div className="relative z-10 max-w-3xl mx-auto">
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                            {t.landing.cta.title}
                        </h2>
                        <p className="text-xl text-blue-100 mb-10">
                            {t.landing.cta.description}
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Button className="h-14 px-8 text-lg bg-white text-blue-600 hover:bg-blue-50 rounded-xl shadow-lg transition-all hover:scale-105 font-bold">
                                {t.landing.cta.startTrial}
                            </Button>
                            <Button variant="outline" className="h-14 px-8 text-lg bg-transparent text-white border-white hover:bg-white/10 rounded-xl transition-all hover:scale-105">
                                {t.landing.cta.scheduleDemo}
                            </Button>
                        </div>
                        <p className="mt-6 text-sm text-blue-200">
                            {t.landing.hero.noCreditCard} • {t.landing.hero.freeTrial} • {t.landing.hero.cancelAnytime}
                        </p>
                    </div>
                </div>
            </div>
        </section>
    )
}
