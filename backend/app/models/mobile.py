from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

# Import the existing Base from models
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))
from models import Base

class DeviceType(enum.Enum):
    IOS = "ios"
    ANDROID = "android"
    TABLET = "tablet"
    DESKTOP = "desktop"

class SyncStatus(enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class ConflictResolution(enum.Enum):
    SERVER_WINS = "server_wins"
    CLIENT_WINS = "client_wins"
    MERGE = "merge"
    MANUAL = "manual"

class MobileDevice(Base):
    __tablename__ = "mobile_devices"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    device_id = Column(String(255), unique=True, nullable=False, index=True)
    device_name = Column(String(255), nullable=False)
    device_type = Column(String(50), nullable=False)  # DeviceType enum
    platform_version = Column(String(100))
    app_version = Column(String(100))
    push_token = Column(String(500))
    is_active = Column(Boolean, default=True)
    last_seen = Column(DateTime, default=datetime.utcnow)
    registration_date = Column(DateTime, default=datetime.utcnow)
    device_info = Column(JSON)  # Additional device metadata
    sync_enabled = Column(Boolean, default=True)
    offline_storage_limit = Column(Integer, default=1073741824)  # 1GB in bytes
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="mobile_devices")
    sync_sessions = relationship("SyncSession", back_populates="device")
    offline_documents = relationship("OfflineDocument", back_populates="device")

class SyncSession(Base):
    __tablename__ = "sync_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("mobile_devices.id"), nullable=False)
    session_id = Column(String(255), unique=True, nullable=False, index=True)
    sync_type = Column(String(50), nullable=False)  # full, incremental, selective
    status = Column(String(50), nullable=False)  # SyncStatus enum
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    total_items = Column(Integer, default=0)
    synced_items = Column(Integer, default=0)
    failed_items = Column(Integer, default=0)
    data_transferred = Column(Integer, default=0)  # bytes
    error_message = Column(Text)
    sync_metadata = Column(JSON)
    last_sync_token = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    device = relationship("MobileDevice", back_populates="sync_sessions")
    sync_items = relationship("SyncItem", back_populates="session")
    conflicts = relationship("SyncConflict", back_populates="session")

class SyncItem(Base):
    __tablename__ = "sync_items"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sync_sessions.id"), nullable=False)
    item_type = Column(String(100), nullable=False)  # document, folder, user, etc.
    item_id = Column(String(255), nullable=False)
    action = Column(String(50), nullable=False)  # create, update, delete
    status = Column(String(50), nullable=False)  # pending, completed, failed
    priority = Column(Integer, default=0)
    retry_count = Column(Integer, default=0)
    error_message = Column(Text)
    item_data = Column(JSON)
    checksum = Column(String(255))
    size_bytes = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    session = relationship("SyncSession", back_populates="sync_items")

class SyncConflict(Base):
    __tablename__ = "sync_conflicts"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sync_sessions.id"), nullable=False)
    item_type = Column(String(100), nullable=False)
    item_id = Column(String(255), nullable=False)
    conflict_type = Column(String(100), nullable=False)  # version, deletion, permission
    server_version = Column(JSON)
    client_version = Column(JSON)
    resolution_strategy = Column(String(50))  # ConflictResolution enum
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime)
    resolved_by = Column(Integer, ForeignKey("users.id"))
    resolution_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    session = relationship("SyncSession", back_populates="conflicts")
    resolver = relationship("User")

class OfflineDocument(Base):
    __tablename__ = "offline_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("mobile_devices.id"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    download_status = Column(String(50), nullable=False)  # pending, downloading, completed, failed
    download_priority = Column(Integer, default=0)
    file_size = Column(Integer)
    downloaded_size = Column(Integer, default=0)
    local_path = Column(String(500))
    checksum = Column(String(255))
    expires_at = Column(DateTime)
    auto_download = Column(Boolean, default=False)
    download_on_wifi_only = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    device = relationship("MobileDevice", back_populates="offline_documents")
    document = relationship("Document")

class MobileSettings(Base):
    __tablename__ = "mobile_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    device_id = Column(Integer, ForeignKey("mobile_devices.id"))
    setting_key = Column(String(255), nullable=False)
    setting_value = Column(JSON)
    is_device_specific = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    device = relationship("MobileDevice")

class PushNotification(Base):
    __tablename__ = "push_notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("mobile_devices.id"), nullable=False)
    notification_type = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    payload = Column(JSON)
    status = Column(String(50), nullable=False)  # pending, sent, delivered, failed
    scheduled_at = Column(DateTime)
    sent_at = Column(DateTime)
    delivered_at = Column(DateTime)
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    device = relationship("MobileDevice")

class OfflineAction(Base):
    __tablename__ = "offline_actions"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("mobile_devices.id"), nullable=False)
    action_type = Column(String(100), nullable=False)  # create_document, update_document, etc.
    action_data = Column(JSON, nullable=False)
    status = Column(String(50), nullable=False)  # pending, processing, completed, failed
    priority = Column(Integer, default=0)
    retry_count = Column(Integer, default=0)
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime)
    
    # Relationships
    device = relationship("MobileDevice")

class MobileAnalytics(Base):
    __tablename__ = "mobile_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("mobile_devices.id"), nullable=False)
    event_type = Column(String(100), nullable=False)
    event_data = Column(JSON)
    session_id = Column(String(255))
    user_id = Column(Integer, ForeignKey("users.id"))
    timestamp = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    device = relationship("MobileDevice")
    user = relationship("User")

class SyncPolicy(Base):
    __tablename__ = "sync_policies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    policy_type = Column(String(100), nullable=False)  # user, device, global
    target_id = Column(Integer)  # user_id or device_id
    sync_frequency = Column(Integer)  # minutes
    auto_sync_enabled = Column(Boolean, default=True)
    wifi_only = Column(Boolean, default=False)
    battery_optimization = Column(Boolean, default=True)
    max_file_size = Column(Integer)  # bytes
    allowed_file_types = Column(JSON)
    sync_folders = Column(JSON)
    conflict_resolution = Column(String(50))  # ConflictResolution enum
    retention_days = Column(Integer, default=30)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class MobileSecurityLog(Base):
    __tablename__ = "mobile_security_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("mobile_devices.id"), nullable=False)
    event_type = Column(String(100), nullable=False)
    severity = Column(String(50), nullable=False)  # low, medium, high, critical
    description = Column(Text, nullable=False)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    location_data = Column(JSON)
    threat_indicators = Column(JSON)
    action_taken = Column(String(255))
    resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    device = relationship("MobileDevice")

class MobileAppVersion(Base):
    __tablename__ = "mobile_app_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    version_number = Column(String(100), nullable=False)
    platform = Column(String(50), nullable=False)  # ios, android
    build_number = Column(String(100))
    release_date = Column(DateTime, default=datetime.utcnow)
    is_required_update = Column(Boolean, default=False)
    min_supported_version = Column(String(100))
    download_url = Column(String(500))
    release_notes = Column(Text)
    file_size = Column(Integer)
    checksum = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)