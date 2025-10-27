#!/bin/bash
# VantaXDemo SQL Seeding Script
# Creates demo company with 5 users directly in PostgreSQL

echo "================================================================================"
echo "🌱 VANTAXDEMO COMPANY SEEDING (SQL VERSION)"
echo "================================================================================"
echo "This script will create:"
echo "  - VantaXDemo company with 5 users"
echo "  - Direct SQL inserts into production database"
echo "================================================================================"
echo ""

# Database credentials from .env
DB_USER="aria_prod"
DB_NAME="aria_production"

# Generate password hashes (using Python's passlib which is installed)
echo "Generating password hashes..."

# Create temporary Python script to generate hashes
cat > /tmp/gen_hashes.py << 'EOF'
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

passwords = {
    "demo": "Demo@2025",
    "finance": "Finance@2025",
    "hr": "HR@2025",
    "compliance": "Compliance@2025",
    "operations": "Operations@2025"
}

for key, password in passwords.items():
    hash = pwd_context.hash(password)
    print(f"{key}:{hash}")
EOF

python3 /tmp/gen_hashes.py > /tmp/password_hashes.txt

# Read hashes
DEMO_HASH=$(grep "^demo:" /tmp/password_hashes.txt | cut -d: -f2-)
FINANCE_HASH=$(grep "^finance:" /tmp/password_hashes.txt | cut -d: -f2-)
HR_HASH=$(grep "^hr:" /tmp/password_hashes.txt | cut -d: -f2-)
COMPLIANCE_HASH=$(grep "^compliance:" /tmp/password_hashes.txt | cut -d: -f2-)
OPERATIONS_HASH=$(grep "^operations:" /tmp/password_hashes.txt | cut -d: -f2-)

echo "✅ Password hashes generated"
echo ""

# Create SQL file with user inserts
cat > /tmp/seed_demo_users.sql << EOF
-- Check if demo users already exist
DO \$\$
DECLARE
    demo_exists INTEGER;
BEGIN
    SELECT COUNT(*) INTO demo_exists FROM users WHERE email = 'demo@vantax.co.za';
    
    IF demo_exists > 0 THEN
        RAISE NOTICE '⚠️  Demo users already exist. Skipping creation.';
    ELSE
        -- Insert VantaXDemo users
        INSERT INTO users (email, password_hash, full_name, is_active, is_superuser, created_at, updated_at)
        VALUES
            ('demo@vantax.co.za', '$DEMO_HASH', 'VantaX Demo Admin', true, true, NOW(), NOW()),
            ('finance@vantax.co.za', '$FINANCE_HASH', 'Finance Manager', true, false, NOW(), NOW()),
            ('hr@vantax.co.za', '$HR_HASH', 'HR Manager', true, false, NOW(), NOW()),
            ('compliance@vantax.co.za', '$COMPLIANCE_HASH', 'Compliance Officer', true, false, NOW(), NOW()),
            ('operations@vantax.co.za', '$OPERATIONS_HASH', 'Operations Manager', true, false, NOW(), NOW());
        
        RAISE NOTICE '✅ Created 5 demo users';
    END IF;
END \$\$;

-- Display created users
SELECT 
    email, 
    full_name, 
    is_active, 
    is_superuser,
    created_at
FROM users 
WHERE email LIKE '%vantax.co.za'
ORDER BY is_superuser DESC, email;
EOF

echo "🏢 Creating VantaXDemo users in database..."
echo ""

# Execute SQL as postgres user
sudo -u postgres psql -d $DB_NAME -f /tmp/seed_demo_users.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "================================================================================"
    echo "✅ SEEDING COMPLETE!"
    echo "================================================================================"
    echo ""
    echo "📋 Demo User Credentials:"
    echo "============================================================"
    echo "Admin:      demo@vantax.co.za / Demo@2025"
    echo "Finance:    finance@vantax.co.za / Finance@2025"
    echo "HR:         hr@vantax.co.za / HR@2025"
    echo "Compliance: compliance@vantax.co.za / Compliance@2025"
    echo "Operations: operations@vantax.co.za / Operations@2025"
    echo "============================================================"
    echo ""
    echo "🔐 Access the demo:"
    echo "   URL: https://aria.vantax.co.za"
    echo "   Email: demo@vantax.co.za"
    echo "   Password: Demo@2025"
    echo ""
    echo "📝 Next Steps:"
    echo "   1. Log in to the platform"
    echo "   2. Test all 67 bots following BOT_TESTING_GUIDE.md"
    echo "   3. Document test results"
    echo ""
    echo "================================================================================"
else
    echo ""
    echo "❌ Error during seeding. Check error messages above."
    exit 1
fi

# Cleanup
rm -f /tmp/gen_hashes.py /tmp/password_hashes.txt /tmp/seed_demo_users.sql
