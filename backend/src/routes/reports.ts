import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../index.js';

export async function reportRoutes(fastify: FastifyInstance) {
  // Get all reports
  fastify.get(
    '/',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { type, fy } = request.query as any;

        const where: any = {};
        if (type) where.type = type;

        const reports = await prisma.report.findMany({
          where,
          orderBy: { createdAt: 'desc' },
        });

        return reply.send(reports);
      } catch (error) {
        throw error;
      }
    }
  );

  // Generate report (placeholder - will implement PDF generation later)
  fastify.post(
    '/:type',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { type } = request.params as { type: string };
        const { periodStart, periodEnd } = request.body as any;

        // Create report record
        const report = await prisma.report.create({
          data: {
            type: type.toUpperCase() as any,
            periodStart: periodStart ? new Date(periodStart) : null,
            periodEnd: periodEnd ? new Date(periodEnd) : null,
          },
        });

        // TODO: Generate PDF and upload to storage
        // For now, return the report record
        return reply.code(201).send(report);
      } catch (error) {
        throw error;
      }
    }
  );
}
