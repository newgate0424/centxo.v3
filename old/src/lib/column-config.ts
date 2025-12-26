'use client'

import { useEffect, useState } from 'react'

// Column definition type
export interface ColumnDef {
    key: string
    label: string
    labelTh?: string
    category: string
    align?: 'left' | 'center' | 'right'
    width?: string
    sortable?: boolean
    // For rendering cell value
    format?: 'number' | 'currency' | 'percentage' | 'time' | 'text' | 'status'
    // For conditional display
    showFor?: ('accounts' | 'campaigns' | 'adsets' | 'ads')[]
    hideFor?: ('accounts' | 'campaigns' | 'adsets' | 'ads')[]
    fixed?: boolean // Always show, cannot be hidden
}

// Available column categories
export const COLUMN_CATEGORIES = {
    'performance': { label: 'Performance', labelTh: 'ประสิทธิภาพ' },
    'engagement': { label: 'Engagement', labelTh: 'การมีส่วนร่วม' },
    'cost': { label: 'Cost', labelTh: 'ค่าใช้จ่าย' },
    'reach': { label: 'Reach & Impressions', labelTh: 'การเข้าถึง' },
    'video': { label: 'Video', labelTh: 'วิดีโอ' },
    'messaging': { label: 'Messaging', labelTh: 'ข้อความ' },
    'conversion': { label: 'Conversion', labelTh: 'Conversion' },
    'settings': { label: 'Settings', labelTh: 'การตั้งค่า' },
}

