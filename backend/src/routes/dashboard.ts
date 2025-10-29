import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../index.js';

export async function dashboardRoutes(fastify: FastifyInstance) {
  // Get dashboard summary with KPIs
  fastify.get(
    '/summary',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Get total applications
        const totalApplications = await prisma.application.count();

        // Get financial totals
        const financials = await prisma.application.aggregate({
          _sum: {
            amountRequested: true,
            amountCommitted: true,
            amountDisbursed: true,
          },
        });

        // Get active vendors count
        const activeVendors = await prisma.vendor.count();

        // Get application status breakdown
        const statusBreakdown = await prisma.application.groupBy({
          by: ['status'],
          _count: true,
        });

        // Get upcoming compliance deadlines (next 30 days)
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const upcomingDeadlines = await prisma.complianceDoc.findMany({
          where: {
            dateRequired: {
              gte: new Date(),
              lte: thirtyDaysFromNow,
            },
            status: {
              in: ['PENDING', 'RECEIVED'],
            },
          },
          select: {
            id: true,
            docType: true,
            dateRequired: true,
            application: {
              select: {
                frn: true,
                name: true,
              },
            },
          },
          orderBy: {
            dateRequired: 'asc',
          },
          take: 10,
        });

        // Get top vendors by contract value
        const topVendors = await prisma.vendor.findMany({
          orderBy: {
            contractValue: 'desc',
          },
          take: 5,
          select: {
            id: true,
            name: true,
            contractValue: true,
            rating: true,
          },
        });

        return reply.send({
          kpis: {
            totalApplications,
            totalRequested: financials._sum.amountRequested || 0,
            totalCommitted: financials._sum.amountCommitted || 0,
            totalDisbursed: financials._sum.amountDisbursed || 0,
            activeVendors,
          },
          statusBreakdown,
          upcomingDeadlines,
          topVendors,
          lastUpdated: new Date().toISOString(),
        });
      } catch (error) {
        throw error;
      }
    }
  );

  // Get funding timeline data for charts
  fastify.get(
    '/funding-timeline',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Group applications by month
        const applications = await prisma.application.findMany({
          select: {
            applicationDate: true,
            amountRequested: true,
            amountCommitted: true,
          },
          where: {
            applicationDate: {
              not: null,
            },
          },
          orderBy: {
            applicationDate: 'asc',
          },
        });

        // Process data for timeline chart
        const timelineData = applications.reduce((acc: any[], app) => {
          if (!app.applicationDate) return acc;

          const month = app.applicationDate.toISOString().slice(0, 7);
          const existing = acc.find((item) => item.month === month);

          if (existing) {
            existing.requested = (parseFloat(existing.requested) + parseFloat(app.amountRequested.toString())).toString();
            existing.committed = (parseFloat(existing.committed) + parseFloat(app.amountCommitted.toString())).toString();
          } else {
            acc.push({
              month,
              requested: app.amountRequested.toString(),
              committed: app.amountCommitted.toString(),
            });
          }

          return acc;
        }, []);

        return reply.send(timelineData);
      } catch (error) {
        throw error;
      }
    }
  );
}
