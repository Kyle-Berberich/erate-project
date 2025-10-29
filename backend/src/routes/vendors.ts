import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index.js';
import { createAuditLog } from '../utils/audit.js';

const createVendorSchema = z.object({
  name: z.string(),
  rating: z.number().min(1).max(5).optional(),
  contractValue: z.number().optional(),
  contact: z.string().optional(),
  notes: z.string().optional(),
});

const updateVendorSchema = createVendorSchema.partial();

export async function vendorRoutes(fastify: FastifyInstance) {
  // Get all vendors
  fastify.get(
    '/',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { search, sortBy = 'name', order = 'asc' } = request.query as any;

        const where: any = {};

        if (search) {
          where.name = { contains: search, mode: 'insensitive' };
        }

        const vendors = await prisma.vendor.findMany({
          where,
          include: {
            applications: {
              select: {
                id: true,
                frn: true,
                name: true,
                status: true,
                amountRequested: true,
                amountCommitted: true,
                amountDisbursed: true,
              },
            },
          },
          orderBy: {
            [sortBy]: order,
          },
        });

        // Calculate aggregated financials
        const vendorsWithAggregates = vendors.map((vendor) => ({
          ...vendor,
          totalApplications: vendor.applications.length,
          totalRequested: vendor.applications.reduce(
            (sum, app) => sum + parseFloat(app.amountRequested.toString()),
            0
          ),
          totalCommitted: vendor.applications.reduce(
            (sum, app) => sum + parseFloat(app.amountCommitted.toString()),
            0
          ),
          totalDisbursed: vendor.applications.reduce(
            (sum, app) => sum + parseFloat(app.amountDisbursed.toString()),
            0
          ),
        }));

        return reply.send(vendorsWithAggregates);
      } catch (error) {
        throw error;
      }
    }
  );

  // Get single vendor
  fastify.get(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };

        const vendor = await prisma.vendor.findUnique({
          where: { id },
          include: {
            applications: true,
          },
        });

        if (!vendor) {
          return reply.code(404).send({ error: 'Vendor not found' });
        }

        return reply.send(vendor);
      } catch (error) {
        throw error;
      }
    }
  );

  // Create vendor
  fastify.post(
    '/',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = createVendorSchema.parse(request.body);

        const vendor = await prisma.vendor.create({
          data: body,
        });

        await createAuditLog({
          userId: request.user?.id,
          entity: 'Vendor',
          entityId: vendor.id,
          action: 'CREATE',
          after: vendor,
        });

        return reply.code(201).send(vendor);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: error.errors });
        }
        throw error;
      }
    }
  );

  // Update vendor
  fastify.patch(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const body = updateVendorSchema.parse(request.body);

        const before = await prisma.vendor.findUnique({ where: { id } });

        if (!before) {
          return reply.code(404).send({ error: 'Vendor not found' });
        }

        const vendor = await prisma.vendor.update({
          where: { id },
          data: body,
        });

        await createAuditLog({
          userId: request.user?.id,
          entity: 'Vendor',
          entityId: vendor.id,
          action: 'UPDATE',
          before,
          after: vendor,
        });

        return reply.send(vendor);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: error.errors });
        }
        throw error;
      }
    }
  );

  // Delete vendor
  fastify.delete(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };

        const before = await prisma.vendor.findUnique({ where: { id } });

        if (!before) {
          return reply.code(404).send({ error: 'Vendor not found' });
        }

        await prisma.vendor.delete({ where: { id } });

        await createAuditLog({
          userId: request.user?.id,
          entity: 'Vendor',
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
