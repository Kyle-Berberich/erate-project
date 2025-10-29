import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import { z } from 'zod';
import { prisma } from '../index.js';
import { createAuditLog } from '../utils/audit.js';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'MANAGER', 'CONTRIBUTOR', 'VIEWER']).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  totpToken: z.string().optional(),
});

const enable2FASchema = z.object({
  userId: z.string(),
});

const verify2FASchema = z.object({
  userId: z.string(),
  token: z.string(),
});

export async function authRoutes(fastify: FastifyInstance) {
  // Register new user
  fastify.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = registerSchema.parse(request.body);

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (existingUser) {
        return reply.code(409).send({ error: 'User already exists' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(body.password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: body.email,
          passwordHash,
          role: body.role || 'VIEWER',
        },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      // Create audit log
      await createAuditLog({
        userId: user.id,
        entity: 'User',
        entityId: user.id,
        action: 'CREATE',
        after: user,
      });

      return reply.code(201).send({
        message: 'User registered successfully',
        user,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      throw error;
    }
  });

  // Login
  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = loginSchema.parse(request.body);

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      // Verify password
      const validPassword = await bcrypt.compare(body.password, user.passwordHash);
      if (!validPassword) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      // Check 2FA if enabled
      if (user.mfaSecret) {
        if (!body.totpToken) {
          return reply.send({
            requiresMfa: true,
            userId: user.id,
          });
        }

        const valid = authenticator.verify({
          token: body.totpToken,
          secret: user.mfaSecret,
        });

        if (!valid) {
          return reply.code(401).send({ error: 'Invalid 2FA token' });
        }
      }

      // Generate JWT
      const token = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      // Create audit log
      await createAuditLog({
        userId: user.id,
        entity: 'User',
        entityId: user.id,
        action: 'LOGIN',
      });

      return reply.send({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      throw error;
    }
  });

  // Enable 2FA
  fastify.post(
    '/2fa/enable',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }

        // Generate secret
        const secret = authenticator.generateSecret();

        // Update user
        await prisma.user.update({
          where: { id: userId },
          data: { mfaSecret: secret },
        });

        // Generate QR code URI
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });

        const otpauth = authenticator.keyuri(user!.email, 'E-Rate Management', secret);

        return reply.send({
          secret,
          otpauth,
        });
      } catch (error) {
        throw error;
      }
    }
  );

  // Verify 2FA
  fastify.post(
    '/2fa/verify',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = verify2FASchema.parse(request.body);
        const userId = request.user?.id;

        if (!userId || userId !== body.userId) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }

        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user?.mfaSecret) {
          return reply.code(400).send({ error: '2FA not enabled' });
        }

        const valid = authenticator.verify({
          token: body.token,
          secret: user.mfaSecret,
        });

        return reply.send({ valid });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: error.errors });
        }
        throw error;
      }
    }
  );

  // Disable 2FA
  fastify.post(
    '/2fa/disable',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }

        await prisma.user.update({
          where: { id: userId },
          data: { mfaSecret: null },
        });

        return reply.send({ message: '2FA disabled successfully' });
      } catch (error) {
        throw error;
      }
    }
  );

  // Get current user
  fastify.get(
    '/me',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }

        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        return reply.send(user);
      } catch (error) {
        throw error;
      }
    }
  );
}
