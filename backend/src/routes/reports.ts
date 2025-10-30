import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../index.js';
import {
  generateMonthlySummary,
  generateApplicationStatusReport,
  generateVendorPerformanceReport,
  generateComplianceChecklistReport,
} from '../services/pdf.js';
import { uploadFile } from '../services/storage.js';

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

  // Generate report
  fastify.post(
    '/:type',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const { type } = request.params as { type: string };
        const { periodStart, periodEnd } = request.body as any;

        const startDate = periodStart ? new Date(periodStart) : new Date(new Date().getFullYear(), 0, 1);
        const endDate = periodEnd ? new Date(periodEnd) : new Date();

        // Generate PDF based on type
        let pdfBuffer: Buffer;
        let fileName: string;

        switch (type.toLowerCase()) {
          case 'monthly-summary':
            pdfBuffer = await generateMonthlySummary(startDate, endDate);
            fileName = `monthly-summary-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}.pdf`;
            break;

          case 'application-status':
            pdfBuffer = await generateApplicationStatusReport();
            fileName = `application-status-${new Date().toISOString().split('T')[0]}.pdf`;
            break;

          case 'vendor-performance':
            pdfBuffer = await generateVendorPerformanceReport();
            fileName = `vendor-performance-${new Date().toISOString().split('T')[0]}.pdf`;
            break;

          case 'compliance-checklist':
            pdfBuffer = await generateComplianceChecklistReport();
            fileName = `compliance-checklist-${new Date().toISOString().split('T')[0]}.pdf`;
            break;

          default:
            return reply.code(400).send({ error: 'Invalid report type' });
        }

        // Upload PDF to storage
        const uploadedFile = await uploadFile(pdfBuffer, fileName, 'application/pdf', user.id, 'reports');

        // Create file record
        const file = await prisma.file.create({
          data: {
            filename: fileName,
            filepath: uploadedFile.key,
            filesize: uploadedFile.fileSize,
            mime: 'application/pdf',
            ownerType: 'report',
            ownerId: null,
            uploaderId: user.id,
          },
        });

        // Create report record
        const report = await prisma.report.create({
          data: {
            type: type.toUpperCase().replace('-', '_') as any,
            periodStart: startDate,
            periodEnd: endDate,
            fileId: file.id,
          },
        });

        return reply.code(201).send({
          ...report,
          file: {
            ...file,
            url: uploadedFile.url,
          },
        });
      } catch (error) {
        console.error('Report generation error:', error);
        return reply.code(500).send({ error: 'Failed to generate report' });
      }
    }
  );

  // Download report PDF
  fastify.get(
    '/:id/download',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };

        const report = await prisma.report.findUnique({
          where: { id },
          include: {
            file: true,
          },
        });

        if (!report || !report.file) {
          return reply.code(404).send({ error: 'Report not found' });
        }

        // Redirect to file download endpoint
        return reply.redirect(302, `/api/files/${report.file.id}/download`);
      } catch (error) {
        throw error;
      }
    }
  );

  // Get report details
  fastify.get(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };

        const report = await prisma.report.findUnique({
          where: { id },
          include: {
            file: true,
          },
        });

        if (!report) {
          return reply.code(404).send({ error: 'Report not found' });
        }

        return reply.send(report);
      } catch (error) {
        throw error;
      }
    }
  );

  // Delete report
  fastify.delete(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };

        const report = await prisma.report.findUnique({
          where: { id },
          include: {
            file: true,
          },
        });

        if (!report) {
          return reply.code(404).send({ error: 'Report not found' });
        }

        // Delete the file if it exists (cascade should handle this, but being explicit)
        if (report.fileId) {
          await prisma.file.delete({
            where: { id: report.fileId },
          });
        }

        await prisma.report.delete({
          where: { id },
        });

        return reply.code(204).send();
      } catch (error) {
        throw error;
      }
    }
  );
}
