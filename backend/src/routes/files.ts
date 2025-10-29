import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../index.js';

export async function fileRoutes(fastify: FastifyInstance) {
  // Get file metadata
  fastify.get(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };

        const file = await prisma.file.findUnique({
          where: { id },
          include: {
            uploader: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        });

        if (!file) {
          return reply.code(404).send({ error: 'File not found' });
        }

        return reply.send(file);
      } catch (error) {
        throw error;
      }
    }
  );

  // Delete file
  fastify.delete(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };

        const file = await prisma.file.findUnique({
          where: { id },
        });

        if (!file) {
          return reply.code(404).send({ error: 'File not found' });
        }

        // TODO: Delete from S3 storage

        await prisma.file.delete({
          where: { id },
        });

        return reply.code(204).send();
      } catch (error) {
        throw error;
      }
    }
  );

  // Generate presigned upload URL
  fastify.post(
    '/sign',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { filename, mime, ownerType, ownerId } = request.body as any;

        // TODO: Generate presigned S3 URL for upload
        // For now, return placeholder
        const presignedUrl = 'https://placeholder-url.com/upload';
        const fileId = 'placeholder-file-id';

        return reply.send({
          uploadUrl: presignedUrl,
          fileId,
        });
      } catch (error) {
        throw error;
      }
    }
  );
}
