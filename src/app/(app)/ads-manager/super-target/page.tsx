'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Target, Users, TrendingUp, Layers, Download } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatNumber } from '@/lib/utils';
import { showCustomToast } from '@/utils/custom-toast';

interface Interest {
    id: string;
    name: string;
    audienceSizeLowerBound: string;
    audienceSizeUpperBound: string;
    topic?: string;
    path?: any;
}

interface TopicStat {
    name: string;
    count: number;
}

export default function SuperTargetPage() {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [top20, setTop20] = useState<Interest[]>([]);
    const [topics, setTopics] = useState<TopicStat[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/targeting/super-target');
            if (res.ok) {
                const data = await res.json();
                setTop20(data.top20 || []);
                setTopics(data.topics || []);
            } else {
                console.error("Failed to fetch super target data");
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleTopicClick = async (topicName: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/targeting/super-target?topic=${encodeURIComponent(topicName)}`);
            if (res.ok) {
                const data = await res.json();
                setTop20(data.interests || []);
            }
        } catch (error) {
            console.error("Error fetching topic:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        await fetchData();
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Target className="h-8 w-8 text-primary" />
                        {t('superTarget.title', 'Super Target')}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {t('superTarget.subtitle', 'Explore top performing interests and discover hidden audiences from your database.')}
                    </p>
                </div>
                <div className="flex gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="gap-2 shadow-sm">
                                <Download className="h-4 w-4" />
                                Export
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => window.location.href = '/api/targeting/super-target/export?format=csv'}>
                                Export as CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.location.href = '/api/targeting/super-target/export?format=xlsx'}>
                                Export as Excel
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-none shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Layers className="h-4 w-4 text-blue-500" />
                            Total Categories
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                            {formatNumber(topics.length)}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-none shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-purple-500" />
                            Top Interest Size
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                            {top20.length > 0 && top20[0].audienceSizeUpperBound ? (parseInt(top20[0].audienceSizeUpperBound) / 1000000).toFixed(1) + 'M' : '0'}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-none shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Users className="h-4 w-4 text-green-500" />
                            Total Interests
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-700 dark:text-green-300">
                            {formatNumber(topics.reduce((acc, curr) => acc + curr.count, 0))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Areas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Interests Table (Dynamic) */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-yellow-500" />
                            Interests List
                        </h2>
                        <Button variant="outline" size="sm" onClick={handleReset} className="text-xs h-8">
                            Reset View
                        </Button>
                    </div>

                    <div className="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col h-[500px]">
                        {/* Fixed Header */}
                        <div className="bg-muted/50 border-b">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-[40%]">Interest Name</TableHead>
                                        <TableHead className="w-[30%]">Category</TableHead>
                                        <TableHead className="w-[30%] text-right">Max Audience Size</TableHead>
                                    </TableRow>
                                </TableHeader>
                            </Table>
                        </div>

                        {/* Scrollable Body */}
                        <div className="overflow-y-auto flex-1 custom-scrollbar">
                            <Table>
                                <TableBody>
                                    {loading ? (
                                        Array.from({ length: 10 }).map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="w-[40%]"><div className="h-4 w-32 bg-muted rounded animate-pulse" /></TableCell>
                                                <TableCell className="w-[30%]"><div className="h-4 w-20 bg-muted rounded animate-pulse" /></TableCell>
                                                <TableCell className="w-[30%]"><div className="h-4 w-24 bg-muted rounded animate-pulse ml-auto" /></TableCell>
                                            </TableRow>
                                        ))
                                    ) : top20.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">
                                                No data found. Try syncing interests.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        top20.map((interest) => (
                                            <TableRow key={interest.id} className="hover:bg-muted/50 transition-colors">
                                                <TableCell className="font-medium w-[40%]">
                                                    {interest.name}
                                                </TableCell>
                                                <TableCell className="w-[30%]">
                                                    <Badge variant="outline" className="font-normal text-xs">
                                                        {interest.topic || 'General'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-sm text-muted-foreground w-[30%]">
                                                    {interest.audienceSizeUpperBound ? formatNumber(parseInt(interest.audienceSizeUpperBound)) : '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>

                {/* Categories / Groups */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Layers className="h-5 w-5 text-blue-500" />
                        Interest Groups
                    </h2>
                    <div className="rounded-xl border bg-card shadow-sm p-4 space-y-3 h-[500px] overflow-y-auto custom-scrollbar">
                        {loading && topics.length === 0 ? (
                            <div className="space-y-2">
                                <div className="h-8 bg-muted rounded animate-pulse" />
                                <div className="h-8 bg-muted rounded animate-pulse" />
                                <div className="h-8 bg-muted rounded animate-pulse" />
                            </div>
                        ) : topics.length === 0 ? (
                            <p className="text-center text-muted-foreground py-4">No categories found.</p>
                        ) : (
                            topics.map((topic, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => handleTopicClick(topic.name)}
                                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group"
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs shrink-0">
                                            {topic.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-medium text-sm truncate">{topic.name}</span>
                                    </div>
                                    <Badge variant="secondary" className="group-hover:bg-background transition-colors ml-2">
                                        {formatNumber(topic.count)}
                                    </Badge>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
