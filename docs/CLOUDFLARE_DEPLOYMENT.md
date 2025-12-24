# ARIA ERP - Cloudflare Deployment Guide

This guide covers deploying ARIA ERP to Cloudflare (Phase 1: Frontend + Auth API).

## Architecture Overview

- **Frontend**: Cloudflare Pages (React/Vite static site)
- **API**: Cloudflare Workers (TypeScript/Hono)
- **Database**: Cloudflare D1 (SQLite)

## Prerequisites

1. Cloudflare account with Workers and Pages enabled
2. Wrangler CLI installed: `npm install -g wrangler`
3. Node.js 18+ installed

## Step 1: Authenticate with Cloudflare

```bash
wrangler login
```

## Step 2: Create D1 Database

```bash
cd workers-api

# Create the database
wrangler d1 create aria-erp-db

# Note the database_id from the output and update wrangler.toml
```

Update `workers-api/wrangler.toml` with the database_id:
```toml
[[d1_databases]]
binding = "DB"
database_name = "aria-erp-db"
database_id = "YOUR_DATABASE_ID_HERE"
```

## Step 3: Run Database Migrations

```bash
# Run migrations on the remote database
wrangler d1 execute aria-erp-db --file=./migrations/001_auth_tables.sql
```

## Step 4: Set JWT Secret

```bash
# Generate a secure secret
openssl rand -base64 64

# Set it as a secret in Workers
wrangler secret put JWT_SECRET
# Paste the generated secret when prompted
```

## Step 5: Deploy Workers API

```bash
cd workers-api
npm install
wrangler deploy
```

The API will be available at: `https://aria-api.<your-subdomain>.workers.dev`

## Step 6: Create Cloudflare Pages Project

1. Go to Cloudflare Dashboard > Pages
2. Click "Create a project" > "Connect to Git"
3. Select the repository: `Reshigan/Aria---Document-Management-Employee`
4. Configure build settings:
   - **Build command**: `cd frontend && npm install && npm run build`
   - **Build output directory**: `frontend/dist`
   - **Root directory**: `/`

## Step 7: Set Environment Variables for Pages

In Cloudflare Pages dashboard > Settings > Environment Variables:

| Variable | Production Value |
|----------|-----------------|
| `VITE_API_URL` | `https://aria-api.<your-subdomain>.workers.dev` |
| `VITE_APP_NAME` | `Aria ERP` |
| `VITE_APP_VERSION` | `2.0.0` |

## Step 8: Configure Custom Domain (Optional)

### For the API (Workers):
1. Go to Workers & Pages > aria-api > Settings > Triggers
2. Add custom domain: `api.aria.vantax.co.za`

### For the Frontend (Pages):
1. Go to Workers & Pages > aria-erp > Custom domains
2. Add custom domain: `aria.vantax.co.za`

## Step 9: Create Demo User

After deployment, create a demo user via the API:

```bash
curl -X POST https://aria-api.<your-subdomain>.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@vantax.co.za",
    "password": "Demo@2025",
    "full_name": "Demo User"
  }'
```

## Testing the Deployment

### Health Check
```bash
curl https://aria-api.<your-subdomain>.workers.dev/health
```

### Login Test
```bash
curl -X POST https://aria-api.<your-subdomain>.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@vantax.co.za",
    "password": "Demo@2025"
  }'
```

## Phase 1 Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api` | GET | API info |
| `/api/auth/login` | POST | User login |
| `/api/auth/logout` | POST | User logout |
| `/api/auth/me` | GET | Get current user |
| `/api/auth/refresh` | POST | Refresh access token |
| `/api/auth/register` | POST | Register new user |

## Troubleshooting

### Database Connection Issues
```bash
# Check database status
wrangler d1 info aria-erp-db

# Run migrations locally first
wrangler d1 execute aria-erp-db --local --file=./migrations/001_auth_tables.sql
```

### CORS Issues
Ensure the frontend domain is listed in the CORS configuration in `workers-api/src/index.ts`.

### JWT Secret Issues
```bash
# Verify secret is set
wrangler secret list
```

## Next Steps (Phase 2+)

- Add CRUD endpoints for customers, suppliers, products
- Add O2C workflow endpoints (quotes, sales orders)
- Add P2P workflow endpoints (purchase orders)
- Implement automation bots via Cloudflare Queues
