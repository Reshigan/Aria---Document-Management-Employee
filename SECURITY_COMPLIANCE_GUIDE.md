# Security and Compliance Implementation Guide

## Overview

This document describes the comprehensive security and compliance features implemented in the ARIA Document Management System, including module assignment, authentication, authorization, encryption, audit trails, and backup functionality.

---

## 1. Authentication

### Username/Password Authentication

**Implementation:**
- Secure password hashing using bcrypt
- Password complexity requirements enforced
- Account lockout after failed login attempts
- Session management with JWT tokens

**Password Requirements:**
- Minimum 8 characters
- Must contain uppercase and lowercase letters
- Must contain at least one number
- Must contain special characters (recommended)

**API Endpoints:**
```
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout
POST /api/auth/refresh-token
POST /api/auth/change-password
```

### Two-Factor Authentication (2FA)

**Implementation:**
- TOTP (Time-based One-Time Password) using standard authenticator apps
- QR code generation for easy setup
- Backup codes for account recovery
- Optional per-user configuration

**Features:**
- Compatible with Google Authenticator, Authy, Microsoft Authenticator
- 10 backup codes generated per user
- Backup codes are single-use and hashed
- 2FA status tracking and management

**API Endpoints:**
```
POST /api/auth/2fa/enable
POST /api/auth/2fa/verify-setup
POST /api/auth/2fa/verify
POST /api/auth/2fa/disable
GET  /api/auth/2fa/status
```

**Usage Example:**
```python
# Enable 2FA
POST /api/auth/2fa/enable
{
  "password": "current_password"
}

# Response includes QR code and backup codes
{
  "message": "2FA setup initiated",
  "secret": "BASE32_SECRET",
  "qr_code": "data:image/png;base64,...",
  "backup_codes": [
    "1234-5678",
    "2345-6789",
    ...
  ]
}

# Verify setup with token from authenticator app
POST /api/auth/2fa/verify-setup
{
  "token": "123456",
  "secret": "BASE32_SECRET"
}
```

---

## 2. Authorization

### Role-Based Access Control (RBAC)

**Roles Hierarchy:**
1. **Super Admin** - Full system access
2. **Admin** - Tenant administration
3. **Manager** - Department management
4. **User** - Standard access
5. **Viewer** - Read-only access

**Implementation:**
- Role inheritance and permissions
- Fine-grained permission system
- Role assignment and revocation
- Temporary role assignments with expiration

**Database Models:**
- `Role` - Define system roles
- `Permission` - Define granular permissions
- `RolePermission` - Link roles to permissions
- `UserRole` - Assign roles to users

### Module-Based Access Control

**Implementation:**
Admin can assign specific system modules to users with:
- **Access Level**: read_only, standard, advanced, admin
- **Custom Permissions**: Override default module permissions
- **Approval Limits**: Financial or transaction approval limits
- **Expiration Dates**: Time-limited access
- **Usage Tracking**: Monitor module usage per user

**Available Modules:**
- Document Management
- Financial Accounting
- Fixed Assets
- Payroll
- HR Management
- Procurement
- Inventory Management
- Manufacturing
- Quality Control
- Maintenance
- Sales Management
- Analytics & Reporting
- Workflow Management

**Admin API Endpoints:**
```
# Module Management
POST   /api/admin/modules/                    # Create module
GET    /api/admin/modules/                    # List modules
GET    /api/admin/modules/{module_id}         # Get module details
PUT    /api/admin/modules/{module_id}         # Update module
DELETE /api/admin/modules/{module_id}         # Delete module

# Module Assignment
POST   /api/admin/modules/assignments         # Assign module to user
POST   /api/admin/modules/assignments/bulk    # Bulk assign modules
GET    /api/admin/modules/assignments/user/{user_id}  # Get user's modules
GET    /api/admin/modules/assignments/module/{module_id}  # Get module users
PUT    /api/admin/modules/assignments/{id}    # Update assignment
POST   /api/admin/modules/assignments/{id}/deactivate  # Deactivate assignment
DELETE /api/admin/modules/assignments/user/{user_id}/module/{module_id}  # Remove module

# Analytics
GET    /api/admin/modules/analytics/module/{module_id}  # Module usage stats
GET    /api/admin/modules/analytics/overview   # System overview
```

