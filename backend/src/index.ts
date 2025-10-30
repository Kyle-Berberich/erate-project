import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { PrismaClient } from '@prisma/client';

// Import routes
import { authRoutes } from './routes/auth.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { applicationRoutes } from './routes/applications.js';
import { vendorRoutes } from './routes/vendors.js';
import { complianceRoutes } from './routes/compliance.js';
import { reportRoutes } from './routes/reports.js';
import { projectRoutes } from './routes/projects.js';
import { fileRoutes } from './routes/files.js';
import { notificationRoutes } from './routes/notifications.js';

// Import services
import { initializeScheduler } from './services/scheduler.js';

// Environment variables
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Initialize Prisma Client
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Initialize Fastify
const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'development' ? 'info' : 'warn',
  },
  trustProxy: true,
});

// Type augmentation for Fastify
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      role: string;
    };
  }
}

// Register plugins
async function registerPlugins() {
  // Security headers
  await fastify.register(helmet, {
    contentSecurityPolicy: false, // Adjust for your needs
  });

  // CORS
  await fastify.register(cors, {
    origin: CORS_ORIGIN,
    credentials: true,
  });

  // JWT
  await fastify.register(jwt, {
    secret: JWT_SECRET,
  });

  // Rate limiting
  await fastify.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    timeWindow: process.env.RATE_LIMIT_TIMEWINDOW || '15m',
  });

  // Multipart (file uploads)
  await fastify.register(multipart, {
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB default
    },
  });
}

// Authentication decorator
fastify.decorate('authenticate', async function (request: any, reply: any) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
});

// Register routes
async function registerRoutes() {
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(dashboardRoutes, { prefix: '/api/dashboard' });
  await fastify.register(applicationRoutes, { prefix: '/api/applications' });
  await fastify.register(vendorRoutes, { prefix: '/api/vendors' });
  await fastify.register(complianceRoutes, { prefix: '/api/compliance' });
  await fastify.register(reportRoutes, { prefix: '/api/reports' });
  await fastify.register(projectRoutes, { prefix: '/api/projects' });
  await fastify.register(fileRoutes, { prefix: '/api/files' });
  await fastify.register(notificationRoutes, { prefix: '/api/notifications' });
}

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  reply.code(statusCode).send({
    error: message,
    statusCode,
  });
});

// Graceful shutdown
async function gracefulShutdown() {
  fastify.log.info('Shutting down gracefully...');
  await prisma.$disconnect();
  await fastify.close();
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
async function start() {
  try {
    await registerPlugins();
    await registerRoutes();

    await fastify.listen({ port: PORT, host: HOST });
    fastify.log.info(`Server listening on http://${HOST}:${PORT}`);

    // Initialize scheduled tasks
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_SCHEDULER === 'true') {
      initializeScheduler();
      fastify.log.info('Scheduler initialized');
    } else {
      fastify.log.info('Scheduler disabled (set ENABLE_SCHEDULER=true to enable in development)');
    }
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
