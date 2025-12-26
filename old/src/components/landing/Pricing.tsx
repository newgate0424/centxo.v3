"use client"

import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { useState } from "react"

export default function Pricing() {
    const [isAnnual, setIsAnnual] = useState(true)

    const plans = [
        {
            name: "Starter",
            price: isAnnual ? 29 : 39,
            description: "Perfect for individuals and small businesses just getting started.",
            features: [
                "Up to 5 Ad Accounts",
                "Basic Analytics",
                "24/7 Support",
                "1 User Seat"
            ],
            highlight: false
        },
        {
            name: "Pro",
            price: isAnnual ? 79 : 99,
            description: "Ideal for growing teams that need advanced optimization tools.",
            features: [
                "Up to 20 Ad Accounts",
                "Advanced Analytics",
                "Automated Optimization",
                "Priority Support",
                "5 User Seats"
            ],
            highlight: true
        },
        {
            name: "Business",
            price: isAnnual ? 199 : 249,
            description: "For agencies and large organizations requiring maximum scale.",
            features: [
                "Unlimited Ad Accounts",
                "Custom Reporting",
                "Dedicated Account Manager",
                "API Access",
                "Unlimited User Seats"
            ],
            highlight: false
        }
    ]

    return (
        <section id="pricing" className="py-24 bg-white">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-blue-600 font-semibold tracking-wide uppercase text-sm mb-3">Pricing</h2>
                    <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                        Simple, transparent pricing
                    </h3>
                    <p className="text-xl text-gray-600 mb-8">
                        Choose the plan that best fits your needs. No hidden fees.
                    </p>

                    {/* Toggle */}
                    <div className="flex items-center justify-center gap-4">
                        <span className={`text-sm font-medium ${!isAnnual ? 'text-gray-900' : 'text-gray-500'}`}>Monthly</span>
                        <button
                            onClick={() => setIsAnnual(!isAnnual)}
                            className="relative w-14 h-8 bg-blue-600 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            <span className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform transform ${isAnnual ? 'translate-x-6' : ''}`} />
                        </button>
                        <span className={`text-sm font-medium ${isAnnual ? 'text-gray-900' : 'text-gray-500'}`}>
                            Yearly <span className="text-blue-600 text-xs font-bold bg-blue-50 px-2 py-0.5 rounded-full ml-1">Save 20%</span>
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {plans.map((plan, index) => (
                        <div
                            key={index}
                            className={`relative rounded-2xl p-8 ${plan.highlight
                                ? 'bg-gray-900 text-white shadow-xl scale-105 z-10'
                                : 'bg-white text-gray-900 border border-gray-100 shadow-sm'
                                }`}
                        >
                            {plan.highlight && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                                    Most Popular
                                </div>
                            )}
                            <h4 className="text-xl font-bold mb-2">{plan.name}</h4>
                            <div className="flex items-baseline gap-1 mb-4">
                                <span className="text-4xl font-bold">${plan.price}</span>
                                <span className={`text-sm ${plan.highlight ? 'text-gray-400' : 'text-gray-500'}`}>/month</span>
                            </div>
                            <p className={`text-sm mb-8 ${plan.highlight ? 'text-gray-300' : 'text-gray-500'}`}>
                                {plan.description}
                            </p>
                            <ul className="space-y-4 mb-8">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm">
                                        <Check className={`w-5 h-5 ${plan.highlight ? 'text-blue-400' : 'text-blue-600'}`} />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <Button
                                className={`w-full h-12 rounded-xl font-medium transition-all ${plan.highlight
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30'
                                    : 'bg-gray-50 hover:bg-gray-100 text-gray-900 border border-gray-200'
                                    }`}
                            >
                                Get Started
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
