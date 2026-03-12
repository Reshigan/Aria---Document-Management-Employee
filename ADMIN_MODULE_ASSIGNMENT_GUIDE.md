# Admin Quick Reference - Module Assignment

## How to Assign Modules to Users

### Prerequisites
- Admin account with module assignment permissions
- Valid authentication token

---

## Step-by-Step Guide

### 1. View Available Modules

```bash
GET /api/admin/modules/
```

**Response:**
```json
{
  "modules": [
    {
      "id": 1,
      "name": "documents",
      "display_name": "Document Management",
      "category": "ADMINISTRATION",
      "status": "ACTIVE"
    },
    {
      "id": 2,
      "name": "financial_accounting",
      "display_name": "Financial Accounting",
      "category": "FINANCIAL",
      "status": "ACTIVE"
    }
    // ... more modules
  ],
  "total": 13
}
```

---

### 2. Assign Module to User

```bash
POST /api/admin/modules/assignments
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "user_id": 123,
  "module_id": 2,
  "access_level": "advanced",
  "approval_limit": 10000,
  "custom_permissions": ["create", "read", "update", "approve"],
  "expires_at": "2026-12-31T23:59:59Z",
  "notes": "Finance team member - full accounting access"
}
```

**Access Levels:**
- `read_only` - Can only view data
- `standard` - Can view and create
- `advanced` - Can view, create, update, and use advanced features
- `admin` - Full module administration

**Response:**
```json
{
  "id": 456,
  "user_id": 123,
  "module_id": 2,
  "module_name": "financial_accounting",
  "module_display_name": "Financial Accounting",
  "is_active": true,
  "access_level": "advanced",
  "approval_limit": 10000,
  "assigned_at": "2026-03-12T10:30:00Z"
}
```

---

### 3. Bulk Assign Modules

```bash
POST /api/admin/modules/assignments/bulk
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "user_ids": [123, 456, 789],
  "module_ids": [1, 2, 3],
  "access_level": "standard",
  "notes": "Finance department - standard access"
}
```

---

### 4. View User's Modules

```bash
GET /api/admin/modules/assignments/user/123
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "user_modules": [
    {
      "id": 456,
      "module_id": 2,
      "module_name": "financial_accounting",
      "is_active": true,
      "access_level": "advanced",
      "approval_limit": 10000,
      "last_accessed": "2026-03-12T09:15:00Z",
      "access_count": 45
    }
  ],
  "total": 1
}
```

---

### 5. Update Module Assignment

```bash
PUT /api/admin/modules/assignments/456
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "access_level": "admin",
  "approval_limit": 50000,
  "notes": "Promoted to senior accountant"
}
```

---

### 6. Remove Module from User

```bash
DELETE /api/admin/modules/assignments/user/123/module/2?reason=Employee%20transferred
Authorization: Bearer <admin_token>
```

Or deactivate with reason:

```bash
POST /api/admin/modules/assignments/456/deactivate
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "reason": "Employee transferred to different department"
}
```

---

## Common Scenarios

### Scenario 1: New Finance Employee

**Modules to Assign:**
- Document Management (standard)
- Financial Accounting (standard)
- Fixed Assets (read_only)

```bash
POST /api/admin/modules/assignments/bulk
{
  "user_ids": [<new_employee_id>],
  "module_ids": [1, 2, 3],
  "access_level": "standard",
  "notes": "New finance employee onboarding"
}
```

Then adjust Fixed Assets to read-only:
```bash
PUT /api/admin/modules/assignments/<assignment_id>
{
  "access_level": "read_only"
}
```

---

### Scenario 2: Finance Manager

**Modules to Assign:**
- Document Management (advanced)
- Financial Accounting (admin)
- Fixed Assets (advanced)
- Payroll (read_only)
- Analytics & Reporting (advanced)

**With Approval Limits:**
```bash
POST /api/admin/modules/assignments
{
  "user_id": <manager_id>,
  "module_id": 2,
  "access_level": "admin",
  "approval_limit": 100000,
  "custom_permissions": ["*"],
  "notes": "Finance Manager - Full accounting module access"
}
```

---

### Scenario 3: Temporary Contractor

