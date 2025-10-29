import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index.js';
import { createAuditLog } from '../utils/audit.js';

const createComplianceSchema = z.object({
  applicationId: z.string(),
  docType: z.enum(['FORM_470', 'FORM_471', 'CONTRACT', 'INVOICE', 'BEAR_FORM', 'PIA_REPORT', 'SITE_VISIT', 'OTHER']),
  dateRequired: z.string().optional(),
  dateReceived: z.string().optional(),
  status: z.enum(['PENDING', 'RECEIVED', 'APPROVED', 'REJECTED', 'OVERDUE']).optional(),
  retentionYears: z.number().optional(),
  storageUri: z.string().optional(),
  reviewer: z.string().optional(),
  notes: z.string().optional(),
});

const updateComplianceSchema = createComplianceSchema.partial();

export async function complianceRoutes(fastify: FastifyInstance) {
  // Get all compliance documents
  fastify.get(
    '/',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { applicationId, status, docType } = request.query as any;

        const where: any = {};

        if (applicationId) where.applicationId = applicationId;
        if (status) where.status = status;
        if (docType) where.docType = docType;

        const docs = await prisma.complianceDoc.findMany({
          where,
          include: {
            application: {
              select: {
                frn: true,
                name: true,
              },
            },
            files: true,
          },
          orderBy: {
            dateRequired: 'asc',
          },
        });

        return reply.send(docs);
      } catch (error) {
        throw error;
      }
    }
  );

  // Get single compliance document
  fastify.get(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };

        const doc = await prisma.complianceDoc.findUnique({
          where: { id },
          include: {
            application: true,
            files: true,
          },
        });

        if (!doc) {
          return reply.code(404).send({ error: 'Compliance document not found' });
        }

        return reply.send(doc);
      } catch (error) {
        throw error;
      }
    }
  );

  // Create compliance document
  fastify.post(
    '/',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = createComplianceSchema.parse(request.body);

        // Calculate disposal date if dateReceived is provided
        let disposalDate = null;
        if (body.dateReceived) {
          const received = new Date(body.dateReceived);
          const years = body.retentionYears || 5;
          disposalDate = new Date(received);
          disposalDate.setFullYear(disposalDate.getFullYear() + years);
        }

        const doc = await prisma.complianceDoc.create({
          data: {
            ...body,
            dateRequired: body.dateRequired ? new Date(body.dateRequired) : null,
            dateReceived: body.dateReceived ? new Date(body.dateReceived) : null,
            disposalDate,
          },
          include: {
            application: true,
          },
        });

        await createAuditLog({
          userId: request.user?.id,
          entity: 'ComplianceDoc',
          entityId: doc.id,
          action: 'CREATE',
          after: doc,
        });

        return reply.code(201).send(doc);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: error.errors });
        }
        throw error;
      }
    }
  );

  // Update compliance document
  fastify.patch(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const body = updateComplianceSchema.parse(request.body);

        const before = await prisma.complianceDoc.findUnique({ where: { id } });

        if (!before) {
          return reply.code(404).send({ error: 'Compliance document not found' });
        }

        // Recalculate disposal date if needed
        let disposalDate = before.disposalDate;
        if (body.dateReceived) {
          const received = new Date(body.dateReceived);
          const years = body.retentionYears || before.retentionYears;
          disposalDate = new Date(received);
          disposalDate.setFullYear(disposalDate.getFullYear() + years);
        }

        const doc = await prisma.complianceDoc.update({
          where: { id },
          data: {
            ...body,
            dateRequired: body.dateRequired ? new Date(body.dateRequired) : undefined,
            dateReceived: body.dateReceived ? new Date(body.dateReceived) : undefined,
            disposalDate,
          },
          include: {
            application: true,
          },
        });

        await createAuditLog({
          userId: request.user?.id,
          entity: 'ComplianceDoc',
          entityId: doc.id,
          action: 'UPDATE',
          before,
          after: doc,
        });

        return reply.send(doc);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: error.errors });
        }
        throw error;
      }
    }
  );

  // Delete compliance document
  fastify.delete(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };

        const before = await prisma.complianceDoc.findUnique({ where: { id } });

        if (!before) {
          return reply.code(404).send({ error: 'Compliance document not found' });
        }

        await prisma.complianceDoc.delete({ where: { id } });

        await createAuditLog({
          userId: request.user?.id,
          entity: 'ComplianceDoc',
          entityId: id,
          action: 'DELETE',
          before,
        });

        return reply.code(204).send();
      } catch (error) {
        throw error;
      }
    }
  );
}
