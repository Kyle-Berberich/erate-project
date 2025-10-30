import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../index.js';
import {
  uploadFile,
  getFileUrl,
  deleteFile,
  getUploadUrl,
  validateFileType,
  validateFileSize,
  FILE_TYPES,
  FILE_SIZE_LIMITS,
} from '../services/storage.js';
import { logAudit } from '../utils/audit.js';

export async function fileRoutes(fastify: FastifyInstance) {
  // Upload file
  fastify.post(
    '/upload',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const data = await request.file();

        if (!data) {
          return reply.code(400).send({ error: 'No file provided' });
        }

        const buffer = await data.toBuffer();
        const { filename, mimetype } = data;

        // Get additional fields
        const fields = data.fields as any;
        const ownerType = fields.ownerType?.value || 'general';
        const ownerId = fields.ownerId?.value;
        const category = fields.category?.value || 'documents';

        // Validate file type
        const allowedTypes = [...FILE_TYPES.DOCUMENTS, ...FILE_TYPES.IMAGES, ...FILE_TYPES.ARCHIVES];
        if (!validateFileType(mimetype, allowedTypes)) {
          return reply.code(400).send({ error: 'File type not allowed' });
        }

        // Validate file size
        const maxSize = category === 'images' ? FILE_SIZE_LIMITS.IMAGE : FILE_SIZE_LIMITS.DOCUMENT;
        if (!validateFileSize(buffer.length, maxSize)) {
          return reply.code(400).send({ error: `File size exceeds ${maxSize / 1024 / 1024}MB limit` });
        }

        // Upload to storage
        const uploaded = await uploadFile(buffer, filename, mimetype, user.id, category);

        // Create database record
        const file = await prisma.file.create({
          data: {
            filename,
            filepath: uploaded.key,
            filesize: uploaded.fileSize,
            mime: mimetype,
            ownerType,
            ownerId,
            uploaderId: user.id,
          },
        });

        await logAudit(user.id, 'CREATE', 'File', file.id, null, file);

        return reply.send({
          ...file,
          url: uploaded.url,
        });
      } catch (error) {
        console.error('File upload error:', error);
        return reply.code(500).send({ error: 'Failed to upload file' });
      }
    }
  );
  // Get file metadata and download URL
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

        // Generate presigned URL for download
        const url = await getFileUrl(file.filepath, 3600); // 1 hour expiry

        return reply.send({
          ...file,
          url,
        });
      } catch (error) {
        throw error;
      }
    }
  );

  // Download file directly
  fastify.get(
    '/:id/download',
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

        // Get presigned URL and redirect
        const url = await getFileUrl(file.filepath, 300); // 5 minutes for direct download

        return reply.redirect(302, url);
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
        const user = (request as any).user;
        const { id } = request.params as { id: string };

        const file = await prisma.file.findUnique({
          where: { id },
        });

        if (!file) {
          return reply.code(404).send({ error: 'File not found' });
        }

        // Delete from S3 storage
        try {
          await deleteFile(file.filepath);
        } catch (error) {
          console.error('Error deleting from storage:', error);
          // Continue with database deletion even if storage deletion fails
        }

        await logAudit(user.id, 'DELETE', 'File', file.id, file, null);

        await prisma.file.delete({
          where: { id },
        });

        return reply.code(204).send();
      } catch (error) {
        throw error;
      }
    }
  );

  // Generate presigned upload URL (for client-side uploads)
  fastify.post(
    '/sign',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const { filename, mime, ownerType, ownerId, category } = request.body as any;

        if (!filename || !mime) {
          return reply.code(400).send({ error: 'filename and mime are required' });
        }

        // Validate file type
        const allowedTypes = [...FILE_TYPES.DOCUMENTS, ...FILE_TYPES.IMAGES, ...FILE_TYPES.ARCHIVES];
        if (!validateFileType(mime, allowedTypes)) {
          return reply.code(400).send({ error: 'File type not allowed' });
        }

        // Generate presigned upload URL
        const { uploadUrl, key } = await getUploadUrl(filename, mime, user.id, category || 'documents');

        // Create database record in pending state
        const file = await prisma.file.create({
          data: {
            filename,
            filepath: key,
            filesize: 0, // Will be updated after upload
            mime,
            ownerType: ownerType || 'general',
            ownerId,
            uploaderId: user.id,
          },
        });

        return reply.send({
          uploadUrl,
          fileId: file.id,
          key,
        });
      } catch (error) {
        console.error('Error generating upload URL:', error);
        return reply.code(500).send({ error: 'Failed to generate upload URL' });
      }
    }
  );

  // List files by owner
  fastify.get(
    '/list/:ownerType/:ownerId',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { ownerType, ownerId } = request.params as { ownerType: string; ownerId: string };

        const files = await prisma.file.findMany({
          where: {
            ownerType,
            ownerId,
          },
          include: {
            uploader: {
              select: {
                id: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        // Generate presigned URLs for all files
        const filesWithUrls = await Promise.all(
          files.map(async (file) => ({
            ...file,
            url: await getFileUrl(file.filepath, 3600),
          }))
        );

        return reply.send(filesWithUrls);
      } catch (error) {
        throw error;
      }
    }
  );
}
