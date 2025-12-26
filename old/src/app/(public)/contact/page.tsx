"use client"

import { useState } from "react"
import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"
import { LogoStatic } from "@/components/Logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Mail, MessageSquare, MapPin, Phone, Clock, Send } from "lucide-react"

export default function ContactPage() {
    const { language } = useLanguage()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)

        // Simulate form submission
        await new Promise(resolve => setTimeout(resolve, 1000))

        toast.success(
            language === "th"
                ? "ส่งข้อความเรียบร้อยแล้ว เราจะติดต่อกลับโดยเร็ว"
                : "Message sent successfully! We'll get back to you soon."
        )

        // Reset form
        const form = e.target as HTMLFormElement
        form.reset()
        setIsSubmitting(false)
    }

    const contactInfo = [
        {
            icon: Mail,
            titleEn: "Email",
            titleTh: "อีเมล",
            value: "support@adser.com",
            href: "mailto:support@adser.com"
        },
        {
            icon: Phone,
            titleEn: "Phone",
            titleTh: "โทรศัพท์",
            value: "+66  -",
            href: "tel:+6621234567"
        },
        {
            icon: MapPin,
            titleEn: "Address",
            titleTh: "ที่อยู่",
            value: language === "th"
                ? "กรุงเทพมหานคร, ประเทศไทย"
                : "Bangkok, Thailand",
            href: null
        },
        {
            icon: Clock,
            titleEn: "Business Hours",
            titleTh: "เวลาทำการ",
            value: language === "th"
                ? "จันทร์ - ศุกร์: 9:00 - 18:00"
                : "Mon - Fri: 9:00 AM - 6:00 PM",
            href: null
        }
    ]

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <Link href="/">
                        <LogoStatic size="md" />
                    </Link>
                    <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">
                        {language === "th" ? "เข้าสู่ระบบ" : "Sign In"}
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="container mx-auto px-6 py-12">
                <div className="max-w-6xl mx-auto">
                    {/* Header Section */}
                    <div className="text-center mb-12">
                        <h1 className="text-3xl font-bold text-gray-900 mb-4">
                            {language === "th" ? "ติดต่อเรา" : "Contact Us"}
                        </h1>
                        <p className="text-gray-600 max-w-2xl mx-auto">
                            {language === "th"
                                ? "มีคำถามหรือข้อเสนอแนะ? เรายินดีรับฟังจากคุณ กรอกแบบฟอร์มด้านล่างหรือติดต่อเราผ่านช่องทางอื่นๆ"
                                : "Have questions or feedback? We'd love to hear from you. Fill out the form below or reach us through other channels."}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12">
                        {/* Contact Form */}
                        <div className="bg-white rounded-xl shadow-sm border p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <MessageSquare className="h-5 w-5 text-blue-600" />
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900">
                                    {language === "th" ? "ส่งข้อความ" : "Send a Message"}
                                </h2>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName">
                                            {language === "th" ? "ชื่อ" : "First Name"} *
                                        </Label>
                                        <Input
                                            id="firstName"
                                            name="firstName"
                                            placeholder={language === "th" ? "ชื่อของคุณ" : "Your first name"}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName">
                                            {language === "th" ? "นามสกุล" : "Last Name"} *
                                        </Label>
                                        <Input
                                            id="lastName"
                                            name="lastName"
                                            placeholder={language === "th" ? "นามสกุลของคุณ" : "Your last name"}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">
                                        {language === "th" ? "อีเมล" : "Email"} *
                                    </Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder={language === "th" ? "your@email.com" : "your@email.com"}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="subject">
                                        {language === "th" ? "หัวข้อ" : "Subject"} *
                                    </Label>
                                    <Input
                                        id="subject"
                                        name="subject"
                                        placeholder={language === "th" ? "หัวข้อที่ต้องการติดต่อ" : "What is this about?"}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="message">
                                        {language === "th" ? "ข้อความ" : "Message"} *
                                    </Label>
                                    <textarea
                                        id="message"
                                        name="message"
                                        rows={5}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                        placeholder={language === "th" ? "กรุณาใส่รายละเอียด..." : "Please provide details..."}
                                        required
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            {language === "th" ? "กำลังส่ง..." : "Sending..."}
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <Send className="h-4 w-4" />
                                            {language === "th" ? "ส่งข้อความ" : "Send Message"}
                                        </span>
                                    )}
                                </Button>
                            </form>
                        </div>

                        {/* Contact Information */}
                        <div className="space-y-6">
                            <div className="bg-white rounded-xl shadow-sm border p-8">
                                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                                    {language === "th" ? "ข้อมูลติดต่อ" : "Contact Information"}
                                </h2>

                                <div className="space-y-6">
                                    {contactInfo.map((item, index) => (
                                        <div key={index} className="flex items-start gap-4">
                                            <div className="p-2 bg-gray-100 rounded-lg shrink-0">
                                                <item.icon className="h-5 w-5 text-gray-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">
                                                    {language === "th" ? item.titleTh : item.titleEn}
                                                </p>
                                                {item.href ? (
                                                    <a
                                                        href={item.href}
                                                        className="text-gray-900 font-medium hover:text-blue-600 transition-colors"
                                                    >
                                                        {item.value}
                                                    </a>
                                                ) : (
                                                    <p className="text-gray-900 font-medium">{item.value}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* FAQ Section */}
                            <div className="bg-white rounded-xl shadow-sm border p-8">
                                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                    {language === "th" ? "คำถามที่พบบ่อย" : "Frequently Asked Questions"}
                                </h2>
                                <p className="text-gray-600 mb-4">
                                    {language === "th"
                                        ? "คุณอาจพบคำตอบสำหรับคำถามของคุณในหน้า FAQ ของเรา"
                                        : "You might find the answer to your question in our FAQ section."}
                                </p>
                                <Link href="/#faq">
                                    <Button variant="outline" className="w-full">
                                        {language === "th" ? "ดูคำถามที่พบบ่อย" : "View FAQ"}
                                    </Button>
                                </Link>
                            </div>

                            {/* Support Hours */}
                            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-8 text-white">
                                <h2 className="text-xl font-semibold mb-4">
                                    {language === "th" ? "เวลาตอบกลับ" : "Response Time"}
                                </h2>
                                <p className="text-blue-100 mb-2">
                                    {language === "th"
                                        ? "เราพยายามตอบกลับทุกข้อความภายใน 24 ชั่วโมงทำการ"
                                        : "We aim to respond to all inquiries within 24 business hours."}
                                </p>
                                <p className="text-blue-100 text-sm">
                                    {language === "th"
                                        ? "สำหรับลูกค้าแผน Pro และ Enterprise จะได้รับการสนับสนุนแบบลำดับความสำคัญ"
                                        : "Pro and Enterprise customers receive priority support."}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t max-w-6xl mx-auto">
                    <Link href="/" className="text-blue-600 hover:underline">
                        ← {language === "th" ? "กลับหน้าหลัก" : "Back to Home"}
                    </Link>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t py-6">
                <div className="container mx-auto px-6 text-center text-sm text-gray-500">
                    © 2025 Adser. {language === "th" ? "สงวนลิขสิทธิ์." : "All rights reserved."}
                </div>
            </footer>
        </div>
    )
}
