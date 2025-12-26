"use client"

import { useLanguage } from "@/contexts/LanguageContext"
import { BarChart3, Zap, Users2 } from "lucide-react"

export default function SimpleFeature() {
    const { t } = useLanguage()

    return (
        <section className="py-24 bg-white">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-blue-600 font-semibold tracking-wide uppercase text-sm mb-3">
                        {t.landing.features.title}
                    </h2>
                    <h3 className="text-3xl font-bold text-gray-900 mb-4">
                        {t.landing.features.mainTitle}
                    </h3>
                    <p className="text-lg text-gray-500">
                        {t.landing.features.description}
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-12">
                    {/* Feature 1 */}
                    <div className="flex flex-col items-center text-center group">
                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 text-blue-600 transition-transform group-hover:scale-110 duration-300">
                            <BarChart3 className="w-8 h-8" />
                        </div>
                        <h4 className="text-xl font-bold text-gray-900 mb-3">
                            {t.landing.features.simpleItems.one.title}
                        </h4>
                        <p className="text-gray-500 leading-relaxed">
                            {t.landing.features.simpleItems.one.description}
                        </p>
                    </div>

                    {/* Feature 2 */}
                    <div className="flex flex-col items-center text-center group">
                        <div className="w-16 h-16 bg-cyan-50 rounded-2xl flex items-center justify-center mb-6 text-cyan-600 transition-transform group-hover:scale-110 duration-300">
                            <Zap className="w-8 h-8" />
                        </div>
                        <h4 className="text-xl font-bold text-gray-900 mb-3">
                            {t.landing.features.simpleItems.two.title}
                        </h4>
                        <p className="text-gray-500 leading-relaxed">
                            {t.landing.features.simpleItems.two.description}
                        </p>
                    </div>

                    {/* Feature 3 */}
                    <div className="flex flex-col items-center text-center group">
                        <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 text-purple-600 transition-transform group-hover:scale-110 duration-300">
                            <Users2 className="w-8 h-8" />
                        </div>
                        <h4 className="text-xl font-bold text-gray-900 mb-3">
                            {t.landing.features.simpleItems.three.title}
                        </h4>
                        <p className="text-gray-500 leading-relaxed">
                            {t.landing.features.simpleItems.three.description}
                        </p>
                    </div>
                </div>
            </div>
        </section>
    )
}
