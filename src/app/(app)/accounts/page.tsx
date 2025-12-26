'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2, ExternalLink, CreditCard, Building2, Edit3, RotateCcw, Trash2, MoreHorizontal } from "lucide-react";
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AdAccount {
  id: string;
  name: string;
  account_id: string;
  status: string;
  activeAds: number;
  spendingCap?: number;
  spentAmount?: number;
  paymentMethod?: string;
  timeZone: string;
  nationality: string;
  currency: string;
  limit: number;
}

import { useAdAccount } from '@/contexts/AdAccountContext';

export default function AccountsPage() {
  const { t, language } = useLanguage();
  const { data: session } = useSession();
  const { selectedAccounts, loading: contextLoading } = useAdAccount();
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Spending limit dialog state
  const [spendingLimitDialogOpen, setSpendingLimitDialogOpen] = useState(false);
  const [selectedAccountForLimit, setSelectedAccountForLimit] = useState<AdAccount | null>(null);
  const [spendingLimitAction, setSpendingLimitAction] = useState<'change' | 'reset'>('change');
  const [newLimitValue, setNewLimitValue] = useState('');
  const [isUpdatingLimit, setIsUpdatingLimit] = useState(false);

  // Sync with selected accounts initially to show something fast
  useEffect(() => {
    if (selectedAccounts && selectedAccounts.length > 0) {
      const basicAccounts = selectedAccounts.map(acc => ({
        id: acc.id,
        name: acc.name,
        account_id: acc.account_id,
        status: 'UNKNOWN',
        activeAds: 0,
        timeZone: '-',
        nationality: '-',
        currency: '-',
        limit: 0
      }));
      setAccounts(basicAccounts);
      setLoading(false);
    } else {
      // No selected accounts
      setAccounts([]);
      setLoading(false);
    }
  }, [selectedAccounts]);

  useEffect(() => {
    if (session?.user && selectedAccounts.length > 0) {
      fetchAccounts();
    }
  }, [session, selectedAccounts]);

  const fetchAccounts = async () => {
    // If we already have accounts, we don't need to show a spinner
    if (accounts.length === 0) setLoading(true);

    try {
      // Only fetch details for selected accounts
      const accountIds = selectedAccounts.map(a => a.account_id).join(',');
      const response = await fetch(`/api/facebook/ad-accounts/details?accountIds=${accountIds}`);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        // If details fail, we still have basic data from selected accounts
        if (selectedAccounts.length > 0) return;
        throw new Error(data.error || 'Failed to fetch accounts');
      }

      const data = await response.json();
      setAccounts(data.accounts || []);
    } catch (err) {
      console.error('Error fetching accounts:', err);
      if (accounts.length === 0) {
        setError(err instanceof Error ? err.message : 'Failed to load accounts');
      }
    } finally {
      setLoading(false);
    }
  };

  // Spending limit handlers
  const openSpendingLimitDialog = (account: AdAccount) => {
    setSelectedAccountForLimit(account);
    setSpendingLimitAction('change');
    setNewLimitValue(account.spendingCap?.toString() || '');
    setSpendingLimitDialogOpen(true);
  };

  const handleSpendingLimitAction = async (account: AdAccount, action: 'change' | 'reset' | 'delete') => {
    if (action === 'change') {
      openSpendingLimitDialog(account);
      return;
    }

    const confirmMessage = action === 'reset'
      ? `รีเซ็ตยอดใช้จ่ายของ ${account.name}?`
      : `ลบวงเงินของ ${account.name}?`;

    if (!confirm(confirmMessage)) return;

    setIsUpdatingLimit(true);
    try {
      const response = await fetch('/api/ads/spending-limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.account_id,
          action,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update spending limit');
      }

      // Refresh accounts
      await fetchAccounts();
      alert(action === 'reset' ? 'รีเซ็ตยอดใช้จ่ายแล้ว!' : 'ลบวงเงินแล้ว!');
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setIsUpdatingLimit(false);
    }
  };

  const handleSaveSpendingLimit = async () => {
    if (!selectedAccountForLimit) return;

    // Validation for change action
    if (spendingLimitAction === 'change' && (!newLimitValue || parseFloat(newLimitValue) <= 0)) {
      alert('กรุณากรอกวงเงินให้ถูกต้อง');
      return;
    }

    setIsUpdatingLimit(true);
    try {
      const response = await fetch('/api/ads/spending-limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: selectedAccountForLimit.account_id,
          action: spendingLimitAction,
          newLimit: spendingLimitAction === 'change' ? newLimitValue : undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update spending limit');
      }

      setSpendingLimitDialogOpen(false);
      await fetchAccounts();

      const message = spendingLimitAction === 'reset'
        ? `รีเซ็ตวงเงินสำหรับ ${selectedAccountForLimit.name} แล้ว`
        : `อัพเดตวงเงินเป็น ${newLimitValue} ${selectedAccountForLimit.currency} สำหรับ ${selectedAccountForLimit.name}`;
      alert(message);
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการอัพเดตวงเงิน');
    } finally {
      setIsUpdatingLimit(false);
    }
  };

  if (loading && accounts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-500">Loading accounts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={fetchAccounts}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!loading && selectedAccounts.length === 0) {
    return (
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('accounts.title')}</h1>
          <p className="text-gray-600 mt-2">{t('accounts.subtitle')}</p>
        </div>
        <div className="glass-card p-12">
          <div className="text-center">
            <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Ad Accounts Selected</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Please select at least one ad account in Settings to view account details.
            </p>
            <Link href="/settings?tab=ad-accounts">
              <Button>Go to Settings</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('accounts.title')}</h1>
        <p className="text-gray-600 mt-2">{t('accounts.subtitle')}</p>
      </div>

      <div className="glass-card overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-auto flex-1">
          <table className="w-full min-w-max">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 w-16 border-r border-gray-200">
                  #
                </th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">
                  {t('accounts.accountName')}
                </th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">
                  {t('accounts.status')}
                </th>
                <th className="px-4 py-2 text-center text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">
                  Active Ads
                </th>
                <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200 pr-12">
                  Spending Cap
                </th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">
                  Payment Method
                </th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">
                  Time Zone
                </th>
                <th className="px-4 py-2 text-center text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">
                  Nationality
                </th>
                <th className="px-4 py-2 text-center text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">
                  Currency
                </th>
                <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 max-w-[280px] border-r border-gray-200">
                  Limit
                </th>
                <th className="px-4 py-2 text-center text-sm font-semibold text-gray-900 max-w-[280px]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 border-b border-gray-200">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-3 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-8"></div></td>
                    <td className="px-4 py-2 border-r border-gray-200">
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-48"></div>
                        <div className="h-3 bg-gray-200 rounded w-32"></div>
                      </div>
                    </td>
                    <td className="px-4 py-2 border-r border-gray-200"><div className="h-6 bg-gray-200 rounded-full w-16"></div></td>
                    <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-12 mx-auto"></div></td>
                    <td className="px-4 py-2 border-r border-gray-200">
                      <div className="flex items-center gap-2">
                        <div className="h-2 bg-gray-200 rounded flex-1"></div>
                        <div className="h-4 bg-gray-200 rounded w-10"></div>
                      </div>
                    </td>
                    <td className="px-4 py-2 border-r border-gray-200">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-8 bg-gray-200 rounded"></div>
                        <div className="h-3 bg-gray-200 rounded w-12"></div>
                      </div>
                    </td>
                    <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-12 mx-auto"></div></td>
                    <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-12 mx-auto"></div></td>
                    <td className="px-4 py-2 border-r border-gray-200"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                    <td className="px-2 py-2"><div className="h-8 w-8 bg-gray-200 rounded mx-auto"></div></td>
                  </tr>
                ))
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                    No ad accounts found
                  </td>
                </tr>
              ) : (
                accounts.map((account, index) => {
                  const spendPercent = account.spendingCap && account.spentAmount
                    ? Math.round((account.spentAmount / account.spendingCap) * 100)
                    : 0;

                  return (
                    <tr key={account.id} className="hover:bg-gray-50 transition-colors border-b border-gray-200">
                      <td className="px-3 py-2 text-sm text-gray-600 border-r border-gray-200">
                        {index + 1}
                      </td>
                      <td className="px-4 py-2 border-r border-gray-200">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">{account.name}</span>
                          <span className="text-xs text-gray-500">ID: {account.account_id}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 border-r border-gray-200">
                        <Badge
                          variant={account.status === 'ACTIVE' ? 'default' : 'secondary'}
                          className={account.status === 'ACTIVE' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}
                        >
                          {account.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-center text-sm text-gray-900 border-r border-gray-200">
                        {account.activeAds}
                      </td>
                      <td
                        className="px-4 py-2 border-r border-gray-200 cursor-pointer group hover:bg-gray-100 transition-colors"
                        onClick={() => openSpendingLimitDialog(account)}
                      >
                        {account.spendingCap ? (
                          <div className="flex flex-col gap-1 relative items-end">
                            <div className="flex items-center gap-2 justify-end relative">
                              {/* Pencil icon - appears on hover, absolute to prevent layout shift */}
                              <div className="absolute right-[calc(100%+8px)] opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <Edit3 className="w-3.5 h-3.5 text-gray-400" />
                              </div>
                              <Progress
                                value={spendPercent}
                                className={`w-16 h-2 [&>div]:transition-colors ${spendPercent >= 100 ? '[&>div]:bg-red-500' :
                                  spendPercent >= 80 ? '[&>div]:bg-orange-500' :
                                    '[&>div]:bg-green-500'
                                  }`}
                              />
                              <span className="text-xs text-gray-600 w-10 text-right">{spendPercent}%</span>
                            </div>
                            <div className="text-xs text-gray-500 transition-all duration-200 text-right w-full pr-12">
                              {account.spentAmount?.toLocaleString() || 0} / {account.spendingCap.toLocaleString()} {account.currency}
                            </div>
                          </div>
                        ) : (
                          <button
                            className="text-xs text-blue-600 hover:underline w-full text-right pr-12"
                            onClick={(e) => {
                              e.stopPropagation();
                              openSpendingLimitDialog(account);
                            }}
                          >
                            ตั้งวงเงิน
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-2 border-r border-gray-200">
                        {account.paymentMethod ? (
                          <div className="flex items-center gap-2">
                            {account.paymentMethod.includes('VISA') ? (
                              <div className="w-8 h-5 flex items-center justify-center bg-[#182C9E] rounded-[3px]">
                                <span className="text-[9px] font-bold text-white tracking-wider">VISA</span>
                              </div>
                            ) : (
                              <div className="w-8 h-5 flex items-center justify-center bg-[#0F172A] rounded-[3px] relative overflow-hidden">
                                <div className="flex -space-x-1 z-10">
                                  <div className="w-2.5 h-2.5 rounded-full bg-[#EB001B]" />
                                  <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F00]" />
                                </div>
                              </div>
                            )}
                            <span className="text-sm text-gray-500">
                              - {account.paymentMethod.substring(account.paymentMethod.length - 4)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 border-r border-gray-200">
                        {account.timeZone}
                      </td>
                      <td className="px-4 py-2 text-center text-sm text-gray-900 border-r border-gray-200">
                        {account.nationality}
                      </td>
                      <td className="px-4 py-2 text-center text-sm text-gray-900 border-r border-gray-200">
                        {account.currency}
                      </td>
                      <td className="px-4 py-2 text-right text-sm font-medium text-gray-900 border-r border-gray-200">
                        ${account.limit.toFixed(2)}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" disabled={isUpdatingLimit}>
                              {isUpdatingLimit ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleSpendingLimitAction(account, 'change')}>
                              <Edit3 className="h-4 w-4 mr-2" />
                              {account.spendingCap ? 'แก้ไขวงเงิน' : 'ตั้งวงเงิน'}
                            </DropdownMenuItem>
                            {account.spendingCap && (
                              <>
                                <DropdownMenuItem onClick={() => handleSpendingLimitAction(account, 'reset')}>
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  รีเซ็ตยอดใช้จ่าย
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleSpendingLimitAction(account, 'delete')}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  ลบวงเงิน
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem
                              onClick={() => window.open(`https://business.facebook.com/adsmanager/manage/accounts?act=${account.account_id}`, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              เปิดใน Meta
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div >

      {/* Spending Limit Dialog - Exact Screenshot Design */}
      < Dialog open={spendingLimitDialogOpen} onOpenChange={setSpendingLimitDialogOpen} >
        <DialogContent className="sm:max-w-[420px] p-0 gap-0">
          {/* Header */}
          <div className="flex items-center gap-2 px-6 pt-6 pb-2">
            <span className="text-blue-600 text-xl font-bold">$</span>
            <span className="text-[17px] font-semibold text-[#0E1B25]">Set Spending Limit</span>
            <button
              onClick={() => setSpendingLimitDialogOpen(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
            >
              <span className="sr-only">Close</span>
            </button>
          </div>

          {selectedAccountForLimit && (
            <div className="px-6 pb-6 space-y-5">
              {/* Account Info - Light blue card with border */}
              <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                <div className="font-bold text-base text-[#0F172A]">{selectedAccountForLimit.name}</div>
                <div className="text-sm text-[#64748B] mt-0.5">{selectedAccountForLimit.account_id}</div>
              </div>

              {/* Money Info */}
              <div className="space-y-1">
                <div className="text-[15px]">
                  <span className="font-medium text-[#0F172A]">Money Left: </span>
                  <span className="text-[#0F172A]">
                    ${selectedAccountForLimit.spendingCap
                      ? Math.max(0, (selectedAccountForLimit.spendingCap - (selectedAccountForLimit.spentAmount || 0))).toFixed(2)
                      : '∞'
                    }
                  </span>
                </div>
                <div className="text-[15px]">
                  <span className="text-[#0F172A]">Spent </span>
                  <span className="text-blue-600 font-medium">
                    ${(selectedAccountForLimit.spentAmount || 0).toFixed(2)}
                  </span>
                  <span className="text-[#0F172A]"> • Limit: </span>
                  <span className="text-blue-600 font-medium">
                    ${selectedAccountForLimit.spendingCap?.toFixed(2) || '∞'}
                  </span>
                </div>
              </div>

              {/* Reset notice */}
              {spendingLimitAction === 'reset' && (
                <p className="text-sm text-[#64748B]">
                  The spent amount will be reset to 0 after resetting
                </p>
              )}

              {/* Action Selection - Only show if has spending cap */}
              {selectedAccountForLimit.spendingCap && (
                <div className="space-y-3 pt-1">
                  <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                    CHOOSE AN ACTION
                  </div>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${spendingLimitAction === 'change' ? 'border-blue-600' : 'border-gray-300'}`}>
                        {spendingLimitAction === 'change' && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                      </div>
                      <input
                        type="radio"
                        name="action"
                        checked={spendingLimitAction === 'change'}
                        onChange={() => setSpendingLimitAction('change')}
                        className="hidden"
                      />
                      <span className="text-[15px] text-[#0F172A]">Change Limit</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${spendingLimitAction === 'reset' ? 'border-blue-600' : 'border-gray-300'}`}>
                        {spendingLimitAction === 'reset' && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                      </div>
                      <input
                        type="radio"
                        name="action"
                        checked={spendingLimitAction === 'reset'}
                        onChange={() => setSpendingLimitAction('reset')}
                        className="hidden"
                      />
                      <span className="text-[15px] text-[#0F172A]">Reset Limit</span>
                    </label>
                  </div>
                </div>
              )}

              {/* New Limit Input - Only show for change action */}
              {(spendingLimitAction === 'change' || !selectedAccountForLimit.spendingCap) && (
                <div className="space-y-2">
                  <div className="text-[15px] text-[#64748B]">
                    New Spending Limit
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="0"
                      value={newLimitValue}
                      onChange={(e) => setNewLimitValue(e.target.value)}
                      className="pr-16 h-[46px] text-base rounded-full border-gray-200 focus-visible:ring-blue-600 focus-visible:border-blue-600 px-4"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-600 font-bold text-sm">
                      {selectedAccountForLimit.currency || 'USD'}
                    </span>
                  </div>
                </div>
              )}

              {/* Submit Button - Blue with icon */}
              <Button
                onClick={handleSaveSpendingLimit}
                disabled={isUpdatingLimit || (spendingLimitAction === 'change' && !newLimitValue)}
                className="w-full h-[46px] bg-blue-600 hover:bg-blue-700 text-white rounded-full text-[15px] font-medium shadow-sm active:scale-[0.98] transition-all"
              >
                {isUpdatingLimit ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit3 className="h-4 w-4 mr-2" />
                    {spendingLimitAction === 'reset' ? 'Reset Limit' : 'Change Limit'}
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog >
    </div >
  );
}
