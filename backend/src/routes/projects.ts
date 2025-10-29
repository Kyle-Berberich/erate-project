import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index.js';
import { createAuditLog } from '../utils/audit.js';

const createProjectSchema = z.object({
  name: z.string(),
  type: z.string(),
  ownerId: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
  notes: z.string().optional(),
});

const createMilestoneSchema = z.object({
  title: z.string(),
  dueDate: z.string().optional(),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE']).optional(),
  assigneeId: z.string().optional(),
  notes: z.string().optional(),
});

const createChecklistSchema = z.object({
  description: z.string(),
  dueDate: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  assigneeId: z.string().optional(),
});

export async function projectRoutes(fastify: FastifyInstance) {
  // Get all projects
  fastify.get(
    '/',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const projects = await prisma.project.findMany({
          include: {
            owner: {
              select: {
                id: true,
                email: true,
              },
            },
            milestones: true,
            checklistItems: true,
          },
          orderBy: { createdAt: 'desc' },
        });

        return reply.send(projects);
      } catch (error) {
        throw error;
      }
    }
  );

  // Get single project
  fastify.get(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };

        const project = await prisma.project.findUnique({
          where: { id },
          include: {
            owner: true,
            milestones: {
              include: {
                assignee: {
                  select: { id: true, email: true },
                },
              },
            },
            checklistItems: {
              include: {
                assignee: {
                  select: { id: true, email: true },
                },
              },
            },
            files: true,
          },
        });

        if (!project) {
          return reply.code(404).send({ error: 'Project not found' });
        }

        return reply.send(project);
      } catch (error) {
        throw error;
      }
    }
  );

  // Create project
  fastify.post(
    '/',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = createProjectSchema.parse(request.body);

        const project = await prisma.project.create({
          data: {
            ...body,
            startDate: body.startDate ? new Date(body.startDate) : null,
            endDate: body.endDate ? new Date(body.endDate) : null,
          },
          include: {
            owner: true,
          },
        });

        await createAuditLog({
          userId: request.user?.id,
          entity: 'Project',
          entityId: project.id,
          action: 'CREATE',
          after: project,
        });

        return reply.code(201).send(project);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: error.errors });
        }
        throw error;
      }
    }
  );

  // Update project
  fastify.patch(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const body = createProjectSchema.partial().parse(request.body);

        const before = await prisma.project.findUnique({ where: { id } });

        if (!before) {
          return reply.code(404).send({ error: 'Project not found' });
        }

        const project = await prisma.project.update({
          where: { id },
          data: {
            ...body,
            startDate: body.startDate ? new Date(body.startDate) : undefined,
            endDate: body.endDate ? new Date(body.endDate) : undefined,
          },
          include: {
            owner: true,
          },
        });

        await createAuditLog({
          userId: request.user?.id,
          entity: 'Project',
          entityId: project.id,
          action: 'UPDATE',
          before,
          after: project,
        });

        return reply.send(project);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: error.errors });
        }
        throw error;
      }
    }
  );

  // Create milestone
  fastify.post(
    '/:id/milestones',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const body = createMilestoneSchema.parse(request.body);

        const milestone = await prisma.projectMilestone.create({
          data: {
            ...body,
            projectId: id,
            dueDate: body.dueDate ? new Date(body.dueDate) : null,
          },
          include: {
            assignee: {
              select: { id: true, email: true },
            },
          },
        });

        return reply.code(201).send(milestone);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: error.errors });
        }
        throw error;
      }
    }
  );

  // Create checklist item
  fastify.post(
    '/:id/checklist',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const body = createChecklistSchema.parse(request.body);

        const item = await prisma.checklistItem.create({
          data: {
            ...body,
            projectId: id,
            dueDate: body.dueDate ? new Date(body.dueDate) : null,
          },
          include: {
            assignee: {
              select: { id: true, email: true },
            },
          },
        });

        return reply.code(201).send(item);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: error.errors });
        }
        throw error;
      }
    }
  );
}
