#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta
import json

# Import existing models to ensure tables exist
from models import Base, User, Document

# Import mobile models
from app.models.mobile import (
    MobileDevice, SyncSession, SyncItem, SyncConflict, OfflineDocument,
    MobileSettings, PushNotification, OfflineAction, MobileAnalytics,
    SyncPolicy, MobileSecurityLog, MobileAppVersion,
    DeviceType, SyncStatus, ConflictResolution
)

# Database configuration
DATABASE_URL = "sqlite:///./aria_document_management.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_mobile_tables():
    """Create mobile-related database tables"""
    print("Creating mobile database tables...")
    
    try:
        # Create all tables (existing + mobile)
        Base.metadata.create_all(bind=engine)
        print("✅ Mobile tables created successfully!")
        
        # Add sample data
        add_sample_mobile_data()
        
    except Exception as e:
        print(f"❌ Error creating mobile tables: {e}")
        return False
    
    return True

def add_sample_mobile_data():
    """Add sample mobile data for testing"""
    print("Adding sample mobile data...")
    
    db = SessionLocal()
    
    try:
        # Check if sample data already exists
        if db.query(MobileDevice).first():
            print("Sample mobile data already exists, skipping...")
            return
        
        # Sample mobile devices
        devices = [
            MobileDevice(
                user_id=1,  # Assuming admin user exists
                device_id="device_001_ios",
                device_name="John's iPhone 14",
                device_type=DeviceType.IOS.value,
                platform_version="iOS 16.5",
                app_version="1.0.0",
                push_token="sample_push_token_ios_001",
                device_info={
                    "model": "iPhone14,2",
                    "screen_resolution": "1170x2532",
                    "storage_capacity": "256GB",
                    "carrier": "Verizon"
                },
                sync_enabled=True,
                offline_storage_limit=2147483648,  # 2GB
                is_active=True,
                last_seen=datetime.utcnow()
            ),
            MobileDevice(
                user_id=1,
                device_id="device_002_android",
                device_name="John's Samsung Galaxy",
                device_type=DeviceType.ANDROID.value,
                platform_version="Android 13",
                app_version="1.0.0",
                push_token="sample_push_token_android_002",
                device_info={
                    "model": "SM-G998B",
                    "screen_resolution": "1440x3200",
                    "storage_capacity": "512GB",
                    "carrier": "T-Mobile"
                },
                sync_enabled=True,
                offline_storage_limit=3221225472,  # 3GB
                is_active=True,
                last_seen=datetime.utcnow() - timedelta(hours=2)
            ),
            MobileDevice(
                user_id=2,  # Assuming another user exists
                device_id="device_003_tablet",
                device_name="Sarah's iPad Pro",
                device_type=DeviceType.TABLET.value,
                platform_version="iPadOS 16.5",
                app_version="1.0.0",
                push_token="sample_push_token_ipad_003",
                device_info={
                    "model": "iPad13,8",
                    "screen_resolution": "2048x2732",
                    "storage_capacity": "1TB",
                    "carrier": "WiFi Only"
                },
                sync_enabled=True,
                offline_storage_limit=5368709120,  # 5GB
                is_active=True,
                last_seen=datetime.utcnow() - timedelta(minutes=30)
            )
        ]
        
        db.add_all(devices)
        db.commit()
        
        # Get device IDs for further sample data
        device_ids = [device.id for device in devices]
        
        # Sample sync sessions
        sync_sessions = [
            SyncSession(
                device_id=device_ids[0],
                session_id="sync_session_001",
                sync_type="full",
                status=SyncStatus.COMPLETED.value,
                started_at=datetime.utcnow() - timedelta(hours=1),
                completed_at=datetime.utcnow() - timedelta(minutes=45),
                total_items=25,
                synced_items=23,
                failed_items=2,
                data_transferred=52428800,  # 50MB
                sync_metadata={
                    "sync_reason": "manual",
                    "network_type": "wifi",
                    "battery_level": 85
                }
            ),
            SyncSession(
                device_id=device_ids[1],
                session_id="sync_session_002",
                sync_type="incremental",
                status=SyncStatus.IN_PROGRESS.value,
                started_at=datetime.utcnow() - timedelta(minutes=15),
                total_items=8,
                synced_items=5,
                failed_items=0,
                data_transferred=10485760,  # 10MB
                sync_metadata={
                    "sync_reason": "scheduled",
                    "network_type": "cellular",
                    "battery_level": 67
                }
            ),
            SyncSession(
                device_id=device_ids[2],
                session_id="sync_session_003",
                sync_type="selective",
                status=SyncStatus.FAILED.value,
                started_at=datetime.utcnow() - timedelta(hours=3),
                completed_at=datetime.utcnow() - timedelta(hours=2, minutes=45),
                total_items=12,
                synced_items=0,
                failed_items=12,
                error_message="Network timeout during sync",
                sync_metadata={
                    "sync_reason": "auto",
                    "network_type": "wifi",
                    "battery_level": 15
                }
            )
        ]
        
        db.add_all(sync_sessions)
        db.commit()
        
        # Get session IDs for sync items
        session_ids = [session.id for session in sync_sessions]
        
        # Sample sync items
        sync_items = [
            SyncItem(
                session_id=session_ids[0],
                item_type="document",
                item_id="doc_001",
                action="create",
                status="completed",
                priority=1,
                item_data={
                    "filename": "quarterly_report.pdf",
                    "size": 2048576,
                    "type": "application/pdf"
                },
                checksum="abc123def456",
                size_bytes=2048576
            ),
            SyncItem(
                session_id=session_ids[0],
                item_type="document",
                item_id="doc_002",
                action="update",
                status="failed",
                priority=2,
                retry_count=3,
                error_message="File locked by another process",
                item_data={
                    "filename": "budget_2024.xlsx",
                    "size": 1048576,
                    "type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                },
                checksum="def456ghi789",
                size_bytes=1048576
            ),
            SyncItem(
                session_id=session_ids[1],
                item_type="folder",
                item_id="folder_001",
                action="create",
                status="completed",
                priority=0,
                item_data={
                    "name": "Project Alpha",
                    "parent_id": None
                },
                size_bytes=0
            )
        ]
        
        db.add_all(sync_items)
        db.commit()
        
        # Sample sync conflicts
        sync_conflicts = [
            SyncConflict(
                session_id=session_ids[0],
                item_type="document",
                item_id="doc_003",
                conflict_type="version",
                server_version={
                    "version": 3,
                    "modified_at": "2024-01-15T10:30:00Z",
                    "modified_by": "user_001"
                },
                client_version={
                    "version": 2,
                    "modified_at": "2024-01-15T09:45:00Z",
                    "modified_by": "user_001"
                },
                resolution_strategy=ConflictResolution.SERVER_WINS.value,
                resolved=True,
                resolved_at=datetime.utcnow() - timedelta(minutes=30),
                resolved_by=1,
                resolution_data={
                    "chosen_version": "server",
                    "backup_created": True
                }
            )
        ]
        
        db.add_all(sync_conflicts)
        db.commit()
        
        # Sample offline documents
        offline_documents = [
            OfflineDocument(
                device_id=device_ids[0],
                document_id=1,  # Assuming document exists
                download_status="completed",
                download_priority=1,
                file_size=5242880,  # 5MB
                downloaded_size=5242880,
                local_path="/storage/documents/doc_001.pdf",
                checksum="sha256_hash_001",
                expires_at=datetime.utcnow() + timedelta(days=30),
                auto_download=True,
                download_on_wifi_only=False
            ),
            OfflineDocument(
                device_id=device_ids[1],
                document_id=2,
                download_status="pending",
                download_priority=2,
                file_size=10485760,  # 10MB
                downloaded_size=0,
                auto_download=False,
                download_on_wifi_only=True
            )
        ]
        
        db.add_all(offline_documents)
        db.commit()
        
        # Sample mobile settings
        mobile_settings = [
            MobileSettings(
                user_id=1,
                device_id=device_ids[0],
                setting_key="auto_sync_enabled",
                setting_value=True,
                is_device_specific=True
            ),
            MobileSettings(
                user_id=1,
                device_id=device_ids[0],
                setting_key="sync_frequency_minutes",
                setting_value=30,
                is_device_specific=True
            ),
            MobileSettings(
                user_id=1,
                setting_key="notification_enabled",
                setting_value=True,
                is_device_specific=False
            ),
            MobileSettings(
                user_id=1,
                setting_key="offline_storage_limit_gb",
                setting_value=2,
                is_device_specific=False
            )
        ]
        
        db.add_all(mobile_settings)
        db.commit()
        
        # Sample push notifications
        push_notifications = [
            PushNotification(
                device_id=device_ids[0],
                notification_type="sync_completed",
                title="Sync Completed",
                message="Your documents have been synchronized successfully",
                payload={
                    "session_id": "sync_session_001",
                    "synced_items": 23,
                    "action_url": "/sync/history"
                },
                status="delivered",
                sent_at=datetime.utcnow() - timedelta(minutes=45),
                delivered_at=datetime.utcnow() - timedelta(minutes=44)
            ),
            PushNotification(
                device_id=device_ids[1],
                notification_type="document_shared",
                title="New Document Shared",
                message="A new document has been shared with you",
                payload={
                    "document_id": 1,
                    "shared_by": "John Doe",
                    "action_url": "/documents/1"
                },
                status="pending",
                scheduled_at=datetime.utcnow() + timedelta(minutes=5)
            )
        ]
        
        db.add_all(push_notifications)
        db.commit()
        
        # Sample offline actions
        offline_actions = [
            OfflineAction(
                device_id=device_ids[0],
                action_type="create_document",
                action_data={
                    "filename": "meeting_notes.txt",
                    "content": "Meeting notes from offline session",
                    "folder_id": 1,
                    "created_at": "2024-01-15T14:30:00Z"
                },
                status="completed",
                priority=1,
                processed_at=datetime.utcnow() - timedelta(hours=1)
            ),
            OfflineAction(
                device_id=device_ids[1],
                action_type="update_document",
                action_data={
                    "document_id": 2,
                    "changes": {
                        "title": "Updated Title",
                        "content": "Updated content"
                    },
                    "modified_at": "2024-01-15T15:45:00Z"
                },
                status="pending",
                priority=2
            )
        ]
        
        db.add_all(offline_actions)
        db.commit()
        
        # Sample mobile analytics
        mobile_analytics = [
            MobileAnalytics(
                device_id=device_ids[0],
                event_type="app_launch",
                event_data={
                    "launch_time": 2.3,
                    "previous_session_duration": 1800,
                    "network_type": "wifi"
                },
                session_id="session_001",
                user_id=1,
                timestamp=datetime.utcnow() - timedelta(hours=2)
            ),
            MobileAnalytics(
                device_id=device_ids[0],
                event_type="document_view",
                event_data={
                    "document_id": 1,
                    "view_duration": 120,
                    "scroll_percentage": 85
                },
                session_id="session_001",
                user_id=1,
                timestamp=datetime.utcnow() - timedelta(hours=1, minutes=30)
            ),
            MobileAnalytics(
                device_id=device_ids[1],
                event_type="sync_initiated",
                event_data={
                    "sync_type": "manual",
                    "items_to_sync": 8,
                    "network_type": "cellular"
                },
                session_id="session_002",
                user_id=1,
                timestamp=datetime.utcnow() - timedelta(minutes=15)
            )
        ]
        
        db.add_all(mobile_analytics)
        db.commit()
        
        # Sample sync policies
        sync_policies = [
            SyncPolicy(
                name="Default iOS Policy",
                description="Default sync policy for iOS devices",
                policy_type="device",
                target_id=device_ids[0],
                sync_frequency=30,
                auto_sync_enabled=True,
                wifi_only=False,
                battery_optimization=True,
                max_file_size=104857600,  # 100MB
                allowed_file_types=["pdf", "docx", "xlsx", "pptx", "txt", "jpg", "png"],
                sync_folders=[1, 2, 3],
                conflict_resolution=ConflictResolution.SERVER_WINS.value,
                retention_days=30,
                is_active=True
            ),
            SyncPolicy(
                name="WiFi Only Policy",
                description="Sync policy for devices with limited data plans",
                policy_type="user",
                target_id=1,
                sync_frequency=60,
                auto_sync_enabled=True,
                wifi_only=True,
                battery_optimization=True,
                max_file_size=52428800,  # 50MB
                allowed_file_types=["pdf", "docx", "txt"],
                conflict_resolution=ConflictResolution.MANUAL.value,
                retention_days=14,
                is_active=True
            )
        ]
        
        db.add_all(sync_policies)
        db.commit()
        
        # Sample security logs
        security_logs = [
            MobileSecurityLog(
                device_id=device_ids[0],
                event_type="suspicious_login_attempt",
                severity="medium",
                description="Multiple failed login attempts detected",
                ip_address="192.168.1.100",
                user_agent="ARIA-Mobile/1.0.0 (iOS 16.5)",
                location_data={
                    "country": "US",
                    "region": "CA",
                    "city": "San Francisco",
                    "latitude": 37.7749,
                    "longitude": -122.4194
                },
                threat_indicators={
                    "failed_attempts": 5,
                    "time_window": "5 minutes",
                    "risk_score": 65
                },
                action_taken="Account temporarily locked",
                resolved=True
            ),
            MobileSecurityLog(
                device_id=device_ids[1],
                event_type="device_jailbreak_detected",
                severity="high",
                description="Device appears to be rooted/jailbroken",
                ip_address="10.0.0.50",
                user_agent="ARIA-Mobile/1.0.0 (Android 13)",
                threat_indicators={
                    "root_indicators": ["su binary found", "custom recovery detected"],
                    "risk_score": 85
                },
                action_taken="Access restricted to read-only mode",
                resolved=False
            )
        ]
        
        db.add_all(security_logs)
        db.commit()
        
        # Sample app versions
        app_versions = [
            MobileAppVersion(
                version_number="1.0.0",
                platform="ios",
                build_number="100",
                release_date=datetime.utcnow() - timedelta(days=30),
                is_required_update=False,
                min_supported_version="1.0.0",
                download_url="https://apps.apple.com/app/aria-document-management",
                release_notes="Initial release with core document management features",
                file_size=52428800,  # 50MB
                checksum="sha256_ios_100",
                is_active=True
            ),
            MobileAppVersion(
                version_number="1.0.1",
                platform="ios",
                build_number="101",
                release_date=datetime.utcnow() - timedelta(days=7),
                is_required_update=True,
                min_supported_version="1.0.0",
                download_url="https://apps.apple.com/app/aria-document-management",
                release_notes="Bug fixes and security improvements",
                file_size=53477376,  # 51MB
                checksum="sha256_ios_101",
                is_active=True
            ),
            MobileAppVersion(
                version_number="1.0.0",
                platform="android",
                build_number="100",
                release_date=datetime.utcnow() - timedelta(days=25),
                is_required_update=False,
                min_supported_version="1.0.0",
                download_url="https://play.google.com/store/apps/details?id=com.aria.docmanagement",
                release_notes="Initial Android release",
                file_size=48234496,  # 46MB
                checksum="sha256_android_100",
                is_active=True
            ),
            MobileAppVersion(
                version_number="1.0.1",
                platform="android",
                build_number="101",
                release_date=datetime.utcnow() - timedelta(days=5),
                is_required_update=False,
                min_supported_version="1.0.0",
                download_url="https://play.google.com/store/apps/details?id=com.aria.docmanagement",
                release_notes="Performance improvements and new sync features",
                file_size=49283072,  # 47MB
                checksum="sha256_android_101",
                is_active=True
            )
        ]
        
        db.add_all(app_versions)
        db.commit()
        
        print("✅ Sample mobile data added successfully!")
        
        # Print summary
        print("\n📊 Mobile Database Summary:")
        print(f"   • Mobile Devices: {db.query(MobileDevice).count()}")
        print(f"   • Sync Sessions: {db.query(SyncSession).count()}")
        print(f"   • Sync Items: {db.query(SyncItem).count()}")
        print(f"   • Sync Conflicts: {db.query(SyncConflict).count()}")
        print(f"   • Offline Documents: {db.query(OfflineDocument).count()}")
        print(f"   • Mobile Settings: {db.query(MobileSettings).count()}")
        print(f"   • Push Notifications: {db.query(PushNotification).count()}")
        print(f"   • Offline Actions: {db.query(OfflineAction).count()}")
        print(f"   • Mobile Analytics: {db.query(MobileAnalytics).count()}")
        print(f"   • Sync Policies: {db.query(SyncPolicy).count()}")
        print(f"   • Security Logs: {db.query(MobileSecurityLog).count()}")
        print(f"   • App Versions: {db.query(MobileAppVersion).count()}")
        
    except Exception as e:
        print(f"❌ Error adding sample mobile data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Setting up ARIA Mobile Database...")
    
    if create_mobile_tables():
        print("\n✅ Mobile database setup completed successfully!")
        print("\n🔧 Mobile API Features Available:")
        print("   • Device registration and management")
        print("   • Sync session orchestration")
        print("   • Offline document management")
        print("   • Push notification system")
        print("   • Mobile analytics tracking")
        print("   • Conflict resolution workflows")
        print("   • Security monitoring")
        print("   • App version management")
        print("   • Mobile settings management")
        print("   • Offline action queuing")
        print("\n🌐 Mobile API Endpoints:")
        print("   • POST /api/mobile/devices/register")
        print("   • GET /api/mobile/devices")
        print("   • POST /api/mobile/sync/start")
        print("   • GET /api/mobile/sync/sessions")
        print("   • POST /api/mobile/offline/documents")
        print("   • GET /api/mobile/settings")
        print("   • POST /api/mobile/notifications")
        print("   • POST /api/mobile/analytics/events")
        print("   • GET /api/mobile/app-version/check")
        print("   • And many more...")
    else:
        print("\n❌ Mobile database setup failed!")
        sys.exit(1)