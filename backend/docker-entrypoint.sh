#!/bin/bash
# Backend startup script for Docker

set -e

echo "🔄 Waiting for PostgreSQL to be ready..."
until PGPASSWORD=$POSTGRES_PASSWORD psql -h "postgres" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q' 2>/dev/null; do
  >&2 echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done

echo "✅ PostgreSQL is ready!"

echo "🔄 Creating database tables..."
python -c "
from app.core.database import Base, engine
Base.metadata.create_all(bind=engine)
print('✅ Database tables created!')
"

echo "🔄 Creating admin user..."
python -c "
from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash
import uuid

db = SessionLocal()
try:
    # Check if admin exists
    existing = db.query(User).filter(User.email == 'admin@aria.local').first()
    if not existing:
        admin = User(
            id=str(uuid.uuid4()),
            email='admin@aria.local',
            username='admin',
            hashed_password=get_password_hash('admin123'),
            full_name='Admin User',
            is_active=True,
            is_superuser=True
        )
        db.add(admin)
        db.commit()
        print('✅ Admin user created: admin@aria.local / admin123')
    else:
        print('✅ Admin user already exists')
except Exception as e:
    print(f'⚠️  Could not create admin user: {e}')
    print('You can create it manually later')
finally:
    db.close()
"

echo "🚀 Starting backend server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