// All available columns
export const ALL_COLUMNS: ColumnDef[] = [
    // === FIXED COLUMNS (always shown) ===
    { key: 'checkbox', label: '', category: 'fixed', fixed: true, hideFor: ['ads'] },
    { key: 'index', label: '#', category: 'fixed', align: 'center', fixed: true },
    { key: 'toggle', label: 'Off/On', labelTh: 'ปิด/เปิด', category: 'fixed', align: 'center', fixed: true, hideFor: ['accounts'] },

    // === PERFORMANCE ===
    { key: 'name', label: 'Name', labelTh: 'ชื่อ', category: 'performance', sortable: true },
    { key: 'delivery', label: 'Delivery', labelTh: 'สถานะการส่ง', category: 'performance', align: 'center', sortable: true, hideFor: ['accounts'] },
    { key: 'status', label: 'Status', labelTh: 'สถานะ', category: 'performance', align: 'center', sortable: true, showFor: ['accounts'] },
    { key: 'budget', label: 'Budget', labelTh: 'งบประมาณ', category: 'performance', align: 'right', format: 'currency', sortable: true, hideFor: ['accounts'] },
    { key: 'results', label: 'Results', labelTh: 'ผลลัพธ์', category: 'performance', align: 'right', format: 'number', sortable: true, hideFor: ['accounts'] },
    { key: 'costPerResult', label: 'Cost per Result', labelTh: 'ต้นทุนต่อผลลัพธ์', category: 'performance', align: 'right', format: 'currency', sortable: true, hideFor: ['accounts'] },

    // === REACH & IMPRESSIONS ===
    { key: 'reach', label: 'Reach', labelTh: 'การเข้าถึง', category: 'reach', align: 'right', format: 'number', sortable: true, hideFor: ['accounts'] },
    { key: 'impressions', label: 'Impressions', labelTh: 'การแสดงผล', category: 'reach', align: 'right', format: 'number', sortable: true, hideFor: ['accounts'] },
    { key: 'frequency', label: 'Frequency', labelTh: 'ความถี่', category: 'reach', align: 'right', format: 'number', sortable: true, hideFor: ['accounts'] },

    // === ENGAGEMENT ===
    { key: 'postEngagements', label: 'Post Engagements', labelTh: 'การมีส่วนร่วม', category: 'engagement', align: 'right', format: 'number', sortable: true, hideFor: ['accounts'] },
    { key: 'clicks', label: 'Clicks (All)', labelTh: 'คลิก (ทั้งหมด)', category: 'engagement', align: 'right', format: 'number', sortable: true, hideFor: ['accounts'] },
    { key: 'linkClicks', label: 'Link Clicks', labelTh: 'คลิกลิงก์', category: 'engagement', align: 'right', format: 'number', sortable: true, hideFor: ['accounts'] },
    { key: 'ctr', label: 'CTR', labelTh: 'อัตราคลิก', category: 'engagement', align: 'right', format: 'percentage', sortable: true, hideFor: ['accounts'] },
    { key: 'cpc', label: 'CPC', labelTh: 'ต้นทุนต่อคลิก', category: 'engagement', align: 'right', format: 'currency', sortable: true, hideFor: ['accounts'] },

    // === COST ===
    { key: 'spend', label: 'Amount Spent', labelTh: 'ยอดใช้จ่าย', category: 'cost', align: 'right', format: 'currency', sortable: true, hideFor: ['accounts'] },
    { key: 'cpm', label: 'CPM', labelTh: 'ต้นทุนต่อพันการแสดง', category: 'cost', align: 'right', format: 'currency', sortable: true, hideFor: ['accounts'] },

    // === MESSAGING ===
    { key: 'newMessagingContacts', label: 'New Messaging Contacts', labelTh: 'ยอดทัก', category: 'messaging', align: 'right', format: 'number', sortable: true, hideFor: ['accounts'] },
    { key: 'costPerNewMessagingContact', label: 'Cost per Message', labelTh: 'ต้นทุนต่อข้อความ', category: 'messaging', align: 'right', format: 'currency', sortable: true, hideFor: ['accounts'] },
    { key: 'messagingFirstReply', label: 'Messaging First Replies', labelTh: 'การตอบกลับครั้งแรก', category: 'messaging', align: 'right', format: 'number', sortable: true, hideFor: ['accounts'] },

    // === VIDEO ===
    { key: 'videoPlays', label: 'Video Plays', labelTh: 'การเล่นวิดีโอ', category: 'video', align: 'right', format: 'number', sortable: true, hideFor: ['accounts'] },
    { key: 'videoAvgTimeWatched', label: 'Avg. Video Play Time', labelTh: 'เวลาดูเฉลี่ย', category: 'video', align: 'right', format: 'time', sortable: true, hideFor: ['accounts'] },
    { key: 'videoPlays3s', label: '3-Second Video Plays', labelTh: 'ดูวิดีโอ 3 วิ', category: 'video', align: 'right', format: 'number', sortable: true, hideFor: ['accounts'] },
    { key: 'videoP25Watched', label: 'Video Plays at 25%', labelTh: 'ดูวิดีโอ 25%', category: 'video', align: 'right', format: 'number', sortable: true, hideFor: ['accounts'] },
    { key: 'videoP50Watched', label: 'Video Plays at 50%', labelTh: 'ดูวิดีโอ 50%', category: 'video', align: 'right', format: 'number', sortable: true, hideFor: ['accounts'] },
    { key: 'videoP75Watched', label: 'Video Plays at 75%', labelTh: 'ดูวิดีโอ 75%', category: 'video', align: 'right', format: 'number', sortable: true, hideFor: ['accounts'] },
    { key: 'videoP95Watched', label: 'Video Plays at 95%', labelTh: 'ดูวิดีโอ 95%', category: 'video', align: 'right', format: 'number', sortable: true, hideFor: ['accounts'] },
    { key: 'videoP100Watched', label: 'Video Plays at 100%', labelTh: 'ดูวิดีโอ 100%', category: 'video', align: 'right', format: 'number', sortable: true, hideFor: ['accounts'] },

    // === CONVERSION ===
    { key: 'purchases', label: 'Purchases', labelTh: 'การซื้อ', category: 'conversion', align: 'right', format: 'number', sortable: true, hideFor: ['accounts'] },
    { key: 'leads', label: 'Leads', labelTh: 'ลีด', category: 'conversion', align: 'right', format: 'number', sortable: true, hideFor: ['accounts'] },
    { key: 'costPerPurchase', label: 'Cost per Purchase', labelTh: 'ต้นทุนต่อการซื้อ', category: 'conversion', align: 'right', format: 'currency', sortable: true, hideFor: ['accounts'] },
    { key: 'costPerLead', label: 'Cost per Lead', labelTh: 'ต้นทุนต่อลีด', category: 'conversion', align: 'right', format: 'currency', sortable: true, hideFor: ['accounts'] },

    // === SETTINGS (for accounts tab) ===
    { key: 'activeAdsCount', label: 'Active Ads', labelTh: 'โฆษณาที่ใช้งาน', category: 'settings', align: 'center', format: 'number', sortable: true, showFor: ['accounts'] },
    { key: 'spendCap', label: 'Spending Cap', labelTh: 'วงเงินใช้จ่าย', category: 'settings', align: 'right', format: 'currency', sortable: true, showFor: ['accounts'] },
    { key: 'paymentMethod', label: 'Payment Method', labelTh: 'วิธีชำระเงิน', category: 'settings', sortable: true, showFor: ['accounts'] },
    { key: 'timezone', label: 'Timezone', labelTh: 'โซนเวลา', category: 'settings', align: 'right', sortable: true, showFor: ['accounts'] },
    { key: 'country', label: 'Country', labelTh: 'ประเทศ', category: 'settings', align: 'right', sortable: true, showFor: ['accounts'] },
    { key: 'currency', label: 'Currency', labelTh: 'สกุลเงิน', category: 'settings', align: 'right', sortable: true, showFor: ['accounts'] },

    // === ADS SPECIFIC ===
    { key: 'accountName', label: 'Account', labelTh: 'บัญชี', category: 'performance', sortable: true, showFor: ['ads'] },
    { key: 'pageName', label: 'Page', labelTh: 'เพจ', category: 'performance', sortable: true, showFor: ['ads'] },
    { key: 'targeting', label: 'Targeting', labelTh: 'กลุ่มเป้าหมาย', category: 'performance', showFor: ['ads'] },
]

