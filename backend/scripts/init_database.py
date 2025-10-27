#!/usr/bin/env python3
"""
Initialize ARIA Database
Creates all tables defined in the models
"""
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from core.database import Base, engine
import models  # Import all models to register them

def init_database():
    """Create all database tables"""
    print("="*70)
    print("🗄️  ARIA DATABASE INITIALIZATION")
    print("="*70)
    print(f"\n📍 Database URL: {engine.url}")
    print(f"📍 Backend Directory: {backend_dir}\n")
    
    try:
        print("🔨 Creating database tables...")
        Base.metadata.create_all(bind=engine)
        
        # Count tables
        table_count = len(Base.metadata.tables)
        
        print(f"\n✅ Database initialized successfully!")
        print(f"📊 Created {table_count} tables\n")
        
        # List all tables
        print("📋 Tables created:")
        print("-" * 70)
        
        table_names = sorted(Base.metadata.tables.keys())
        for i, table_name in enumerate(table_names, 1):
            print(f"   {i:2d}. {table_name}")
        
        print("-" * 70)
        print(f"\n✨ Total: {table_count} tables ready for use")
        print("\n🎯 Next steps:")
        print("   1. Run: python scripts/seed_demo_data.py")
        print("   2. Login at: https://aria.vantax.co.za")
        print("   3. Use credentials: admin@vantax.co.za / Demo@2025\n")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error initializing database: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = init_database()
    sys.exit(0 if success else 1)
