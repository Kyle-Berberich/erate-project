import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../index.js';

export async function notificationRoutes(fastify: FastifyInstance) {
  // Get user notifications
  fastify.get(
    '/',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }

        const notifications = await prisma.notification.findMany({
          where: { userId },
          orderBy: { scheduledFor: 'desc' },
          take: 50,
        });

        return reply.send(notifications);
      } catch (error) {
        throw error;
      }
    }
  );

  // Preview notification (for testing)
  fastify.post(
    '/preview',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { kind, payload } = request.body as any;

        // TODO: Generate notification preview
        return reply.send({
          kind,
          payload,
          preview: 'Notification preview would appear here',
        });
      } catch (error) {
        throw error;
      }
    }
  );

  // Cron endpoint for sending due reminders
  fastify.post('/cron/due-reminders', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // TODO: Implement reminder sending logic
      // This would be called by a cron job service
      const now = new Date();

      // Find pending notifications
      const pending = await prisma.notification.findMany({
        where: {
          sentAt: null,
          scheduledFor: {
            lte: now,
          },
        },
      });

      // TODO: Send emails and mark as sent

      return reply.send({
        processed: pending.length,
      });
    } catch (error) {
      throw error;
    }
  });
}
