"use client"

import { Star } from "lucide-react"

export default function Testimonials() {
    const testimonials = [
        {
            name: "Sarah Johnson",
            role: "Marketing Director",
            company: "TechFlow",
            image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150",
            content: "ADSER has completely transformed how we handle our Facebook campaigns. The automated optimization alone has saved us countless hours and improved our ROI by 40%."
        },
        {
            name: "Michael Chen",
            role: "E-commerce Founder",
            company: "Shopify Store",
            image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150&h=150",
            content: "The analytics dashboard is a game-changer. I can finally see exactly where my budget is going and which creatives are performing best. Highly recommended!"
        },
        {
            name: "Emily Davis",
            role: "Agency Owner",
            company: "Creative Digital",
            image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150&h=150",
            content: "Managing multiple client accounts used to be a nightmare. With ADSER, we've streamlined our workflow and can scale our agency without adding more headcount."
        }
    ]

    return (
        <section className="py-24 bg-gray-50">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-blue-600 font-semibold tracking-wide uppercase text-sm mb-3">Testimonials</h2>
                    <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                        Loved by marketing teams
                    </h3>
                    <p className="text-xl text-gray-600">
                        See what our customers have to say about their experience with ADSER.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {testimonials.map((testimonial, index) => (
                        <div key={index} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full">
                            <div className="flex gap-1 mb-6">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                ))}
                            </div>
                            <p className="text-gray-700 leading-relaxed mb-8 flex-1">
                                "{testimonial.content}"
                            </p>
                            <div className="flex items-center gap-4 mt-auto">
                                <img
                                    src={testimonial.image}
                                    alt={testimonial.name}
                                    className="w-12 h-12 rounded-full object-cover"
                                />
                                <div>
                                    <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
                                    <p className="text-sm text-gray-500">{testimonial.role}, {testimonial.company}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
