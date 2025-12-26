'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import ClientRouteGuard from '@/components/ClientRouteGuard'
import { cn } from '@/lib/utils'
import { DateRange } from 'react-day-picker'
import { DatePickerWithRange } from '@/components/DateRangePicker'
import DashboardCharts from '@/components/DashboardCharts'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import {
    Banknote,
    MessageCircle,
    Users,
    TrendingUp,
    Target,
    ArrowUpRight,
    ArrowDownRight,
    Filter,
    AlertTriangle,
    Activity
} from 'lucide-react'

// --- Types for Data ---
// (Inferring types from V1 usage, using any for flexibility where exact type is unknown but consistent with V1)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DashboardRow = any;

export default function DashboardV2Page() {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Initialize activeTab from URL params to prevent reset on refresh
    const getInitialTab = () => {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search)
            const tabParam = urlParams.get('tab')
            if (tabParam) {
                const tabMap: { [key: string]: number } = {
                    'lottery': 1,
                    'baccarat': 2,
                    'horse-racing': 3,
                    'football-area': 4
                }
                return tabMap[tabParam] || 1
            }
        }
        return 1
    }

    // const [isLeftOpen, setIsLeftOpen] = useState(true) // V2: Sidebar is distinct or merged
    const [activeTab, setActiveTab] = useState(getInitialTab)
    const [mounted, setMounted] = useState(false)
    const [urlParamsLoaded, setUrlParamsLoaded] = useState(false)
    const [dateRange, setDateRange] = useState<DateRange | undefined>()
    const [selectedMonth, setSelectedMonth] = useState<string>('')
    const [selectedYear, setSelectedYear] = useState<string>('')
    const [selectedView, setSelectedView] = useState<string>('team')
    const [chartPeriod, setChartPeriod] = useState<'daily' | 'monthly'>('daily')

    // Dashboard data state
    const [dashboardData, setDashboardData] = useState<DashboardRow[]>([])
    const [isLoadingData, setIsLoadingData] = useState(false)
    const [exchangeRate, setExchangeRate] = useState<number>(35.0)

    // Status tracking
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

    // Goals state
    const [goals, setGoals] = useState<{
        [key: number]: {
            cover: string
            cpm: string
            deposit: string
            loss: string
            repeat: string
            child: string
            costPerDeposit: string
        }
    }>({
        1: { cover: '', cpm: '', deposit: '', loss: '', repeat: '', child: '', costPerDeposit: '' },
        2: { cover: '', cpm: '', deposit: '', loss: '', repeat: '', child: '', costPerDeposit: '' },
        3: { cover: '', cpm: '', deposit: '', loss: '', repeat: '', child: '', costPerDeposit: '' },
        4: { cover: '', cpm: '', deposit: '', loss: '', repeat: '', child: '', costPerDeposit: '' },
    })

    // Consts
    const months = [
        { value: '1', label: 'ม.ค.' },
        { value: '2', label: 'ก.พ.' },
        { value: '3', label: 'มี.ค.' },
        { value: '4', label: 'เม.ย.' },
        { value: '5', label: 'พ.ค.' },
        { value: '6', label: 'มิ.ย.' },
        { value: '7', label: 'ก.ค.' },
        { value: '8', label: 'ส.ค.' },
        { value: '9', label: 'ก.ย.' },
        { value: '10', label: 'ต.ค.' },
        { value: '11', label: 'พ.ย.' },
        { value: '12', label: 'ธ.ค.' },
    ]

    const years = [
        { value: '2024', label: '2024' },
        { value: '2025', label: '2025' },
        { value: '2026', label: '2026' },
    ]

    const tabs = [
        { id: 1, name: 'หวย', slug: 'lottery' },
        { id: 2, name: 'บาคาร่า', slug: 'baccarat' },
        { id: 3, name: 'หวยม้า', slug: 'horse-racing' },
        { id: 4, name: 'ฟุตบอลแอเรีย', slug: 'football-area' },
    ]

    // --- KPI Calculation ---
    const kpis = useMemo(() => {
        if (!dashboardData || dashboardData.length === 0) return null;

        const totalSpend = dashboardData.reduce((acc, row) => acc + (row.spend || 0), 0);
        const totalDeposit = dashboardData.reduce((acc, row) => acc + (row.deposit || 0), 0); // Count of deposits? Or amount? V1 chart says amount. V1 table column is "เติม". row.deposit is likely count, depositAmount is value?
        // Checking DashboardCharts.tsx line 173: row.depositAmount used for value. 
        // Checking V1 table line 650: formatNumber(row.deposit) -> usually count.
        // Let's assume V1 table "เติม" is count.

        // Actually, for KPI we usually want Value. Let's try to sum `depositAmount` if available, or fallback.
        // Looking at DashboardCharts line 331: dataKey={`${name}.depositAmount`}. 
        // The data structure passed to charts is likely aggregated by date.
        // The `dashboardData` passed to table is row per team.
        // Let's look at V1 table line 652: turnoverAdser (Baht).

        const totalDepositCount = dashboardData.reduce((acc, row) => acc + (row.deposit || 0), 0);
        const totalTurnover = dashboardData.reduce((acc, row) => acc + (row.turnoverAdser || 0), 0);
        const totalMessages = dashboardData.reduce((acc, row) => acc + (row.netMessages || 0), 0);
        const totalUsers = dashboardData.reduce((acc, row) => acc + (row.hasUser || 0), 0);
        const totalAllMessages = dashboardData.reduce((acc, row) => acc + (row.message || 0), 0);

        // Averages
        // const avgCPM = totalMessages > 0 ? totalSpend / totalMessages : 0; // Old Logic


        return {
            totalSpend,
            totalDepositCount,
            totalTurnover,
            totalMessages: totalMessages, // Net messages (Keep for backward compat or rename if needed)
            totalAllMessages,
            totalNetMessages: totalMessages,
            totalLostMessages: dashboardData.reduce((acc, row) => acc + (row.lostMessages || 0), 0),
            totalUsers,
            avgCPM: totalAllMessages > 0 ? totalSpend / totalAllMessages : 0,
            avgCostPerDeposit: totalDepositCount > 0 ? totalSpend / totalDepositCount : 0,
            avgDollarPerCover: (totalSpend > 0 && exchangeRate > 0)
                ? (totalTurnover / exchangeRate) / totalSpend
                : 0
        };
    }, [dashboardData, exchangeRate]);


    // --- Effects (Copied from V1) ---

    // Load saved state
    useEffect(() => {
        setMounted(true)
        const savedMonth = localStorage.getItem('dashboard-selectedMonth')
        const savedYear = localStorage.getItem('dashboard-selectedYear')
        const savedDateRange = localStorage.getItem('dashboard-dateRange')
        const savedView = localStorage.getItem('dashboard-selectedView')

        if (savedMonth) setSelectedMonth(savedMonth)
        if (savedYear) setSelectedYear(savedYear)
        if (savedView) setSelectedView(savedView)
        else setSelectedView('team')

        // Fetch Goals
        const fetchGoals = async () => {
            try {
                const response = await fetch('/api/admin/goals')
                if (response.ok) {
                    const data = await response.json()
                    setGoals(data.goals || {})
                }
            } catch (error) {
                console.error('Failed to fetch goals:', error)
            }
        }
        fetchGoals()

        // Fetch Exchange Rate
        const fetchExchangeRate = async () => {
            try {
                const response = await fetch('/api/exchange-rate')
                if (response.ok) {
                    const data = await response.json()
                    setExchangeRate(data.rate || 35.0)
                }
            } catch (error) {
                console.error('Failed to fetch exchange rate:', error)
            }
        }
        fetchExchangeRate()

        // Default Date Logic
        const now = new Date()
        if (!savedMonth) setSelectedMonth(String(now.getMonth() + 1))
        if (!savedYear) setSelectedYear(String(now.getFullYear()))

        if (savedDateRange) {
            try {
                const parsed = JSON.parse(savedDateRange)
                setDateRange({
                    from: parsed.from ? new Date(parsed.from) : undefined,
                    to: parsed.to ? new Date(parsed.to) : undefined
                })
            } catch (e) {
                setDateRange({ from: now, to: now })
            }
        } else {
            setDateRange({ from: now, to: now })
        }
    }, [])

    // URL Parameter Sync Effect Removed to prevent infinite loop
    // URL updates are now handled explicitly in event handlers

    // Read URL params
    useEffect(() => {
        if (!mounted) return
        const tabParam = searchParams.get('tab')
        const viewParam = searchParams.get('view')
        const monthParam = searchParams.get('month')
        const yearParam = searchParams.get('year')
        const startDateParam = searchParams.get('startDate')
        const endDateParam = searchParams.get('endDate')

        if (tabParam) {
            const found = tabs.find(t => t.slug === tabParam)
            if (found) setActiveTab(found.id)
        }
        if (viewParam) setSelectedView(viewParam)
        if (monthParam) setSelectedMonth(monthParam)
        if (yearParam) setSelectedYear(yearParam)

        if (startDateParam && endDateParam) {
            const s = new Date(startDateParam + 'T00:00:00')
            const e = new Date(endDateParam + 'T00:00:00')
            if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
                setDateRange({ from: s, to: e })
            }
        }

        // Mark URL params as loaded to allow data fetching
        setUrlParamsLoaded(true)
    }, [searchParams, mounted])

    // Data Fetching - wait for URL params to be loaded first
    useEffect(() => {
        const fetchData = async (silent: boolean = false) => {
            // Wait for URL params to be loaded before fetching
            if (!urlParamsLoaded || !dateRange?.from || !dateRange?.to || !mounted) {
                setDashboardData([])
                return
            }

            if (!silent) setIsLoadingData(true)
            try {
                const tab = tabs.find(t => t.id === activeTab)
                if (!tab) return

                const formatDateLocal = (date: Date): string => {
                    const year = date.getFullYear()
                    const month = String(date.getMonth() + 1).padStart(2, '0')
                    const day = String(date.getDate()).padStart(2, '0')
                    return `${year}-${month}-${day}`
                }

                const params = new URLSearchParams({
                    startDate: formatDateLocal(dateRange.from),
                    endDate: formatDateLocal(dateRange.to),
                    tab: tab.slug,
                    view: selectedView || 'team'
                })

                const response = await fetch(`/api/dashboard/data?${params}`)
                if (!response.ok) throw new Error('Failed to fetch dashboard data')

                const result = await response.json()
                setDashboardData(result.data || [])
                setExchangeRate(result.exchangeRate || 35.0)
                setLastRefresh(new Date())

            } catch (error) {
                console.error('Error fetching dashboard data:', error)
                setDashboardData([])
            } finally {
                setIsLoadingData(false)
            }
        }

        fetchData()

        const interval = setInterval(() => {
            // Silent refresh
            fetchData(true)
        }, 60000)

        return () => clearInterval(interval)
    }, [dateRange, activeTab, selectedView, mounted, urlParamsLoaded])


    // --- Handlers ---

    // Helper to update URL
    const updateURL = (overrides: Partial<any> = {}) => {
        const currentTab = tabs.find(t => t.id === (overrides.activeTab || activeTab))
        if (!currentTab) return

        const params = new URLSearchParams()
        params.set('tab', currentTab.slug)

        if (overrides.selectedView || selectedView) {
            params.set('view', overrides.selectedView || selectedView)
        }

        // Month/Year
        const m = overrides.selectedMonth !== undefined ? overrides.selectedMonth : selectedMonth
        if (m) params.set('month', m)

        const y = overrides.selectedYear !== undefined ? overrides.selectedYear : selectedYear
        if (y) params.set('year', y)

        // Date Range
        const r = overrides.dateRange !== undefined ? overrides.dateRange : dateRange
        if (r?.from) {
            const year = r.from.getFullYear()
            const month = String(r.from.getMonth() + 1).padStart(2, '0')
            const day = String(r.from.getDate()).padStart(2, '0')
            params.set('startDate', `${year}-${month}-${day}`)
        }
        if (r?.to) {
            const year = r.to.getFullYear()
            const month = String(r.to.getMonth() + 1).padStart(2, '0')
            const day = String(r.to.getDate()).padStart(2, '0')
            params.set('endDate', `${year}-${month}-${day}`)
        }

        const newURL = `/dashboard?${params.toString()}`
        router.replace(newURL, { scroll: false })
    }

    const handleTabChange = (id: number) => {
        setActiveTab(id)
        localStorage.setItem('dashboard-activeTab', String(id))
        updateURL({ activeTab: id })
    }

    const handleDateRangeChange = (range: DateRange | undefined) => {
        // Custom logic for dashboardv2: If "This Month" is selected, adjust end date to today
        if (range?.from && range?.to) {
            const today = new Date();
            const startOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const endOfCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

            // Check if this is "This Month" selection (1st to last day of current month)
            const isThisMonthSelection =
                range.from.getDate() === 1 &&
                range.from.getMonth() === today.getMonth() &&
                range.from.getFullYear() === today.getFullYear() &&
                range.to.getDate() === endOfCurrentMonth.getDate() &&
                range.to.getMonth() === today.getMonth() &&
                range.to.getFullYear() === today.getFullYear();

            if (isThisMonthSelection) {
                // Adjust to use today as end date
                range = {
                    from: range.from,
                    to: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
                };
            }
        }

        setDateRange(range)
        if (range?.from && range?.to) {
            localStorage.setItem('dashboard-dateRange', JSON.stringify({
                from: range.from.toISOString(),
                to: range.to.toISOString()
            }))
        }
        updateURL({ dateRange: range })
    }

    // Handler wrappers for Selects
    const handleViewChange = (v: string) => {
        setSelectedView(v)
        localStorage.setItem('dashboard-selectedView', v)
        updateURL({ selectedView: v })
    }

    const handleMonthChange = (v: string) => {
        setSelectedMonth(v)
        updateURL({ selectedMonth: v })
    }

    const handleYearChange = (v: string) => {
        setSelectedYear(v)
        updateURL({ selectedYear: v })
    }

    // --- Helpers for Table ---
    const formatNumber = (num: number, decimals: number = 0) => num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

    // Helper to check under-budget warning condition
    const checkUnderBudgetCondition = (spend: number, planSpend: number) => {
        if (spend === 0) return false; // Don't show if 0 spend

        const pct = planSpend > 0 ? (spend / planSpend) * 100 : 0;
        if (pct >= 70) return false; // Not under budget

        // Check if viewing "Current Month" and if it's not ended yet
        if (dateRange?.from && dateRange?.to) {
            const today = new Date();
            const startOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const endOfCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

            // Check if selected range is the full current month
            const isViewingCurrentMonth =
                dateRange.from.getDate() === 1 &&
                dateRange.from.getMonth() === today.getMonth() &&
                dateRange.from.getFullYear() === today.getFullYear() &&
                dateRange.to.getDate() === endOfCurrentMonth.getDate() &&
                dateRange.to.getMonth() === today.getMonth() &&
                dateRange.to.getFullYear() === today.getFullYear();

            // If viewing current month, only show if today is the last day (or passed?)
            // User: "If it hasn't ended yet... don't show. Show on last day."
            if (isViewingCurrentMonth) {
                if (today.getDate() < endOfCurrentMonth.getDate()) {
                    return false;
                }
            }
        }
        return true;
    }

    // Progress Bar reusable (Minimal version)
    const ProgressBar = ({ current, target, colorClass, warningType, warningMessage }: { current: number, target: number, colorClass?: string, warningType?: 'none' | 'over' | 'under', warningMessage?: string }) => {
        const p = target > 0 ? (current / target) * 100 : 0
        return (
            <div className="w-full flex flex-col gap-0.5">
                <div className="w-full flex items-center gap-2 relative">
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden relative">
                        <div className={cn("h-full transition-all", colorClass || "bg-blue-500")} style={{ width: `${Math.min(p, 100)}%` }} />
                    </div>
                    <span className="text-xs w-8 text-right">{p.toFixed(0)}%</span>

                    {warningType === 'over' && (
                        <div className="absolute -top-2 -right-1">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                        </div>
                    )}

                    {warningType === 'under' && (
                        <div className="absolute -top-3.5 -right-1">
                            <AlertTriangle className="h-4 w-4 text-yellow-500 fill-yellow-100" />
                        </div>
                    )}
                </div>
                {warningType === 'over' && warningMessage && (
                    <span className="text-[10px] text-red-500 text-right w-full leading-none">{warningMessage}</span>
                )}
                {warningType === 'under' && warningMessage && (
                    <span className="text-[10px] text-yellow-600 text-right w-full leading-none">{warningMessage}</span>
                )}
            </div>
        )
    }
    // Helper to format percentage with count
    const renderPercent = (val: number, total: number) => {
        const pct = total > 0 ? (val / total) * 100 : 0
        return (
            <div className="flex flex-col items-center leading-tight">
                <span>{formatNumber(val)}</span>
                <span className="text-xs text-muted-foreground">({pct.toFixed(2)}%)</span>
            </div>
        )
    }

    return (
        <ClientRouteGuard requiredRoute="/dashboard">
            <div className="h-full bg-transparent dark:bg-zinc-950 flex flex-col overflow-hidden">
                <Card className="flex-1 flex flex-col rounded-2xl shadow-sm bg-slate-50 dark:bg-zinc-900 border-none overflow-hidden">

                    {/* Fixed Header Section (Sticky Filters) */}
                    <div className="flex-none z-20 bg-slate-50 dark:bg-zinc-900">
                        <div className="mx-6 mt-4 p-4 bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700">

                            {/* 1. Top Navigation Bar (Filters & Tabs) */}
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-gray-100 dark:border-zinc-800">
                                {/* Tabs Pilled */}
                                <div className="flex p-1 bg-gray-100 dark:bg-zinc-800 rounded-lg overflow-x-auto">
                                    {tabs.map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => handleTabChange(tab.id)}
                                            className={cn(
                                                "px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap flex-shrink-0",
                                                activeTab === tab.id
                                                    ? "bg-white dark:bg-zinc-700 text-primary shadow-sm"
                                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                            )}
                                        >
                                            {tab.name}
                                        </button>
                                    ))}
                                </div>

                                {/* Filters Row - responsive */}
                                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
                                    <DatePickerWithRange date={dateRange} setDate={handleDateRangeChange} />

                                    <Select value={selectedView} onValueChange={handleViewChange}>
                                        <SelectTrigger className="w-full sm:w-[120px] h-10"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">รวม</SelectItem>
                                            <SelectItem value="team">ทีม</SelectItem>
                                            <SelectItem value="adser">แอดเซอร์</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Select value={chartPeriod} onValueChange={(v: any) => setChartPeriod(v)}>
                                        <SelectTrigger className="w-full sm:w-[120px] h-10"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="daily">รายวัน</SelectItem>
                                            <SelectItem value="monthly">รายเดือน</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {(chartPeriod === 'daily') && (
                                        <Select value={selectedMonth} onValueChange={handleMonthChange}>
                                            <SelectTrigger className="w-full sm:w-[100px] h-10"><SelectValue placeholder="Month" /></SelectTrigger>
                                            <SelectContent>
                                                {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    )}

                                    {/* Year filter should be visible for both daily and monthly */}
                                    {(chartPeriod === 'daily' || chartPeriod === 'monthly') && (
                                        <Select value={selectedYear} onValueChange={handleYearChange}>
                                            <SelectTrigger className="w-full sm:w-[100px] h-10"><SelectValue placeholder="Year" /></SelectTrigger>
                                            <SelectContent>
                                                {years.map(y => <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Content Area */}
                    <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">

                        {/* 2. KPI Cards Section (Interactive Dashboard Style) */}
                        {kpis && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                <Card className="shadow-sm border border-gray-200/60 bg-white dark:bg-zinc-800 dark:border-zinc-700 relative">
                                    <div className="absolute top-2.5 right-2">
                                        <MessageCircle className="h-4 w-4 text-orange-500" />
                                    </div>
                                    {/* ปรับระยะห่างจากขอบด้านบนตรง pt-0 (ถ้า pt-0 ยังห่างไป ให้ใช้ -mt-1 ที่ div ด้านล่างนี้) และปรับขอบล่างตรง pb-0 */}
                                    <CardContent className="px-3 pt-0 pb-1">
                                        <div className="grid grid-cols-2 gap-4 -mt-1">
                                            <div className="flex flex-col">
                                                {/* ส่วนหัวข้อ: ปรับ font size ตรง text-sm */}
                                                <span className="text-sm font-medium text-muted-foreground leading-none">Total Messages</span>
                                                {/* ส่วนตัวเลข: ปรับระยะห่างจากหัวข้อตรง mt-3 และปรับขนาดตรง text-xl และขยับขวาตรง ml-2 */}
                                                <div className="text-xl font-bold leading-none mt-3 ml-2">{formatNumber(kpis.totalAllMessages)}</div>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-muted-foreground leading-none">CPM Avg</span>
                                                <div className="text-xl font-bold text-gray-700 dark:text-gray-300 leading-none mt-3 ml-2">${formatNumber(kpis.avgCPM, 2)}</div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Quality / Loss Card */}
                                <Card className="shadow-sm border border-gray-200/60 bg-white dark:bg-zinc-800 dark:border-zinc-700 relative">
                                    <div className="absolute top-2.5 right-2">
                                        <Activity className="h-4 w-4 text-purple-500" />
                                    </div>
                                    <CardContent className="px-3 pt-0 pb-1">
                                        <div className="grid grid-cols-2 gap-4 -mt-1">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-muted-foreground leading-none">คุณภาพ</span>
                                                <div className="text-xl font-bold text-green-600 dark:text-green-400 leading-none mt-3 ml-2">
                                                    {(kpis.totalAllMessages > 0 ? (kpis.totalNetMessages / kpis.totalAllMessages) * 100 : 0).toFixed(2)}%
                                                </div>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-muted-foreground leading-none">ยอดเสีย</span>
                                                <div className="text-xl font-bold text-red-600 dark:text-red-400 leading-none mt-3 ml-2">
                                                    {(kpis.totalAllMessages > 0 ? (100 - ((kpis.totalNetMessages / kpis.totalAllMessages) * 100)) : 0).toFixed(2)}%
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="shadow-sm border border-gray-200/60 bg-white dark:bg-zinc-800 dark:border-zinc-700 relative">
                                    <div className="absolute top-2.5 right-2">
                                        <Target className="h-4 w-4 text-green-500" />
                                    </div>
                                    {/* ปรับระยะห่างจากขอบด้านบนตรง pt-0 (ถ้า pt-0 ยังห่างไป ให้ใช้ -mt-1 ที่ div ด้านล่างนี้) */}
                                    <CardContent className="px-3 pt-0 pb-1">
                                        <div className="grid grid-cols-2 gap-4 -mt-1">
                                            <div className="flex flex-col">
                                                {/* ปรับระยะห่างตัวเลขตรง mt-3 */}
                                                <span className="text-sm font-medium text-muted-foreground leading-none">Total Deposit</span>
                                                <div className="text-xl font-bold leading-none mt-3 ml-2">{formatNumber(kpis.totalDepositCount)}</div>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-muted-foreground leading-none">ต้นทุน/เติม</span>
                                                <div className="text-xl font-bold text-gray-700 dark:text-gray-300 leading-none mt-3 ml-2">${formatNumber(kpis.avgCostPerDeposit, 2)}</div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="shadow-sm border border-gray-200/60 bg-white dark:bg-zinc-800 dark:border-zinc-700 relative">
                                    <div className="absolute top-2.5 right-2">
                                        <Banknote className="h-4 w-4 text-primary" />
                                    </div>
                                    {/* ปรับระยะห่างจากขอบด้านบนตรง pt-0 (ถ้า pt-0 ยังห่างไป ให้ใช้ -mt-1 ที่ div ด้านล่างนี้) */}
                                    <CardContent className="px-3 pt-0 pb-1">
                                        <div className="grid grid-cols-1 gap-4 -mt-1">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-muted-foreground leading-none">Total Spend</span>
                                                <div className="text-xl font-bold leading-none mt-3 ml-2">${formatNumber(kpis.totalSpend, 2)}</div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="shadow-sm border border-gray-200/60 bg-white dark:bg-zinc-800 dark:border-zinc-700 relative">
                                    <div className="absolute top-2.5 right-2">
                                        <TrendingUp className="h-4 w-4 text-blue-500" />
                                    </div>
                                    {/* ปรับระยะห่างจากขอบด้านบนตรง pt-0 (ถ้า pt-0 ยังห่างไป ให้ใช้ -mt-1 ที่ div ด้านล่างนี้) */}
                                    <CardContent className="px-3 pt-0 pb-1">
                                        <div className="grid gap-4 -mt-1" style={{ gridTemplateColumns: '60% 40%' }}>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-muted-foreground leading-none">Total Turnover</span>
                                                <div className="text-xl font-bold text-green-950 dark:text-green-100 leading-none mt-3 ml-2">฿{formatNumber(kpis.totalTurnover, 2)}</div>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-muted-foreground leading-none">1$/Cover</span>
                                                <div className="text-xl font-bold text-gray-700 dark:text-gray-300 leading-none mt-3 ml-2">{formatNumber(kpis.avgDollarPerCover, 2)}</div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Main Content Area */}
                        {/* 3. Charts Section */}
                        {/* 3. Detailed Breakdown Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-xl font-semibold">Detailed Breakdown</h3>
                                <div className="text-sm font-normal text-muted-foreground bg-white px-3 py-1 rounded-full border shadow-sm">
                                    Exchange Rate: ฿{exchangeRate.toFixed(2)}
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col border border-gray-200/60 rounded-xl overflow-hidden bg-white shadow-sm">
                                <div className="flex-1 overflow-auto">
                                    <table className="w-full caption-bottom text-sm text-center">
                                        <thead className="bg-gray-50 sticky top-0 z-10">
                                            <tr className="border-b h-14">
                                                <th className="border-r whitespace-nowrap bg-gray-50 font-medium px-4 text-left min-w-[120px]">ทีม</th>
                                                <th className="border-r whitespace-nowrap bg-gray-50 font-medium w-[150px] px-4">ทัก/แผน</th>
                                                <th className="border-r whitespace-nowrap bg-gray-50 font-medium px-4">คุณภาพ</th>
                                                <th className="border-r whitespace-nowrap bg-gray-50 font-medium px-4">เสีย</th>
                                                <th className="border-r whitespace-nowrap bg-gray-50 font-medium px-4">CPM</th>
                                                <th className="border-r whitespace-nowrap bg-gray-50 font-medium px-4">เติม</th>
                                                <th className="border-r whitespace-nowrap bg-gray-50 font-medium px-4">ต้นทุน/เติม</th>
                                                <th className="border-r whitespace-nowrap bg-gray-50 font-medium w-[150px] px-4">ใช้จ่าย/แผน</th>
                                                <th className="border-r whitespace-nowrap bg-gray-50 font-medium px-4">ยอดเล่นใหม่</th>
                                                <th className="border-r whitespace-nowrap bg-gray-50 font-medium px-4">1$/Cover</th>
                                                <th className="border-r whitespace-nowrap bg-gray-50 font-medium px-4">เงียบ</th>
                                                <th className="border-r whitespace-nowrap bg-gray-50 font-medium px-4">ทักซ้ำ</th>
                                                <th className="border-r whitespace-nowrap bg-gray-50 font-medium px-4">มียูส</th>
                                                <th className="border-r whitespace-nowrap bg-gray-50 font-medium px-4">ก่อกวน</th>
                                                <th className="border-r whitespace-nowrap bg-gray-50 font-medium px-4">บล็อก</th>
                                                <th className="border-r whitespace-nowrap bg-gray-50 font-medium px-4">เด็ก</th>
                                                <th className="border-r whitespace-nowrap bg-gray-50 font-medium px-4">50+</th>
                                                <th className="whitespace-nowrap bg-gray-50 font-medium px-4">ต่างชาติ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(dashboardData || []).map((row, i) => (
                                                <tr key={i} className={cn(
                                                    "border-b hover:bg-gray-50 transition-colors",
                                                    isLoadingData && "opacity-50 pointer-events-none"
                                                )}>
                                                    <td className="border-r font-medium border-gray-100 px-2 py-2 text-left">
                                                        {isLoadingData ? (
                                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
                                                        ) : (
                                                            row.team === 'บาล้าน' ? 'คิง มหาเฮง' : row.team
                                                        )}
                                                    </td>
                                                    <td className="border-r w-[150px] border-gray-100 px-2 py-2">
                                                        {isLoadingData ? (
                                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mx-auto animate-pulse"></div>
                                                        ) : (
                                                            <div className="flex flex-col text-xs text-center gap-1">
                                                                <span><span className="text-sm">{formatNumber(row.message)}</span><span className="text-xs text-gray-500">/{formatNumber(row.planMessage)}</span></span>
                                                                <ProgressBar
                                                                    current={row.message}
                                                                    target={row.planMessage}
                                                                    colorClass={
                                                                        (row.planMessage > 0 ? (row.message / row.planMessage) * 100 : 0) < 50 ? "bg-red-500" :
                                                                            (row.planMessage > 0 ? (row.message / row.planMessage) * 100 : 0) <= 80 ? "bg-orange-600" :
                                                                                (row.planMessage > 0 ? (row.message / row.planMessage) * 100 : 0) < 100 ? "bg-blue-500" :
                                                                                    "bg-green-500"
                                                                    }
                                                                />
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="border-r border-gray-100 px-2 py-2">{renderPercent(row.netMessages, row.message)}</td>
                                                    <td className={cn(
                                                        "border-r border-gray-100 px-2 py-2",
                                                        (row.message > 0 ? (row.lostMessages / row.message) * 100 : 0) <= parseFloat(goals[activeTab]?.loss || '0') ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 font-medium" :
                                                            (row.message > 0 ? (row.lostMessages / row.message) * 100 : 0) <= (parseFloat(goals[activeTab]?.loss || '0') * 1.05) ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 font-medium" :
                                                                "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 font-medium"
                                                    )}>{renderPercent(row.lostMessages, row.message)}</td>
                                                    <td className={cn(
                                                        "border-r border-gray-100 px-2 py-2",
                                                        row.cpm <= parseFloat(goals[activeTab]?.cpm || '0') ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 font-medium" :
                                                            row.cpm <= (parseFloat(goals[activeTab]?.cpm || '0') * 1.05) ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 font-medium" :
                                                                "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 font-medium"
                                                    )}>{formatNumber(row.cpm, 2)}</td>
                                                    <td className="border-r border-gray-100 px-2 py-2 font-medium">{formatNumber(row.deposit)}</td>
                                                    <td className={cn(
                                                        "border-r border-gray-100 px-2 py-2",
                                                        row.costPerDeposit <= parseFloat(goals[activeTab]?.costPerDeposit || '0') ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 font-medium" :
                                                            row.costPerDeposit <= (parseFloat(goals[activeTab]?.costPerDeposit || '0') * 1.05) ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 font-medium" :
                                                                "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 font-medium"
                                                    )}>{formatNumber(row.costPerDeposit, 2)}</td>
                                                    <td className="border-r w-[150px] border-gray-100 px-2 py-2">
                                                        <div className="flex flex-col text-xs text-center gap-1">
                                                            <span><span className="text-sm">{formatNumber(row.spend, 2)}</span><span className="text-xs text-gray-500">/{formatNumber(row.planSpend, 2)}</span></span>
                                                            <ProgressBar
                                                                current={row.spend}
                                                                target={row.planSpend}
                                                                colorClass={
                                                                    (row.planSpend > 0 ? (row.spend / row.planSpend) * 100 : 0) < 70 ? "bg-red-500" :
                                                                        (row.planSpend > 0 ? (row.spend / row.planSpend) * 100 : 0) <= 100 ? "bg-green-500" :
                                                                            "bg-yellow-400"
                                                                }
                                                                warningType={
                                                                    (row.planSpend > 0 ? (row.spend / row.planSpend) * 100 : 0) > 100 ? 'over' :
                                                                        checkUnderBudgetCondition(row.spend, row.planSpend) ? 'under' : 'none'
                                                                }
                                                                warningMessage={
                                                                    (row.planSpend > 0 ? (row.spend / row.planSpend) * 100 : 0) > 100 ? "ใช้งบเกินนะ" :
                                                                        checkUnderBudgetCondition(row.spend, row.planSpend) ? "ใช้งบไม่ถึงเกณฑ์นะ" : ""
                                                                }
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="border-r border-gray-100 px-2 py-2 text-right text-green-950 dark:text-green-100 font-medium">฿{formatNumber(row.turnoverAdser, 2)}</td>
                                                    <td className={cn(
                                                        "border-r border-gray-100 px-2 py-2",
                                                        row.dollarPerCover > parseFloat(goals[activeTab]?.cover || '0') ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 font-medium" : ""
                                                    )}>{formatNumber(row.dollarPerCover, 2)}</td>
                                                    <td className="border-r border-gray-100 px-2 py-2">{renderPercent(row.silent, row.message)}</td>
                                                    <td className={cn(
                                                        "border-r border-gray-100 px-2 py-2",
                                                        (row.message > 0 ? (row.duplicate / row.message) * 100 : 0) <= parseFloat(goals[activeTab]?.repeat || '0') ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 font-medium" :
                                                            (row.message > 0 ? (row.duplicate / row.message) * 100 : 0) <= (parseFloat(goals[activeTab]?.repeat || '0') * 1.05) ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 font-medium" :
                                                                "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 font-medium"
                                                    )}>{renderPercent(row.duplicate, row.message)}</td>
                                                    <td className="border-r border-gray-100 px-2 py-2">{renderPercent(row.hasUser, row.message)}</td>
                                                    <td className="border-r border-gray-100 px-2 py-2">{renderPercent(row.spam, row.message)}</td>
                                                    <td className="border-r border-gray-100 px-2 py-2">{renderPercent(row.blocked, row.message)}</td>
                                                    <td className={cn(
                                                        "border-r border-gray-100 px-2 py-2",
                                                        (row.message > 0 ? (row.under18 / row.message) * 100 : 0) <= parseFloat(goals[activeTab]?.child || '0') ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 font-medium" :
                                                            (row.message > 0 ? (row.under18 / row.message) * 100 : 0) <= (parseFloat(goals[activeTab]?.child || '0') * 1.05) ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 font-medium" :
                                                                "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 font-medium"
                                                    )}>{renderPercent(row.under18, row.message)}</td>
                                                    <td className="border-r border-gray-100 px-2 py-2">{renderPercent(row.over50, row.message)}</td>
                                                    <td className="px-2 py-2">{renderPercent(row.foreign, row.message)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* 4. Charts Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 px-1">
                                <TrendingUp className="w-5 h-5 text-primary" />
                                <h3 className="text-xl font-semibold">Analytics Overview</h3>
                            </div>

                            {dashboardData.length > 0 ? (
                                <DashboardCharts
                                    data={dashboardData}
                                    goals={{
                                        cover: parseFloat(goals[activeTab]?.cover || '0'),
                                        cpm: parseFloat(goals[activeTab]?.cpm || '0'),
                                        deposit: parseFloat(goals[activeTab]?.deposit || '0'),
                                        loss: parseFloat(goals[activeTab]?.loss || '0'),
                                        repeat: parseFloat(goals[activeTab]?.repeat || '0'),
                                        child: parseFloat(goals[activeTab]?.child || '0'),
                                        costPerDeposit: parseFloat(goals[activeTab]?.costPerDeposit || '0')
                                    }}
                                    dateRange={dateRange}
                                    activeTab={activeTab.toString()}
                                    selectedView={selectedView}
                                    chartPeriod={chartPeriod}
                                    selectedMonth={selectedMonth}
                                    selectedYear={selectedYear}
                                />
                            ) : (
                                <div className="h-[200px] flex items-center justify-center text-muted-foreground bg-gray-50 rounded-xl">
                                    {isLoadingData ? 'Loading charts...' : 'No data available for selected period'}
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            </div>
        </ClientRouteGuard>
    )
}
