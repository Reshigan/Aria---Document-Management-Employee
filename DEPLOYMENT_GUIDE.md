# ARIA ERP - Deployment Guide

## 🚀 Production Deployment

### Prerequisites
- Docker & Docker Compose installed
- Domain name configured (optional)
- SSL certificates (optional, for HTTPS)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd aria-erp
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your production values
   nano .env
   ```

3. **Generate secret keys**
   ```bash
   python3 -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(32))"
   python3 -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_urlsafe(32))"
   ```

4. **Build and start services**
   ```bash
   docker-compose up -d --build
   ```

5. **Initialize database**
   ```bash
   docker-compose exec backend python init_db.py
   ```

6. **Verify deployment**
   ```bash
   curl http://localhost:8000/health
   ```

### Service URLs

- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Frontend**: http://localhost:5173 (dev) or http://localhost:3000 (production)

### Default Admin Credentials

```
Email: admin@aria-erp.com
Password: AdminPass123!
```

⚠️ **IMPORTANT**: Change these credentials immediately after first login!

## 📊 System Status

### Verified Components

✅ **Authentication System**
- JWT token generation and validation
- User registration and login
- Password hashing (bcrypt)
- Role-based access control

✅ **Bot System** (61 bots available)
- 10 categories
- 61 fully functional bots
- Bot execution framework
- Status monitoring

### Bot Categories

1. **Accounting** (3 bots)
   - Financial Close Bot
   - Financial Reporting Bot
   - General Ledger Bot

2. **Banking & Treasury** (2 bots)
   - Bank Reconciliation Bot
   - Payment Processing Bot

3. **Sales & CRM** (6 bots)
   - Lead Management Bot
   - Opportunity Tracking Bot
   - Customer Support Bot
   - Quote Generation Bot
   - Order Processing Bot
   - Sales Analytics Bot

4. **General Operations** (25 bots)
   - Various operational bots

5. **Supply Chain** (6 bots)
   - Inventory management
   - Procurement
   - Logistics

6. **Document Management** (6 bots)
   - Document processing
   - Archive management
   - Data extraction

7. **Manufacturing** (3 bots)
   - Production planning
   - Quality control
   - Equipment maintenance

8. **Human Resources** (3 bots)
   - Employee onboarding
   - Time tracking
   - Performance management

9. **Compliance & Regulatory** (3 bots)
   - Audit management
   - Tax compliance
   - BBBEE compliance

10. **Financial Operations** (4 bots)
    - Various financial operations

## 🧪 Testing

### Run automated tests
```bash
python3 test_erp.py
```

Expected output:
```
✅ All tests passed!
The ERP system is ready for deployment!
```

### Manual testing

1. **Test authentication**
   ```bash
   curl -X POST "http://localhost:8000/api/v1/auth/login" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "username=admin@aria-erp.com&password=AdminPass123!"
   ```

2. **Test bot listing**
   ```bash
   TOKEN="<your-token>"
   curl "http://localhost:8000/api/v1/bots/" \
     -H "Authorization: Bearer $TOKEN"
   ```

3. **Test bot execution**
   ```bash
   curl -X POST "http://localhost:8000/api/v1/bots/financial_close_bot/execute" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"action": "test"}'
   ```

## 🔧 Maintenance

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Database backup
```bash
# SQLite
cp backend/aria_erp.db backend/aria_erp.db.backup

# PostgreSQL
docker-compose exec postgres pg_dump -U aria_user aria_erp > backup.sql
```

### Update application
```bash
git pull
docker-compose down
docker-compose up -d --build
```

### Stop services
```bash
docker-compose down
```

### Clean restart
```bash
docker-compose down -v  # Removes volumes
docker-compose up -d --build
```

## 🌐 Production Considerations

### Security

1. **Change default credentials**
2. **Use strong secret keys**
3. **Enable HTTPS with SSL certificates**
4. **Configure firewall rules**
5. **Regular security updates**

### Database

For production, use PostgreSQL instead of SQLite:

```yaml
# docker-compose.yml
environment:
  - DATABASE_URL=postgresql://user:password@postgres:5432/aria_erp
```

### Scaling

- Use a reverse proxy (nginx) for load balancing
- Separate frontend and backend servers
- Use Redis for caching and session storage
- Consider Kubernetes for container orchestration

### Monitoring

- Set up application monitoring (Prometheus, Grafana)
- Configure error tracking (Sentry)
- Set up uptime monitoring
- Enable audit logging

## 📝 Architecture

### Backend (FastAPI)
- RESTful API with JWT authentication
- 61 specialized bots for various ERP functions
- SQLAlchemy ORM with support for SQLite/PostgreSQL
- Async processing with background tasks

### Frontend (React + TypeScript)
- Modern responsive UI with Tailwind CSS
- Real-time updates
- Role-based dashboard
- Mobile-friendly design

### Database Schema
- User and company management
- Financial records (invoices, payments, ledger)
- Inventory and products
- Document management
- Comprehensive audit trails

## 🆘 Troubleshooting

### Backend won't start
```bash
# Check logs
docker-compose logs backend

# Common issues:
# - Database connection failed: Check DATABASE_URL
# - Port already in use: Change port in docker-compose.yml
# - Missing dependencies: Rebuild with --build flag
```

### Database errors
```bash
# Reset database (⚠️ DESTROYS ALL DATA)
docker-compose down -v
docker-compose up -d
docker-compose exec backend python init_db.py
```

### Frontend can't connect to backend
```bash
# Check VITE_API_URL in .env
# Ensure backend is running: curl http://localhost:8000/health
# Check CORS settings in backend
```

## 📞 Support

For issues or questions:
1. Check logs: `docker-compose logs`
2. Verify health: `curl http://localhost:8000/health`
3. Run tests: `python3 test_erp.py`

## ✅ Deployment Checklist

- [ ] Environment variables configured
- [ ] Secret keys generated
- [ ] Database initialized
- [ ] Admin password changed
- [ ] HTTPS/SSL configured (production)
- [ ] Backup strategy in place
- [ ] Monitoring configured
- [ ] Firewall rules set
- [ ] All tests passing
- [ ] Documentation reviewed

## 🎉 Success Criteria

Your ARIA ERP is successfully deployed when:

✅ Health check returns 200 OK
✅ Login works with admin credentials
✅ All 61 bots are listed
✅ Bot execution returns valid responses
✅ Frontend loads without errors
✅ API documentation accessible at /docs

---

**Version**: 1.0.0  
**Last Updated**: 2025-10-27  
**Status**: ✅ Production Ready
