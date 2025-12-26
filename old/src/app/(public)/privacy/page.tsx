"use client"

import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"
import { LogoStatic } from "@/components/Logo"

export default function PrivacyPolicyPage() {
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
                    {language === "th" ? "นโยบายความเป็นส่วนตัว" : "Privacy Policy"}
                </h1>

                <div className="prose prose-gray max-w-none">
                    <p className="text-gray-600 mb-6">
                        {language === "th"
                            ? "อัปเดตล่าสุด: 4 ธันวาคม 2568"
                            : "Last updated: December 4, 2025"}
                    </p>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            {language === "th" ? "1. บทนำ" : "1. Introduction"}
                        </h2>
                        <p className="text-gray-700 mb-4">
                            {language === "th"
                                ? "Adser (\"เรา\", \"ของเรา\") ให้ความสำคัญกับความเป็นส่วนตัวของคุณ นโยบายความเป็นส่วนตัวนี้อธิบายวิธีที่เราเก็บรวบรวม ใช้ และปกป้องข้อมูลส่วนบุคคลของคุณเมื่อคุณใช้บริการของเรา รวมถึงการเชื่อมต่อกับ Facebook/Meta APIs"
                                : "Adser (\"we\", \"our\", \"us\") respects your privacy. This Privacy Policy explains how we collect, use, and protect your personal information when you use our services, including integration with Facebook/Meta APIs."}
                        </p>
                        <p className="text-gray-700 mb-4">
                            {language === "th"
                                ? "โดยการใช้บริการของเรา คุณยินยอมให้มีการเก็บรวบรวมและใช้ข้อมูลตามนโยบายนี้"
                                : "By using our services, you consent to the collection and use of information in accordance with this policy."}
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            {language === "th" ? "2. ข้อมูลที่เราเก็บรวบรวม" : "2. Information We Collect"}
                        </h2>
                        <p className="text-gray-700 mb-4">
                            {language === "th" ? "เราอาจเก็บรวบรวมข้อมูลต่อไปนี้:" : "We may collect the following information:"}
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>{language === "th" ? "ข้อมูลบัญชี (ชื่อ อีเมล รหัสผ่านที่เข้ารหัส)" : "Account information (name, email, encrypted password)"}</li>
                            <li>{language === "th" ? "ข้อมูลโปรไฟล์ Facebook (ชื่อ รหัสผู้ใช้ อีเมล)" : "Facebook profile information (name, user ID, email)"}</li>
                            <li>{language === "th" ? "ข้อมูล Facebook Ads (บัญชีโฆษณา แคมเปญ ข้อมูลเชิงลึก การใช้จ่าย)" : "Facebook Ads data (ad accounts, campaigns, insights, spend)"}</li>
                            <li>{language === "th" ? "Access tokens สำหรับการเชื่อมต่อ API" : "Access tokens for API integration"}</li>
                            <li>{language === "th" ? "ข้อมูลการใช้งานและการวิเคราะห์" : "Usage data and analytics"}</li>
                            <li>{language === "th" ? "ข้อมูลอุปกรณ์และเบราว์เซอร์" : "Device and browser information"}</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            {language === "th" ? "3. การใช้ข้อมูล Facebook" : "3. Facebook Data Usage"}
                        </h2>
                        <p className="text-gray-700 mb-4">
                            {language === "th"
                                ? "เมื่อคุณเชื่อมต่อบัญชี Facebook ของคุณ เราจะ:"
                                : "When you connect your Facebook account, we:"}
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>{language === "th" ? "เข้าถึงข้อมูลบัญชีโฆษณาที่คุณอนุญาตเท่านั้น" : "Only access ad account data that you authorize"}</li>
                            <li>{language === "th" ? "ใช้ข้อมูลเพื่อแสดงสถิติและรายงานโฆษณาของคุณ" : "Use data to display your ad statistics and reports"}</li>
                            <li>{language === "th" ? "ไม่แชร์ข้อมูล Facebook ของคุณกับบุคคลที่สาม" : "Do not share your Facebook data with third parties"}</li>
                            <li>{language === "th" ? "ไม่ขายหรือใช้ข้อมูลเพื่อการโฆษณา" : "Do not sell or use data for advertising purposes"}</li>
                            <li>{language === "th" ? "จัดเก็บ access tokens อย่างปลอดภัยด้วยการเข้ารหัส" : "Store access tokens securely with encryption"}</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            {language === "th" ? "4. วิธีที่เราใช้ข้อมูลของคุณ" : "4. How We Use Your Information"}
                        </h2>
                        <p className="text-gray-700 mb-4">
                            {language === "th" ? "เราใช้ข้อมูลของคุณเพื่อ:" : "We use your information to:"}
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>{language === "th" ? "ให้บริการจัดการโฆษณา Facebook ของเรา" : "Provide our Facebook ads management services"}</li>
                            <li>{language === "th" ? "แสดงข้อมูลเชิงลึกและรายงานประสิทธิภาพโฆษณา" : "Display ad performance insights and reports"}</li>
                            <li>{language === "th" ? "จัดการบัญชีและการตรวจสอบสิทธิ์ของคุณ" : "Manage your account and authentication"}</li>
                            <li>{language === "th" ? "สื่อสารกับคุณเกี่ยวกับบริการของเรา" : "Communicate with you about our services"}</li>
                            <li>{language === "th" ? "ปรับปรุงและพัฒนาแพลตฟอร์มของเรา" : "Improve and develop our platform"}</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            {language === "th" ? "5. การแบ่งปันข้อมูล" : "5. Information Sharing"}
                        </h2>
                        <p className="text-gray-700 mb-4">
                            {language === "th"
                                ? "เราไม่ขายข้อมูลส่วนบุคคลของคุณ เราอาจแบ่งปันข้อมูลกับ:"
                                : "We do not sell your personal information. We may share information with:"}
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>{language === "th" ? "Facebook/Meta ผ่าน APIs อย่างเป็นทางการเท่านั้น" : "Facebook/Meta through official APIs only"}</li>
                            <li>{language === "th" ? "ผู้ให้บริการโครงสร้างพื้นฐาน (เซิร์ฟเวอร์ ฐานข้อมูล)" : "Infrastructure service providers (servers, databases)"}</li>
                            <li>{language === "th" ? "หน่วยงานกำกับดูแลเมื่อกฎหมายกำหนด" : "Legal authorities when required by law"}</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            {language === "th" ? "6. การเก็บรักษาและลบข้อมูล" : "6. Data Retention and Deletion"}
                        </h2>
                        <p className="text-gray-700 mb-4">
                            {language === "th"
                                ? "เราเก็บรักษาข้อมูลของคุณตราบเท่าที่บัญชีของคุณยังใช้งานอยู่ หรือตามที่จำเป็นเพื่อให้บริการแก่คุณ"
                                : "We retain your data as long as your account is active or as needed to provide you services."}
                        </p>
                        <p className="text-gray-700 mb-4">
                            {language === "th"
                                ? "คุณสามารถขอลบข้อมูลได้ตลอดเวลาโดย:"
                                : "You can request data deletion at any time by:"}
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>{language === "th" ? "ยกเลิกการเชื่อมต่อ Facebook จากการตั้งค่าบัญชี" : "Disconnecting Facebook from account settings"}</li>
                            <li>{language === "th" ? "ติดต่อเราเพื่อขอลบบัญชี" : "Contacting us to request account deletion"}</li>
                            <li>{language === "th" ? "เราจะลบข้อมูลทั้งหมดภายใน 30 วัน" : "We will delete all data within 30 days"}</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            {language === "th" ? "7. ความปลอดภัยของข้อมูล" : "7. Data Security"}
                        </h2>
                        <p className="text-gray-700 mb-4">
                            {language === "th"
                                ? "เราใช้มาตรการรักษาความปลอดภัยที่เหมาะสมเพื่อปกป้องข้อมูลของคุณ:"
                                : "We implement appropriate security measures to protect your data:"}
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>{language === "th" ? "การเข้ารหัส SSL/TLS สำหรับการส่งข้อมูล" : "SSL/TLS encryption for data transmission"}</li>
                            <li>{language === "th" ? "การเข้ารหัสข้อมูลที่จัดเก็บ" : "Encryption of stored data"}</li>
                            <li>{language === "th" ? "การควบคุมการเข้าถึงอย่างเข้มงวด" : "Strict access controls"}</li>
                            <li>{language === "th" ? "การตรวจสอบความปลอดภัยเป็นประจำ" : "Regular security audits"}</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            {language === "th" ? "8. สิทธิ์ของคุณ" : "8. Your Rights"}
                        </h2>
                        <p className="text-gray-700 mb-4">
                            {language === "th" ? "คุณมีสิทธิ์ในการ:" : "You have the right to:"}
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>{language === "th" ? "เข้าถึงข้อมูลส่วนบุคคลของคุณ" : "Access your personal data"}</li>
                            <li>{language === "th" ? "แก้ไขข้อมูลที่ไม่ถูกต้อง" : "Correct inaccurate data"}</li>
                            <li>{language === "th" ? "ขอให้ลบข้อมูลของคุณ" : "Request deletion of your data"}</li>
                            <li>{language === "th" ? "ยกเลิกการเชื่อมต่อ Facebook ได้ตลอดเวลา" : "Disconnect Facebook at any time"}</li>
                            <li>{language === "th" ? "ถอนความยินยอมได้ตลอดเวลา" : "Withdraw consent at any time"}</li>
                            <li>{language === "th" ? "ร้องเรียนต่อหน่วยงานกำกับดูแล" : "Lodge a complaint with a regulatory authority"}</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            {language === "th" ? "9. คุกกี้และเทคโนโลยีการติดตาม" : "9. Cookies and Tracking Technologies"}
                        </h2>
                        <p className="text-gray-700 mb-4">
                            {language === "th"
                                ? "เราใช้คุกกี้เพื่อ:"
                                : "We use cookies to:"}
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>{language === "th" ? "รักษาสถานะการเข้าสู่ระบบของคุณ" : "Maintain your login session"}</li>
                            <li>{language === "th" ? "จดจำการตั้งค่าของคุณ" : "Remember your preferences"}</li>
                            <li>{language === "th" ? "วิเคราะห์การใช้งานเว็บไซต์" : "Analyze website usage"}</li>
                        </ul>
                        <p className="text-gray-700 mt-4">
                            {language === "th"
                                ? "คุณสามารถจัดการการตั้งค่าคุกกี้ในเบราว์เซอร์ของคุณได้"
                                : "You can manage cookie settings in your browser."}
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            {language === "th" ? "10. การเปลี่ยนแปลงนโยบาย" : "10. Policy Changes"}
                        </h2>
                        <p className="text-gray-700 mb-4">
                            {language === "th"
                                ? "เราอาจอัปเดตนโยบายนี้เป็นครั้งคราว เราจะแจ้งให้คุณทราบถึงการเปลี่ยนแปลงที่สำคัญผ่านทางอีเมลหรือประกาศบนเว็บไซต์ของเรา การใช้บริการต่อหลังจากมีการเปลี่ยนแปลงถือว่าคุณยอมรับนโยบายใหม่"
                                : "We may update this policy periodically. We will notify you of significant changes via email or a notice on our website. Continued use of our services after changes constitutes acceptance of the new policy."}
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            {language === "th" ? "11. ติดต่อเรา" : "11. Contact Us"}
                        </h2>
                        <p className="text-gray-700 mb-4">
                            {language === "th"
                                ? "หากคุณมีคำถามเกี่ยวกับนโยบายความเป็นส่วนตัวนี้ หรือต้องการใช้สิทธิ์เกี่ยวกับข้อมูลของคุณ กรุณาติดต่อเราที่:"
                                : "If you have questions about this Privacy Policy or want to exercise your data rights, please contact us at:"}
                        </p>
                        <div className="text-gray-700 space-y-2">
                            <p><strong>Email:</strong> <a href="mailto:privacy@adser.com" className="text-blue-600 hover:underline">privacy@adser.com</a></p>
                            <p><strong>{language === "th" ? "เว็บไซต์" : "Website"}:</strong> <a href="https://www.adser.com" className="text-blue-600 hover:underline">www.adser.com</a></p>
                        </div>
                    </section>

                    <section className="mb-8 p-4 bg-gray-100 rounded-lg">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            {language === "th" ? "12. ข้อมูลสำหรับ Facebook/Meta" : "12. Facebook/Meta Compliance"}
                        </h2>
                        <p className="text-gray-700 mb-4">
                            {language === "th"
                                ? "แอปพลิเคชันนี้ใช้ Facebook Login และ Facebook Marketing API แอปนี้ปฏิบัติตาม:"
                                : "This application uses Facebook Login and Facebook Marketing API. This app complies with:"}
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li><a href="https://www.facebook.com/policy.php" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Facebook Data Policy</a></li>
                            <li><a href="https://developers.facebook.com/terms/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Meta Platform Terms</a></li>
                            <li><a href="https://developers.facebook.com/devpolicy/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Meta Developer Policies</a></li>
                        </ul>
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
                    © 2025 Adser. {language === "th" ? "สงวนลิขสิทธิ์." : "All rights reserved."}
                </div>
            </footer>
        </div>
    )
}