**Usage Example:**
```python
# Assign Financial Accounting module to user
POST /api/admin/modules/assignments
{
  "user_id": 123,
  "module_id": 2,  # Financial Accounting
  "access_level": "advanced",
  "approval_limit": 10000,  # Can approve up to $10,000
  "custom_permissions": ["create", "read", "update"],
  "expires_at": "2026-12-31T23:59:59Z",
  "notes": "Granted for Q1 financial close"
}

# Bulk assign modules to multiple users
POST /api/admin/modules/assignments/bulk
{
  "user_ids": [123, 456, 789],
  "module_ids": [1, 2, 3],  # Documents, Financial, Fixed Assets
  "access_level": "standard",
  "notes": "Finance team access"
}
```

---

## 3. Encryption

### Data at Rest

**Implementation:**
- Symmetric encryption using Fernet (AES-128)
- Field-level encryption for sensitive data
- Master key management
- Key rotation support

**Encrypted Fields:**
- Passwords for third-party integrations
- API keys
- Personal identifiable information (PII)
- Financial data
- Social security numbers
- Bank account information

**Service Usage:**
```python
from backend.services.encryption_service import EncryptionService

# Initialize with master key
encryption = EncryptionService(master_key=os.getenv("MASTER_ENCRYPTION_KEY"))

# Encrypt sensitive field
encrypted_ssn = encryption.encrypt_field(
    field_value="123-45-6789",
    field_key="user_ssn"
)

# Decrypt when needed
decrypted_ssn = encryption.decrypt_field(
    encrypted_value=encrypted_ssn,
    field_key="user_ssn"
)

# Encrypt entire dictionary
encrypted_data = encryption.encrypt_dict({
    "credit_card": "1234-5678-9012-3456",
    "cvv": "123"
})
```

### Data in Transit

**Implementation:**
- TLS/SSL encryption for all API communications
- HTTPS enforced for all endpoints
- Certificate management
- Secure WebSocket connections

**Configuration:**
```python
# SSL/TLS Configuration
SSL_CERT_PATH = "/etc/ssl/certs/aria.crt"
SSL_KEY_PATH = "/etc/ssl/private/aria.key"
SSL_ENABLED = True
MIN_TLS_VERSION = "1.2"
```

---

## 4. Audit Trail

### Immutable Logging

**Implementation:**
- All system actions logged
- Write-once, read-many (WORM) approach
- Cannot be modified or deleted
- Timestamps with timezone awareness

**Logged Actions:**
- User login/logout
- Create, read, update, delete operations
- Document uploads/downloads
- Module access
- Permission changes
- Role assignments
- Security events
- Failed login attempts

**Database Model:**
```python
class AuditLog(BaseModel):
    id: Integer
    user_id: Integer
    session_id: Integer
    action: AuditAction  # LOGIN, LOGOUT, CREATE, READ, UPDATE, DELETE, etc.
    resource_type: String  # document, folder, user, etc.
    resource_id: Integer
    resource_name: String
    description: Text
    ip_address: String
    user_agent: String
    request_data: JSON
    response_data: JSON
    success: Boolean
    error_message: Text
    execution_time_ms: Integer
    created_at: DateTime  # Immutable timestamp
```

**API Endpoints:**
```
GET /api/admin/security/audit-logs
  - Query parameters:
    - user_id: Filter by user
    - action: Filter by action type
    - start_date: Filter by date range
    - end_date: Filter by date range
    - limit: Number of results
```

**Usage Example:**
```python
# Get audit logs for specific user
GET /api/admin/security/audit-logs?user_id=123&limit=100

# Get all delete operations
GET /api/admin/security/audit-logs?action=DELETE&limit=50

# Get logs for date range
GET /api/admin/security/audit-logs?start_date=2026-01-01&end_date=2026-01-31
```

### Security Events

**Tracked Events:**
- Failed login attempts
- Suspicious activities
- Unauthorized access attempts
- Password changes
- Account locked/unlocked
- Two-factor authentication enabled/disabled

