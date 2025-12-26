"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

export default function FAQ() {
    const faqs = [
        {
            question: "How does the free trial work?",
            answer: "You can try ADSER free for 14 days. No credit card is required to start. You'll get full access to all features in the Pro plan during your trial."
        },
        {
            question: "Can I cancel my subscription anytime?",
            answer: "Yes, you can cancel your subscription at any time. There are no long-term contracts or cancellation fees. Your access will continue until the end of your billing period."
        },
        {
            question: "Is my data secure?",
            answer: "Absolutely. We use bank-grade encryption to protect your data and are fully GDPR and CCPA compliant. We never share your data with third parties."
        },
        {
            question: "Do you offer discounts for non-profits?",
            answer: "Yes! We offer a 50% discount for registered non-profit organizations. Please contact our support team with your documentation to apply."
        },
        {
            question: "Can I upgrade or downgrade my plan?",
            answer: "Yes, you can change your plan at any time from your account settings. Prorated charges or credits will be applied automatically."
        }
    ]

    const [openIndex, setOpenIndex] = useState<number | null>(0)

    return (
        <section className="py-24 bg-gray-50">
            <div className="max-w-3xl mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-blue-600 font-semibold tracking-wide uppercase text-sm mb-3">FAQ</h2>
                    <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                        Frequently Asked Questions
                    </h3>
                    <p className="text-xl text-gray-600">
                        Have questions? We're here to help.
                    </p>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <div
                            key={index}
                            className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-200"
                        >
                            <button
                                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                className="w-full px-6 py-4 flex items-center justify-between text-left focus:outline-none"
                            >
                                <span className="font-semibold text-gray-900">{faq.question}</span>
                                {openIndex === index ? (
                                    <ChevronUp className="w-5 h-5 text-blue-600" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                )}
                            </button>
                            <div
                                className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${openIndex === index ? 'max-h-40 pb-6 opacity-100' : 'max-h-0 opacity-0'
                                    }`}
                            >
                                <p className="text-gray-600 leading-relaxed">
                                    {faq.answer}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
