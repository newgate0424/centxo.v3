"use client"

import { useState, useEffect, useRef } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RefreshCw, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, Search, MoreHorizontal, X, DollarSign, Pencil, PlusCircle, LayoutGrid, Flag, Layers, Megaphone, Download } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { useTheme } from "@/contexts/ThemeContext"
import { DatePickerWithRange } from "@/components/DateRangePicker"
import { DateRange } from "react-day-picker"
import { addDays, format } from "date-fns"
import { Checkbox } from "@/components/ui/checkbox"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    ALL_COLUMNS,
    COLUMN_CATEGORIES,
    getColumnsForTab,
    getAvailableColumnsForTab,
    groupColumnsByCategory,
    useVisibleColumns,
    formatCellValue,
    DEFAULT_VISIBLE_COLUMNS,
    type ColumnDef
} from "@/lib/column-config"
import { ColumnsDialog, AdsTableHeader, AdsTableCell, FormattingDialog, type FormattingRule } from "@/components/ads-table"


// Helper for Payment Icons
const PaymentMethodCell = ({ value }: { value: string }) => {
    if (!value || value === "N/A") return <span className="text-muted-foreground">-</span>

    const lower = value.toLowerCase()
    let Icon = null

    if (lower.includes("visa")) {
        Icon = (
            <div className="h-5 w-8 bg-[#1434CB] rounded-[2px] flex items-center justify-center text-[9px] font-bold text-white">
                VISA
            </div>
        )
    } else if (lower.includes("mastercard")) {
        Icon = (
            <div className="h-5 w-8 bg-[#0A2540] rounded-[2px] flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="h-4 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="7" cy="12" r="7" fill="#EB001B" />
                    <circle cx="17" cy="12" r="7" fill="#F79E1B" />
                    <path d="M12 16.8A6.98 6.98 0 0 1 9.6 12 6.98 6.98 0 0 1 12 7.2a6.98 6.98 0 0 1 2.4 4.8 6.98 6.98 0 0 1-2.4 4.8z" fill="#FF5F00" />
                </svg>
            </div>
        )
    } else {
        Icon = <div className="h-5 w-auto px-1.5 bg-muted rounded-[2px] flex items-center justify-center text-[9px] font-bold">CARD</div>
    }

    const last4 = value.match(/\d{4}/)?.[0] || value.replace(/[^0-9]/g, '').slice(-4)

    return (
        <div className="flex items-center justify-start gap-2">
            {Icon}
            <span className="text-sm text-muted-foreground">- {last4}</span>
        </div>
    )
}

// Theme color classes mapping
const themeColors = {
    violet: {
        active: 'bg-violet-200 text-violet-800 border-violet-300',
        inactive: 'bg-violet-100/70 text-violet-600 hover:bg-violet-150 dark:bg-violet-950 dark:text-violet-400 dark:hover:bg-violet-900',
        badge: 'bg-white text-violet-600',
        toast: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800',
        toastIcon: 'bg-violet-100 dark:bg-violet-900',
        toastClose: 'text-violet-400 hover:text-violet-600',
        toastProgress: 'bg-violet-300'
    },
    blue: {
        active: 'bg-blue-200 text-blue-800 border-blue-300',
        inactive: 'bg-blue-100/70 text-blue-600 hover:bg-blue-150 dark:bg-blue-950 dark:text-blue-400 dark:hover:bg-blue-900',
        badge: 'bg-white text-blue-600',
        toast: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
        toastIcon: 'bg-blue-100 dark:bg-blue-900',
        toastClose: 'text-blue-400 hover:text-blue-600',
        toastProgress: 'bg-blue-300'
    },
    indigo: {
        active: 'bg-indigo-200 text-indigo-800 border-indigo-300',
        inactive: 'bg-indigo-100/70 text-indigo-600 hover:bg-indigo-150 dark:bg-indigo-950 dark:text-indigo-400 dark:hover:bg-indigo-900',
        badge: 'bg-white text-indigo-600',
        toast: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800',
        toastIcon: 'bg-indigo-100 dark:bg-indigo-900',
        toastClose: 'text-indigo-400 hover:text-indigo-600',
        toastProgress: 'bg-indigo-300'
    },
    cyan: {
        active: 'bg-cyan-200 text-cyan-800 border-cyan-300',
        inactive: 'bg-cyan-100/70 text-cyan-600 hover:bg-cyan-150 dark:bg-cyan-950 dark:text-cyan-400 dark:hover:bg-cyan-900',
        badge: 'bg-white text-cyan-600',
        toast: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800',
        toastIcon: 'bg-cyan-100 dark:bg-cyan-900',
        toastClose: 'text-cyan-400 hover:text-cyan-600',
        toastProgress: 'bg-cyan-300'
    },
    teal: {
        active: 'bg-teal-200 text-teal-800 border-teal-300',
        inactive: 'bg-teal-100/70 text-teal-600 hover:bg-teal-150 dark:bg-teal-950 dark:text-teal-400 dark:hover:bg-teal-900',
        badge: 'bg-white text-teal-600',
        toast: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800',
        toastIcon: 'bg-teal-100 dark:bg-teal-900',
        toastClose: 'text-teal-400 hover:text-teal-600',
        toastProgress: 'bg-teal-300'
    },
    green: {
        active: 'bg-green-200 text-green-800 border-green-300',
        inactive: 'bg-green-100/70 text-green-600 hover:bg-green-150 dark:bg-green-950 dark:text-green-400 dark:hover:bg-green-900',
        badge: 'bg-white text-green-600',
        toast: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
        toastIcon: 'bg-green-100 dark:bg-green-900',
        toastClose: 'text-green-400 hover:text-green-600',
        toastProgress: 'bg-green-300'
    },
    amber: {
        active: 'bg-amber-200 text-amber-800 border-amber-300',
        inactive: 'bg-amber-100/70 text-amber-600 hover:bg-amber-150 dark:bg-amber-950 dark:text-amber-400 dark:hover:bg-amber-900',
        badge: 'bg-white text-amber-600',
        toast: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
        toastIcon: 'bg-amber-100 dark:bg-amber-900',
        toastClose: 'text-amber-400 hover:text-amber-600',
        toastProgress: 'bg-amber-300'
    },
    orange: {
        active: 'bg-orange-200 text-orange-800 border-orange-300',
        inactive: 'bg-orange-100/70 text-orange-600 hover:bg-orange-150 dark:bg-orange-950 dark:text-orange-400 dark:hover:bg-orange-900',
        badge: 'bg-white text-orange-600',
        toast: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
        toastIcon: 'bg-orange-100 dark:bg-orange-900',
        toastClose: 'text-orange-400 hover:text-orange-600',
        toastProgress: 'bg-orange-300'
    },
    rose: {
        active: 'bg-rose-200 text-rose-800 border-rose-300',
        inactive: 'bg-rose-100/70 text-rose-600 hover:bg-rose-150 dark:bg-rose-950 dark:text-rose-400 dark:hover:bg-rose-900',
        badge: 'bg-white text-rose-600',
        toast: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800',
        toastIcon: 'bg-rose-100 dark:bg-rose-900',
        toastClose: 'text-rose-400 hover:text-rose-600',
        toastProgress: 'bg-rose-300'
    },
    pink: {
        active: 'bg-pink-200 text-pink-800 border-pink-300',
        inactive: 'bg-pink-100/70 text-pink-600 hover:bg-pink-150 dark:bg-pink-950 dark:text-pink-400 dark:hover:bg-pink-900',
        badge: 'bg-white text-pink-600',
        toast: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950 dark:text-pink-300 dark:border-pink-800',
        toastIcon: 'bg-pink-100 dark:bg-pink-900',
        toastClose: 'text-pink-400 hover:text-pink-600',
        toastProgress: 'bg-pink-300'
    },
    sky: {
        active: 'bg-sky-200 text-sky-800 border-sky-300',
        inactive: 'bg-sky-100/70 text-sky-600 hover:bg-sky-150 dark:bg-sky-950 dark:text-sky-400 dark:hover:bg-sky-900',
        badge: 'bg-white text-sky-600',
        toast: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800',
        toastIcon: 'bg-sky-100 dark:bg-sky-900',
        toastClose: 'text-sky-400 hover:text-sky-600',
        toastProgress: 'bg-sky-300'
    },
    slate: {
        active: 'bg-slate-300 text-slate-800 border-slate-400',
        inactive: 'bg-slate-100/70 text-slate-600 hover:bg-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900',
        badge: 'bg-white text-slate-600',
        toast: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800',
        toastIcon: 'bg-slate-100 dark:bg-slate-900',
        toastClose: 'text-slate-400 hover:text-slate-600',
        toastProgress: 'bg-slate-300'
    },
    emerald: {
        active: 'bg-emerald-200 text-emerald-800 border-emerald-300',
        inactive: 'bg-emerald-100/70 text-emerald-600 hover:bg-emerald-150 dark:bg-emerald-950 dark:text-emerald-400 dark:hover:bg-emerald-900',
        badge: 'bg-white text-emerald-600',
        toast: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
        toastIcon: 'bg-emerald-100 dark:bg-emerald-900',
        toastClose: 'text-emerald-400 hover:text-emerald-600',
        toastProgress: 'bg-emerald-300'
    },
    lavender: {
        active: 'bg-purple-200 text-purple-800 border-purple-300',
        inactive: 'bg-purple-100/70 text-purple-600 hover:bg-purple-150 dark:bg-purple-950 dark:text-purple-400 dark:hover:bg-purple-900',
        badge: 'bg-white text-purple-500',
        toast: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
        toastIcon: 'bg-purple-100 dark:bg-purple-900',
        toastClose: 'text-purple-400 hover:text-purple-600',
        toastProgress: 'bg-purple-200'
    }
}