**API Endpoints:**
```
GET /api/admin/security/security-events
  - Query parameters:
    - user_id: Filter by user
    - event_type: Filter by event type
    - severity: low, medium, high, critical
    - resolved: true/false
```

---

## 5. Backups

### Automated Daily Backups

**Implementation:**
- PostgreSQL database backups
- Automated daily schedule (2 AM UTC)
- Compression using gzip
- Multi-location storage (local + cloud)
- Retention policies

**Backup Types:**
1. **Full Backup** - Complete database dump
2. **Schema Only** - Database structure without data
3. **Data Only** - Data without schema

**Storage Locations:**
- Local filesystem: `/var/backups/aria/`
- Cloud storage: AWS S3 bucket
- Geographic redundancy

**Retention Policy:**
- Daily backups: 7 days
- Weekly backups: 30 days
- Monthly backups: 365 days
- Automatic cleanup of expired backups

**API Endpoints:**
```
# Backup Operations
POST   /api/admin/backups/create      # Create manual backup
POST   /api/admin/backups/restore     # Restore from backup
GET    /api/admin/backups/list        # List available backups
DELETE /api/admin/backups/{backup_id}  # Delete backup
POST   /api/admin/backups/cleanup     # Clean expired backups
GET    /api/admin/backups/status      # Backup system status
```

**Usage Examples:**
```python
# Create manual backup
POST /api/admin/backups/create
{
  "backup_type": "full",
  "compress": true,
  "upload_to_s3": true,
  "retention_days": 30
}

# Response
{
  "message": "Backup created successfully",
  "backup_info": {
    "backup_id": "aria_db_full_20260312_143000",
    "created_at": "2026-03-12T14:30:00Z",
    "file_size": 523456789,
    "compressed_size": 156789012,
    "s3_location": "s3://aria-backups/backups/aria_db_full_20260312_143000.sql.gz"
  }
}

# List backups
GET /api/admin/backups/list?limit=10

# Restore backup
POST /api/admin/backups/restore
{
  "backup_id": "aria_db_full_20260312_143000",
  "from_s3": true
}
```

### Disaster Recovery

**Recovery Point Objective (RPO):** 24 hours
**Recovery Time Objective (RTO):** 4 hours

**Recovery Procedures:**
1. Identify backup to restore
2. Download from S3 if needed
3. Stop application services
4. Restore database
5. Verify data integrity
6. Restart services
7. Validate system functionality

**Backup Verification:**
- Automated backup integrity checks
- Test restores on staging environment
- Monthly disaster recovery drills

---

## 6. Security Best Practices

### Configuration

**Environment Variables:**
```bash
# Security Settings
SECRET_KEY=<strong-random-key>
MASTER_ENCRYPTION_KEY=<fernet-key>

# Session Settings
SESSION_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION_MINUTES=30

# Password Policy
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SPECIAL=true
PASSWORD_HISTORY_COUNT=5

# 2FA Settings
ENABLE_2FA=true
2FA_ISSUER_NAME=ARIA Document Management

# Backup Settings
BACKUP_DIR=/var/backups/aria
BACKUP_S3_BUCKET=aria-backups
BACKUP_RETENTION_DAYS=30

# Database Encryption
DB_SSL_MODE=require
DB_SSL_CERT=/path/to/cert
```

### Security Checklist

- [ ] Strong master encryption key generated and secured
- [ ] SSL/TLS certificates installed and configured
- [ ] Database encrypted at rest
- [ ] All API endpoints use HTTPS
- [ ] Password policy enforced
- [ ] 2FA enabled for admin accounts
- [ ] Audit logging enabled
- [ ] Daily backups scheduled
- [ ] Backup restoration tested
- [ ] Security events monitored
- [ ] Failed login attempts tracked
- [ ] Account lockout policy configured
- [ ] Session timeout configured
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints

---

## 7. Compliance

### SOC 2 Compliance

**Controls Implemented:**
- Access controls (authentication and authorization)
- Encryption (data at rest and in transit)
- Audit logging (immutable trail)
- Backup and disaster recovery
- Security monitoring

### GDPR Compliance

