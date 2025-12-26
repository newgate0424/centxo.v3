'use client'

import { TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { ALL_COLUMNS, type ColumnDef } from "@/lib/column-config"

interface AdsTableHeaderProps {
    activeTab: string
    visibleColumns: string[]
    sortConfig: { key: string, direction: 'asc' | 'desc' } | null
    onSort: (key: string) => void
    currentSelection: string[]
    dataLength: number
    onToggleSelectAll: (checked: boolean) => void
    t: any // Translation object
}

// Get label for a column from ALL_COLUMNS or translation
function getColumnLabel(key: string, t: any): string {
    const colDef = ALL_COLUMNS.find(c => c.key === key)

    // Try translation first for common keys
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
        'frequency': 'Frequency',
        'ctr': 'CTR',
        'cpc': 'CPC',
        'cpm': 'CPM',
        'linkClicks': 'Link Clicks',
        'purchases': 'Purchases',
        'leads': 'Leads',
        'costPerPurchase': 'Cost per Purchase',
        'costPerLead': 'Cost per Lead',
        'messagingFirstReply': 'Messaging First Replies',
    }

    return translationMap[key] || colDef?.label || key
}

// Get alignment for a column
function getColumnAlign(key: string): 'left' | 'center' | 'right' {
    const colDef = ALL_COLUMNS.find(c => c.key === key)
    return colDef?.align || 'left'
}

// Check if column is sortable
function isColumnSortable(key: string): boolean {
    const colDef = ALL_COLUMNS.find(c => c.key === key)
    return colDef?.sortable ?? true
}

export function AdsTableHeader({
    activeTab,
    visibleColumns,
    sortConfig,
    onSort,
    currentSelection,
    dataLength,
    onToggleSelectAll,
    t
}: AdsTableHeaderProps) {

    // Sort icon component
    const SortIcon = ({ columnKey }: { columnKey: string }) => {
        if (!sortConfig || sortConfig.key !== columnKey) {
            return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
        }
        return sortConfig.direction === 'asc'
            ? <ArrowUp className="h-3 w-3 text-primary" />
            : <ArrowDown className="h-3 w-3 text-primary" />
    }

    // Get alignment class
    const getAlignClass = (align: 'left' | 'center' | 'right') => {
        switch (align) {
            case 'center': return 'text-center'
            case 'right': return 'text-right'
            default: return 'text-left'
        }
    }

    // Get justify class for flex container
    const getJustifyClass = (align: 'left' | 'center' | 'right') => {
        switch (align) {
            case 'center': return 'justify-center'
            case 'right': return 'justify-end'
            default: return 'justify-start'
        }
    }

    return (
        <TableHeader className="bg-gray-50 sticky top-0 z-10">
            <TableRow className="hover:bg-gray-50 border-b h-12">
                {/* Checkbox column - not for ads tab */}
                {activeTab !== 'ads' && (
                    <TableHead
                        className="border-r p-0 text-center cursor-pointer bg-gray-50 w-[40px] min-w-[40px] max-w-[40px]"
                        onClick={() => onToggleSelectAll(!(dataLength > 0 && currentSelection.length === dataLength))}
                    >
                        <div className="flex items-center justify-center h-full w-full">
                            <Checkbox
                                className="h-5 w-5 pointer-events-none"
                                checked={dataLength > 0 && currentSelection.length === dataLength}
                            />
                        </div>
                    </TableHead>
                )}

                {/* Index column */}
                <TableHead className="border-r text-center bg-gray-50 w-[40px] min-w-[40px] max-w-[40px]">#</TableHead>

                {/* On/Off toggle - not for accounts tab */}
                {activeTab !== 'accounts' && (
                    <TableHead className="border-r whitespace-nowrap text-center bg-gray-50">
                        {t.common?.off || 'Off'} / {t.common?.on || 'On'}
                    </TableHead>
                )}

                {/* Dynamic columns based on visibleColumns */}
                {visibleColumns.map((colKey, index) => {
                    const align = getColumnAlign(colKey)
                    const sortable = isColumnSortable(colKey)
                    const label = getColumnLabel(colKey, t)
                    const isLast = index === visibleColumns.length - 1

                    return (
                        <TableHead
                            key={colKey}
                            className={`${sortable ? 'cursor-pointer' : ''} ${!isLast ? 'border-r' : ''} whitespace-nowrap bg-gray-50 ${getAlignClass(align)}`}
                            onClick={sortable ? () => onSort(colKey) : undefined}
                        >
                            <div className={`flex items-center gap-1 ${getJustifyClass(align)}`}>
                                {label}
                                {sortable && <SortIcon columnKey={colKey} />}
                            </div>
                        </TableHead>
                    )
                })}

                {/* Action column for accounts tab */}
                {activeTab === 'accounts' && (
                    <TableHead className="text-right border-r whitespace-nowrap bg-gray-50">
                        {t.common?.action || 'Action'}
                    </TableHead>
                )}
            </TableRow>
        </TableHeader>
    )
}