export default function AdsTable() {
    const { t } = useLanguage()
    const { primaryColor } = useTheme()
    const colors = themeColors[primaryColor] || themeColors.sky
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()

    // Initialize state directly from URL params to prevent flicker/reset
    const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || "accounts")
    const [isLoading, setIsLoading] = useState(false)
    const [data, setData] = useState<any[]>([])
    // Default no sorting - cycle through: none → desc → asc → none
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(() => {
        const sortKey = searchParams.get('sortKey')
        const sortDir = searchParams.get('sortDir')
        if (sortKey && sortDir) {
            return { key: sortKey, direction: sortDir as 'asc' | 'desc' }
        }
        return null  // Default: no sorting
    })
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>(() => searchParams.get('statusFilter') || "all")

    const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(() => {
        const param = searchParams.get('accountIds')
        return param ? param.split(',').filter(Boolean) : []
    })
    const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>(() => {
        const param = searchParams.get('campaignIds')
        return param ? param.split(',').filter(Boolean) : []
    })
    const [selectedAdSetIds, setSelectedAdSetIds] = useState<string[]>(() => {
        const param = searchParams.get('adSetIds')
        return param ? param.split(',').filter(Boolean) : []
    })
    const [selectedAdIds, setSelectedAdIds] = useState<string[]>(() => {
        const param = searchParams.get('adIds')
        return param ? param.split(',').filter(Boolean) : []
    })
    const [selectedAccountName, setSelectedAccountName] = useState<string | null>(() => searchParams.get('accountName'))

    // Checked items (checkbox state) - separate from selected (navigation)
    const [checkedAccountIds, setCheckedAccountIds] = useState<string[]>(() => {
        const param = searchParams.get('checkedAccounts')
        return param ? param.split(',').filter(Boolean) : []
    })
    const [checkedCampaignIds, setCheckedCampaignIds] = useState<string[]>(() => {
        const param = searchParams.get('checkedCampaigns')
        return param ? param.split(',').filter(Boolean) : []
    })
    const [checkedAdSetIds, setCheckedAdSetIds] = useState<string[]>(() => {
        const param = searchParams.get('checkedAdSets')
        return param ? param.split(',').filter(Boolean) : []
    })
    const [checkedAdIds, setCheckedAdIds] = useState<string[]>(() => {
        const param = searchParams.get('checkedAds')
        return param ? param.split(',').filter(Boolean) : []
    })

    // Spending Limit Dialog state
    const [spendingLimitDialogOpen, setSpendingLimitDialogOpen] = useState(false)
    const [selectedAccountForLimit, setSelectedAccountForLimit] = useState<any>(null)
    const [spendingLimitAction, setSpendingLimitAction] = useState<'change' | 'reset' | 'delete'>('change')
    const [newSpendingLimit, setNewSpendingLimit] = useState('')
    const [isUpdatingLimit, setIsUpdatingLimit] = useState(false)

    // Customize Columns Dialog state
    const [columnsDialogOpen, setColumnsDialogOpen] = useState(false)
    const { visibleColumns, setVisibleColumns, resetToDefault: resetColumnsToDefault, reorderColumns, isLoaded: columnsLoaded } = useVisibleColumns(activeTab)
    const [columnSearch, setColumnSearch] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('performance')

    // Get available columns for current tab (from column-config)
    const availableColumnsForTab = getAvailableColumnsForTab(activeTab)
    const groupedColumns = groupColumnsByCategory(availableColumnsForTab)

    // Conditional Formatting Dialog state
    const [formattingDialogOpen, setFormattingDialogOpen] = useState(false)
    const [formattingRules, setFormattingRules] = useState<FormattingRule[]>([])

    // Google Sheets Config Dialog state


    // Track what we've already fetched to prevent duplicate fetches (ref declared here, used in useEffects below)
    const lastFetchRef = useRef<string | null>(null)
    const lastFetchTimeRef = useRef<number | null>(null)
    const CACHE_TTL = 5 * 60 * 1000 // 5 minutes in milliseconds

    // State for expanded targeting popup
    const [expandedTargeting, setExpandedTargeting] = useState<Set<string>>(new Set())

    const updateUrl = (params: {
        tab?: string,
        accountIds?: string[],
        campaignIds?: string[],
        adSetIds?: string[],
        adIds?: string[],
        accountName?: string | null,
        checkedAccounts?: string[],
        checkedCampaigns?: string[],
        checkedAdSets?: string[],
        checkedAds?: string[],
        from?: Date,
        to?: Date,
        statusFilter?: string,
        sortKey?: string,
        sortDir?: string
    }) => {
        const newParams = new URLSearchParams(searchParams.toString())
        if (params.tab) newParams.set('tab', params.tab)
        if (params.accountIds !== undefined) {
            if (params.accountIds.length > 0) newParams.set('accountIds', params.accountIds.join(','))
            else newParams.delete('accountIds')
        }
        if (params.campaignIds !== undefined) {
            if (params.campaignIds.length > 0) newParams.set('campaignIds', params.campaignIds.join(','))
            else newParams.delete('campaignIds')
        }
        if (params.adSetIds !== undefined) {
            if (params.adSetIds.length > 0) newParams.set('adSetIds', params.adSetIds.join(','))
            else newParams.delete('adSetIds')
        }
        if (params.adIds !== undefined) {
            if (params.adIds.length > 0) newParams.set('adIds', params.adIds.join(','))
            else newParams.delete('adIds')
        }
        if (params.accountName !== undefined) {
            if (params.accountName) newParams.set('accountName', params.accountName)
            else newParams.delete('accountName')
        }
        if (params.checkedAccounts !== undefined) {
            if (params.checkedAccounts.length > 0) newParams.set('checkedAccounts', params.checkedAccounts.join(','))
            else newParams.delete('checkedAccounts')
        }
        if (params.checkedCampaigns !== undefined) {
            if (params.checkedCampaigns.length > 0) newParams.set('checkedCampaigns', params.checkedCampaigns.join(','))
            else newParams.delete('checkedCampaigns')
        }
        if (params.checkedAdSets !== undefined) {
            if (params.checkedAdSets.length > 0) newParams.set('checkedAdSets', params.checkedAdSets.join(','))
            else newParams.delete('checkedAdSets')
        }
        if (params.checkedAds !== undefined) {
            if (params.checkedAds.length > 0) newParams.set('checkedAds', params.checkedAds.join(','))
            else newParams.delete('checkedAds')
        }
        if (params.from) newParams.set('from', format(params.from, 'yyyy-MM-dd'))
        if (params.to) newParams.set('to', format(params.to, 'yyyy-MM-dd'))
        if (params.statusFilter !== undefined) {
            if (params.statusFilter && params.statusFilter !== 'all') newParams.set('statusFilter', params.statusFilter)
            else newParams.delete('statusFilter')
        }
        if (params.sortKey !== undefined && params.sortDir !== undefined) {
            newParams.set('sortKey', params.sortKey)
            newParams.set('sortDir', params.sortDir)
        }
        router.replace(`${pathname}?${newParams.toString()}`)
    }

    const [date, setDate] = useState<DateRange | undefined>(() => {
        const fromParam = searchParams.get('from')
        const toParam = searchParams.get('to')
        if (fromParam && toParam) {
            return { from: new Date(fromParam), to: new Date(toParam) }
        }
        // Default to today
        const today = new Date()
        return { from: today, to: today }
    })

    const handleDateChange = (newDate: DateRange | undefined) => {
        setDate(newDate)
        if (newDate?.from && newDate?.to) {
            updateUrl({ from: newDate.from, to: newDate.to })
        }
    }

    const fetchData = async (type: string, ids: { accountIds?: string[], campaignIds?: string[], adSetIds?: string[] }, noCache = false, keepExistingData = false) => {
        // Always show loading skeleton when fetching new data
        if (!keepExistingData) {
            setIsLoading(true)
            setData([]) // Clear old data to show skeleton
        }
        try {
            const dateParams = date?.from && date?.to
                ? `&since=${format(date.from, 'yyyy-MM-dd')}&until=${format(date.to, 'yyyy-MM-dd')}`
                : ''
            let queryParams = dateParams
            if (ids.accountIds && ids.accountIds.length > 0) queryParams += `&accountIds=${ids.accountIds.join(',')}`
            if (ids.campaignIds && ids.campaignIds.length > 0) queryParams += `&campaignIds=${ids.campaignIds.join(',')}`
            if (ids.adSetIds && ids.adSetIds.length > 0) queryParams += `&adSetIds=${ids.adSetIds.join(',')}`

            // Add noCache parameter to bypass Redis cache
            if (noCache) queryParams += `&noCache=true`

            const [basicRes, insightsRes] = await Promise.all([
                fetch(`/api/ads/basic?type=${type}${queryParams}`),
                fetch(`/api/ads/insights?type=${type}${queryParams}`)
            ])

            if (!basicRes.ok) {
                const errorData = await basicRes.json().catch(() => ({}))
                throw new Error(errorData.error || "Failed to fetch basic data")
            }
            const basicData = await basicRes.json()

            console.log(`[${type}] Basic data:`, basicData.data?.slice(0, 2))

            // Handle empty or undefined data
            if (!basicData.data || basicData.data.length === 0) {
                if (!keepExistingData) {
                    setData([])
                }
                setIsLoading(false)
                return
            }

            const initialData = basicData.data.map((item: any) => ({
                ...item,
                spend: "...",
                impressions: "...",
                clicks: "...",
                reach: "...",
                actions: null, // null indicates loading
                costPerActionType: null,
                _insightsLoading: true, // flag to show loading state
            }))

            if (!insightsRes.ok) {
                console.warn("Failed to fetch insights, using basic data only")
            }
            const insightsData = insightsRes.ok ? await insightsRes.json() : { data: [] }

            const mergedData = initialData.map((item: any) => {
                const insight = insightsData?.data?.find((i: any) => i.id === item.id)
                // Add accountId from selectedAccountIds for Action button
                const accountId = item.account_id || item.accountId || selectedAccountIds[0]
                return {
                    ...item,
                    accountId, // Add accountId to each item
                    spend: insight?.spend || "0.00",
                    impressions: insight?.impressions || 0,
                    clicks: insight?.clicks || 0,
                    reach: insight?.reach || 0,
                    actions: insight?.actions || [],
                    costPerActionType: insight?.costPerActionType || [],
                    videoAvgTimeWatched: insight?.videoAvgTimeWatched || 0,
                    videoPlays: insight?.videoPlays || 0,
                    videoP25Watched: insight?.videoP25Watched || 0,
                    videoP50Watched: insight?.videoP50Watched || 0,
                    videoP75Watched: insight?.videoP75Watched || 0,
                    videoP95Watched: insight?.videoP95Watched || 0,
                    videoP100Watched: insight?.videoP100Watched || 0,
                    _insightsLoading: false, // Insights loaded
                }
            })
            setData(mergedData)
        } catch (error: any) {
            console.error("Failed to fetch data:", error?.message || error)
            toast.error(error?.message || t.toasts.loadAdsError)
        } finally {
            setIsLoading(false)
        }
    }

    // Fetch accounts data - only depends on activeTab and date
    useEffect(() => {
        if (activeTab !== 'accounts') return

        const dateKey = date?.from && date?.to
            ? `${date.from.toISOString()}-${date.to.toISOString()}`
            : 'no-date'
        const fetchKey = `accounts-${dateKey}`

        // Check if cache key is the same
        if (lastFetchRef.current === fetchKey) {
            // Check cache age
            const now = Date.now()
            const cacheAge = lastFetchTimeRef.current ? now - lastFetchTimeRef.current : Infinity
            const cacheAgeMinutes = Math.floor(cacheAge / 60000)

            // If cache is less than 5 minutes old, don't fetch
            if (cacheAge < CACHE_TTL) {
                console.log(`📦 [CACHE] Using cached data for accounts (age: ${cacheAgeMinutes}m ${Math.floor((cacheAge % 60000) / 1000)}s)`)
                return
            }
            console.log(`🔄 [FETCH] Cache expired for accounts (age: ${cacheAgeMinutes}m), fetching fresh data...`)
        } else {
            console.log(`🔄 [FETCH] New cache key for accounts, fetching data...`)
        }

        // Fetch new data
        lastFetchRef.current = fetchKey
        lastFetchTimeRef.current = Date.now()
        fetchData('accounts', {})
    }, [activeTab, date])

    // Fetch campaigns data - depends on activeTab, date, and account selection
    useEffect(() => {
        if (activeTab !== 'campaigns') return

        const accountIds = checkedAccountIds.length > 0 ? checkedAccountIds : selectedAccountIds
        if (accountIds.length === 0) return

        const dateKey = date?.from && date?.to
            ? `${date.from.toISOString()}-${date.to.toISOString()}`
            : 'no-date'
        const fetchKey = `campaigns-${dateKey}-${accountIds.join(',')}`

        if (lastFetchRef.current === fetchKey) {
            const now = Date.now()
            const cacheAge = lastFetchTimeRef.current ? now - lastFetchTimeRef.current : Infinity
            const cacheAgeMinutes = Math.floor(cacheAge / 60000)
            if (cacheAge < CACHE_TTL) {
                console.log(`📦 [CACHE] Using cached data for campaigns (age: ${cacheAgeMinutes}m ${Math.floor((cacheAge % 60000) / 1000)}s)`)
                return
            }
            console.log(`🔄 [FETCH] Cache expired for campaigns, fetching fresh data...`)
        } else {
            console.log(`🔄 [FETCH] New cache key for campaigns, fetching data...`)
        }

        lastFetchRef.current = fetchKey
        lastFetchTimeRef.current = Date.now()
        fetchData('campaigns', { accountIds })
    }, [activeTab, date, selectedAccountIds, checkedAccountIds])

    // Fetch adsets data - depends on activeTab, date, account and campaign selection
    useEffect(() => {
        if (activeTab !== 'adsets') return

        const accountIds = checkedAccountIds.length > 0 ? checkedAccountIds : selectedAccountIds
        const campaignIds = checkedCampaignIds.length > 0 ? checkedCampaignIds : selectedCampaignIds
        if (accountIds.length === 0) return

        const dateKey = date?.from && date?.to
            ? `${date.from.toISOString()}-${date.to.toISOString()}`
            : 'no-date'
        const fetchKey = `adsets-${dateKey}-${accountIds.join(',')}-${campaignIds.join(',')}`

        if (lastFetchRef.current === fetchKey) {
            const now = Date.now()
            const cacheAge = lastFetchTimeRef.current ? now - lastFetchTimeRef.current : Infinity
            const cacheAgeMinutes = Math.floor(cacheAge / 60000)
            if (cacheAge < CACHE_TTL) {
                console.log(`📦 [CACHE] Using cached data for adsets (age: ${cacheAgeMinutes}m ${Math.floor((cacheAge % 60000) / 1000)}s)`)
                return
            }
            console.log(`🔄 [FETCH] Cache expired for adsets, fetching fresh data...`)
        } else {
            console.log(`🔄 [FETCH] New cache key for adsets, fetching data...`)
        }

        lastFetchRef.current = fetchKey
        lastFetchTimeRef.current = Date.now()
        fetchData('adsets', { accountIds, campaignIds })
    }, [activeTab, date, selectedAccountIds, checkedAccountIds, checkedCampaignIds])

    // Fetch ads data - depends on activeTab, date, account, campaign, and adset selection
    useEffect(() => {
        if (activeTab !== 'ads') return

        const accountIds = checkedAccountIds.length > 0 ? checkedAccountIds : selectedAccountIds
        const campaignIds = checkedCampaignIds.length > 0 ? checkedCampaignIds : selectedCampaignIds
        const adSetIds = checkedAdSetIds.length > 0 ? checkedAdSetIds : selectedAdSetIds
        if (accountIds.length === 0) return

        const dateKey = date?.from && date?.to
            ? `${date.from.toISOString()}-${date.to.toISOString()}`
            : 'no-date'
        const fetchKey = `ads-${dateKey}-${accountIds.join(',')}-${campaignIds.join(',')}-${adSetIds.join(',')}`

        if (lastFetchRef.current === fetchKey) {
            const now = Date.now()
            const cacheAge = lastFetchTimeRef.current ? now - lastFetchTimeRef.current : Infinity
            const cacheAgeMinutes = Math.floor(cacheAge / 60000)
            if (cacheAge < CACHE_TTL) {
                console.log(`📦 [CACHE] Using cached data for ads (age: ${cacheAgeMinutes}m ${Math.floor((cacheAge % 60000) / 1000)}s)`)
                return
            }
            console.log(`🔄 [FETCH] Cache expired for ads, fetching fresh data...`)
        } else {
            console.log(`🔄 [FETCH] New cache key for ads, fetching data...`)
        }

        lastFetchRef.current = fetchKey
        lastFetchTimeRef.current = Date.now()
        fetchData('ads', { accountIds, campaignIds, adSetIds })
    }, [activeTab, date, selectedAccountIds, checkedAccountIds, checkedCampaignIds, checkedAdSetIds])

    const handleRowClick = (item: any) => {
        // Ads tab: No selection on row click
        if (activeTab === 'ads') {
            return
        }
        // Other tabs: Toggle checkbox selection when clicking row
        toggleSelectRow(item.id, !currentSelection.includes(item.id))
    }

    const handleBackToAccounts = () => {
        setSelectedAccountIds([])
        setSelectedCampaignIds([])
        setSelectedAdSetIds([])
        setSelectedAdIds([])
        setSelectedAccountName(null)
        setActiveTab('accounts')
        updateUrl({ tab: 'accounts', accountIds: [], campaignIds: [], adSetIds: [], adIds: [], accountName: null })
    }

    const getCurrentSelection = () => {
        switch (activeTab) {
            case 'accounts': return checkedAccountIds
            case 'campaigns': return checkedCampaignIds
            case 'adsets': return checkedAdSetIds
            case 'ads': return checkedAdIds
            default: return []
        }
    }

    const setCurrentSelection = (newSelection: string[]) => {
        switch (activeTab) {
            case 'accounts':
                setCheckedAccountIds(newSelection)
                // Clear all child selections when accounts change
                setCheckedCampaignIds([])
                setCheckedAdSetIds([])
                setCheckedAdIds([])
                updateUrl({
                    checkedAccounts: newSelection,
                    checkedCampaigns: [],
                    checkedAdSets: [],
                    checkedAds: []
                })
                break
            case 'campaigns':
                setCheckedCampaignIds(newSelection)
                // Clear child selections when campaigns change
                setCheckedAdSetIds([])
                setCheckedAdIds([])
                updateUrl({
                    checkedCampaigns: newSelection,
                    checkedAdSets: [],
                    checkedAds: []
                })
                break
            case 'adsets':
                setCheckedAdSetIds(newSelection)
                // Clear child selections when adsets change
                setCheckedAdIds([])
                updateUrl({
                    checkedAdSets: newSelection,
                    checkedAds: []
                })
                break
            case 'ads':
                setCheckedAdIds(newSelection)
                updateUrl({ checkedAds: newSelection })
                break
        }
    }

    const toggleSelectAll = (checked: boolean) => {
        if (checked) {
            setCurrentSelection(data.map(item => item.id))
        } else {
            setCurrentSelection([])
        }
    }

    const getActionValue = (actions: any[], type: string) => {
        if (!actions || !Array.isArray(actions)) return 0
        const action = actions.find((a: any) => a.action_type === type)
        return action ? parseFloat(action.value) : 0
    }

    const hasActionType = (actions: any[], type: string) => {
        if (!actions) return false
        return actions.some((a: any) => a.action_type === type)
    }

    const getCostPerAction = (costs: any[], type: string) => {
        if (!costs) return 0
        const cost = costs.find((c: any) => c.action_type === type)
        return cost ? parseFloat(cost.value) : 0
    }

    const hasCostType = (costs: any[], type: string) => {
        if (!costs) return false
        return costs.some((c: any) => c.action_type === type)
    }

    const formatCurrency = (value: number, currency: string) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)
    }

    const formatNumber = (value: number) => {
        return new Intl.NumberFormat('en-US').format(value)
    }

    const toggleSelectRow = (id: string, checked: boolean) => {
        const currentSelection = getCurrentSelection()
        if (checked) {
            setCurrentSelection([...currentSelection, id])
        } else {
            setCurrentSelection(currentSelection.filter(rowId => rowId !== id))
        }
    }

    // Toggle On/Off status for campaigns, adsets, ads
    const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())
    const [lockedSortOrder, setLockedSortOrder] = useState<string[]>([])

    const handleToggleStatus = async (itemId: string, currentStatus: string, e: React.MouseEvent) => {
        e.stopPropagation()

        const type = activeTab === 'campaigns' ? 'campaign' : activeTab === 'adsets' ? 'adset' : 'ad'
        const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'

        console.log(`🔄 Toggling ${type} ${itemId} from ${currentStatus} to ${newStatus}`)

        // Lock current sort order to prevent jumping
        if (lockedSortOrder.length === 0) {
            setLockedSortOrder(filteredData.map(item => item.id))
        }

        // Add to toggling state immediately
        setTogglingIds(prev => new Set(prev).add(itemId))

        // Optimistic update - อัปเดต UI ทันที
        setData(prev => {
            const updated = prev.map(d => {
                if (d.id === itemId) {
                    console.log(`✅ Found item to update: ${d.id}, old status: ${d.status}, new status: ${newStatus}`)
                    return {
                        ...d, // เก็บข้อมูลเดิมทั้งหมดรวม insights
                        status: newStatus,
                        effectiveStatus: newStatus,
                        deliveryStatus: newStatus === 'PAUSED'
                            ? (type === 'campaign' ? 'CAMPAIGN_PAUSED' : type === 'adset' ? 'ADSET_PAUSED' : 'PAUSED')
                            : 'ACTIVE'
                    }
                }
                return d
            })
            return updated
        })

        try {
            const res = await fetch('/api/ads/toggle-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: itemId, type, status: newStatus })
            })

            const result = await res.json()

            if (!res.ok) {
                throw new Error(result.error || 'Failed to update status')
            }

            // Show success message
            toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} ${newStatus === 'ACTIVE' ? 'activated' : 'paused'}`)

            // Clear cache to ensure next refresh gets fresh data
            lastFetchRef.current = null
            lastFetchTimeRef.current = null

            // Fetch only the updated item data silently in background
            const fetchUpdatedItem = async () => {
                try {
                    const dateParams = date?.from && date?.to
                        ? `&since=${format(date.from, 'yyyy-MM-dd')}&until=${format(date.to, 'yyyy-MM-dd')}`
                        : ''

                    const [basicRes, insightsRes] = await Promise.all([
                        fetch(`/api/ads/basic?type=${type}&itemId=${itemId}&noCache=true${dateParams}`),
                        fetch(`/api/ads/insights?type=${type}&itemId=${itemId}&noCache=true${dateParams}`)
                    ])

                    if (basicRes.ok && insightsRes.ok) {
                        const basicData = await basicRes.json()
                        const insightsData = await insightsRes.json()

                        if (basicData.data && basicData.data.length > 0) {
                            const updatedItem = basicData.data[0]
                            const insight = insightsData?.data?.find((i: any) => i.id === updatedItem.id)

                            // Update only this specific item, keeping all existing data
                            setData(prev => prev.map(d => {
                                if (d.id === itemId) {
                                    const accountId = updatedItem.account_id || updatedItem.accountId || d.accountId || selectedAccountIds[0]
                                    return {
                                        ...d, // Keep all existing data first
                                        // Only update specific fields that we know changed
                                        status: updatedItem.status || d.status,
                                        effectiveStatus: updatedItem.effective_status || updatedItem.effectiveStatus || d.effectiveStatus,
                                        configuredStatus: updatedItem.configured_status || updatedItem.configuredStatus || d.configuredStatus,
                                        deliveryStatus: updatedItem.effective_status || updatedItem.effectiveStatus || d.deliveryStatus,
                                        accountId,
                                        // Update insights but keep existing if not available
                                        insights: insight || d.insights || {},
                                        spend: insight?.spend || d.spend || "0.00",
                                        impressions: insight?.impressions || d.impressions || 0,
                                        clicks: insight?.clicks || d.clicks || 0,
                                        reach: insight?.reach || d.reach || 0,
                                        actions: insight?.actions || d.actions || [],
                                        costPerActionType: insight?.costPerActionType || d.costPerActionType || [],
                                        videoAvgTimeWatched: insight?.videoAvgTimeWatched || d.videoAvgTimeWatched || 0,
                                        videoPlays: insight?.videoPlays || d.videoPlays || 0,
                                        videoP25Watched: insight?.videoP25Watched || d.videoP25Watched || 0,
                                        videoP50Watched: insight?.videoP50Watched || d.videoP50Watched || 0,
                                        videoP75Watched: insight?.videoP75Watched || d.videoP75Watched || 0,
                                        videoP95Watched: insight?.videoP95Watched || d.videoP95Watched || 0,
                                        videoP100Watched: insight?.videoP100Watched || d.videoP100Watched || 0,
                                    }
                                }
                                return d
                            }))
                        }
                    }
                } catch (err) {
                    console.error('Failed to fetch updated item:', err)
                }
            }

            // Fetch updated item after a short delay
            setTimeout(fetchUpdatedItem, 1500)

        } catch (error: any) {
            console.error('Error toggling status:', error)
            toast.error(error.message || 'Failed to update status')

            // Revert optimistic update on error
            setData(prev => prev.map(d =>
                d.id === itemId
                    ? {
                        ...d,
                        status: currentStatus,
                        effectiveStatus: currentStatus,
                        deliveryStatus: d.deliveryStatus
                    }
                    : d
            ))
        } finally {
            // Remove from toggling state
            setTogglingIds(prev => {
                const next = new Set(prev)
                next.delete(itemId)
                return next
            })

            // Unlock sort order after a delay
            setTimeout(() => {
                setLockedSortOrder([])
            }, 1000)
        }
    }

    // Helper function to get column label with translations
    const getColumnLabel = (key: string): string => {
        const translationMap: Record<string, string> = {
            'name': t.common?.name || 'Name',
            'delivery': t.common?.delivery || 'Delivery',
            'status': t.common?.status || 'Status',
            'results': t.common?.results || 'Results',
            'costPerResult': t.common?.costPerResult || 'Cost per Result',
            'budget': t.common?.budget || 'Budget',
            'reach': t.common?.reach || 'Reach',
            'impressions': t.common?.impressions || 'Impressions',
            'postEngagements': t.common?.postEngagements || 'Post Engagements',
            'clicks': t.common?.clicks || 'Clicks (All)',
            'newMessagingContacts': t.common?.newMessagingContacts || 'New Messaging Contacts',
            'spend': t.common?.amountSpent || 'Amount Spent',
            'costPerNewMessagingContact': t.common?.costPerNewMessagingContact || 'Cost per Message',
            'videoAvgTimeWatched': t.common?.videoAvgPlayTime || 'Avg Video Play Time',
            'videoPlays': t.common?.videoPlays || 'Video Plays',
            'videoPlays3s': t.common?.videoPlays3s || '3-Second Video Plays',
            'videoP25Watched': t.common?.videoPlays25 || 'Video Plays at 25%',
            'videoP50Watched': t.common?.videoPlays50 || 'Video Plays at 50%',
            'videoP75Watched': t.common?.videoPlays75 || 'Video Plays at 75%',
            'videoP95Watched': t.common?.videoPlays95 || 'Video Plays at 95%',
            'videoP100Watched': t.common?.videoPlays100 || 'Video Plays at 100%',
            'activeAdsCount': 'Active Ads',
            'spendCap': 'Spending Cap',
            'paymentMethod': t.common?.paymentMethod || 'Payment Method',
            'timezone': t.common?.timeZone || 'Timezone',
            'country': t.common?.nationality || 'Country',
            'currency': t.common?.currency || 'Currency',
            'accountName': t.common?.account || 'Account',
            'pageName': t.common?.page || 'Page',
            'targeting': t.common?.target || 'Targeting',
        }
        const colDef = ALL_COLUMNS.find(c => c.key === key)
        return translationMap[key] || colDef?.label || key
    }

    // Get column alignment
    const getColumnAlign = (key: string): 'left' | 'center' | 'right' => {
        const colDef = ALL_COLUMNS.find(c => c.key === key)
        return colDef?.align || 'left'
    }

    // Check if column is sortable
    const isColumnSortable = (key: string): boolean => {
        const colDef = ALL_COLUMNS.find(c => c.key === key)
        return colDef?.sortable ?? true
    }

    // Render dynamic cell based on column key
    const renderDynamicCell = (item: any, colKey: string, index: number, isLast: boolean) => {
        const align = getColumnAlign(colKey)
        const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : ''
        const borderClass = !isLast ? 'border-r' : ''
        const currency = item.currency || 'USD'

        // Helper to get result value based on objective
        const getResultValue = () => {
            const objective = item.objective?.toUpperCase() || ''
            const messagingResult = getActionValue(item.actions, 'onsite_conversion.messaging_conversation_started_7d')
            const messagingFirstReply = getActionValue(item.actions, 'onsite_conversion.messaging_first_reply')
            const isMessagingCampaign = hasActionType(item.actions, 'onsite_conversion.messaging_conversation_started_7d') ||
                hasActionType(item.actions, 'onsite_conversion.messaging_first_reply') ||
                messagingResult > 0 || messagingFirstReply > 0

            if (objective === 'MESSAGES' || objective === 'OUTCOME_ENGAGEMENT') {
                if (messagingResult > 0) return messagingResult
                if (messagingFirstReply > 0) return messagingFirstReply
                return 0
            }
            if (isMessagingCampaign) {
                if (messagingResult > 0) return messagingResult
                if (messagingFirstReply > 0) return messagingFirstReply
                return 0
            }

            // Fallback to other action types
            const fallbackTypes = ['link_click', 'post_engagement', 'video_view', 'page_engagement']
            for (const type of fallbackTypes) {
                const val = getActionValue(item.actions, type)
                if (val > 0) return val
            }
            return 0
        }

        // Helper to get cost per result
        const getCostPerResultValue = () => {
            const messagingCost = getCostPerAction(item.costPerActionType, 'onsite_conversion.messaging_conversation_started_7d')
            const messagingFirstReplyCost = getCostPerAction(item.costPerActionType, 'onsite_conversion.messaging_first_reply')
            if (messagingCost > 0) return messagingCost
            if (messagingFirstReplyCost > 0) return messagingFirstReplyCost

            const fallbackTypes = ['link_click', 'post_engagement', 'video_view']
            for (const type of fallbackTypes) {
                const val = getCostPerAction(item.costPerActionType, type)
                if (val > 0) return val
            }
            return 0
        }

        const renderValue = () => {
            switch (colKey) {
                case 'delivery':
                    return getDeliveryStatus(item, activeTab)
                case 'results':
                    const resultVal = getResultValue()
                    return resultVal > 0 ? formatNumber(resultVal) : '-'
                case 'costPerResult':
                    // Only show cost per result if there are actual results
                    const resultForCost = getResultValue()
                    if (resultForCost === 0) return '-'
                    const costVal = getCostPerResultValue()
                    return costVal > 0 ? formatCurrency(costVal, currency) : '-'
                case 'budget':
                    if (item.dailyBudget) return <div className="flex flex-col items-end"><span>{formatCurrency(item.dailyBudget / 100, currency)}</span><span className="text-xs text-muted-foreground">{t.common.daily || 'Daily'}</span></div>
                    if (item.lifetimeBudget) return <div className="flex flex-col items-end"><span>{formatCurrency(item.lifetimeBudget / 100, currency)}</span><span className="text-xs text-muted-foreground">{t.common.lifetime || 'Lifetime'}</span></div>
                    if (item.budget) return formatCurrency(parseFloat(item.budget) / 100, currency)
                    return '-'
                case 'reach':
                    return formatNumber(item.reach || 0)
                case 'impressions':
                    return formatNumber(item.impressions || 0)
                case 'postEngagements':
                    return formatNumber(getActionValue(item.actions, 'post_engagement'))
                case 'clicks':
                    return formatNumber(item.clicks || 0)
                case 'newMessagingContacts':
                    return formatNumber(getActionValue(item.actions, 'onsite_conversion.messaging_conversation_started_7d'))
                case 'spend':
                    return formatCurrency(item.spend || 0, currency)
                case 'costPerNewMessagingContact':
                    return formatCurrency(getCostPerAction(item.costPerActionType, 'onsite_conversion.messaging_conversation_started_7d'), currency)
                case 'videoAvgTimeWatched':
                    const val = item.videoAvgTimeWatched ? parseFloat(item.videoAvgTimeWatched) : 0
                    if (val === 0) return '-'
                    const minutes = Math.floor(val / 60)
                    const seconds = Math.floor(val % 60)
                    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
                case 'videoPlays':
                    return formatNumber(item.videoPlays || 0)
                case 'videoPlays3s':
                    return formatNumber(getActionValue(item.actions, 'video_view'))
                case 'videoP25Watched':
                    return formatNumber(item.videoP25Watched || 0)
                case 'videoP50Watched':
                    return formatNumber(item.videoP50Watched || 0)
                case 'videoP75Watched':
                    return formatNumber(item.videoP75Watched || 0)
                case 'videoP95Watched':
                    return formatNumber(item.videoP95Watched || 0)
                case 'videoP100Watched':
                    return formatNumber(item.videoP100Watched || 0)
                case 'frequency':
                    const freq = item.impressions && item.reach ? (parseInt(item.impressions) / parseInt(item.reach)).toFixed(2) : null
                    return freq || '-'
                case 'ctr':
                    const ctr = item.clicks && item.impressions ? ((parseInt(item.clicks) / parseInt(item.impressions)) * 100).toFixed(2) : null
                    return ctr ? `${ctr}%` : '-'
                case 'cpc':
                    const cpc = item.clicks && item.spend ? (parseFloat(item.spend) / parseInt(item.clicks)) : null
                    return cpc ? formatCurrency(cpc, currency) : '-'
                case 'cpm':
                    const cpm = item.impressions && item.spend ? ((parseFloat(item.spend) / parseInt(item.impressions)) * 1000) : null
                    return cpm ? formatCurrency(cpm, currency) : '-'
                case 'linkClicks':
                    return formatNumber(getActionValue(item.actions, 'link_click'))
                case 'purchases':
                    return formatNumber(getActionValue(item.actions, 'offsite_conversion.fb_pixel_purchase'))
                case 'leads':
                    return formatNumber(getActionValue(item.actions, 'lead'))
                case 'costPerPurchase':
                    const purchaseCost = getCostPerAction(item.costPerActionType, 'offsite_conversion.fb_pixel_purchase')
                    return purchaseCost > 0 ? formatCurrency(purchaseCost, currency) : '-'
                case 'costPerLead':
                    const leadCost = getCostPerAction(item.costPerActionType, 'lead')
                    return leadCost > 0 ? formatCurrency(leadCost, currency) : '-'
                case 'messagingFirstReply':
                    return formatNumber(getActionValue(item.actions, 'onsite_conversion.messaging_first_reply'))
                default:
                    return item[colKey] !== undefined ? String(item[colKey]) : '-'
            }
        }

        return (
            <TableCell key={colKey} className={`${alignClass} ${borderClass}`}>
                {renderValue()}
            </TableCell>
        )
    }

    const handleSort = (key: string) => {
        // Cycle through: none → desc (มากไปน้อย) → asc (น้อยไปมาก) → none
        if (!sortConfig || sortConfig.key !== key) {
            // First click on new column: desc (มากไปน้อย)
            setSortConfig({ key, direction: 'desc' })
            updateUrl({ sortKey: key, sortDir: 'desc' })
        } else if (sortConfig.direction === 'desc') {
            // Second click: asc (น้อยไปมาก)
            setSortConfig({ key, direction: 'asc' })
            updateUrl({ sortKey: key, sortDir: 'asc' })
        } else {
            // Third click: reset to no sorting
            setSortConfig(null)
            updateUrl({ sortKey: '', sortDir: '' })
        }
    }

    // Spending Limit Dialog handlers
    const openSpendingLimitDialog = (account: any, action: 'change' | 'reset' | 'delete' = 'change') => {
        setSelectedAccountForLimit(account)
        setSpendingLimitAction(action)
        setNewSpendingLimit(account.spendCap ? (parseFloat(account.spendCap) / 100).toString() : '')
        setSpendingLimitDialogOpen(true)
    }

    const handleSpendingLimitSubmit = async () => {
        if (!selectedAccountForLimit) return

        // Validation
        if (spendingLimitAction === 'change' && (!newSpendingLimit || parseFloat(newSpendingLimit) <= 0)) {
            toast.error(t.toasts.invalidSpendingLimit)
            return
        }

        setIsUpdatingLimit(true)
        try {
            const response = await fetch('/api/ads/spending-limit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    accountId: selectedAccountForLimit.id,
                    action: spendingLimitAction,
                    newLimit: spendingLimitAction === 'change' ? newSpendingLimit : undefined,
                }),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to update spending limit')
            }

            if (spendingLimitAction === 'delete') {
                toast.success(t.toasts.spendingLimitDeleted.replace('{name}', selectedAccountForLimit.name))
            } else if (spendingLimitAction === 'reset') {
                toast.success(t.toasts.spendingLimitReset.replace('{name}', selectedAccountForLimit.name))
            } else {
                toast.success(t.toasts.spendingLimitUpdated.replace('{amount}', newSpendingLimit).replace('{currency}', selectedAccountForLimit.currency).replace('{name}', selectedAccountForLimit.name))
            }

            setSpendingLimitDialogOpen(false)
            // Clear cache and refresh data silently
            lastFetchRef.current = null
            lastFetchTimeRef.current = null
            fetchData('accounts', {}, true, true) // noCache=true, keepExistingData=true (silent)
        } catch (error: any) {
            console.error('Error updating spending limit:', error)
            toast.error(error.message || t.toasts.updateLimitError)
        } finally {
            setIsUpdatingLimit(false)
        }
    }

    const filteredData = data.filter(item => {
        // Search filter
        const matchesSearch = !searchQuery ||
            item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.id?.includes(searchQuery)

        // Status filter - only apply to non-accounts tabs
        if (activeTab === 'accounts') {
            return matchesSearch
        }

        const status = (item.deliveryStatus || item.effectiveStatus || item.status || '').toUpperCase()
        let matchesStatus = true

        if (statusFilter === 'active') {
            matchesStatus = status === 'ACTIVE'
        } else if (statusFilter === 'inactive') {
            matchesStatus = ['PAUSED', 'INACTIVE', 'CAMPAIGN_OFF', 'CAMPAIGN_PAUSED',
                'ADSET_OFF', 'ADSET_PAUSED', 'AD_OFF', 'ADS_OFF',
                'ADSETS_INACTIVE', 'ADS_INACTIVE', 'NO_ADS', 'NO_ADSETS',
                'DELETED', 'ARCHIVED'].includes(status)
        } else if (statusFilter === 'error') {
            matchesStatus = ['ERROR', 'DISABLED', 'ACCOUNT_DISABLED', 'DISAPPROVED',
                'WITH_ISSUES', 'NOT_DELIVERING', 'SPEND_LIMIT_REACHED',
                'PENDING_BILLING_INFO'].includes(status)
        }

        return matchesSearch && matchesStatus
    })

    // Delivery status priority for sorting (lower = better/first)
    const getDeliveryPriority = (status: string): number => {
        const priorities: { [key: string]: number } = {
            'ACTIVE': 1,
            'IN_PROCESS': 2,
            'PENDING_REVIEW': 2,
            'PREAPPROVED': 3,
            'WITH_ISSUES': 4,
            'NOT_DELIVERING': 5,
            'PAUSED': 6,
            'CAMPAIGN_PAUSED': 6,
            'CAMPAIGN_OFF': 6,
            'ADSET_PAUSED': 6,
            'ADSET_OFF': 6,
            'AD_OFF': 6,
            'ADS_OFF': 6,
            'ADSETS_INACTIVE': 7,
            'ADS_INACTIVE': 7,
            'NO_ADS': 8,
            'NO_ADSETS': 8,
            'SPEND_LIMIT_REACHED': 9,
            'PENDING_BILLING_INFO': 10,
            'DISAPPROVED': 11,
            'ERROR': 12,
            'DISABLED': 13,
            'ACCOUNT_DISABLED': 13,
            'INACTIVE': 14,
            'DELETED': 15,
            'ARCHIVED': 16,
        }
        return priorities[status?.toUpperCase()] || 99
    }

    // Helper to get numeric value for sorting
    const getNumericValueForSort = (item: any, key: string): number => {
        // Direct numeric properties
        const numericKeys = [
            'spend', 'impressions', 'clicks', 'reach', 'activeAdsCount',
            'spendCap', 'amountSpent', 'budget', 'postEngagements',
            'newMessagingContacts', 'costPerNewMessagingContact',
            'videoAvgTimeWatched', 'videoPlays', 'videoPlays3s',
            'videoP25Watched', 'videoP50Watched', 'videoP75Watched',
            'videoP95Watched', 'videoP100Watched'
        ]

        if (numericKeys.includes(key)) {
            return parseFloat(item[key]) || 0
        }

        // Special handling for results - calculate from actions
        if (key === 'results') {
            const objective = item.objective?.toUpperCase() || ''
            const messagingResult = getActionValue(item.actions, 'onsite_conversion.messaging_conversation_started_7d')
            const messagingFirstReply = getActionValue(item.actions, 'onsite_conversion.messaging_first_reply')

            if (objective === 'OUTCOME_ENGAGEMENT' || objective === 'MESSAGES') {
                return messagingResult > 0 ? messagingResult : messagingFirstReply
            }

            // Try to get result based on objective
            const objectiveToActionMap: Record<string, string[]> = {
                'CONVERSIONS': ['offsite_conversion.fb_pixel_purchase', 'offsite_conversion.fb_pixel_lead', 'omni_purchase'],
                'LINK_CLICKS': ['link_click'],
                'POST_ENGAGEMENT': ['post_engagement'],
                'VIDEO_VIEWS': ['video_view'],
                'APP_INSTALLS': ['app_install', 'mobile_app_install'],
                'LEAD_GENERATION': ['lead', 'leadgen.other'],
                'REACH': ['reach'],
                'BRAND_AWARENESS': ['reach'],
                'TRAFFIC': ['link_click', 'landing_page_view'],
                'ENGAGEMENT': ['post_engagement', 'page_engagement'],
                'OUTCOME_TRAFFIC': ['link_click', 'landing_page_view'],
                'OUTCOME_LEADS': ['lead', 'leadgen.other', 'onsite_conversion.lead_grouped'],
                'OUTCOME_SALES': ['offsite_conversion.fb_pixel_purchase', 'omni_purchase'],
                'OUTCOME_AWARENESS': ['reach'],
            }

            const actionTypes = objectiveToActionMap[objective] || []
            for (const actionType of actionTypes) {
                const val = getActionValue(item.actions, actionType)
                if (val > 0) return val
            }

            // Fallback
            return getActionValue(item.actions, 'post_engagement') ||
                getActionValue(item.actions, 'link_click') || 0
        }

        // Special handling for costPerResult
        if (key === 'costPerResult') {
            const objective = item.objective?.toUpperCase() || ''
            const messagingCost = getCostPerAction(item.costPerActionType, 'onsite_conversion.messaging_conversation_started_7d')
            const messagingFirstReplyCost = getCostPerAction(item.costPerActionType, 'onsite_conversion.messaging_first_reply')

            if (objective === 'OUTCOME_ENGAGEMENT' || objective === 'MESSAGES') {
                return messagingCost > 0 ? messagingCost : messagingFirstReplyCost
            }

            // Try other costs
            const costTypes = [
                'offsite_conversion.fb_pixel_purchase', 'lead', 'link_click',
                'post_engagement', 'video_view'
            ]
            for (const costType of costTypes) {
                const val = getCostPerAction(item.costPerActionType, costType)
                if (val > 0) return val
            }
            return 0
        }

        return 0
    }

    const sortedData = [...filteredData].sort((a, b) => {
        // If sort order is locked (during toggle), maintain the locked order
        if (lockedSortOrder.length > 0) {
            const aIndex = lockedSortOrder.indexOf(a.id)
            const bIndex = lockedSortOrder.indexOf(b.id)
            if (aIndex !== -1 && bIndex !== -1) {
                return aIndex - bIndex
            }
        }

        if (!sortConfig) return 0
        const { key, direction } = sortConfig

        let aVal: any = a[key]
        let bVal: any = b[key]

        // Special handling for deliveryStatus
        if (key === 'deliveryStatus') {
            aVal = getDeliveryPriority(a.deliveryStatus || a.effectiveStatus || a.status)
            bVal = getDeliveryPriority(b.deliveryStatus || b.effectiveStatus || b.status)
        }
        // Handle all numeric columns including results and costPerResult
        else if (key === 'spend' || key === 'impressions' || key === 'clicks' || key === 'reach' ||
            key === 'activeAdsCount' || key === 'spendCap' || key === 'amountSpent' ||
            key === 'budget' || key === 'postEngagements' || key === 'newMessagingContacts' ||
            key === 'costPerNewMessagingContact' || key === 'videoAvgTimeWatched' ||
            key === 'videoPlays' || key === 'videoPlays3s' || key === 'videoP25Watched' ||
            key === 'videoP50Watched' || key === 'videoP75Watched' || key === 'videoP95Watched' ||
            key === 'videoP100Watched' || key === 'results' || key === 'costPerResult') {
            aVal = getNumericValueForSort(a, key)
            bVal = getNumericValueForSort(b, key)
        }
        // Handle string values
        else if (typeof aVal === 'string' && typeof bVal === 'string') {
            aVal = aVal.toLowerCase()
            bVal = bVal.toLowerCase()
        }
        // Handle null/undefined values - put them at the end
        else {
            if (aVal == null && bVal == null) return 0
            if (aVal == null) return direction === 'asc' ? 1 : -1
            if (bVal == null) return direction === 'asc' ? -1 : 1
        }

        if (aVal < bVal) return direction === 'asc' ? -1 : 1
        if (aVal > bVal) return direction === 'asc' ? 1 : -1
        return 0
    })

    const getStatusColor = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'ACTIVE': return 'bg-green-100 text-green-800'
            case 'INACTIVE': return 'bg-gray-100 text-gray-800'
            case 'PAUSED': return 'bg-yellow-100 text-yellow-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    // Delivery status with colored dot like Meta Ads - different labels per tab
    const getDeliveryStatus = (item: any, tab: string) => {
        // Use deliveryStatus (calculated) for campaigns/adsets, effectiveStatus for ads
        const status = item.deliveryStatus || item.effectiveStatus || item.status
        const statusUpper = status?.toUpperCase()?.replace(/ /g, '_')

        // Common status configs shared across all tabs
        const commonConfig: { [key: string]: { color: string } } = {
            'ACTIVE': { color: 'bg-green-500' },
            'PAUSED': { color: 'bg-gray-400' },
            'DELETED': { color: 'bg-gray-400' },
            'ARCHIVED': { color: 'bg-gray-400' },
            'IN_PROCESS': { color: 'bg-blue-500' },
            'WITH_ISSUES': { color: 'bg-yellow-500' },
            'PENDING_REVIEW': { color: 'bg-blue-500' },
            'DISAPPROVED': { color: 'bg-red-500' },
            'PREAPPROVED': { color: 'bg-blue-500' },
            'PENDING_BILLING_INFO': { color: 'bg-yellow-500' },
            'CAMPAIGN_PAUSED': { color: 'bg-gray-400' },
            'CAMPAIGN_OFF': { color: 'bg-gray-400' },
            'ADSET_PAUSED': { color: 'bg-gray-400' },
            'ADSET_OFF': { color: 'bg-gray-400' },
            'ADSETS_INACTIVE': { color: 'bg-gray-400' },
            'AD_OFF': { color: 'bg-gray-400' },
            'ADS_OFF': { color: 'bg-gray-400' },
            'ADS_INACTIVE': { color: 'bg-gray-400' },
            'NO_ADS': { color: 'bg-gray-400' },
            'NO_ADSETS': { color: 'bg-gray-400' },
            'NOT_DELIVERING': { color: 'bg-yellow-500' },
            'ERROR': { color: 'bg-red-500' },
            'INACTIVE': { color: 'bg-gray-400' },
            'DISABLED': { color: 'bg-red-500' },
            'ACCOUNT_DISABLED': { color: 'bg-red-500' },
            'SPEND_LIMIT_REACHED': { color: 'bg-orange-500' },
        }

        // Map status keys to translation keys based on context
        const getStatusKey = (statusKey: string, tabName: string): string => {
            // Map certain statuses to different keys based on tab context
            const statusMappings: { [key: string]: { [key: string]: string } } = {
                'campaigns': {
                    'PAUSED': 'CAMPAIGN_OFF',
                },
                'adsets': {
                    'PAUSED': 'ADSET_OFF',
                },
                'ads': {
                    'PAUSED': 'AD_OFF',
                },
            }
            return statusMappings[tabName]?.[statusKey] || statusKey
        }

        const color = commonConfig[statusUpper]?.color || 'bg-gray-400'
        const translationKey = getStatusKey(statusUpper, tab)
        const label = (t.status as any)[translationKey] || (t.status as any)[statusUpper] || statusUpper || t.status.UNKNOWN

        // Check if label needs to be split into 2 lines
        const isMultiLine = label.length > 15
        const lines = isMultiLine ? label.split(' ').reduce((acc: string[], word: string, i: number, arr: string[]) => {
            const mid = Math.ceil(arr.length / 2)
            if (i < mid) {
                acc[0] = (acc[0] || '') + (acc[0] ? ' ' : '') + word
            } else {
                acc[1] = (acc[1] || '') + (acc[1] ? ' ' : '') + word
            }
            return acc
        }, ['', '']) : [label]

        return (
            <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${color} flex-shrink-0`} />
                {isMultiLine ? (
                    <div className="flex flex-col leading-tight">
                        <span className="text-sm">{lines[0]}</span>
                        <span className="text-sm">{lines[1]}</span>
                    </div>
                ) : (
                    <span className="text-sm">{label}</span>
                )}
            </div>
        )
    }

    const currentSelection = getCurrentSelection()
    const bodyRef = useRef<HTMLDivElement>(null)

    // Helper to render sort icon based on current sort state
    const SortIcon = ({ columnKey }: { columnKey: string }) => {
        if (!sortConfig || sortConfig.key !== columnKey) {
            return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
        }
        return sortConfig.direction === 'asc'
            ? <ArrowUp className="h-3 w-3 text-primary" />
            : <ArrowDown className="h-3 w-3 text-primary" />
    }

    return (
        <div className="h-full flex flex-col gap-0 pt-0">
            <div className="flex flex-col gap-4 flex-none">
                {/* Tabs Row - Full Width like adscheck.smit.vn */}
                <div className="flex items-stretch w-full">
                    {/* Custom Tabs - Grid 4 columns */}
                    <div className="grid grid-cols-4 flex-1">
                        {/* Ad Account Tab */}
                        <button
                            onClick={() => {
                                setActiveTab('accounts')
                                setSelectedAccountIds([])
                                setSelectedCampaignIds([])
                                setSelectedAdSetIds([])
                                setSelectedAdIds([])
                                setSelectedAccountName(null)
                                updateUrl({ tab: 'accounts', accountIds: [], campaignIds: [], adSetIds: [], adIds: [], accountName: null })
                            }}
                            className={`flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 rounded-t-xl ${activeTab === 'accounts'
                                ? `${colors.active} shadow-md`
                                : `${colors.inactive} border-transparent`
                                }`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                            <span>{t.tabs.accounts}</span>
                            {checkedAccountIds.length > 0 && (
                                <span className={`ml-1 px-2 py-0.5 text-xs font-semibold ${colors.badge} rounded-full`}>
                                    {t.common.selectedItems.replace('{count}', String(checkedAccountIds.length))}
                                </span>
                            )}
                        </button>

                        {/* Campaigns Tab */}
                        <button
                            onClick={() => {
                                if (checkedAccountIds.length === 0 && selectedAccountIds.length === 0) {
                                    toast.custom((tid) => (
                                        <div className={`${colors.toast} px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 min-w-[320px] relative overflow-hidden border`}>
                                            <div className={`flex-shrink-0 ${colors.toastIcon} p-1.5 rounded-full`}>
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <span className="font-medium flex-1">{t.toasts.selectAtLeastOneAccount}</span>
                                            <button onClick={() => toast.dismiss(tid)} className={`${colors.toastClose} transition-colors`}>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                            <div className={`absolute bottom-0 left-0 h-1 ${colors.toastProgress} animate-shrink-width`} />
                                        </div>
                                    ), { duration: 4000 })
                                    return
                                }
                                setActiveTab('campaigns')
                                updateUrl({ tab: 'campaigns' })
                            }}
                            className={`flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 rounded-t-xl ${activeTab === 'campaigns'
                                ? `${colors.active} shadow-md`
                                : checkedAccountIds.length === 0 && selectedAccountIds.length === 0
                                    ? 'bg-gray-50 text-gray-400 border-transparent cursor-pointer dark:bg-gray-900 dark:text-gray-600'
                                    : `${colors.inactive} border-transparent`
                                }`}
                        >
                            <Flag className="w-4 h-4" />
                            <span>{t.tabs.campaigns}</span>
                            {checkedCampaignIds.length > 0 && (
                                <span className={`ml-1 px-2 py-0.5 text-xs font-semibold ${colors.badge} rounded-full`}>
                                    {t.common.selectedItems.replace('{count}', String(checkedCampaignIds.length))}
                                </span>
                            )}
                        </button>

                        {/* Ad Sets Tab */}
                        <button
                            onClick={() => {
                                if (checkedAccountIds.length === 0 && selectedAccountIds.length === 0) {
                                    toast.custom((tid) => (
                                        <div className={`${colors.toast} px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 min-w-[320px] relative overflow-hidden border`}>
                                            <div className={`flex-shrink-0 ${colors.toastIcon} p-1.5 rounded-full`}>
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <span className="font-medium flex-1">{t.toasts.selectAtLeastOneAccount}</span>
                                            <button onClick={() => toast.dismiss(tid)} className={`${colors.toastClose} transition-colors`}>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                            <div className={`absolute bottom-0 left-0 h-1 ${colors.toastProgress} animate-shrink-width`} />
                                        </div>
                                    ), { duration: 4000 })
                                    return
                                }
                                setActiveTab('adsets')
                                updateUrl({ tab: 'adsets' })
                            }}
                            className={`flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 rounded-t-xl ${activeTab === 'adsets'
                                ? `${colors.active} shadow-md`
                                : checkedAccountIds.length === 0 && selectedAccountIds.length === 0
                                    ? 'bg-gray-50 text-gray-400 border-transparent cursor-pointer dark:bg-gray-900 dark:text-gray-600'
                                    : `${colors.inactive} border-transparent`
                                }`}
                        >
                            <Layers className="w-4 h-4" />
                            <span>{t.tabs.adSets}</span>
                            {checkedAdSetIds.length > 0 && (
                                <span className={`ml-1 px-2 py-0.5 text-xs font-semibold ${colors.badge} rounded-full`}>
                                    {t.common.selectedItems.replace('{count}', String(checkedAdSetIds.length))}
                                </span>
                            )}
                        </button>

                        {/* Ads Tab */}
                        <button
                            onClick={() => {
                                if (checkedAccountIds.length === 0 && selectedAccountIds.length === 0) {
                                    toast.custom((tid) => (
                                        <div className={`${colors.toast} px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 min-w-[320px] relative overflow-hidden border`}>
                                            <div className={`flex-shrink-0 ${colors.toastIcon} p-1.5 rounded-full`}>
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <span className="font-medium flex-1">{t.toasts.selectAtLeastOneAccount}</span>
                                            <button onClick={() => toast.dismiss(tid)} className={`${colors.toastClose} transition-colors`}>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                            <div className={`absolute bottom-0 left-0 h-1 ${colors.toastProgress} animate-shrink-width`} />
                                        </div>
                                    ), { duration: 4000 })
                                    return
                                }
                                setActiveTab('ads')
                                updateUrl({ tab: 'ads' })
                            }}
                            className={`flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 rounded-t-xl ${activeTab === 'ads'
                                ? `${colors.active} shadow-md`
                                : checkedAccountIds.length === 0 && selectedAccountIds.length === 0
                                    ? 'bg-gray-50 text-gray-400 border-transparent cursor-pointer dark:bg-gray-900 dark:text-gray-600'
                                    : `${colors.inactive} border-transparent`
                                }`}
                        >
                            <Megaphone className="w-4 h-4" />
                            <span>{t.tabs.ads}</span>
                            {checkedAdIds.length > 0 && (
                                <span className={`ml-1 px-2 py-0.5 text-xs font-semibold ${colors.badge} rounded-full`}>
                                    {t.common.selectedItems.replace('{count}', String(checkedAdIds.length))}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Search and Actions Row */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 px-1">
                    <div className="relative w-full sm:w-48">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t.common.search}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 h-9"
                        />
                    </div>
                    {activeTab !== 'accounts' && (
                        <div className="flex flex-col sm:flex-row gap-2">
                            <DatePickerWithRange date={date} setDate={handleDateChange} />
                            <Select value={statusFilter} onValueChange={(value) => {
                                setStatusFilter(value)
                                updateUrl({ statusFilter: value })
                            }}>
                                <SelectTrigger className="w-full sm:w-[160px] h-9">
                                    <SelectValue placeholder={t.common.allStatus} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t.common.allStatus}</SelectItem>
                                    <SelectItem value="active">{t.status.ACTIVE}</SelectItem>
                                    <SelectItem value="inactive">{t.status.INACTIVE}</SelectItem>
                                    <SelectItem value="error">{t.status.ERROR}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => {
                            // Reset cache
                            lastFetchRef.current = null
                            lastFetchTimeRef.current = null
                            // Use noCache=false to allow Redis cache (faster)
                            if (activeTab === 'accounts') fetchData('accounts', {}, false, false)
                            else if (activeTab === 'campaigns') fetchData('campaigns', { accountIds: checkedAccountIds.length > 0 ? checkedAccountIds : selectedAccountIds }, false, false)
                            else if (activeTab === 'adsets') fetchData('adsets', { accountIds: checkedAccountIds.length > 0 ? checkedAccountIds : selectedAccountIds, campaignIds: checkedCampaignIds.length > 0 ? checkedCampaignIds : selectedCampaignIds }, false, false)
                            else if (activeTab === 'ads') fetchData('ads', { accountIds: checkedAccountIds.length > 0 ? checkedAccountIds : selectedAccountIds, campaignIds: checkedCampaignIds.length > 0 ? checkedCampaignIds : selectedCampaignIds, adSetIds: checkedAdSetIds.length > 0 ? checkedAdSetIds : selectedAdSetIds }, false, false)
                        }} disabled={isLoading}>
                            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0">
                                    <LayoutGrid className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>ตัวเลือกการปรับแต่ง</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setColumnsDialogOpen(true)}>
                                    <LayoutGrid className="mr-2 h-4 w-4" />
                                    <span>ปรับแต่งคอลัมน์</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFormattingDialogOpen(true)}>
                                    <Flag className="mr-2 h-4 w-4" />
                                    <span>การจัดรูปแบบตามเงื่อนไข</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            <div className="px-1 mt-4">
                <div className="mt-2">
                    {!selectedAccountName && selectedAccountIds.length > 0 && activeTab !== 'accounts' && (
                        <div className="flex items-center text-sm text-muted-foreground whitespace-nowrap">
                            <Button variant="link" className="p-0 h-auto font-normal" onClick={handleBackToAccounts}>
                                {t.tabs.accounts} ({selectedAccountIds.length})
                            </Button>
                        </div>
                    )}
                    {selectedAccountName && (
                        <div className="flex items-center text-sm text-muted-foreground whitespace-nowrap">
                            <Button variant="link" className="p-0 h-auto font-normal" onClick={handleBackToAccounts}>
                                {t.tabs.accounts}
                            </Button>
                            <span className="mx-2">/</span>
                            <span className="font-medium text-foreground">{selectedAccountName}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col border rounded-xl overflow-hidden mt-4 relative">
                {/* Single Table with sticky header */}
                <div ref={bodyRef} className="flex-1 overflow-auto">
                    {/* Horizontal scroll wrapper for mobile */}
                    <div className="min-w-full overflow-x-auto">
                        <table className="w-full caption-bottom text-sm text-left">
                            <TableHeader className="bg-gray-50 sticky top-0 z-10">
                                <TableRow className="hover:bg-gray-50 border-b h-14">
                                    {activeTab !== 'ads' && (
                                        <TableHead
                                            className="border-r p-0 text-center cursor-pointer bg-gray-50 w-[40px] min-w-[40px] max-w-[40px]"
                                            onClick={() => toggleSelectAll(!(data.length > 0 && currentSelection.length === data.length))}
                                        >
                                            <div className="flex items-center justify-center h-full w-full">
                                                <Checkbox
                                                    className="h-5 w-5 pointer-events-none"
                                                    checked={data.length > 0 && currentSelection.length === data.length}
                                                />
                                            </div>
                                        </TableHead>
                                    )}
                                    <TableHead className="border-r text-center bg-gray-50 w-[40px] min-w-[40px] max-w-[40px]">#</TableHead>
                                    {activeTab !== 'accounts' && (
                                        <TableHead className="border-r whitespace-nowrap text-center bg-gray-50">{t.common.off} / {t.common.on}</TableHead>
                                    )}
                                    {activeTab === 'ads' && (
                                        <>
                                            <TableHead className="cursor-pointer border-r whitespace-nowrap bg-gray-50" onClick={() => handleSort('accountName')}>
                                                <div className="flex items-center gap-1">{t.common.account || 'Account'} <SortIcon columnKey="accountName" /></div>
                                            </TableHead>
                                            <TableHead className="cursor-pointer border-r whitespace-nowrap bg-gray-50" onClick={() => handleSort('pageId')}>
                                                <div className="flex items-center gap-1">{t.common.page} <SortIcon columnKey="pageId" /></div>
                                            </TableHead>
                                        </>
                                    )}
                                    <TableHead
                                        className="cursor-pointer border-r whitespace-nowrap bg-gray-50"
                                        onClick={() => handleSort('name')}
                                    >
                                        <div className="flex items-center gap-1">
                                            {t.common.name} <SortIcon columnKey="name" />
                                        </div>
                                    </TableHead>
                                    {activeTab === 'ads' && (
                                        <TableHead className="border-r whitespace-nowrap bg-gray-50 min-w-[120px]">
                                            {t.common.target || 'Target'}
                                        </TableHead>
                                    )}
                                    {activeTab === 'accounts' && (
                                        <>
                                            <TableHead className="cursor-pointer border-r whitespace-nowrap text-center bg-gray-50" onClick={() => handleSort('deliveryStatus')}>
                                                <div className="flex items-center justify-center gap-1">{t.common.status} <SortIcon columnKey="deliveryStatus" /></div>
                                            </TableHead>
                                            <TableHead className="cursor-pointer border-r whitespace-nowrap text-center bg-gray-50" onClick={() => handleSort('activeAdsCount')}>
                                                <div className="flex items-center justify-center gap-1">Active Ads <SortIcon columnKey="activeAdsCount" /></div>
                                            </TableHead>
                                            <TableHead className="cursor-pointer border-r whitespace-nowrap text-right bg-gray-50" onClick={() => handleSort('spendCap')}>
                                                <div className="flex items-center justify-end gap-1">Spending Cap <SortIcon columnKey="spendCap" /></div>
                                            </TableHead>
                                            <TableHead className="cursor-pointer text-left border-r whitespace-nowrap bg-gray-50" onClick={() => handleSort('paymentMethod')}>
                                                <div className="flex items-center gap-1">{t.common.paymentMethod} <SortIcon columnKey="paymentMethod" /></div>
                                            </TableHead>
                                            <TableHead className="cursor-pointer text-right border-r whitespace-nowrap bg-gray-50" onClick={() => handleSort('timezone')}>
                                                <div className="flex items-center justify-end gap-1">{t.common.timeZone} <SortIcon columnKey="timezone" /></div>
                                            </TableHead>
                                            <TableHead className="cursor-pointer text-right border-r whitespace-nowrap bg-gray-50" onClick={() => handleSort('country')}>
                                                <div className="flex items-center justify-end gap-1">{t.common.nationality} <SortIcon columnKey="country" /></div>
                                            </TableHead>
                                            <TableHead className="cursor-pointer text-right border-r whitespace-nowrap bg-gray-50" onClick={() => handleSort('currency')}>
                                                <div className="flex items-center justify-end gap-1">{t.common.currency} <SortIcon columnKey="currency" /></div>
                                            </TableHead>
                                            <TableHead className="cursor-pointer text-right border-r whitespace-nowrap bg-gray-50" onClick={() => handleSort('spendCap')}>
                                                <div className="flex items-center justify-end gap-1">Limit <SortIcon columnKey="spendCap" /></div>
                                            </TableHead>
                                            <TableHead className="text-right border-r whitespace-nowrap bg-gray-50">{t.common.action}</TableHead>
                                        </>
                                    )}
                                    {activeTab !== 'accounts' && (
                                        <>
                                            {/* Dynamic headers based on visibleColumns - filter out hardcoded columns */}
                                            {visibleColumns
                                                .filter(colKey => {
                                                    // These columns are hardcoded and should not be rendered dynamically
                                                    const hardcodedColumns = ['name']
                                                    // For ads tab, also exclude account, page, and targeting
                                                    if (activeTab === 'ads') {
                                                        return !['name', 'accountName', 'pageName', 'targeting'].includes(colKey)
                                                    }
                                                    return !hardcodedColumns.includes(colKey)
                                                })
                                                .map((colKey, index, filteredArray) => {
                                                    const align = getColumnAlign(colKey)
                                                    const sortable = isColumnSortable(colKey)
                                                    const label = getColumnLabel(colKey)
                                                    const isLast = index === filteredArray.length - 1
                                                    const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : ''
                                                    const justifyClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''

                                                    return (
                                                        <TableHead
                                                            key={colKey}
                                                            className={`${sortable ? 'cursor-pointer' : ''} ${!isLast ? 'border-r' : ''} whitespace-nowrap bg-gray-50 ${alignClass}`}
                                                            onClick={sortable ? () => handleSort(colKey) : undefined}
                                                        >
                                                            <div className={`flex items-center gap-1 ${justifyClass}`}>
                                                                {label}
                                                                {sortable && <SortIcon columnKey={colKey} />}
                                                            </div>
                                                        </TableHead>
                                                    )
                                                })}
                                        </>
                                    )}
                                </TableRow>
                            </TableHeader>
                            <TableBody className="[&_tr:last-child]:border-b [&_tr:last-child]:border-gray-200">
                                {isLoading ? (
                                    // Skeleton loading rows
                                    [...Array(8)].map((_, rowIndex) => (
                                        <TableRow key={`skeleton-${rowIndex}`} className={`h-14 ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                            {/* Checkbox */}
                                            <TableCell className="border-r p-0 text-center w-[40px] min-w-[40px] max-w-[40px]">
                                                <div className="flex items-center justify-center h-full w-full">
                                                    <div className="h-5 w-5 rounded bg-gray-200 animate-pulse" />
                                                </div>
                                            </TableCell>
                                            {/* # */}
                                            <TableCell className="border-r text-center w-[40px] min-w-[40px] max-w-[40px]">
                                                <div className="h-4 w-4 mx-auto rounded bg-gray-200 animate-pulse" />
                                            </TableCell>
                                            {activeTab !== 'accounts' && (
                                                /* On/Off Switch */
                                                <TableCell className="border-r text-center">
                                                    <div className="h-5 w-9 mx-auto rounded-full bg-gray-200 animate-pulse" />
                                                </TableCell>
                                            )}
                                            {activeTab === 'ads' && (
                                                /* Page */
                                                <TableCell className="border-r">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
                                                        <div className="h-3 w-16 rounded bg-gray-200 animate-pulse" />
                                                    </div>
                                                </TableCell>
                                            )}
                                            {/* Name */}
                                            <TableCell className="border-r">
                                                {activeTab === 'ads' ? (
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded bg-gray-200 animate-pulse flex-none" />
                                                        <div className="flex flex-col gap-1">
                                                            <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
                                                            <div className="h-3 w-20 rounded bg-gray-200 animate-pulse" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-1">
                                                        <div className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
                                                        <div className="h-3 w-24 rounded bg-gray-200 animate-pulse" />
                                                    </div>
                                                )}
                                            </TableCell>
                                            {activeTab === 'accounts' ? (
                                                <>
                                                    {/* Status, Active Ads, Spending Cap, Payment, Timezone, Country, Currency, Limit, Action */}
                                                    <TableCell className="border-r text-center"><div className="h-5 w-16 mx-auto rounded-full bg-gray-200 animate-pulse" /></TableCell>
                                                    <TableCell className="border-r text-center"><div className="h-4 w-8 mx-auto rounded bg-gray-200 animate-pulse" /></TableCell>
                                                    <TableCell className="border-r text-right"><div className="h-4 w-20 ml-auto rounded bg-gray-200 animate-pulse" /></TableCell>
                                                    <TableCell className="border-r"><div className="h-5 w-24 rounded bg-gray-200 animate-pulse" /></TableCell>
                                                    <TableCell className="border-r text-right"><div className="h-4 w-16 ml-auto rounded bg-gray-200 animate-pulse" /></TableCell>
                                                    <TableCell className="border-r text-right"><div className="h-4 w-8 ml-auto rounded bg-gray-200 animate-pulse" /></TableCell>
                                                    <TableCell className="border-r text-right"><div className="h-4 w-10 ml-auto rounded bg-gray-200 animate-pulse" /></TableCell>
                                                    <TableCell className="border-r text-right"><div className="h-4 w-16 ml-auto rounded bg-gray-200 animate-pulse" /></TableCell>
                                                    <TableCell className="text-right"><div className="h-6 w-6 ml-auto rounded bg-gray-200 animate-pulse" /></TableCell>
                                                </>
                                            ) : (
                                                <>
                                                    {/* Delivery, Results, Cost/Result, Budget, Impressions, Reach, Post Eng, Clicks, Msg, Spend, Cost/Msg, Video metrics */}
                                                    <TableCell className="border-r"><div className="h-5 w-16 rounded-full bg-gray-200 animate-pulse" /></TableCell>
                                                    <TableCell className="border-r text-right"><div className="h-4 w-12 ml-auto rounded bg-gray-200 animate-pulse" /></TableCell>
                                                    <TableCell className="border-r text-right"><div className="h-4 w-16 ml-auto rounded bg-gray-200 animate-pulse" /></TableCell>
                                                    <TableCell className="border-r text-right"><div className="h-4 w-20 ml-auto rounded bg-gray-200 animate-pulse" /></TableCell>
                                                    <TableCell className="border-r text-right"><div className="h-4 w-16 ml-auto rounded bg-gray-200 animate-pulse" /></TableCell>
                                                    <TableCell className="border-r text-right"><div className="h-4 w-16 ml-auto rounded bg-gray-200 animate-pulse" /></TableCell>
                                                    <TableCell className="border-r text-right"><div className="h-4 w-14 ml-auto rounded bg-gray-200 animate-pulse" /></TableCell>
                                                    <TableCell className="border-r text-right"><div className="h-4 w-12 ml-auto rounded bg-gray-200 animate-pulse" /></TableCell>
                                                    <TableCell className="border-r text-right"><div className="h-4 w-10 ml-auto rounded bg-gray-200 animate-pulse" /></TableCell>
                                                    <TableCell className="border-r text-right"><div className="h-4 w-16 ml-auto rounded bg-gray-200 animate-pulse" /></TableCell>
                                                    <TableCell className="border-r text-right"><div className="h-4 w-14 ml-auto rounded bg-gray-200 animate-pulse" /></TableCell>
                                                    <TableCell className="border-r text-right"><div className="h-4 w-12 ml-auto rounded bg-gray-200 animate-pulse" /></TableCell>
                                                    <TableCell className="border-r text-right"><div className="h-4 w-14 ml-auto rounded bg-gray-200 animate-pulse" /></TableCell>
                                                    <TableCell className="border-r text-right"><div className="h-4 w-14 ml-auto rounded bg-gray-200 animate-pulse" /></TableCell>
                                                    <TableCell className="border-r text-right"><div className="h-4 w-14 ml-auto rounded bg-gray-200 animate-pulse" /></TableCell>
                                                    <TableCell className="border-r text-right"><div className="h-4 w-14 ml-auto rounded bg-gray-200 animate-pulse" /></TableCell>
                                                    <TableCell className="border-r text-right"><div className="h-4 w-14 ml-auto rounded bg-gray-200 animate-pulse" /></TableCell>
                                                    <TableCell className="border-r text-right"><div className="h-4 w-14 ml-auto rounded bg-gray-200 animate-pulse" /></TableCell>
                                                    <TableCell className="text-right"><div className="h-4 w-14 ml-auto rounded bg-gray-200 animate-pulse" /></TableCell>
                                                </>
                                            )}
                                        </TableRow>
                                    ))
                                ) : data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={activeTab === 'accounts' ? 10 : 24} className="h-24 text-center">
                                            {t.common.noResults}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sortedData.map((item, index) => (
                                        <TableRow
                                            key={item.id}
                                            className={`cursor-pointer hover:bg-muted/50 h-14 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                                            onClick={() => handleRowClick(item)}
                                        >
                                            {activeTab !== 'ads' && (
                                                <TableCell
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        toggleSelectRow(item.id, !currentSelection.includes(item.id))
                                                    }}
                                                    className="border-r p-0 text-center cursor-pointer w-[40px] min-w-[40px] max-w-[40px]"
                                                >
                                                    <div className="flex items-center justify-center h-full w-full">
                                                        <Checkbox
                                                            className="h-5 w-5 pointer-events-none"
                                                            checked={currentSelection.includes(item.id)}
                                                        />
                                                    </div>
                                                </TableCell>
                                            )}
                                            <TableCell className="text-muted-foreground border-r text-center w-[40px] min-w-[40px] max-w-[40px]">{index + 1}</TableCell>
                                            {activeTab !== 'accounts' && (
                                                <TableCell className="border-r text-center">
                                                    <div
                                                        className="flex items-center justify-center"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            if (!togglingIds.has(item.id)) {
                                                                handleToggleStatus(item.id, item.status, e)
                                                            }
                                                        }}
                                                    >
                                                        <Switch
                                                            checked={item.status === 'ACTIVE'}
                                                            disabled={togglingIds.has(item.id)}
                                                            onCheckedChange={(checked) => {
                                                                // This is handled by the parent div onClick
                                                            }}
                                                        />
                                                    </div>
                                                </TableCell>
                                            )}
                                            {activeTab === 'ads' && (
                                                <>
                                                    <TableCell className="border-r px-2">
                                                        <a
                                                            href={`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${(item.account_id || '').replace('act_', '')}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-sm whitespace-nowrap hover:text-blue-600 hover:underline cursor-pointer"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {item.accountName || item.account_id || '-'}
                                                        </a>
                                                    </TableCell>
                                                    <TableCell className="border-r px-2">
                                                        {item.pageId ? (
                                                            <div className="flex flex-col min-w-0">
                                                                <a
                                                                    href={`https://www.facebook.com/${item.pageId}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-sm whitespace-nowrap hover:text-blue-600 hover:underline w-fit"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    {item.pageName || item.pageId}
                                                                </a>
                                                                <span className="text-xs text-muted-foreground whitespace-nowrap">ID: {item.pageId}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground">-</span>
                                                        )}
                                                    </TableCell>
                                                </>
                                            )}
                                            <TableCell className="font-medium border-r">
                                                {activeTab === 'ads' ? (
                                                    <div className="flex items-center gap-2">
                                                        {item.creative?.thumbnailUrl || item.creative?.imageUrl ? (
                                                            <img
                                                                src={item.creative.thumbnailUrl || item.creative.imageUrl}
                                                                alt={item.name}
                                                                className="h-10 w-10 object-cover rounded flex-none"
                                                                referrerPolicy="no-referrer"
                                                                onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/40x40?text=No+Img' }}
                                                            />
                                                        ) : (
                                                            <div className="h-10 w-10 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground flex-none">No</div>
                                                        )}
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="font-medium text-sm whitespace-nowrap">{item.name}</span>
                                                            <span className="text-xs text-muted-foreground whitespace-nowrap">ID: {item.id}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-medium whitespace-nowrap" title={item.name}>{item.name}</span>
                                                        <span className="text-xs text-muted-foreground whitespace-nowrap">ID: {item.id}</span>
                                                    </div>
                                                )}
                                            </TableCell>
                                            {/* Target Column - Only for Ads tab */}
                                            {activeTab === 'ads' && (
                                                <TableCell className="border-r px-2 relative">
                                                    {item.targeting ? (
                                                        <div
                                                            className="flex flex-col text-xs cursor-pointer"
                                                            onDoubleClick={(e) => {
                                                                e.stopPropagation()
                                                                setExpandedTargeting(prev => {
                                                                    const next = new Set(prev)
                                                                    if (next.has(item.id)) {
                                                                        next.delete(item.id)
                                                                    } else {
                                                                        next.add(item.id)
                                                                    }
                                                                    return next
                                                                })
                                                            }}
                                                        >
                                                            {expandedTargeting.has(item.id) ? (
                                                                <>
                                                                    <div
                                                                        className="fixed inset-0 z-40"
                                                                        onClick={() => {
                                                                            setExpandedTargeting(prev => {
                                                                                const next = new Set(prev)
                                                                                next.delete(item.id)
                                                                                return next
                                                                            })
                                                                        }}
                                                                    />
                                                                    <div className="absolute left-0 top-0 z-50 bg-white border border-gray-300 shadow-lg p-3 w-96 max-h-[250px] rounded dark:bg-gray-800 dark:border-gray-600 overflow-y-auto">
                                                                        <div className="flex justify-between items-start mb-2 sticky top-0 bg-white dark:bg-gray-800 pb-2">
                                                                            <span className="font-medium text-sm">Target</span>
                                                                            <button
                                                                                className="text-gray-400 hover:text-gray-600 ml-2 text-lg leading-none"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation()
                                                                                    setExpandedTargeting(prev => {
                                                                                        const next = new Set(prev)
                                                                                        next.delete(item.id)
                                                                                        return next
                                                                                    })
                                                                                }}
                                                                            >×</button>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            {item.targeting.age && (
                                                                                <div>
                                                                                    <span className="font-medium text-xs">อายุ: </span>
                                                                                    <span className="text-muted-foreground text-xs">{item.targeting.age}</span>
                                                                                </div>
                                                                            )}
                                                                            {item.targeting.countries && (
                                                                                <div>
                                                                                    <span className="font-medium text-xs">ประเทศ: </span>
                                                                                    <span className="text-muted-foreground text-xs">
                                                                                        {Array.isArray(item.targeting.countries)
                                                                                            ? item.targeting.countries.join(', ')
                                                                                            : item.targeting.countries}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                            {item.targeting.interests && (
                                                                                <div>
                                                                                    <span className="font-medium text-xs">ความสนใจ: </span>
                                                                                    <span className="text-muted-foreground text-xs whitespace-normal block">
                                                                                        {Array.isArray(item.targeting.interests)
                                                                                            ? item.targeting.interests.join(', ')
                                                                                            : item.targeting.interests}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    {item.targeting.age && <span>อายุ: {item.targeting.age}</span>}
                                                                    {item.targeting.countries && (
                                                                        <span className="text-muted-foreground truncate max-w-[100px]">
                                                                            ประเทศ: {Array.isArray(item.targeting.countries)
                                                                                ? item.targeting.countries.slice(0, 2).join(', ') + (item.targeting.countries.length > 2 ? '...' : '')
                                                                                : item.targeting.countries}
                                                                        </span>
                                                                    )}
                                                                    {item.targeting.interests && (
                                                                        <span className="text-muted-foreground truncate max-w-[100px]">
                                                                            ความสนใจ: {Array.isArray(item.targeting.interests)
                                                                                ? item.targeting.interests.slice(0, 2).join(', ') + (item.targeting.interests.length > 2 ? '...' : '')
                                                                                : item.targeting.interests}
                                                                        </span>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">-</span>
                                                    )}
                                                </TableCell>
                                            )}
                                            {activeTab === 'accounts' && (
                                                <>
                                                    <TableCell className="border-r text-center">
                                                        <div className="flex items-center justify-center">
                                                            {getDeliveryStatus(item, 'accounts')}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="border-r text-center">
                                                        <span className="text-sm font-medium">{item.activeAdsCount || 0}</span>
                                                    </TableCell>
                                                    <TableCell
                                                        className="text-right border-r cursor-pointer hover:bg-gray-50"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            openSpendingLimitDialog(item, 'change')
                                                        }}
                                                    >
                                                        {item.spendCap && parseFloat(item.spendCap) > 0 ? (
                                                            <div className="group relative flex items-center justify-end gap-2">
                                                                {/* Edit icon - shows on hover */}
                                                                <Pencil className="h-3.5 w-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />

                                                                {/* Progress bar */}
                                                                <div className="flex items-center gap-2 min-w-[80px]">
                                                                    {(() => {
                                                                        const spent = parseFloat(item.amountSpent || '0') / 100
                                                                        const cap = parseFloat(item.spendCap) / 100
                                                                        const percentage = cap > 0 ? Math.min(100, Math.round((spent / cap) * 100)) : 0
                                                                        const progressColor = percentage >= 90 ? 'bg-red-500' : percentage >= 70 ? 'bg-orange-400' : 'bg-emerald-500'

                                                                        return (
                                                                            <>
                                                                                <div className="relative w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                                                    <div
                                                                                        className={`absolute left-0 top-0 h-full ${progressColor} rounded-full transition-all`}
                                                                                        style={{ width: `${percentage}%` }}
                                                                                    />
                                                                                </div>
                                                                                <span className="text-sm text-gray-600 w-10 text-right">{percentage}%</span>
                                                                            </>
                                                                        )
                                                                    })()}
                                                                </div>

                                                                {/* Tooltip with amount */}
                                                                <div className="absolute top-full right-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                                                    <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                                                        {formatCurrency(parseFloat(item.amountSpent || '0') / 100, item.currency || 'USD')} / {formatCurrency(parseFloat(item.spendCap) / 100, item.currency || 'USD')}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-end gap-1 text-blue-600 hover:text-blue-700 text-sm">
                                                                Set Limit
                                                                <PlusCircle className="h-4 w-4" />
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-left border-r">
                                                        <PaymentMethodCell value={item.paymentMethod} />
                                                    </TableCell>
                                                    <TableCell className="text-right border-r">{item.timezone}</TableCell>
                                                    <TableCell className="text-right border-r">{item.country}</TableCell>
                                                    <TableCell className="text-right border-r">{item.currency}</TableCell>
                                                    <TableCell className="text-right border-r">
                                                        {item.spendCap ? formatCurrency(parseFloat(item.spendCap) / 100, item.currency || 'USD') : '-'}
                                                    </TableCell>
                                                    <TableCell
                                                        className="text-center cursor-pointer hover:bg-gray-100 transition-colors"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            window.open(`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${item.id}`, '_blank')
                                                        }}
                                                    >
                                                        <div className="flex items-center justify-center">
                                                            <ExternalLink className="h-4 w-4" />
                                                        </div>
                                                    </TableCell>
                                                </>
                                            )}
                                            {activeTab !== 'accounts' && (
                                                <>
                                                    {/* Dynamic cells based on visibleColumns - filter out hardcoded columns */}
                                                    {visibleColumns
                                                        .filter(colKey => {
                                                            // These columns are hardcoded and should not be rendered dynamically
                                                            const hardcodedColumns = ['name']
                                                            // For ads tab, also exclude account, page, and targeting
                                                            if (activeTab === 'ads') {
                                                                return !['name', 'accountName', 'pageName', 'targeting'].includes(colKey)
                                                            }
                                                            return !hardcodedColumns.includes(colKey)
                                                        })
                                                        .map((colKey, colIndex, filteredArray) =>
                                                            renderDynamicCell(item, colKey, colIndex, colIndex === filteredArray.length - 1)
                                                        )}
                                                </>
                                            )}
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </table>
                    </div>
                </div>
            </div>

            {currentSelection.length > 0 && (
                <div className="text-sm text-muted-foreground flex-none">
                    {currentSelection.length} {t.common.selected}
                </div>
            )}

            {/* Spending Limit Dialog */}
            <Dialog open={spendingLimitDialogOpen} onOpenChange={setSpendingLimitDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader className="flex flex-row items-center justify-between">
                        <DialogTitle className="flex items-center gap-2 text-primary">
                            <DollarSign className="h-5 w-5" />
                            Set Spending Limit
                        </DialogTitle>
                    </DialogHeader>

                    {selectedAccountForLimit && (
                        <div className="space-y-4">
                            {/* Account Info */}
                            <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                                <div className="font-medium">{selectedAccountForLimit.name}</div>
                                <div className="text-sm text-muted-foreground">{selectedAccountForLimit.id}</div>
                            </div>

                            {/* Money Info */}
                            <div className="space-y-1">
                                <div className="text-sm">
                                    <span className="font-medium">Money Left: </span>
                                    {selectedAccountForLimit.spendCap
                                        ? formatCurrency(
                                            Math.max(0, (parseFloat(selectedAccountForLimit.spendCap) - parseFloat(selectedAccountForLimit.amountSpent || '0')) / 100),
                                            selectedAccountForLimit.currency || 'USD'
                                        )
                                        : 'No limit'
                                    }
                                </div>
                                <div className="text-sm">
                                    <span>Spent </span>
                                    <span className="text-primary font-medium">
                                        {formatCurrency(parseFloat(selectedAccountForLimit.amountSpent || '0') / 100, selectedAccountForLimit.currency || 'USD')}
                                    </span>
                                    <span> • Limit: </span>
                                    <span className="text-primary font-medium">
                                        {selectedAccountForLimit.spendCap
                                            ? formatCurrency(parseFloat(selectedAccountForLimit.spendCap) / 100, selectedAccountForLimit.currency || 'USD')
                                            : 'No limit'
                                        }
                                    </span>
                                </div>
                            </div>

                            {/* Reset notice */}
                            {spendingLimitAction === 'reset' && (
                                <p className="text-sm text-muted-foreground">
                                    The spent amount will be reset to 0 after resetting
                                </p>
                            )}

                            {/* Action Selection */}
                            {selectedAccountForLimit.spendCap && (
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Choose an Action</Label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="action"
                                                checked={spendingLimitAction === 'change'}
                                                onChange={() => setSpendingLimitAction('change')}
                                                className="w-4 h-4 accent-primary"
                                            />
                                            <span className="text-sm">Change Limit</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="action"
                                                checked={spendingLimitAction === 'reset'}
                                                onChange={() => setSpendingLimitAction('reset')}
                                                className="w-4 h-4 accent-primary"
                                            />
                                            <span className="text-sm">Reset Limit</span>
                                        </label>
                                        {/* Delete Limit is not supported by Facebook API - must be done in Ads Manager */}
                                    </div>
                                </div>
                            )}

                            {/* New Limit Input */}
                            {(spendingLimitAction === 'change' || !selectedAccountForLimit.spendCap) && (
                                <div className="space-y-2">
                                    <Label htmlFor="newLimit" className="text-sm text-muted-foreground">
                                        New Spending Limit
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="newLimit"
                                            type="number"
                                            placeholder="0"
                                            value={newSpendingLimit}
                                            onChange={(e) => setNewSpendingLimit(e.target.value)}
                                            className="pr-16 focus-visible:ring-primary"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-primary font-medium">
                                            {selectedAccountForLimit.currency || 'USD'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Submit Button */}
                            <Button
                                onClick={handleSpendingLimitSubmit}
                                disabled={isUpdatingLimit || (spendingLimitAction === 'change' && !newSpendingLimit)}
                                className="w-full bg-primary hover:bg-primary/90"
                            >
                                <Pencil className="h-4 w-4 mr-2" />
                                {isUpdatingLimit
                                    ? 'Updating...'
                                    : spendingLimitAction === 'reset'
                                        ? 'Reset Limit'
                                        : 'Change Limit'
                                }
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Customize Columns Dialog */}
            <ColumnsDialog
                open={columnsDialogOpen}
                onOpenChange={setColumnsDialogOpen}
                activeTab={activeTab}
                visibleColumns={visibleColumns}
                setVisibleColumns={setVisibleColumns}
                resetColumnsToDefault={resetColumnsToDefault}
            />

            {/* Conditional Formatting Dialog */}
            <FormattingDialog
                open={formattingDialogOpen}
                onOpenChange={setFormattingDialogOpen}
                formattingRules={formattingRules}
                setFormattingRules={setFormattingRules}
            />
        </div>
    )
}