**Features:**
- Data encryption
- Audit trail of data access
- Right to be forgotten (user deletion)
- Data export capabilities
- Consent management
- Data retention policies

### HIPAA Compliance (If applicable)

**Features:**
- Encryption of PHI
- Access controls
- Audit trails
- Breach notification procedures
- Business associate agreements

---

## 8. Monitoring and Alerts

### Security Monitoring

**Monitored Events:**
- Failed login attempts
- Unauthorized access attempts
- Unusual activity patterns
- Account lockouts
- Permission changes
- Module access violations

**Alert Channels:**
- Email notifications
- Slack integration
- SMS alerts (critical events)
- Dashboard notifications

### Backup Monitoring

**Monitored Metrics:**
- Backup success/failure
- Backup size trends
- Storage capacity
- Restoration test results

---

## 9. User Management

### Admin Responsibilities

**Module Assignment:**
1. Create or identify user account
2. Determine required modules based on role
3. Set appropriate access level
4. Configure approval limits if needed
5. Set expiration date if temporary access
6. Document assignment reason

**Best Practices:**
- Use least privilege principle
- Review module assignments quarterly
- Remove access for terminated employees immediately
- Use temporary assignments for contractors
- Monitor module usage for anomalies

### User Onboarding

**Process:**
1. Create user account
2. Assign role (User, Manager, Admin)
3. Assign required modules
4. Set approval limits
5. Enable 2FA requirement
6. Send welcome email with credentials
7. Schedule security training

### User Offboarding

**Process:**
1. Deactivate user account
2. Revoke all module assignments
3. Invalidate all sessions
4. Disable API keys
5. Archive user data per retention policy
6. Document offboarding in audit log

---

## 10. API Integration

### Secure API Access

**Authentication Methods:**
1. JWT tokens (recommended for web apps)
2. API keys (for service-to-service)
3. OAuth 2.0 (for third-party integrations)

**Example Integration:**
```python
import requests

# Authenticate
response = requests.post('https://api.aria.com/auth/login', json={
    'username': 'user@company.com',
    'password': 'SecureP@ssw0rd'
})
token = response.json()['access_token']

# Check module access
headers = {'Authorization': f'Bearer {token}'}
response = requests.get(
    'https://api.aria.com/admin/modules/check-access/2',
    headers=headers
)

# Access allowed - proceed with operations
if response.json()['has_access']:
    # Upload document
    files = {'file': open('document.pdf', 'rb')}
    response = requests.post(
        'https://api.aria.com/documents/upload',
        headers=headers,
        files=files
    )
```

---

## 11. Testing

### Security Testing

**Test Scenarios:**
```python
# Test 1: Password complexity enforcement
# Test 2: Account lockout after failed attempts
# Test 3: 2FA verification
# Test 4: Role-based access control
# Test 5: Module access restrictions
# Test 6: Encrypted data storage
# Test 7: Audit log immutability
# Test 8: Backup creation and restoration
# Test 9: Session expiration
# Test 10: Cross-site scripting (XSS) prevention
```

**Automated Tests:**
```bash
# Run security test suite
pytest tests/security/

# Run module assignment tests
pytest tests/modules/

# Run encryption tests
pytest tests/encryption/

# Run backup tests
pytest tests/backups/
```

---

## 12. Troubleshooting

### Common Issues

**Issue: User cannot access module**
- Check module assignment status
- Verify module is active
- Check expiration date
- Verify user account is active
- Review audit logs for access attempts

**Issue: 2FA not working**
- Verify time synchronization
- Check backup codes
- Confirm 2FA is enabled
- Verify secret key matches

**Issue: Backup failure**
- Check disk space
- Verify database credentials
- Review backup logs
- Confirm S3 credentials (if applicable)

**Issue: Audit log missing entries**
- Check database connection
- Verify logging service is running
- Review error logs
- Confirm user had valid session

---

## Support and Maintenance

For technical support or questions:
- Email: support@aria-dms.com
- Documentation: https://docs.aria-dms.com
- Status Page: https://status.aria-dms.com

---

**Last Updated:** March 12, 2026
**Version:** 2.0
**Maintained By:** ARIA Security Team
