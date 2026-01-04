
import { prisma } from "@/lib/prisma";

export type AuditAction =
    | 'USER_LOGIN'
    | 'USER_REGISTER'
    | 'SYNC_INTERESTS'
    | 'EXPORT_DATA'
    | 'CREATE_CAMPAIGN'
    | 'UPDATE_CAMPAIGN'
    | 'API_ERROR';

interface CreateLogParams {
    userId?: string;
    action: AuditAction;
    entityType?: string;
    entityId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
}

export async function createAuditLog(params: CreateLogParams) {
    try {
        await prisma.auditLog.create({
            data: {
                userId: params.userId,
                action: params.action,
                entityType: params.entityType,
                entityId: params.entityId,
                details: params.details ? JSON.parse(JSON.stringify(params.details)) : undefined, // Ensure valid JSON
                ipAddress: params.ipAddress,
                userAgent: params.userAgent,
            }
        });
    } catch (error) {
        console.error('Failed to create audit log:', error);
        // Don't throw, logging shouldn't break the app flow
    }
}
