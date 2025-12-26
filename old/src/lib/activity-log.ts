import { prisma } from '@/lib/db';

export type ActivityAction =
    | 'login'
    | 'logout'
    | 'register'
    | 'send_message'
    | 'view_conversation'
    | 'create_team'
    | 'add_member'
    | 'remove_member'
    | 'update_member_role'
    | 'toggle_auto_assign'
    | 'assign_conversation'
    | 'connect_facebook'
    | 'disconnect_facebook'
    | 'update_settings';

interface LogActivityParams {
    userId: string;
    userEmail: string;
    userName?: string | null;
    action: ActivityAction;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
}

export async function logActivity(params: LogActivityParams) {
    try {
        await prisma.activityLog.create({
            data: {
                userId: params.userId,
                userEmail: params.userEmail,
                userName: params.userName,
                action: params.action,
                details: params.details ? JSON.stringify(params.details) : null,
                ipAddress: params.ipAddress,
                userAgent: params.userAgent,
            }
        });
    } catch (error) {
        console.error('[ActivityLog] Failed to log activity:', error);
    }
}

export async function getRecentActivities(limit: number = 50) {
    return prisma.activityLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
    });
}

export async function getActivitiesByUser(userId: string, limit: number = 50) {
    return prisma.activityLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });
}

export async function getActivitiesByAction(action: string, limit: number = 50) {
    return prisma.activityLog.findMany({
        where: { action },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });
}
