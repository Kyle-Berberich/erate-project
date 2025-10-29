# E-Rate Management System

A cloud-based, single-tenant web application for managing E-Rate applications, vendors, compliance, projects, and reports.

## Features

- **Dashboard**: Real-time KPIs, charts, and insights
- **Applications**: Track FRNs, funding requests, and lifecycle
- **Vendors**: Manage vendor relationships and performance
- **Compliance**: Document tracking with automated retention
- **Reports**: Generate PDF reports (Monthly, Status, Performance, Compliance)
- **Projects**: Timeline and checklist management
- **End-of-FY Binder**: One-click export of all documents
- **Notifications**: Email reminders for deadlines and milestones
- **Security**: Role-based access, 2FA support, audit logging

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for fast builds
- Tailwind CSS for styling
- shadcn/ui for components
- Chart.js for visualizations
- React Router for navigation
- React Query for data fetching

### Backend
- Node.js with TypeScript
- Fastify web framework
- Prisma ORM with PostgreSQL
- JWT authentication with bcrypt
- TOTP 2FA support
- S3-compatible file storage (Cloudflare R2)
- PDFKit for report generation
- Postmark/SendGrid for emails

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (or managed service like Supabase/Railway)
- S3-compatible storage (Cloudflare R2, AWS S3, etc.)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd erate-project
```

2. Install dependencies:
```bash
npm install
```

3. Set up backend environment:
```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
```

4. Run database migrations:
```bash
cd backend
npm run migrate
```

5. Seed the database (optional):
```bash
cd backend
npm run seed
```

### Development

Run both frontend and backend concurrently:
```bash
npm run dev
```

Or run them separately:
```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

The frontend will be available at http://localhost:5173 and the backend API at http://localhost:3000.

### Production Build

Build both applications:
```bash
npm run build
```

Start the backend:
```bash
cd backend
npm start
```

Serve the frontend static files using any static file server (nginx, Caddy, etc.).

## Project Structure

```
erate-project/
├── frontend/           # React frontend application
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Page components
│   │   ├── lib/        # Utilities and helpers
│   │   └── App.tsx     # Main app component
│   └── package.json
│
├── backend/            # Node.js backend API
│   ├── src/
│   │   ├── routes/     # API route handlers
│   │   ├── services/   # Business logic
│   │   ├── utils/      # Utilities
│   │   └── index.ts    # Server entry point
│   ├── prisma/
│   │   └── schema.prisma # Database schema
│   └── package.json
│
└── package.json        # Root workspace config
```

## API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/2fa/enable` - Enable 2FA
- `GET /api/auth/me` - Get current user

### Applications
- `GET /api/applications` - List all applications
- `POST /api/applications` - Create application
- `GET /api/applications/:id` - Get application details
- `PATCH /api/applications/:id` - Update application
- `DELETE /api/applications/:id` - Delete application

### Vendors
- `GET /api/vendors` - List all vendors
- `POST /api/vendors` - Create vendor
- `GET /api/vendors/:id` - Get vendor details
- `PATCH /api/vendors/:id` - Update vendor

### Compliance
- `GET /api/compliance` - List compliance documents
- `POST /api/compliance` - Create compliance document
- `PATCH /api/compliance/:id` - Update compliance document

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create project
- `POST /api/projects/:id/milestones` - Add milestone
- `POST /api/projects/:id/checklist` - Add checklist item

### Dashboard
- `GET /api/dashboard/summary` - Get dashboard KPIs
- `GET /api/dashboard/funding-timeline` - Get timeline data

## Deployment

### Recommended Platforms
- **Railway** - Full-stack deployment with Postgres
- **Fly.io** - Low-cost containers
- **Render** - Easy deployment with free tier

### Environment Variables

See `backend/.env.example` for all required environment variables.

## Security

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens for authentication
- Optional TOTP 2FA
- Role-based access control (Admin, Manager, Contributor, Viewer)
- Audit logging for key operations
- Rate limiting on API endpoints
- CSRF protection
- Helmet.js security headers

## Cost Target

Sub-$25/month at small scale:
- Database: Supabase free tier or Railway ($5/month)
- Backend hosting: Fly.io or Railway ($5-10/month)
- Frontend hosting: Cloudflare Pages (free) or Vercel (free)
- File storage: Cloudflare R2 ($0-5/month)
- Email: Postmark free tier (100 emails/month)

## License

MIT

## Support

For issues or questions, please file an issue on GitHub.
