'use client'

import { TableCell } from "@/components/ui/table"
import { ALL_COLUMNS, formatCellValue } from "@/lib/column-config"

interface AdsTableCellProps {
    item: any
    colKey: string
    currency?: string
    // Helper functions passed from parent
    getActionValue: (actions: any[], type: string) => number
    getCostPerAction: (costs: any[], type: string) => number
    formatNumber: (value: number) => string
    formatCurrency: (value: number, currency: string) => string
}

// Get alignment for a column
function getColumnAlign(key: string): 'left' | 'center' | 'right' {
    const colDef = ALL_COLUMNS.find(c => c.key === key)
    return colDef?.align || 'left'
}

export function AdsTableCell({
    item,
    colKey,
    currency = 'THB',
    getActionValue,
    getCostPerAction,
    formatNumber,
    formatCurrency
}: AdsTableCellProps) {

    const getAlignClass = (align: 'left' | 'center' | 'right') => {
        switch (align) {
            case 'center': return 'text-center'
            case 'right': return 'text-right'
            default: return ''
        }
    }

    const align = getColumnAlign(colKey)
    const alignClass = getAlignClass(align)

    // Render cell value based on column key
    const renderValue = () => {
        switch (colKey) {
            // === BASIC INFO ===
            case 'name':
                return <span className="font-medium">{item.name || '-'}</span>

            case 'accountName':
                return (
                    <a
                        href={`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${(item.account_id || '').replace('act_', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm whitespace-nowrap hover:text-blue-600 hover:underline cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {item.accountName || item.account_id || '-'}
                    </a>
                )

            case 'pageName':
                return item.pageId ? (
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
                ) : <span className="text-muted-foreground">-</span>

            // === STATUS ===
            case 'delivery':
            case 'status':
                const status = item.deliveryStatus || item.effectiveStatus || item.status || '-'
                return <span className="text-sm">{status}</span>

            // === BUDGET ===
            case 'budget':
                const budgetValue = item.daily_budget || item.lifetime_budget || item.budget
                if (!budgetValue) return <span className="text-muted-foreground">-</span>
                const budgetNum = parseFloat(budgetValue) / 100
                return formatCurrency(budgetNum, item.currency || currency)

            // === METRICS ===
            case 'results':
                // Calculate results based on objective
                const objective = item.objective
                let results = 0
                if (objective === 'OUTCOME_ENGAGEMENT' || objective === 'MESSAGES') {
                    results = getActionValue(item.actions, 'onsite_conversion.messaging_first_reply') ||
                        getActionValue(item.actions, 'onsite_conversion.messaging_conversation_started_7d') ||
                        getActionValue(item.actions, 'post_engagement')
                } else {
                    results = getActionValue(item.actions, 'offsite_conversion.fb_pixel_purchase') ||
                        getActionValue(item.actions, 'lead') ||
                        getActionValue(item.actions, 'link_click') ||
                        getActionValue(item.actions, 'post_engagement')
                }
                return results > 0 ? formatNumber(results) : '-'

            case 'costPerResult':
                const resultsCost = getCostPerAction(item.costPerActionType, 'onsite_conversion.messaging_first_reply') ||
                    getCostPerAction(item.costPerActionType, 'post_engagement') ||
                    getCostPerAction(item.costPerActionType, 'link_click')
                return resultsCost > 0 ? formatCurrency(resultsCost, item.currency || currency) : '-'

            case 'reach':
                return item.reach ? formatNumber(parseInt(item.reach)) : '-'

            case 'impressions':
                return item.impressions ? formatNumber(parseInt(item.impressions)) : '-'

            case 'frequency':
                const freq = item.impressions && item.reach ? (parseInt(item.impressions) / parseInt(item.reach)).toFixed(2) : null
                return freq ? freq : '-'

            case 'postEngagements':
                const engagements = getActionValue(item.actions, 'post_engagement')
                return engagements > 0 ? formatNumber(engagements) : '-'

            case 'clicks':
                return item.clicks ? formatNumber(parseInt(item.clicks)) : '-'

            case 'linkClicks':
                const linkClicks = getActionValue(item.actions, 'link_click')
                return linkClicks > 0 ? formatNumber(linkClicks) : '-'

            case 'ctr':
                const ctr = item.clicks && item.impressions ? ((parseInt(item.clicks) / parseInt(item.impressions)) * 100).toFixed(2) : null
                return ctr ? `${ctr}%` : '-'

            case 'cpc':
                const cpc = item.clicks && item.spend ? (parseFloat(item.spend) / parseInt(item.clicks)) : null
                return cpc ? formatCurrency(cpc, item.currency || currency) : '-'

            case 'cpm':
                const cpm = item.impressions && item.spend ? ((parseFloat(item.spend) / parseInt(item.impressions)) * 1000) : null
                return cpm ? formatCurrency(cpm, item.currency || currency) : '-'

            // === SPEND ===
            case 'spend':
                return item.spend ? formatCurrency(parseFloat(item.spend), item.currency || currency) : '-'

            // === MESSAGING ===
            case 'newMessagingContacts':
                const messaging = getActionValue(item.actions, 'onsite_conversion.messaging_conversation_started_7d') ||
                    getActionValue(item.actions, 'onsite_conversion.messaging_first_reply')
                return messaging > 0 ? formatNumber(messaging) : '-'

            case 'costPerNewMessagingContact':
                const msgCost = getCostPerAction(item.costPerActionType, 'onsite_conversion.messaging_conversation_started_7d') ||
                    getCostPerAction(item.costPerActionType, 'onsite_conversion.messaging_first_reply')
                return msgCost > 0 ? formatCurrency(msgCost, item.currency || currency) : '-'

            case 'messagingFirstReply':
                const firstReply = getActionValue(item.actions, 'onsite_conversion.messaging_first_reply')
                return firstReply > 0 ? formatNumber(firstReply) : '-'

            // === VIDEO ===
            case 'videoPlays':
                return item.videoPlays ? formatNumber(parseInt(item.videoPlays)) : '-'

            case 'videoAvgTimeWatched':
                const avgTime = item.videoAvgTimeWatched
                if (!avgTime || avgTime === 0) return '-'
                const mins = Math.floor(avgTime / 60)
                const secs = Math.floor(avgTime % 60)
                return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

            case 'videoPlays3s':
                return item.videoPlays3s ? formatNumber(parseInt(item.videoPlays3s)) : '-'

            case 'videoP25Watched':
                return item.videoP25Watched ? formatNumber(parseInt(item.videoP25Watched)) : '-'

            case 'videoP50Watched':
                return item.videoP50Watched ? formatNumber(parseInt(item.videoP50Watched)) : '-'

            case 'videoP75Watched':
                return item.videoP75Watched ? formatNumber(parseInt(item.videoP75Watched)) : '-'

            case 'videoP95Watched':
                return item.videoP95Watched ? formatNumber(parseInt(item.videoP95Watched)) : '-'

            case 'videoP100Watched':
                return item.videoP100Watched ? formatNumber(parseInt(item.videoP100Watched)) : '-'

            // === CONVERSION ===
            case 'purchases':
                const purchases = getActionValue(item.actions, 'offsite_conversion.fb_pixel_purchase')
                return purchases > 0 ? formatNumber(purchases) : '-'

            case 'leads':
                const leads = getActionValue(item.actions, 'lead')
                return leads > 0 ? formatNumber(leads) : '-'

            case 'costPerPurchase':
                const purchaseCost = getCostPerAction(item.costPerActionType, 'offsite_conversion.fb_pixel_purchase')
                return purchaseCost > 0 ? formatCurrency(purchaseCost, item.currency || currency) : '-'

            case 'costPerLead':
                const leadCost = getCostPerAction(item.costPerActionType, 'lead')
                return leadCost > 0 ? formatCurrency(leadCost, item.currency || currency) : '-'

            // === ACCOUNT SPECIFIC ===
            case 'activeAdsCount':
                return item.activeAdsCount !== undefined ? formatNumber(item.activeAdsCount) : '-'

            case 'spendCap':
                return item.spendCap ? formatCurrency(parseFloat(item.spendCap) / 100, item.currency || currency) : '-'

            case 'paymentMethod':
                return item.paymentMethod || '-'

            case 'timezone':
                return item.timezone_name || item.timezone || '-'

            case 'country':
                return item.business_country_code || item.country || '-'

            case 'currency':
                return item.currency || '-'

            // === DEFAULT ===
            default:
                return item[colKey] !== undefined ? String(item[colKey]) : '-'
        }
    }

    return (
        <TableCell className={`border-r ${alignClass}`}>
            {renderValue()}
        </TableCell>
    )
}
