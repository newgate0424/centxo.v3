"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { translations, Language } from '@/lib/translations'

// Timezone mapping
const timezoneMap: Record<string, string> = {
    'auto': Intl.DateTimeFormat().resolvedOptions().timeZone,
    'asia-bangkok': 'Asia/Bangkok',
    'asia-singapore': 'Asia/Singapore',
    'utc': 'UTC',
    'america-newyork': 'America/New_York',
    'europe-london': 'Europe/London',
    'asia-tokyo': 'Asia/Tokyo',
}

type LanguageContextType = {
    language: Language
    setLanguage: (lang: Language) => void
    t: typeof translations.en
    timezone: string
    setTimezone: (tz: string) => void
    formatTime: (date: string | Date) => string
    formatDateTime: (date: string | Date) => string
    formatRelativeTime: (date: string | Date) => string
    formatConversationTime: (date: string | Date) => string
    formatMessageTime: (date: string | Date) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>('en')
    const [timezone, setTimezoneState] = useState<string>('auto')
    // const [mounted, setMounted] = useState(false)

    useEffect(() => {
        // setMounted(true)
        const savedLanguage = localStorage.getItem('laroun-language') as Language
        if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'th')) {
            setLanguage(savedLanguage)
        }
        const savedTimezone = localStorage.getItem('laroun-timezone')
        if (savedTimezone) {
            setTimezoneState(savedTimezone)
        }
    }, [])

    const handleSetLanguage = (lang: Language) => {
        setLanguage(lang)
        localStorage.setItem('laroun-language', lang)
    }

    const handleSetTimezone = (tz: string) => {
        setTimezoneState(tz)
        localStorage.setItem('laroun-timezone', tz)
    }

    // Get the actual IANA timezone string
    const getIANATimezone = () => {
        return timezoneMap[timezone] || Intl.DateTimeFormat().resolvedOptions().timeZone
    }

    // Format time as HH:mm (e.g., 22:20)
    const formatTime = (date: string | Date): string => {
        if (!date) return '-'
        const d = new Date(date)
        return d.toLocaleTimeString(language === 'th' ? 'th-TH' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: getIANATimezone()
        })
    }

    // Format full date time
    const formatDateTime = (date: string | Date): string => {
        if (!date) return '-'
        const d = new Date(date)
        return d.toLocaleString(language === 'th' ? 'th-TH' : 'en-US', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: getIANATimezone()
        })
    }

    // Format conversation time: 17:14, Yesterday, 30 Sep
    const formatConversationTime = (date: string | Date): string => {
        if (!date) return '-'
        const d = new Date(date)
        const now = new Date()
        const tz = getIANATimezone()

        // Get dates in target timezone
        const dateInTz = new Date(d.toLocaleString('en-US', { timeZone: tz }))
        const nowInTz = new Date(now.toLocaleString('en-US', { timeZone: tz }))

        // Check if same day
        const isToday = dateInTz.toDateString() === nowInTz.toDateString()

        // Check if yesterday
        const yesterday = new Date(nowInTz)
        yesterday.setDate(yesterday.getDate() - 1)
        const isYesterday = dateInTz.toDateString() === yesterday.toDateString()

        // Check if this year
        const isThisYear = dateInTz.getFullYear() === nowInTz.getFullYear()

        if (isToday) {
            // Show time: 17:14
            return d.toLocaleTimeString(language === 'th' ? 'th-TH' : 'en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: tz
            })
        }

        if (isYesterday) {
            return language === 'th' ? 'เมื่อวาน' : 'Yesterday'
        }

        // Show date: 30 Sep or 30 ก.ย.
        if (isThisYear) {
            return d.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
                day: 'numeric',
                month: 'short',
                timeZone: tz
            })
        }

        // Show full date with year: 30 Sep 2024
        return d.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            timeZone: tz
        })
    }

    // Format relative time (e.g., "ตอนนี้", "5 นาที", "2 ชม.") - kept for backwards compatibility
    const formatRelativeTime = (date: string | Date): string => {
        // Now use formatConversationTime instead
        return formatConversationTime(date)
    }

    // Format message time: HH:mm (e.g., 17:14)
    const formatMessageTime = (date: string | Date): string => {
        if (!date) return '-'
        const d = new Date(date)
        return d.toLocaleTimeString(language === 'th' ? 'th-TH' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: getIANATimezone()
        })
    }

    const value = {
        language,
        setLanguage: handleSetLanguage,
        t: translations[language],
        timezone,
        setTimezone: handleSetTimezone,
        formatTime,
        formatDateTime,
        formatRelativeTime,
        formatConversationTime,
        formatMessageTime
    }

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage() {
    const context = useContext(LanguageContext)
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider')
    }
    return context
}
