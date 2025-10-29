import { prisma } from '../index.js';
import { AuditAction } from '@prisma/client';

interface CreateAuditLogParams {
  userId?: string;
  entity: string;
  entityId?: string;
  action: AuditAction | 'LOGIN' | 'LOGOUT';
  before?: any;
  after?: any;
}

export async function createAuditLog(params: CreateAuditLogParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        entity: params.entity,
        entityId: params.entityId,
        action: params.action as AuditAction,
        before: params.before || null,
        after: params.after || null,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit log failures shouldn't break the main operation
  }
}