**With Expiration Date:**
```bash
POST /api/admin/modules/assignments
{
  "user_id": <contractor_id>,
  "module_id": 1,
  "access_level": "standard",
  "expires_at": "2026-06-30T23:59:59Z",
  "notes": "3-month contract - expires June 30"
}
```

---

### Scenario 4: Employee Leaving

**Remove All Access:**
```bash
# Get all user modules
GET /api/admin/modules/assignments/user/<user_id>

# Deactivate each assignment
POST /api/admin/modules/assignments/<assignment_id>/deactivate
{
  "reason": "Employee terminated - Last day: 2026-03-15"
}
```

---

## Module Categories

| Category | Modules |
|----------|---------|
| **Financial** | Financial Accounting, Fixed Assets |
| **HR** | Payroll, HR Management |
| **Procurement** | Procurement |
| **Operations** | Inventory, Manufacturing |
| **Quality** | Quality Control |
| **Maintenance** | Maintenance |
| **Sales** | Sales Management |
| **Analytics** | Analytics & Reporting |
| **Administration** | Document Management, Workflow Management |

---

## Access Levels Explained

| Level | Create | Read | Update | Delete | Advanced Features | Admin Functions |
|-------|--------|------|--------|--------|-------------------|-----------------|
| **read_only** | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| **standard** | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| **advanced** | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| **admin** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## Approval Limits

Set financial approval limits per user:

```json
{
  "approval_limit": 10000  // Can approve up to $10,000
}
```

**Common Limits:**
- Junior Staff: $1,000
- Senior Staff: $10,000
- Manager: $50,000
- Director: $100,000
- Executive: Unlimited (null)

---

## Monitoring & Analytics

### View Module Usage Stats

```bash
GET /api/admin/modules/analytics/module/2
```

**Response:**
```json
{
  "module_id": 2,
  "module_name": "financial_accounting",
  "total_assigned_users": 25,
  "active_users": 23,
  "inactive_users": 2,
  "total_accesses": 1543,
  "average_accesses_per_user": 67,
  "most_active_users": [
    {"user_id": 123, "email": "john@company.com", "access_count": 245}
  ]
}
```

### System Overview

```bash
GET /api/admin/modules/analytics/overview
```

**Response:**
```json
{
  "total_modules": 13,
  "active_modules": 13,
  "total_assignments": 156,
  "active_assignments": 148,
  "most_popular_modules": [
    {"module_id": 1, "module_name": "documents", "assignment_count": 87}
  ]
}
```

---

## Best Practices

### 1. Least Privilege Principle
- Start with minimal access
- Grant additional permissions as needed
- Review quarterly

### 2. Use Expiration Dates
- For contractors and temporary staff
- For project-specific access
- For trial periods

### 3. Document Assignments
- Always add notes explaining why access was granted
- Include project codes or ticket numbers
- Reference approval documentation

### 4. Regular Reviews
- Monthly: Review new assignments
- Quarterly: Review all active assignments
- Annually: Full access audit

### 5. Monitor Usage
- Check access counts regularly
- Investigate unusual patterns
- Remove unused module access

### 6. Offboarding Checklist
- [ ] Deactivate user account
- [ ] Remove all module assignments
- [ ] Document reason for removal
- [ ] Archive user data
- [ ] Notify relevant departments

---

## Troubleshooting

### Issue: User can't access module

**Check:**
1. Is user account active?
   ```bash
   GET /api/users/<user_id>
   ```

2. Is module assigned?
   ```bash
   GET /api/admin/modules/assignments/user/<user_id>
   ```

3. Has assignment expired?
   - Check `expires_at` field

4. Is module active?
   ```bash
   GET /api/admin/modules/<module_id>
   ```

### Issue: Module not showing in list

**Check:**
1. Module status should be "ACTIVE"
2. User has proper permissions to view
3. Frontend filtering settings

### Issue: Approval limit not working

**Verify:**
1. Assignment has `approval_limit` set
2. User's role supports approvals
3. Module has `requires_approval` enabled

---

## Support

For assistance:
- Check audit logs: `/api/admin/security/audit-logs`
- Review security events: `/api/admin/security/security-events`
- Contact: support@aria-dms.com

---

**Last Updated:** March 12, 2026
**Version:** 1.0