// Default visible columns for each tab
export const DEFAULT_VISIBLE_COLUMNS: Record<string, string[]> = {
    accounts: ['name', 'status', 'activeAdsCount', 'spendCap', 'paymentMethod', 'timezone', 'country', 'currency'],
    campaigns: ['name', 'delivery', 'results', 'costPerResult', 'budget', 'reach', 'impressions', 'postEngagements', 'clicks', 'newMessagingContacts', 'spend', 'costPerNewMessagingContact'],
    adsets: ['name', 'delivery', 'results', 'costPerResult', 'budget', 'reach', 'impressions', 'postEngagements', 'clicks', 'newMessagingContacts', 'spend', 'costPerNewMessagingContact'],
    ads: ['accountName', 'pageName', 'name', 'targeting', 'delivery', 'results', 'costPerResult', 'budget', 'reach', 'impressions', 'postEngagements', 'clicks', 'newMessagingContacts', 'spend', 'costPerNewMessagingContact', 'videoAvgTimeWatched', 'videoPlays', 'videoPlays3s', 'videoP25Watched', 'videoP50Watched', 'videoP75Watched', 'videoP95Watched', 'videoP100Watched'],
}

// Get columns for a specific tab
export function getColumnsForTab(tab: string, visibleColumnKeys: string[]): ColumnDef[] {
    return ALL_COLUMNS.filter(col => {
        // Check if column is visible for this tab
        if (col.showFor && !col.showFor.includes(tab as any)) return false
        if (col.hideFor && col.hideFor.includes(tab as any)) return false

        // Fixed columns are always shown
        if (col.fixed) return true

        // Check if column is in visible list
        return visibleColumnKeys.includes(col.key)
    })
}

// Get all columns available for a tab (for the customize dialog)
export function getAvailableColumnsForTab(tab: string): ColumnDef[] {
    return ALL_COLUMNS.filter(col => {
        if (col.fixed) return false // Don't show fixed columns in the list
        if (col.showFor && !col.showFor.includes(tab as any)) return false
        if (col.hideFor && col.hideFor.includes(tab as any)) return false
        return true
    })
}

// Group columns by category
export function groupColumnsByCategory(columns: ColumnDef[]): Record<string, ColumnDef[]> {
    return columns.reduce((acc, col) => {
        if (!acc[col.category]) acc[col.category] = []
        acc[col.category].push(col)
        return acc
    }, {} as Record<string, ColumnDef[]>)
}

// localStorage key
const STORAGE_KEY = 'adsTable_visibleColumns'

// Hook to manage visible columns with localStorage
export function useVisibleColumns(tab: string) {
    const [visibleColumns, setVisibleColumnsState] = useState<string[]>([])
    const [isLoaded, setIsLoaded] = useState(false)

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored) {
                const parsed = JSON.parse(stored)
                if (parsed[tab]) {
                    setVisibleColumnsState(parsed[tab])
                } else {
                    setVisibleColumnsState(DEFAULT_VISIBLE_COLUMNS[tab] || [])
                }
            } else {
                setVisibleColumnsState(DEFAULT_VISIBLE_COLUMNS[tab] || [])
            }
        } catch {
            setVisibleColumnsState(DEFAULT_VISIBLE_COLUMNS[tab] || [])
        }
        setIsLoaded(true)
    }, [tab])

    // Save to localStorage when changed
    const setVisibleColumns = (columns: string[]) => {
        setVisibleColumnsState(columns)
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            const parsed = stored ? JSON.parse(stored) : {}
            parsed[tab] = columns
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
        } catch {
            // Ignore localStorage errors
        }
    }

    // Reset to default
    const resetToDefault = () => {
        setVisibleColumns(DEFAULT_VISIBLE_COLUMNS[tab] || [])
    }

    // Reorder columns
    const reorderColumns = (fromIndex: number, toIndex: number) => {
        const newColumns = [...visibleColumns]
        const [removed] = newColumns.splice(fromIndex, 1)
        newColumns.splice(toIndex, 0, removed)
        setVisibleColumns(newColumns)
    }

    return {
        visibleColumns,
        setVisibleColumns,
        resetToDefault,
        reorderColumns,
        isLoaded
    }
}

// Format cell value based on format type
export function formatCellValue(
    value: any,
    format?: ColumnDef['format'],
    currency?: string
): string {
    if (value === null || value === undefined || value === '') return '-'

    switch (format) {
        case 'number':
            const num = parseFloat(String(value))
            if (isNaN(num)) return String(value)
            return new Intl.NumberFormat('en-US').format(num)

        case 'currency':
            const amount = parseFloat(String(value))
            if (isNaN(amount)) return String(value)
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency || 'THB',
                minimumFractionDigits: 2
            }).format(amount)

        case 'percentage':
            const pct = parseFloat(String(value))
            if (isNaN(pct)) return String(value)
            return `${pct.toFixed(2)}%`

        case 'time':
            const seconds = parseFloat(String(value))
            if (isNaN(seconds) || seconds === 0) return '-'
            const mins = Math.floor(seconds / 60)
            const secs = Math.floor(seconds % 60)
            return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

        default:
            return String(value)
    }
}
