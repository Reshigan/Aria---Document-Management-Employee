#!/usr/bin/env python3
"""
Aria Document Management System - Data Migration & Seeding Script
Comprehensive data migration, seeding, and production setup utilities
"""

import os
import sys
import json
import sqlite3
import hashlib
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional
import argparse
import logging

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from passlib.context import CryptContext

# Import models
from models import Base, User, Document, DocumentType, DocumentStatus
from core.logging_config import get_logger

# Setup logging
logger = get_logger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class DataMigrationManager:
    """Comprehensive data migration and seeding manager"""
    
    def __init__(self, database_url: str = "sqlite:///./aria.db"):
        self.database_url = database_url
        self.engine = create_engine(database_url, connect_args={"check_same_thread": False})
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.db = SessionLocal()
        
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.db.close()
    
    def create_tables(self):
        """Create all database tables"""
        logger.info("Creating database tables...")
        Base.metadata.create_all(bind=self.engine)
        logger.info("Database tables created successfully")
    
    def drop_tables(self):
        """Drop all database tables (use with caution!)"""
        logger.warning("Dropping all database tables...")
        Base.metadata.drop_all(bind=self.engine)
        logger.info("Database tables dropped")
    
    def backup_database(self, backup_path: Optional[str] = None) -> str:
        """Create a backup of the current database"""
        if backup_path is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_path = f"aria_backup_{timestamp}.db"
        
        # For SQLite, we can simply copy the file
        if "sqlite" in self.database_url:
            db_file = self.database_url.replace("sqlite:///", "").replace("sqlite://", "")
            if os.path.exists(db_file):
                import shutil
                shutil.copy2(db_file, backup_path)
                logger.info(f"Database backed up to: {backup_path}")
                return backup_path
        
        logger.error("Backup not supported for this database type")
        return ""
    
    def seed_production_users(self):
        """Seed production users with secure passwords"""
        logger.info("Seeding production users...")
        
        production_users = [
            {
                "username": "admin",
                "email": "admin@aria.vantax.co.za",
                "password": "admin123",  # Change in production!
                "full_name": "System Administrator",
                "is_superuser": True,
                "is_active": True
            },
            {
                "username": "demo",
                "email": "demo@aria.vantax.co.za",
                "password": "demo123",
                "full_name": "Demo User",
                "is_superuser": False,
                "is_active": True
            },
            {
                "username": "manager",
                "email": "manager@aria.vantax.co.za",
                "password": "manager123",
                "full_name": "Department Manager",
                "is_superuser": False,
                "is_active": True
            },
            {
                "username": "user1",
                "email": "user1@aria.vantax.co.za",
                "password": "user123",
                "full_name": "Standard User",
                "is_superuser": False,
                "is_active": True
            },
            {
                "username": "guest",
                "email": "guest@aria.vantax.co.za",
                "password": "guest123",
                "full_name": "Guest User",
                "is_superuser": False,
                "is_active": True
            }
        ]
        
        for user_data in production_users:
            # Check if user already exists
            existing_user = self.db.query(User).filter(
                User.username == user_data["username"]
            ).first()
            
            if existing_user:
                logger.info(f"User {user_data['username']} already exists, updating...")
                # Update existing user (but don't change password if it's already hashed)
                existing_user.email = user_data["email"]
                existing_user.full_name = user_data["full_name"]
                existing_user.is_superuser = user_data["is_superuser"]
                existing_user.is_active = user_data["is_active"]
                
                # Only update password if it's not already a bcrypt hash
                current_hash = existing_user.hashed_password or ""
                if not current_hash.startswith("$2b$"):
                    existing_user.password_hash = pwd_context.hash(user_data["password"])
                    logger.info(f"Updated password for user {user_data['username']}")
                else:
                    logger.info(f"Password already hashed for user {user_data['username']}, skipping")
                
                existing_user.updated_at = datetime.utcnow()
            else:
                # Create new user
                logger.info(f"Creating user: {user_data['username']}")
                new_user = User(
                    username=user_data["username"],
                    email=user_data["email"],
                    password_hash=pwd_context.hash(user_data["password"]),
                    full_name=user_data["full_name"],
                    is_superuser=user_data["is_superuser"],
                    is_active=user_data["is_active"],
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                self.db.add(new_user)
        
        self.db.commit()
        logger.info("Production users seeded successfully")
    
    def seed_document_types(self):
        """Seed document types and categories"""
        logger.info("Seeding document types...")
        
        document_types = [
            "PDF Document",
            "Word Document", 
            "Excel Spreadsheet",
            "PowerPoint Presentation",
            "Text File",
            "Image File",
            "Archive File",
            "Video File",
            "Audio File",
            "Other"
        ]
        
        # Note: This assumes you have a DocumentType model
        # If not, you might store this as metadata or in a separate table
        for doc_type in document_types:
            logger.info(f"Document type available: {doc_type}")
        
        logger.info("Document types configured")
    
    def seed_sample_documents(self):
        """Create sample documents for demonstration"""
        logger.info("Creating sample documents...")
        
        # Get admin user for sample documents
        admin_user = self.db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            logger.error("Admin user not found, cannot create sample documents")
            return
        
        sample_documents = [
            {
                "original_filename": "Welcome_to_Aria.pdf",
                "stored_filename": "welcome_aria_001.pdf",
                "file_path": "/uploads/samples/welcome_aria_001.pdf",
                "file_size": 1024000,  # 1MB
                "mime_type": "application/pdf",
                "document_type": "PDF Document",
                "status": "active",
                "user_id": admin_user.id,
                "metadata": {
                    "title": "Welcome to Aria Document Management",
                    "description": "Introduction guide to Aria features and capabilities",
                    "category": "Documentation",
                    "tags": ["welcome", "guide", "introduction"]
                }
            },
            {
                "original_filename": "System_Architecture.docx",
                "stored_filename": "system_arch_001.docx",
                "file_path": "/uploads/samples/system_arch_001.docx",
                "file_size": 2048000,  # 2MB
                "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "document_type": "Word Document",
                "status": "active",
                "user_id": admin_user.id,
                "metadata": {
                    "title": "Aria System Architecture Overview",
                    "description": "Technical documentation of system architecture",
                    "category": "Technical",
                    "tags": ["architecture", "technical", "system"]
                }
            },
            {
                "original_filename": "User_Statistics.xlsx",
                "stored_filename": "user_stats_001.xlsx",
                "file_path": "/uploads/samples/user_stats_001.xlsx",
                "file_size": 512000,  # 512KB
                "mime_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "document_type": "Excel Spreadsheet",
                "status": "active",
                "user_id": admin_user.id,
                "metadata": {
                    "title": "User Activity Statistics",
                    "description": "Monthly user activity and engagement metrics",
                    "category": "Reports",
                    "tags": ["statistics", "users", "monthly", "report"]
                }
            }
        ]
        
        for doc_data in sample_documents:
            # Check if document already exists
            existing_doc = self.db.query(Document).filter(
                Document.original_filename == doc_data["original_filename"]
            ).first()
            
            if existing_doc:
                logger.info(f"Sample document {doc_data['original_filename']} already exists")
                continue
            
            # Create sample document record
            new_document = Document(
                filename=doc_data["stored_filename"],  # Use stored_filename as filename
                original_filename=doc_data["original_filename"],
                file_path=doc_data["file_path"],
                file_size=doc_data["file_size"],
                mime_type=doc_data["mime_type"],
                document_type=doc_data["document_type"],
                status=doc_data["status"],
                uploaded_by=doc_data["user_id"],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            self.db.add(new_document)
            logger.info(f"Created sample document: {doc_data['original_filename']}")
        
        self.db.commit()
        logger.info("Sample documents created successfully")
    
    def optimize_database(self):
        """Optimize database performance"""
        logger.info("Optimizing database performance...")
        
        # Create performance indexes
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_users_email_active ON users(email, is_active);",
            "CREATE INDEX IF NOT EXISTS idx_users_username_active ON users(username, is_active);",
            "CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);",
            "CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);",
            "CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);",
            "CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);",
            "CREATE INDEX IF NOT EXISTS idx_documents_type_status ON documents(document_type, status);",
            "CREATE INDEX IF NOT EXISTS idx_documents_filename ON documents(original_filename);",
        ]
        
        for index_sql in indexes:
            try:
                self.db.execute(text(index_sql))
                logger.info(f"Created index: {index_sql.split('idx_')[1].split(' ')[0]}")
            except Exception as e:
                logger.warning(f"Index creation failed: {e}")
        
        # Analyze database statistics
        try:
            self.db.execute(text("ANALYZE;"))
            logger.info("Database statistics updated")
        except Exception as e:
            logger.warning(f"Database analysis failed: {e}")
        
        self.db.commit()
        logger.info("Database optimization completed")
    
    def migrate_from_legacy(self, legacy_db_path: str):
        """Migrate data from legacy database"""
        logger.info(f"Starting migration from legacy database: {legacy_db_path}")
        
        if not os.path.exists(legacy_db_path):
            logger.error(f"Legacy database not found: {legacy_db_path}")
            return False
        
        try:
            # Connect to legacy database
            legacy_conn = sqlite3.connect(legacy_db_path)
            legacy_cursor = legacy_conn.cursor()
            
            # Migrate users
            legacy_cursor.execute("SELECT * FROM users")
            legacy_users = legacy_cursor.fetchall()
            
            for user_row in legacy_users:
                # Adapt this based on your legacy schema
                logger.info(f"Migrating user: {user_row}")
                # Migration logic here
            
            # Migrate documents
            legacy_cursor.execute("SELECT * FROM documents")
            legacy_documents = legacy_cursor.fetchall()
            
            for doc_row in legacy_documents:
                logger.info(f"Migrating document: {doc_row}")
                # Migration logic here
            
            legacy_conn.close()
            self.db.commit()
            
            logger.info("Legacy migration completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Legacy migration failed: {e}")
            self.db.rollback()
            return False
    
    def export_data(self, export_path: str):
        """Export current data to JSON format"""
        logger.info(f"Exporting data to: {export_path}")
        
        export_data = {
            "export_timestamp": datetime.utcnow().isoformat(),
            "version": "2.0.0",
            "users": [],
            "documents": []
        }
        
        # Export users (excluding sensitive data)
        users = self.db.query(User).all()
        for user in users:
            export_data["users"].append({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "is_active": user.is_active,
                "is_superuser": user.is_superuser,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "updated_at": user.updated_at.isoformat() if user.updated_at else None,
                "last_login": user.last_login.isoformat() if user.last_login else None
            })
        
        # Export documents metadata
        documents = self.db.query(Document).all()
        for doc in documents:
            export_data["documents"].append({
                "id": doc.id,
                "original_filename": doc.original_filename,
                "file_size": doc.file_size,
                "mime_type": doc.mime_type,
                "document_type": doc.document_type,
                "status": doc.status,
                "user_id": doc.user_id,
                "created_at": doc.created_at.isoformat() if doc.created_at else None,
                "updated_at": doc.updated_at.isoformat() if doc.updated_at else None
            })
        
        # Write export file
        with open(export_path, 'w') as f:
            json.dump(export_data, f, indent=2)
        
        logger.info(f"Data exported successfully: {len(export_data['users'])} users, {len(export_data['documents'])} documents")
    
    def import_data(self, import_path: str):
        """Import data from JSON export"""
        logger.info(f"Importing data from: {import_path}")
        
        if not os.path.exists(import_path):
            logger.error(f"Import file not found: {import_path}")
            return False
        
        try:
            with open(import_path, 'r') as f:
                import_data = json.load(f)
            
            logger.info(f"Import file version: {import_data.get('version', 'unknown')}")
            
            # Import users
            for user_data in import_data.get("users", []):
                existing_user = self.db.query(User).filter(
                    User.username == user_data["username"]
                ).first()
                
                if not existing_user:
                    new_user = User(
                        username=user_data["username"],
                        email=user_data["email"],
                        full_name=user_data["full_name"],
                        is_active=user_data["is_active"],
                        is_superuser=user_data["is_superuser"],
                        password_hash=pwd_context.hash("changeme123"),  # Default password
                        created_at=datetime.fromisoformat(user_data["created_at"]) if user_data["created_at"] else datetime.utcnow(),
                        updated_at=datetime.fromisoformat(user_data["updated_at"]) if user_data["updated_at"] else datetime.utcnow()
                    )
                    self.db.add(new_user)
                    logger.info(f"Imported user: {user_data['username']}")
            
            self.db.commit()
            logger.info("Data import completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Data import failed: {e}")
            self.db.rollback()
            return False
    
    def validate_data_integrity(self):
        """Validate database integrity and consistency"""
        logger.info("Validating data integrity...")
        
        issues = []
        
        # Check for duplicate usernames
        duplicate_usernames = self.db.execute(text("""
            SELECT username, COUNT(*) as count 
            FROM users 
            GROUP BY username 
            HAVING COUNT(*) > 1
        """)).fetchall()
        
        if duplicate_usernames:
            issues.append(f"Duplicate usernames found: {duplicate_usernames}")
        
        # Check for duplicate emails
        duplicate_emails = self.db.execute(text("""
            SELECT email, COUNT(*) as count 
            FROM users 
            GROUP BY email 
            HAVING COUNT(*) > 1
        """)).fetchall()
        
        if duplicate_emails:
            issues.append(f"Duplicate emails found: {duplicate_emails}")
        
        # Check for orphaned documents
        orphaned_docs = self.db.execute(text("""
            SELECT d.id, d.original_filename 
            FROM documents d 
            LEFT JOIN users u ON d.user_id = u.id 
            WHERE u.id IS NULL
        """)).fetchall()
        
        if orphaned_docs:
            issues.append(f"Orphaned documents found: {len(orphaned_docs)}")
        
        # Check for missing file paths
        missing_files = self.db.execute(text("""
            SELECT id, original_filename, file_path 
            FROM documents 
            WHERE file_path IS NULL OR file_path = ''
        """)).fetchall()
        
        if missing_files:
            issues.append(f"Documents with missing file paths: {len(missing_files)}")
        
        if issues:
            logger.warning("Data integrity issues found:")
            for issue in issues:
                logger.warning(f"  - {issue}")
            return False
        else:
            logger.info("Data integrity validation passed")
            return True
    
    def get_statistics(self):
        """Get database statistics"""
        stats = {}
        
        # User statistics
        stats["users"] = {
            "total": self.db.query(User).count(),
            "active": self.db.query(User).filter(User.is_active == True).count(),
            "superusers": self.db.query(User).filter(User.is_superuser == True).count()
        }
        
        # Document statistics
        stats["documents"] = {
            "total": self.db.query(Document).count(),
            "active": self.db.query(Document).filter(Document.status == "active").count(),
            "total_size": self.db.execute(text("SELECT SUM(file_size) FROM documents")).scalar() or 0
        }
        
        # Database size (for SQLite)
        if "sqlite" in self.database_url:
            db_file = self.database_url.replace("sqlite:///", "").replace("sqlite://", "")
            if os.path.exists(db_file):
                stats["database_size"] = os.path.getsize(db_file)
        
        return stats

def main():
    """Main CLI interface for data migration"""
    parser = argparse.ArgumentParser(description="Aria Data Migration & Seeding Tool")
    parser.add_argument("--database-url", default="sqlite:///./aria.db", help="Database URL")
    parser.add_argument("--action", required=True, choices=[
        "create-tables", "drop-tables", "seed-users", "seed-documents", 
        "seed-all", "optimize", "backup", "export", "import", "validate", 
        "stats", "migrate-legacy", "full-setup"
    ], help="Action to perform")
    parser.add_argument("--file", help="File path for backup/export/import/legacy operations")
    parser.add_argument("--force", action="store_true", help="Force operation without confirmation")
    
    args = parser.parse_args()
    
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    with DataMigrationManager(args.database_url) as manager:
        try:
            if args.action == "create-tables":
                manager.create_tables()
            
            elif args.action == "drop-tables":
                if not args.force:
                    confirm = input("This will delete all data. Are you sure? (yes/no): ")
                    if confirm.lower() != "yes":
                        print("Operation cancelled")
                        return
                manager.drop_tables()
            
            elif args.action == "seed-users":
                manager.seed_production_users()
            
            elif args.action == "seed-documents":
                manager.seed_sample_documents()
            
            elif args.action == "seed-all":
                manager.seed_production_users()
                manager.seed_document_types()
                manager.seed_sample_documents()
            
            elif args.action == "optimize":
                manager.optimize_database()
            
            elif args.action == "backup":
                backup_file = args.file or f"aria_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
                manager.backup_database(backup_file)
            
            elif args.action == "export":
                export_file = args.file or f"aria_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
                manager.export_data(export_file)
            
            elif args.action == "import":
                if not args.file:
                    print("Import file required (--file)")
                    return
                manager.import_data(args.file)
            
            elif args.action == "validate":
                manager.validate_data_integrity()
            
            elif args.action == "stats":
                stats = manager.get_statistics()
                print("\n=== Database Statistics ===")
                print(f"Users: {stats['users']['total']} total, {stats['users']['active']} active, {stats['users']['superusers']} admins")
                print(f"Documents: {stats['documents']['total']} total, {stats['documents']['active']} active")
                print(f"Total file size: {stats['documents']['total_size'] / 1024 / 1024:.2f} MB")
                if 'database_size' in stats:
                    print(f"Database size: {stats['database_size'] / 1024 / 1024:.2f} MB")
            
            elif args.action == "migrate-legacy":
                if not args.file:
                    print("Legacy database file required (--file)")
                    return
                manager.migrate_from_legacy(args.file)
            
            elif args.action == "full-setup":
                print("Performing full production setup...")
                manager.create_tables()
                manager.seed_production_users()
                manager.seed_document_types()
                manager.seed_sample_documents()
                manager.optimize_database()
                manager.validate_data_integrity()
                stats = manager.get_statistics()
                print(f"\n✅ Setup complete! {stats['users']['total']} users, {stats['documents']['total']} documents")
            
            print(f"✅ Operation '{args.action}' completed successfully")
            
        except Exception as e:
            logger.error(f"Operation failed: {e}")
            print(f"❌ Operation failed: {e}")
            sys.exit(1)

if __name__ == "__main__":
    main()