# ARIA ERP - Cloudflare Deployment Guide

This guide explains how to deploy the ARIA ERP system to Cloudflare's platform, utilizing Cloudflare Workers for the backend API and Cloudflare Pages for the frontend.

## Architecture Overview

ARIA ERP uses the following Cloudflare services:

- **Cloudflare Workers**: Hosts the backend API with TypeScript/Hono framework
- **Cloudflare D1**: Serverless SQL database for storing ERP data
- **Cloudflare R2**: Object storage for documents and files
- **Cloudflare Pages**: Static site hosting for the React/Vite frontend
- **Cloudflare Workers AI**: AI capabilities for intelligent bot orchestration

## Prerequisites

1. **Cloudflare Account** with:
   - Workers enabled
   - D1 database access
   - Pages enabled
   - Workers AI access (optional)

2. **Wrangler CLI** installed:
   ```bash
   npm install -g wrangler
   ```

3. **Node.js 18+** and **npm**

## Automated Deployment (Recommended)

### Via GitHub Actions

The repository includes GitHub Actions workflows for automated deployment:

1. **Continuous Integration** (`ci.yml`): Runs on every push/PR
2. **Deploy to Production** (`deploy.yml`): Runs on pushes to `main` branch
3. **Complete Deployment** (`deploy-complete.yml`): Manual trigger for full deployment

To deploy manually:
1. Go to GitHub → Actions
2. Select "Complete Cloudflare Deployment"
3. Click "Run workflow"
4. Choose environment and options
5. Click "Run workflow"

### Via Command Line

Run the complete deployment script:

```bash
./complete-cloudflare-deploy.sh
```

## Manual Deployment Steps

### 1. Backend API (Workers)

```bash
cd workers-api

# Install dependencies
npm install

# Build TypeScript code
npm run build

# Deploy to Cloudflare Workers
npx wrangler deploy
```

### 2. Database Setup (D1)

First, create the database (if not exists):

```bash
npx wrangler d1 create aria-erp-db
```

Then apply migrations:

```bash
# Apply all migrations in order
for file in migrations/*.sql; do
  echo "Running: $file"
  npx wrangler d1 execute aria-erp-db --remote --file="$file" --yes
done
```

### 3. Frontend (Pages)

```bash
cd frontend-v2

# Install dependencies
npm install

# Build the application
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy dist --project-name=aria-erp --branch=main
```

## Configuration

### Environment Variables

Backend environment variables are set in `workers-api/wrangler.toml`:

```toml
[vars]
ENVIRONMENT = "production"
APP_NAME = "ARIA ERP"
```

Frontend environment variables are set in `wrangler.pages.toml`:

```toml
[env.production]
VITE_API_URL = "https://aria-api.reshigan-085.workers.dev"
VITE_APP_NAME = "Aria ERP"
VITE_APP_VERSION = "2.0.0"
```

### Secrets Management

Secrets should be set via Wrangler:

```bash
# Set a secret
npx wrangler secret put SECRET_NAME

# List secrets
npx wrangler secret list
```

## Monitoring and Maintenance

### View Logs

```bash
# Tail logs in real-time
wrangler tail aria-api

# View recent logs
wrangler tail aria-api --format pretty
```

### Database Management

```bash
# List databases
npx wrangler d1 list

# Execute SQL queries
npx wrangler d1 execute aria-erp-db --remote --command="SELECT * FROM users LIMIT 5;"

# Backup database
npx wrangler d1 backup create aria-erp-db
```

### Rollback Previous Deployment

```bash
# List deployments
wrangler versions list

# Rollback to specific version
wrangler versions deploy --version-id=<VERSION_ID>
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**: Ensure `CLOUDFLARE_API_TOKEN` has proper permissions
2. **Database Connection**: Verify D1 database bindings in `wrangler.toml`
3. **Migration Failures**: Check migration SQL syntax and database constraints
4. **Build Errors**: Ensure Node.js and npm versions meet requirements

### Debugging Steps

```bash
# Login to Cloudflare
wrangler login

# Check current user
wrangler whoami

# Validate configuration
wrangler deploy --dry-run

# Check for configuration issues
wrangler deployments list
```

## Custom Domains

To use custom domains:

1. Add domain to Cloudflare dashboard
2. Update `wrangler.toml` with route configuration:
   ```toml
   routes = [
     { pattern = "api.yourdomain.com/*", zone_name = "yourdomain.com" }
   ]
   ```
3. Update frontend environment variables to use custom API URL

## Scaling Considerations

- **Workers**: Automatically scales with demand
- **D1**: Serverless database with automatic scaling
- **R2**: Unlimited storage with pay-per-use pricing
- **Pages**: Global CDN with automatic caching

## Cost Management

Monitor usage in Cloudflare dashboard:
- Workers invocations
- D1 database operations
- R2 storage and bandwidth
- Pages build minutes and bandwidth

## Security Best Practices

1. **Use Secrets**: Store sensitive data as secrets, not in source code
2. **Validate Inputs**: Sanitize all API inputs
3. **Rate Limiting**: Implement rate limiting in Workers
4. **Audit Logs**: Maintain audit trails for critical operations
5. **Regular Updates**: Keep dependencies updated

## Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)

---
*Last Updated: April 2025*