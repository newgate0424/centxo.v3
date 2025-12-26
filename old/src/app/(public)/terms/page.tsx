"use client"

import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"
import { LogoStatic } from "@/components/Logo"

export default function TermsOfServicePage() {
    const { language } = useLanguage()

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
            <main className="container mx-auto px-6 py-12 max-w-4xl">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">
                    {language === "th" ? "เงื่อนไขการให้บริการ" : "Terms of Service"}
                </h1>

                <div className="prose prose-gray max-w-none">
                    <p className="text-gray-600 mb-6">
                        {language === "th"
                            ? "อัปเดตล่าสุด: 4 ธันวาคม 2568"
                            : "Last updated: December 4, 2025"}
                    </p>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            {language === "th" ? "1. การยอมรับเงื่อนไข" : "1. Acceptance of Terms"}
                        </h2>
                        <p className="text-gray-700 mb-4">
                            {language === "th"
                                ? "โดยการเข้าถึงและใช้งาน Adser คุณยอมรับและตกลงที่จะผูกพันตามข้อกำหนดและเงื่อนไขเหล่านี้ หากคุณไม่เห็นด้วยกับส่วนใดส่วนหนึ่งของเงื่อนไขเหล่านี้ คุณอาจไม่สามารถเข้าถึงบริการได้"
                                : "By accessing and using Adser, you accept and agree to be bound by these terms and conditions. If you disagree with any part of these terms, you may not access the service."}
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            {language === "th" ? "2. คำอธิบายบริการ" : "2. Description of Service"}
                        </h2>
                        <p className="text-gray-700 mb-4">
                            {language === "th"
                                ? "Adser เป็นแพลตฟอร์มจัดการโฆษณา Facebook ที่ช่วยให้ผู้ใช้จัดการแคมเปญโฆษณาหลายบัญชีจากที่เดียว เราให้บริการเครื่องมือสำหรับ:"
                                : "Adser is a Facebook Ads management platform that helps users manage multiple ad accounts from one place. We provide tools for:"}
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>{language === "th" ? "การจัดการแคมเปญโฆษณา" : "Ad campaign management"}</li>
                            <li>{language === "th" ? "การวิเคราะห์และรายงานประสิทธิภาพ" : "Performance analytics and reporting"}</li>
                            <li>{language === "th" ? "การจัดการบัญชีโฆษณาหลายบัญชี" : "Multi-account ad management"}</li>
                            <li>{language === "th" ? "ข้อมูลเชิงลึกและการเพิ่มประสิทธิภาพ" : "Insights and optimization"}</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            {language === "th" ? "3. บัญชีผู้ใช้" : "3. User Accounts"}
                        </h2>
                        <p className="text-gray-700 mb-4">
                            {language === "th" ? "เมื่อคุณสร้างบัญชีกับเรา คุณต้อง:" : "When you create an account with us, you must:"}
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>{language === "th" ? "ให้ข้อมูลที่ถูกต้องและครบถ้วน" : "Provide accurate and complete information"}</li>
                            <li>{language === "th" ? "รักษาความปลอดภัยของรหัสผ่านของคุณ" : "Maintain the security of your password"}</li>
                            <li>{language === "th" ? "รับผิดชอบต่อกิจกรรมทั้งหมดภายใต้บัญชีของคุณ" : "Be responsible for all activities under your account"}</li>
                            <li>{language === "th" ? "แจ้งเราทันทีหากมีการใช้งานโดยไม่ได้รับอนุญาต" : "Notify us immediately of any unauthorized use"}</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            {language === "th" ? "4. การเชื่อมต่อ Facebook" : "4. Facebook Integration"}
                        </h2>
                        <p className="text-gray-700 mb-4">
                            {language === "th"
                                ? "เพื่อใช้บริการของเรา คุณจะต้องเชื่อมต่อบัญชี Facebook ของคุณ คุณยอมรับว่า:"
                                : "To use our services, you will need to connect your Facebook account. You agree that:"}
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>{language === "th" ? "คุณมีสิทธิ์เข้าถึงบัญชีโฆษณา Facebook ที่คุณเชื่อมต่อ" : "You have authorization to access the Facebook ad accounts you connect"}</li>
                            <li>{language === "th" ? "คุณจะปฏิบัติตามนโยบายโฆษณาของ Facebook" : "You will comply with Facebook's advertising policies"}</li>
                            <li>{language === "th" ? "เราไม่รับผิดชอบต่อการดำเนินการของ Facebook กับบัญชีของคุณ" : "We are not responsible for Facebook's actions regarding your account"}</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            {language === "th" ? "5. การใช้งานที่ยอมรับได้" : "5. Acceptable Use"}
                        </h2>
                        <p className="text-gray-700 mb-4">
                            {language === "th" ? "คุณตกลงที่จะไม่:" : "You agree not to:"}
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>{language === "th" ? "ใช้บริการเพื่อวัตถุประสงค์ที่ผิดกฎหมาย" : "Use the service for any illegal purpose"}</li>
                            <li>{language === "th" ? "ละเมิดทรัพย์สินทางปัญญาของผู้อื่น" : "Violate any intellectual property rights"}</li>
                            <li>{language === "th" ? "พยายามเข้าถึงระบบของเราโดยไม่ได้รับอนุญาต" : "Attempt to gain unauthorized access to our systems"}</li>
                            <li>{language === "th" ? "รบกวนหรือขัดขวางการทำงานของบริการ" : "Interfere with or disrupt the service"}</li>
                            <li>{language === "th" ? "ส่งมัลแวร์หรือโค้ดที่เป็นอันตราย" : "Transmit malware or harmful code"}</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            {language === "th" ? "6. การชำระเงินและการสมัครสมาชิก" : "6. Payment and Subscription"}
                        </h2>
                        <p className="text-gray-700 mb-4">
                            {language === "th"
                                ? "แผนการสมัครสมาชิกบางแผนอาจต้องชำระค่าบริการ ข้อกำหนดการชำระเงินรวมถึง:"
                                : "Some subscription plans require payment. Payment terms include:"}
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>{language === "th" ? "ค่าบริการจะถูกเรียกเก็บตามรอบการเรียกเก็บเงิน" : "Fees are charged according to your billing cycle"}</li>
                            <li>{language === "th" ? "การสมัครสมาชิกจะต่ออายุอัตโนมัติเว้นแต่จะยกเลิก" : "Subscriptions auto-renew unless cancelled"}</li>
                            <li>{language === "th" ? "ไม่มีการคืนเงินสำหรับรอบการเรียกเก็บเงินบางส่วน" : "No refunds for partial billing periods"}</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            {language === "th" ? "7. ทรัพย์สินทางปัญญา" : "7. Intellectual Property"}
                        </h2>
                        <p className="text-gray-700 mb-4">
                            {language === "th"
                                ? "บริการและเนื้อหาต้นฉบับ คุณสมบัติ และฟังก์ชันการทำงานเป็นและจะยังคงเป็นทรัพย์สินเฉพาะของ Adser และผู้ให้อนุญาต บริการได้รับการคุ้มครองโดยลิขสิทธิ์ เครื่องหมายการค้า และกฎหมายอื่นๆ"
                                : "The service and its original content, features, and functionality are and will remain the exclusive property of Adser and its licensors. The service is protected by copyright, trademark, and other laws."}
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            {language === "th" ? "8. ข้อจำกัดความรับผิด" : "8. Limitation of Liability"}
                        </h2>
                        <p className="text-gray-700 mb-4">
                            {language === "th"
                                ? "ไม่ว่าในกรณีใด Adser ผู้อำนวยการ พนักงาน หุ้นส่วน ตัวแทน ผู้รับเหมา หรือบริษัทในเครือ จะไม่รับผิดชอบต่อความเสียหายทางอ้อม อุบัติเหตุ พิเศษ ผลสืบเนื่อง หรือเชิงลงโทษ รวมถึงแต่ไม่จำกัดเพียง การสูญเสียผลกำไร ข้อมูล การใช้งาน ค่าความนิยม หรือการสูญเสียที่ไม่มีตัวตนอื่นๆ"
                                : "In no event shall Adser, nor its directors, employees, partners, agents, contractors, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses."}
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            {language === "th" ? "9. การยกเลิก" : "9. Termination"}
                        </h2>
                        <p className="text-gray-700 mb-4">
                            {language === "th"
                                ? "เราอาจยกเลิกหรือระงับบัญชีของคุณทันทีโดยไม่ต้องแจ้งให้ทราบล่วงหน้าหรือรับผิดชอบ ด้วยเหตุผลใดก็ตาม รวมถึงแต่ไม่จำกัดเพียง หากคุณละเมิดข้อกำหนด"
                                : "We may terminate or suspend your account immediately, without prior notice or liability, for any reason, including without limitation if you breach the Terms."}
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            {language === "th" ? "10. การเปลี่ยนแปลงเงื่อนไข" : "10. Changes to Terms"}
                        </h2>
                        <p className="text-gray-700 mb-4">
                            {language === "th"
                                ? "เราขอสงวนสิทธิ์ในการแก้ไขหรือเปลี่ยนเงื่อนไขเหล่านี้ได้ตลอดเวลาตามดุลยพินิจของเราแต่เพียงผู้เดียว หากมีการแก้ไขเป็นสาระสำคัญ เราจะพยายามแจ้งให้ทราบล่วงหน้าอย่างน้อย 30 วันก่อนที่เงื่อนไขใหม่จะมีผลบังคับใช้"
                                : "We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days' notice prior to any new terms taking effect."}
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            {language === "th" ? "11. ติดต่อเรา" : "11. Contact Us"}
                        </h2>
                        <p className="text-gray-700 mb-4">
                            {language === "th"
                                ? "หากคุณมีคำถามเกี่ยวกับเงื่อนไขเหล่านี้ กรุณาติดต่อเราที่:"
                                : "If you have any questions about these Terms, please contact us at:"}
                        </p>
                        <p className="text-gray-700">
                            Email: <a href="mailto:legal@gate169.com" className="text-blue-600 hover:underline">legal@gate169.com</a>
                        </p>
                    </section>
                </div>

                <div className="mt-12 pt-8 border-t">
                    <Link href="/" className="text-blue-600 hover:underline">
                        ← {language === "th" ? "กลับหน้าหลัก" : "Back to Home"}
                    </Link>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t py-6">
                <div className="container mx-auto px-6 text-center text-sm text-gray-500">
                    © 2025 GATE169. {language === "th" ? "สงวนลิขสิทธิ์." : "All rights reserved."}
                </div>
            </footer>
        </div>
    )
}
