# E-Rate Management System - Setup Guide

## Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** 14+
- **Git**

## Quick Start

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd erate-project

# Install all dependencies (root, backend, frontend)
npm install
```

### 2. Database Setup

Create a PostgreSQL database:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE erate_db;
\q
```

### 3. Environment Configuration

Create environment files for backend:

**backend/.env**
```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/erate_db"

# JWT Secret (generate a random string)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Server
PORT=3000
NODE_ENV=development

# File Storage (Cloudflare R2 or S3-compatible)
S3_ENDPOINT="https://your-account-id.r2.cloudflarestorage.com"
S3_ACCESS_KEY_ID="your-access-key"
S3_SECRET_ACCESS_KEY="your-secret-key"
S3_BUCKET="erate-files"
S3_REGION="auto"

# Email (Postmark)
POSTMARK_API_KEY="your-postmark-api-key"
FROM_EMAIL="noreply@yourdomain.com"

# Optional: Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000
```

### 4. Run Database Migrations

```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

### 5. Seed the Database (Optional but Recommended)

This creates sample users, vendors, applications, and more:

```bash
npm run seed
```

**Default Users Created:**
- Admin: `admin@erate.local` / `admin123`
- Manager: `manager@erate.local` / `manager123`
- Contributor: `contributor@erate.local` / `contributor123`
- Viewer: `viewer@erate.local` / `viewer123`

### 6. Start the Application

From the root directory:

```bash
# Start both backend and frontend concurrently
npm run dev
```

Or start them separately:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

**Access the application:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Health Check: http://localhost:3000/health

## Development Workflow

### Database Changes

When modifying the Prisma schema:

```bash
cd backend

# Create and apply migration
npx prisma migrate dev --name description-of-changes

# Regenerate Prisma Client
npx prisma generate

# View database in Prisma Studio
npx prisma studio
```

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Code Linting

```bash
# Backend
cd backend
npm run lint

# Frontend
cd frontend
npm run lint
```

## Production Build

### Build Locally

```bash
# Build backend
cd backend
npm run build

# Build frontend
cd frontend
npm run build
```

### Using Docker

```bash
# Build image
docker build -t erate-management .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e JWT_SECRET="your-secret" \
  -e NODE_ENV="production" \
  erate-management
```

## Deployment Options

### Option 1: Railway

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login and initialize:
```bash
railway login
railway init
```

3. Add PostgreSQL:
```bash
railway add --plugin postgresql
```

4. Set environment variables:
```bash
railway variables set JWT_SECRET="your-secret"
railway variables set S3_ENDPOINT="your-endpoint"
# ... add all other env vars
```

5. Deploy:
```bash
railway up
```

### Option 2: Fly.io

1. Install Fly CLI:
```bash
curl -L https://fly.io/install.sh | sh
```

2. Login and launch:
```bash
fly auth login
fly launch
```

3. Create PostgreSQL:
```bash
fly postgres create
fly postgres attach <postgres-app-name>
```

4. Set secrets:
```bash
fly secrets set JWT_SECRET="your-secret"
fly secrets set S3_ENDPOINT="your-endpoint"
# ... add all other secrets
```

5. Deploy:
```bash
fly deploy
```

### Option 3: VPS (DigitalOcean, Linode, etc.)

1. Install Node.js, PostgreSQL, and Nginx on your VPS

2. Clone and build the application

3. Use PM2 for process management:
```bash
npm install -g pm2

# Start backend
cd backend
pm2 start dist/index.js --name erate-backend

# Serve frontend with nginx
# Configure nginx to serve frontend/dist and proxy /api to backend
```

4. Configure nginx reverse proxy:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Serve frontend
    location / {
        root /path/to/erate-project/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Database Backup

### Automated Backups

```bash
# Create backup script (backup.sh)
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > backups/erate_backup_$DATE.sql
```

### Restore from Backup

```bash
psql $DATABASE_URL < backups/erate_backup_YYYYMMDD_HHMMSS.sql
```

## Monitoring

### Health Check Endpoints

- `GET /health` - Basic health check
- `GET /api/dashboard/summary` - Verify database connectivity

### Logging

Backend uses Fastify's built-in logger:
- Development: Info level with pretty printing
- Production: Warn level with JSON output

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)
```

### Database Connection Issues

1. Verify PostgreSQL is running
2. Check DATABASE_URL in backend/.env
3. Ensure database exists: `psql -l`
4. Test connection: `psql $DATABASE_URL`

### Migration Errors

```bash
# Reset database (WARNING: destroys all data)
cd backend
npx prisma migrate reset

# Or manually drop and recreate
psql -U postgres
DROP DATABASE erate_db;
CREATE DATABASE erate_db;
\q

# Then run migrations again
npx prisma migrate dev
```

### Frontend Build Errors

```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install

# If peer dependency issues
npm install --legacy-peer-deps
```

## Security Checklist

Before deploying to production:

- [ ] Change JWT_SECRET to a strong random value
- [ ] Use strong database passwords
- [ ] Enable SSL/TLS for database connections
- [ ] Configure CORS properly (whitelist your domain)
- [ ] Set up rate limiting appropriately
- [ ] Enable Helmet.js security headers
- [ ] Use environment variables for all secrets
- [ ] Enable database backups
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerting
- [ ] Review and test RBAC permissions
- [ ] Enable 2FA for admin accounts

## Cost Optimization

Target: **< $25/month**

### Recommended Stack:
- **Database**: Neon (Free tier) or Railway Postgres ($5/mo)
- **Hosting**: Fly.io (1 VM: 1 CPU, 512MB = $3-5/mo)
- **Storage**: Cloudflare R2 (Free tier up to 10GB)
- **Email**: Postmark (Free tier: 100 emails/mo)
- **Total**: ~$8-10/month

### Scaling Considerations:
- Use connection pooling for database
- Enable caching (5-minute TTL implemented)
- Optimize images and assets
- Consider CDN for static assets (Cloudflare free tier)

## Support

For issues or questions:
1. Check this setup guide
2. Review API documentation (coming soon)
3. Check database schema: `backend/prisma/schema.prisma`
4. Review logs for error messages

## Next Steps

After setup:
1. Login with seeded admin account
2. Change default passwords
3. Create your organization's users
4. Configure compliance document types
5. Start tracking E-Rate applications!
