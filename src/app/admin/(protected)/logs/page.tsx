
import { PrismaClient } from '@prisma/client';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from 'date-fns';

const prisma = new PrismaClient();

export default async function AdminLogsPage() {
    const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100, // Limit to last 100 entries for now
    });

    // In a real app, we would join with User table, but schema relationship is not explicitly strictly defined for all logs yet.
    // We can fetch users to map names manually if needed or update schema. For now, showing userId.
    const userIds = [...new Set(logs.map(log => log.userId).filter(Boolean) as string[])];
    const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true }
    });

    const userMap = users.reduce((acc, user) => {
        acc[user.id] = user.name || user.email || 'Unknown';
        return acc;
    }, {} as Record<string, string>);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Activity Logs</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>System Audit Logs</CardTitle>
                    <CardDescription>
                        Track user actions and system events. (Last 100 records)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[180px]">Timestamp</TableHead>
                                <TableHead className="w-[150px]">User</TableHead>
                                <TableHead className="w-[150px]">Action</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead className="w-[120px]">IP Address</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No logs found.</TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="text-muted-foreground font-mono text-xs">
                                            {format(new Date(log.createdAt), 'MMM d, HH:mm:ss')}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {log.userId ? userMap[log.userId] || log.userId : 'System'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{log.action}</Badge>
                                        </TableCell>
                                        <TableCell className="max-w-[400px] truncate text-xs text-muted-foreground" title={JSON.stringify(log.details)}>
                                            {log.details ? JSON.stringify(log.details) : '-'}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground font-mono">
                                            {log.ipAddress || '-'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
