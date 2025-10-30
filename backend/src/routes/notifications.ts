import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../index.js';
import { checkDeadlinesAndNotify, sendDailyDigests } from '../services/scheduler.js';

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

  // Mark notification as read
  fastify.patch(
    '/:id/read',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.user?.id;
        const { id } = request.params as { id: string };

        const notification = await prisma.notification.findFirst({
          where: { id, userId },
        });

        if (!notification) {
          return reply.code(404).send({ error: 'Notification not found' });
        }

        const updated = await prisma.notification.update({
          where: { id },
          data: { readAt: new Date() },
        });

        return reply.send(updated);
      } catch (error) {
        throw error;
      }
    }
  );

  // Mark all notifications as read
  fastify.post(
    '/read-all',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.user?.id;

        await prisma.notification.updateMany({
          where: {
            userId,
            readAt: null,
          },
          data: { readAt: new Date() },
        });

        return reply.send({ success: true });
      } catch (error) {
        throw error;
      }
    }
  );

  // Get unread count
  fastify.get(
    '/unread-count',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.user?.id;

        const count = await prisma.notification.count({
          where: {
            userId,
            readAt: null,
          },
        });

        return reply.send({ count });
      } catch (error) {
        throw error;
      }
    }
  );

  // Cron endpoint for sending deadline reminders
  fastify.post('/cron/deadline-reminders', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await checkDeadlinesAndNotify();
      return reply.send({ success: true, message: 'Deadline reminders sent' });
    } catch (error) {
      console.error('Error in deadline reminders cron:', error);
      return reply.code(500).send({ error: 'Failed to send deadline reminders' });
    }
  });

  // Cron endpoint for sending daily digests
  fastify.post('/cron/daily-digest', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await sendDailyDigests();
      return reply.send({ success: true, message: 'Daily digests sent' });
    } catch (error) {
      console.error('Error in daily digest cron:', error);
      return reply.code(500).send({ error: 'Failed to send daily digests' });
    }
  });

  // Process pending scheduled notifications
  fastify.post('/cron/process-pending', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const now = new Date();

      // Find pending notifications that are due
      const pending = await prisma.notification.findMany({
        where: {
          sentAt: null,
          scheduledFor: {
            lte: now,
          },
        },
        include: {
          user: true,
        },
      });

      // Mark as sent (email sending would be handled by the scheduler for these types)
      for (const notification of pending) {
        await prisma.notification.update({
          where: { id: notification.id },
          data: { sentAt: new Date() },
        });
      }

      return reply.send({
        processed: pending.length,
        message: `Processed ${pending.length} pending notifications`,
      });
    } catch (error) {
      console.error('Error processing pending notifications:', error);
      return reply.code(500).send({ error: 'Failed to process pending notifications' });
    }
  });
}
