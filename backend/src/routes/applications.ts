import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index.js';
import { createAuditLog } from '../utils/audit.js';

// Validation schemas
const createApplicationSchema = z.object({
  frn: z.string(),
  name: z.string(),
  vendorId: z.string(),
  category: z.enum(['CATEGORY_ONE', 'CATEGORY_TWO']),
  serviceType: z.string(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'COMMITTED', 'IN_PROGRESS', 'COMPLETED', 'DENIED', 'CANCELLED']).optional(),
  amountRequested: z.number().optional(),
  amountCommitted: z.number().optional(),
  amountDisbursed: z.number().optional(),
  discountRate: z.number().min(0).max(100).optional(),
  serviceStart: z.string().optional(),
  serviceEnd: z.string().optional(),
  applicationDate: z.string().optional(),
  approvalDate: z.string().optional(),
  notes: z.string().optional(),
});

const updateApplicationSchema = createApplicationSchema.partial();

export async function applicationRoutes(fastify: FastifyInstance) {
  // Get all applications
  fastify.get(
    '/',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { search, status, vendorId, sortBy = 'createdAt', order = 'desc' } = request.query as any;

        const where: any = {};

        if (search) {
          where.OR = [
            { frn: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
          ];
        }

        if (status) {
          where.status = status;
        }

        if (vendorId) {
          where.vendorId = vendorId;
        }

        const applications = await prisma.application.findMany({
          where,
          include: {
            vendor: {
              select: {
                id: true,
                name: true,
                rating: true,
              },
            },
          },
          orderBy: {
            [sortBy]: order,
          },
        });

        return reply.send(applications);
      } catch (error) {
        throw error;
      }
    }
  );

  // Get single application
  fastify.get(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };

        const application = await prisma.application.findUnique({
          where: { id },
          include: {
            vendor: true,
            complianceDocs: true,
            files: true,
          },
        });

        if (!application) {
          return reply.code(404).send({ error: 'Application not found' });
        }

        return reply.send(application);
      } catch (error) {
        throw error;
      }
    }
  );

  // Create application
  fastify.post(
    '/',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = createApplicationSchema.parse(request.body);

        // Check if FRN already exists
        const existing = await prisma.application.findUnique({
          where: { frn: body.frn },
        });

        if (existing) {
          return reply.code(409).send({ error: 'FRN already exists' });
        }

        const application = await prisma.application.create({
          data: {
            ...body,
            serviceStart: body.serviceStart ? new Date(body.serviceStart) : null,
            serviceEnd: body.serviceEnd ? new Date(body.serviceEnd) : null,
            applicationDate: body.applicationDate ? new Date(body.applicationDate) : null,
            approvalDate: body.approvalDate ? new Date(body.approvalDate) : null,
          },
          include: {
            vendor: true,
          },
        });

        // Create audit log
        await createAuditLog({
          userId: request.user?.id,
          entity: 'Application',
          entityId: application.id,
          action: 'CREATE',
          after: application,
        });

        return reply.code(201).send(application);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: error.errors });
        }
        throw error;
      }
    }
  );

  // Update application
  fastify.patch(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const body = updateApplicationSchema.parse(request.body);

        const before = await prisma.application.findUnique({
          where: { id },
        });

        if (!before) {
          return reply.code(404).send({ error: 'Application not found' });
        }

        const application = await prisma.application.update({
          where: { id },
          data: {
            ...body,
            serviceStart: body.serviceStart ? new Date(body.serviceStart) : undefined,
            serviceEnd: body.serviceEnd ? new Date(body.serviceEnd) : undefined,
            applicationDate: body.applicationDate ? new Date(body.applicationDate) : undefined,
            approvalDate: body.approvalDate ? new Date(body.approvalDate) : undefined,
          },
          include: {
            vendor: true,
          },
        });

        // Create audit log
        await createAuditLog({
          userId: request.user?.id,
          entity: 'Application',
          entityId: application.id,
          action: 'UPDATE',
          before,
          after: application,
        });

        return reply.send(application);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: error.errors });
        }
        throw error;
      }
    }
  );

  // Delete application
  fastify.delete(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };

        const before = await prisma.application.findUnique({
          where: { id },
        });

        if (!before) {
          return reply.code(404).send({ error: 'Application not found' });
        }

        await prisma.application.delete({
          where: { id },
        });

        // Create audit log
        await createAuditLog({
          userId: request.user?.id,
          entity: 'Application',
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
