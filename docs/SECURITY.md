# ARIA ERP Security Documentation

This document outlines the security measures implemented in ARIA ERP and provides guidance for secure deployment and operation.

## Security Architecture Overview

ARIA implements a defense-in-depth security model with multiple layers of protection including authentication, authorization, tenant isolation, rate limiting, and security headers.

## Authentication

ARIA uses JWT (JSON Web Tokens) for authentication with the following configuration:

**Token Configuration:**
- Access tokens expire after 30 minutes (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`)
- Refresh tokens expire after 7 days (configurable via `REFRESH_TOKEN_EXPIRE_DAYS`)
- Tokens are signed using HS256 algorithm by default (configurable via `JWT_ALGORITHM`)

**Required Environment Variables:**
```bash
# REQUIRED - Application will fail to start without this
JWT_SECRET_KEY="your-secure-random-key-here"

# Optional - defaults shown
JWT_ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

**Generating a Secure JWT Secret:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

## Multi-Tenancy and Data Isolation

ARIA is a multi-tenant system where each company's data is isolated using `company_id` filtering.

**Tenant Isolation Rules:**
- All database queries MUST include `company_id` filter
- `company_id` is extracted from the authenticated user's JWT token
- Endpoints NEVER accept `company_id` as a query parameter override
- Master data creation endpoints require authentication and use the authenticated user's company context

**Security Enforcement:**
- The `get_current_user` dependency extracts and validates company context
- All data access layers filter by `company_id`
- Cross-tenant data access is prevented at the application layer

## Rate Limiting

ARIA implements rate limiting to prevent abuse and ensure fair resource usage.

**Rate Limit Configuration:**
| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Authentication (login, register) | 5 requests | 60 seconds |
| Bot Execution | 20 requests | 60 seconds |
| General API | 100 requests | 60 seconds |

**Exempt Paths:** `/health`, `/`, `/docs`, `/openapi.json`, `/redoc`

**Rate Limit Headers:**
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Window`: Time window for the limit
- `Retry-After`: Seconds to wait before retrying (on 429 response)

**Production Deployment:**
For multi-instance deployments, set `REDIS_URL` environment variable to enable Redis-based rate limiting for consistent limits across instances.

## Security Headers

All responses include the following security headers:

| Header | Value | Purpose |
|--------|-------|---------|
| X-Content-Type-Options | nosniff | Prevent MIME type sniffing |
| X-Frame-Options | SAMEORIGIN | Prevent clickjacking |
| X-XSS-Protection | 1; mode=block | Enable browser XSS filter |
| Referrer-Policy | strict-origin-when-cross-origin | Control referrer information |
| Permissions-Policy | (restrictive) | Disable unnecessary browser features |
| Content-Security-Policy | (restrictive) | Prevent XSS and injection attacks |
| Strict-Transport-Security | max-age=31536000 | Enforce HTTPS (production only) |

## CORS Configuration

Cross-Origin Resource Sharing is configured to allow only specific origins.

**Default Allowed Origins:**
- `https://aria.vantax.co.za`
- `https://www.aria.vantax.co.za`
- `http://localhost:3000` (development)
- `http://localhost:5173` (development)

**Custom Configuration:**
Set the `CORS_ORIGINS` environment variable with comma-separated origins:
```bash
CORS_ORIGINS="https://aria.vantax.co.za,https://custom-domain.com"
```

## Environment Variables Reference

### Required Variables

| Variable | Description |
|----------|-------------|
| `JWT_SECRET_KEY` | Secret key for signing JWT tokens. Must be set - no default. |
| `DATABASE_URL` or `DATABASE_URL_PG` | PostgreSQL connection string |

### Optional Security Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_ALGORITHM` | HS256 | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 30 | Access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | 7 | Refresh token lifetime |
| `CORS_ORIGINS` | (see above) | Comma-separated allowed origins |
| `ENVIRONMENT` | development | Set to "production" for HSTS |
| `REDIS_URL` | (none) | Redis URL for distributed rate limiting |

### Development-Only Variables

| Variable | Description |
|----------|-------------|
| `DEMO_COMPANY_ID` | Demo company ID for fallback auth (dev only) |
| `DEMO_USER_ID` | Demo user ID for fallback auth (dev only) |

## Deployment Security Checklist

Before deploying to production, verify the following:

### Environment Configuration
- [ ] `JWT_SECRET_KEY` is set to a unique, randomly generated value
- [ ] `ENVIRONMENT` is set to "production"
- [ ] `CORS_ORIGINS` includes only your production domains
- [ ] `DEMO_COMPANY_ID` and `DEMO_USER_ID` are NOT set in production
- [ ] Database credentials are stored securely (not in code)

### Infrastructure
- [ ] HTTPS is enforced at the load balancer/proxy level
- [ ] Database connections use SSL
- [ ] Redis (if used) is password-protected and not publicly accessible
- [ ] Firewall rules restrict access to necessary ports only

### Monitoring
- [ ] Application logs are collected and monitored
- [ ] Failed authentication attempts are logged and alerted
- [ ] Rate limit violations are monitored
- [ ] Error tracking (Sentry) is configured

### Access Control
- [ ] Admin accounts use strong passwords
- [ ] Service accounts have minimal required permissions
- [ ] API keys are rotated regularly
- [ ] Unused accounts are disabled

## Incident Response

### Suspected Credential Compromise

If you suspect JWT secrets or credentials have been compromised:

1. **Immediately rotate the JWT_SECRET_KEY** - This invalidates all existing tokens
2. **Review access logs** for unauthorized access
3. **Reset affected user passwords**
4. **Audit recent data changes** for suspicious activity
5. **Update any derived secrets** that may have been exposed

### Rate Limit Bypass Attempts

If you detect rate limit bypass attempts:

1. **Review source IPs** in application logs
2. **Consider IP-based blocking** at the firewall level
3. **Increase monitoring** for the affected endpoints
4. **Consider reducing rate limits** temporarily

## Security Updates

This security implementation was last updated: December 2024

For security concerns or to report vulnerabilities, contact the development team.
