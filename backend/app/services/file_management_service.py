import os
import hashlib
import mimetypes
import shutil
import zipfile
import tempfile
from typing import List, Dict, Any, Optional, Tuple, BinaryIO
from datetime import datetime, timedelta
from pathlib import Path
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from app.models.file_management import (
    FileMetadata, FileChunk, FileShare, FileVersion, 
    FileAccessLog, FileArchive, FileDuplicate, FilePreview
)
from app.services.cache_service import cache_service, monitor_performance
import secrets
import json

class FileManagementService:
    def __init__(self, db: Session, storage_path: str = "/tmp/aria_files"):
        self.db = db
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)
        
        # Create subdirectories
        (self.storage_path / "files").mkdir(exist_ok=True)
        (self.storage_path / "chunks").mkdir(exist_ok=True)
        (self.storage_path / "previews").mkdir(exist_ok=True)
        (self.storage_path / "archives").mkdir(exist_ok=True)
        (self.storage_path / "temp").mkdir(exist_ok=True)

    # File Upload and Management
    @monitor_performance
    def upload_file(self, file_data: BinaryIO, filename: str, user_id: int,
                   metadata: Dict[str, Any] = None) -> FileMetadata:
        """Upload a complete file"""
        # Read file data
        file_content = file_data.read()
        file_size = len(file_content)
        
        # Generate hashes
        md5_hash = hashlib.md5(file_content).hexdigest()
        sha256_hash = hashlib.sha256(file_content).hexdigest()
        
        # Check for duplicates
        existing_file = self.db.query(FileMetadata).filter(
            FileMetadata.sha256_hash == sha256_hash
        ).first()
        
        if existing_file:
            # File already exists, create a reference or return existing
            return existing_file
        
        # Determine file properties
        mime_type, _ = mimetypes.guess_type(filename)
        file_extension = Path(filename).suffix.lower()
        content_type = self._determine_content_type(mime_type, file_extension)
        
        # Generate unique file ID and path
        file_id = self._generate_file_id()
        file_path = self.storage_path / "files" / f"{file_id}{file_extension}"
        
        # Save file to storage
        with open(file_path, 'wb') as f:
            f.write(file_content)
        
        # Extract extended metadata
        extended_metadata = self._extract_file_metadata(file_path, content_type)
        
        # Create file metadata record
        file_metadata = FileMetadata(
            file_id=file_id,
            filename=filename,
            original_filename=filename,
            file_path=str(file_path),
            file_size=file_size,
            mime_type=mime_type or 'application/octet-stream',
            file_extension=file_extension,
            md5_hash=md5_hash,
            sha256_hash=sha256_hash,
            content_type=content_type,
            extended_metadata=extended_metadata,
            is_processed=True,
            processing_status='completed'
        )
        
        self.db.add(file_metadata)
        self.db.commit()
        self.db.refresh(file_metadata)
        
        # Create initial version
        self._create_file_version(file_metadata, user_id, "Initial upload")
        
        # Generate previews asynchronously (simulate)
        self._generate_previews(file_metadata)
        
        # Log access
        self._log_file_access(file_metadata.id, 'upload', user_id)
        
        return file_metadata

    @monitor_performance
    def start_chunked_upload(self, filename: str, file_size: int, chunk_size: int = 1024*1024) -> Dict[str, Any]:
        """Start a chunked upload session"""
        upload_id = secrets.token_urlsafe(32)
        total_chunks = (file_size + chunk_size - 1) // chunk_size
        
        # Store upload session info in cache
        upload_info = {
            'upload_id': upload_id,
            'filename': filename,
            'file_size': file_size,
            'chunk_size': chunk_size,
            'total_chunks': total_chunks,
            'uploaded_chunks': [],
            'created_at': datetime.utcnow().isoformat()
        }
        
        cache_service.set(f"upload:{upload_id}", upload_info, 3600)  # 1 hour TTL
        
        return {
            'upload_id': upload_id,
            'chunk_size': chunk_size,
            'total_chunks': total_chunks
        }

    @monitor_performance
    def upload_chunk(self, upload_id: str, chunk_number: int, chunk_data: bytes) -> Dict[str, Any]:
        """Upload a file chunk"""
        # Get upload session info
        upload_info = cache_service.get(f"upload:{upload_id}")
        if not upload_info:
            raise ValueError("Upload session not found or expired")
        
        # Validate chunk
        if chunk_number < 0 or chunk_number >= upload_info['total_chunks']:
            raise ValueError("Invalid chunk number")
        
        # Save chunk to temporary storage
        chunk_path = self.storage_path / "chunks" / f"{upload_id}_{chunk_number}"
        with open(chunk_path, 'wb') as f:
            f.write(chunk_data)
        
        # Update upload info
        upload_info['uploaded_chunks'].append(chunk_number)
        upload_info['uploaded_chunks'] = list(set(upload_info['uploaded_chunks']))  # Remove duplicates
        cache_service.set(f"upload:{upload_id}", upload_info, 3600)
        
        return {
            'chunk_number': chunk_number,
            'uploaded_chunks': len(upload_info['uploaded_chunks']),
            'total_chunks': upload_info['total_chunks'],
            'is_complete': len(upload_info['uploaded_chunks']) == upload_info['total_chunks']
        }

    @monitor_performance
    def complete_chunked_upload(self, upload_id: str, user_id: int) -> FileMetadata:
        """Complete a chunked upload by assembling chunks"""
        # Get upload session info
        upload_info = cache_service.get(f"upload:{upload_id}")
        if not upload_info:
            raise ValueError("Upload session not found or expired")
        
        # Verify all chunks are uploaded
        if len(upload_info['uploaded_chunks']) != upload_info['total_chunks']:
            raise ValueError("Not all chunks have been uploaded")
        
        # Assemble file from chunks
        file_id = self._generate_file_id()
        filename = upload_info['filename']
        file_extension = Path(filename).suffix.lower()
        file_path = self.storage_path / "files" / f"{file_id}{file_extension}"
        
        with open(file_path, 'wb') as output_file:
            for chunk_num in sorted(upload_info['uploaded_chunks']):
                chunk_path = self.storage_path / "chunks" / f"{upload_id}_{chunk_num}"
                with open(chunk_path, 'rb') as chunk_file:
                    output_file.write(chunk_file.read())
                # Clean up chunk file
                os.remove(chunk_path)
        
        # Verify file size
        actual_size = os.path.getsize(file_path)
        if actual_size != upload_info['file_size']:
            raise ValueError("Assembled file size doesn't match expected size")
        
        # Generate hashes
        with open(file_path, 'rb') as f:
            file_content = f.read()
            md5_hash = hashlib.md5(file_content).hexdigest()
            sha256_hash = hashlib.sha256(file_content).hexdigest()
        
        # Create file metadata
        mime_type, _ = mimetypes.guess_type(filename)
        content_type = self._determine_content_type(mime_type, file_extension)
        extended_metadata = self._extract_file_metadata(file_path, content_type)
        
        file_metadata = FileMetadata(
            file_id=file_id,
            filename=filename,
            original_filename=filename,
            file_path=str(file_path),
            file_size=actual_size,
            mime_type=mime_type or 'application/octet-stream',
            file_extension=file_extension,
            md5_hash=md5_hash,
            sha256_hash=sha256_hash,
            content_type=content_type,
            extended_metadata=extended_metadata,
            is_processed=True,
            processing_status='completed'
        )
        
        self.db.add(file_metadata)
        self.db.commit()
        self.db.refresh(file_metadata)
        
        # Create initial version
        self._create_file_version(file_metadata, user_id, "Chunked upload")
        
        # Clean up upload session
        cache_service.delete(f"upload:{upload_id}")
        
        # Generate previews
        self._generate_previews(file_metadata)
        
        return file_metadata

    # File Sharing
    @monitor_performance
    def create_file_share(self, file_id: int, share_type: str, created_by: int,
                         password: str = None, expires_at: datetime = None,
                         max_downloads: int = None, **permissions) -> FileShare:
        """Create a file share link"""
        file_metadata = self.db.query(FileMetadata).filter(FileMetadata.file_id == file_id).first()
        if not file_metadata:
            raise ValueError("File not found")
        
        share_token = secrets.token_urlsafe(32)
        password_hash = None
        if password:
            password_hash = hashlib.sha256(password.encode()).hexdigest()
        
        file_share = FileShare(
            file_metadata_id=file_metadata.id,
            share_token=share_token,
            share_type=share_type,
            password_hash=password_hash,
            expires_at=expires_at,
            max_downloads=max_downloads,
            created_by=created_by,
            can_download=permissions.get('can_download', True),
            can_view=permissions.get('can_view', True),
            can_comment=permissions.get('can_comment', False)
        )
        
        self.db.add(file_share)
        self.db.commit()
        self.db.refresh(file_share)
        
        return file_share

    @monitor_performance
    def access_shared_file(self, share_token: str, password: str = None,
                          user_id: int = None, ip_address: str = None) -> Dict[str, Any]:
        """Access a shared file"""
        file_share = self.db.query(FileShare).filter(
            and_(FileShare.share_token == share_token, FileShare.is_active == True)
        ).first()
        
        if not file_share:
            raise ValueError("Share not found or inactive")
        
        # Check expiration
        if file_share.expires_at and datetime.utcnow() > file_share.expires_at:
            raise ValueError("Share has expired")
        
        # Check download limit
        if file_share.max_downloads and file_share.download_count >= file_share.max_downloads:
            raise ValueError("Download limit exceeded")
        
        # Check password
        if file_share.password_hash:
            if not password:
                raise ValueError("Password required")
            if hashlib.sha256(password.encode()).hexdigest() != file_share.password_hash:
                raise ValueError("Invalid password")
        
        # Update access tracking
        file_share.access_count += 1
        file_share.last_accessed = datetime.utcnow()
        
        # Log access
        self._log_file_access(
            file_share.file_metadata_id, 'share_access', user_id,
            file_share_id=file_share.id, ip_address=ip_address
        )
        
        self.db.commit()
        
        return {
            'file_metadata': file_share.file_metadata,
            'share': file_share,
            'can_download': file_share.can_download,
            'can_view': file_share.can_view,
            'can_comment': file_share.can_comment
        }

    # File Versioning
    @monitor_performance
    def create_file_version(self, file_id: int, new_file_data: BinaryIO,
                           user_id: int, description: str = None) -> FileVersion:
        """Create a new version of an existing file"""
        file_metadata = self.db.query(FileMetadata).filter(FileMetadata.file_id == file_id).first()
        if not file_metadata:
            raise ValueError("File not found")
        
        # Read new file data
        new_content = new_file_data.read()
        new_size = len(new_content)
        new_hash = hashlib.sha256(new_content).hexdigest()
        
        # Get next version number
        latest_version = self.db.query(FileVersion).filter(
            FileVersion.file_metadata_id == file_metadata.id
        ).order_by(desc(FileVersion.version_number)).first()
        
        next_version = (latest_version.version_number + 1) if latest_version else 1
        
        # Save new version file
        version_path = self.storage_path / "files" / f"{file_metadata.file_id}_v{next_version}{file_metadata.file_extension}"
        with open(version_path, 'wb') as f:
            f.write(new_content)
        
        # Mark current version as not current
        self.db.query(FileVersion).filter(
            and_(FileVersion.file_metadata_id == file_metadata.id, FileVersion.is_current == True)
        ).update({'is_current': False})
        
        # Create new version record
        file_version = FileVersion(
            file_metadata_id=file_metadata.id,
            version_number=next_version,
            version_description=description,
            file_path=str(version_path),
            file_size=new_size,
            file_hash=new_hash,
            is_current=True,
            created_by=user_id
        )
        
        self.db.add(file_version)
        
        # Update main file metadata
        file_metadata.file_path = str(version_path)
        file_metadata.file_size = new_size
        file_metadata.sha256_hash = new_hash
        file_metadata.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(file_version)
        
        return file_version

    # Duplicate Detection
    @monitor_performance
    def detect_duplicates(self, similarity_threshold: float = 0.95) -> List[Dict[str, Any]]:
        """Detect duplicate files based on hash and content similarity"""
        # Find exact hash matches
        hash_duplicates = self.db.query(
            FileMetadata.sha256_hash,
            func.count(FileMetadata.id).label('count'),
            func.group_concat(FileMetadata.id).label('file_ids')
        ).group_by(FileMetadata.sha256_hash).having(func.count(FileMetadata.id) > 1).all()
        
        duplicate_groups = []
        
        for hash_group in hash_duplicates:
            file_ids = [int(fid) for fid in hash_group.file_ids.split(',')]
            files = self.db.query(FileMetadata).filter(FileMetadata.id.in_(file_ids)).all()
            
            # Create duplicate group
            group_id = hash_group.sha256_hash
            
            for file_meta in files:
                # Check if already recorded
                existing = self.db.query(FileDuplicate).filter(
                    FileDuplicate.file_metadata_id == file_meta.id
                ).first()
                
                if not existing:
                    duplicate = FileDuplicate(
                        duplicate_group_id=group_id,
                        file_metadata_id=file_meta.id,
                        similarity_score=1.0,
                        detection_method='hash',
                        hash_match=True,
                        size_match=True
                    )
                    self.db.add(duplicate)
            
            duplicate_groups.append({
                'group_id': group_id,
                'files': files,
                'similarity_score': 1.0,
                'detection_method': 'hash'
            })
        
        self.db.commit()
        return duplicate_groups

    # File Archives
    @monitor_performance
    def create_archive(self, file_ids: List[int], archive_name: str, 
                      archive_type: str = 'zip', created_by: int) -> FileArchive:
        """Create an archive from multiple files"""
        files = self.db.query(FileMetadata).filter(FileMetadata.file_id.in_(file_ids)).all()
        if not files:
            raise ValueError("No files found to archive")
        
        # Create archive record
        archive = FileArchive(
            archive_name=archive_name,
            archive_type=archive_type,
            file_count=len(files),
            created_by=created_by,
            status='creating'
        )
        
        self.db.add(archive)
        self.db.commit()
        self.db.refresh(archive)
        
        # Create archive file
        archive_path = self.storage_path / "archives" / f"{archive.id}_{archive_name}.{archive_type}"
        
        try:
            total_size = 0
            file_list = []
            
            if archive_type == 'zip':
                with zipfile.ZipFile(archive_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                    for file_meta in files:
                        file_path = Path(file_meta.file_path)
                        if file_path.exists():
                            zipf.write(file_path, file_meta.filename)
                            total_size += file_meta.file_size
                            file_list.append({
                                'id': file_meta.file_id,
                                'name': file_meta.filename,
                                'size': file_meta.file_size
                            })
            
            # Update archive record
            compressed_size = os.path.getsize(archive_path)
            compression_ratio = (total_size - compressed_size) / total_size if total_size > 0 else 0
            
            archive.archive_path = str(archive_path)
            archive.total_size = total_size
            archive.compressed_size = compressed_size
            archive.compression_ratio = compression_ratio
            archive.file_list = file_list
            archive.archive_hash = self._calculate_file_hash(archive_path)
            archive.status = 'completed'
            archive.progress_percentage = 100.0
            archive.completed_at = datetime.utcnow()
            
            self.db.commit()
            
        except Exception as e:
            archive.status = 'failed'
            archive.error_message = str(e)
            self.db.commit()
            raise
        
        return archive

    # Helper Methods
    def _generate_file_id(self) -> int:
        """Generate unique file ID"""
        import time
        return int(time.time() * 1000000) % 2147483647  # Keep within int range

    def _determine_content_type(self, mime_type: str, file_extension: str) -> str:
        """Determine content type category"""
        if not mime_type:
            return 'unknown'
        
        if mime_type.startswith('image/'):
            return 'image'
        elif mime_type.startswith('video/'):
            return 'video'
        elif mime_type.startswith('audio/'):
            return 'audio'
        elif mime_type in ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']:
            return 'document'
        elif mime_type.startswith('text/'):
            return 'text'
        elif mime_type in ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed']:
            return 'archive'
        else:
            return 'other'

    def _extract_file_metadata(self, file_path: Path, content_type: str) -> Dict[str, Any]:
        """Extract extended metadata from file"""
        metadata = {}
        
        try:
            if content_type == 'image':
                # For images, we could use PIL to extract EXIF data
                metadata['extracted_with'] = 'basic'
            elif content_type == 'document':
                # For documents, we could extract properties
                metadata['extracted_with'] = 'basic'
            
            # Basic file stats
            stat = file_path.stat()
            metadata.update({
                'created_time': datetime.fromtimestamp(stat.st_ctime).isoformat(),
                'modified_time': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                'access_time': datetime.fromtimestamp(stat.st_atime).isoformat()
            })
            
        except Exception as e:
            metadata['extraction_error'] = str(e)
        
        return metadata

    def _create_file_version(self, file_metadata: FileMetadata, user_id: int, description: str):
        """Create initial file version"""
        file_version = FileVersion(
            file_metadata_id=file_metadata.id,
            version_number=1,
            version_description=description,
            file_path=file_metadata.file_path,
            file_size=file_metadata.file_size,
            file_hash=file_metadata.sha256_hash,
            is_current=True,
            created_by=user_id
        )
        
        self.db.add(file_version)
        self.db.commit()

    def _generate_previews(self, file_metadata: FileMetadata):
        """Generate file previews (thumbnails, etc.)"""
        # This would integrate with image processing libraries
        # For now, just create placeholder records
        
        if file_metadata.content_type in ['image', 'document', 'video']:
            preview_types = ['thumbnail', 'small', 'medium']
            
            for preview_type in preview_types:
                preview = FilePreview(
                    file_metadata_id=file_metadata.id,
                    preview_type=preview_type,
                    preview_format='jpg',
                    preview_path=f"/previews/{file_metadata.file_id}_{preview_type}.jpg",
                    preview_size=0,  # Would be actual size
                    generation_method='placeholder',
                    is_generated=False,
                    generation_status='pending'
                )
                
                self.db.add(preview)
        
        self.db.commit()

    def _log_file_access(self, file_metadata_id: int, access_type: str, user_id: int = None,
                        file_share_id: int = None, ip_address: str = None):
        """Log file access for audit trail"""
        access_log = FileAccessLog(
            file_metadata_id=file_metadata_id,
            file_share_id=file_share_id,
            access_type=access_type,
            user_id=user_id,
            ip_address=ip_address,
            status_code=200,
            response_time_ms=0.0  # Would be actual response time
        )
        
        self.db.add(access_log)
        self.db.commit()

    def _calculate_file_hash(self, file_path: Path) -> str:
        """Calculate SHA256 hash of file"""
        hash_sha256 = hashlib.sha256()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_sha256.update(chunk)
        return hash_sha256.hexdigest()

    # File Management Operations
    @monitor_performance
    def get_file_info(self, file_id: int) -> Optional[FileMetadata]:
        """Get comprehensive file information"""
        return self.db.query(FileMetadata).filter(FileMetadata.file_id == file_id).first()

    @monitor_performance
    def delete_file(self, file_id: int, user_id: int) -> bool:
        """Delete file and all associated data"""
        file_metadata = self.db.query(FileMetadata).filter(FileMetadata.file_id == file_id).first()
        if not file_metadata:
            return False
        
        try:
            # Delete physical file
            file_path = Path(file_metadata.file_path)
            if file_path.exists():
                os.remove(file_path)
            
            # Delete versions
            versions = self.db.query(FileVersion).filter(FileVersion.file_metadata_id == file_metadata.id).all()
            for version in versions:
                version_path = Path(version.file_path)
                if version_path.exists():
                    os.remove(version_path)
            
            # Delete previews
            previews = self.db.query(FilePreview).filter(FilePreview.file_metadata_id == file_metadata.id).all()
            for preview in previews:
                preview_path = Path(preview.preview_path)
                if preview_path.exists():
                    os.remove(preview_path)
            
            # Log deletion
            self._log_file_access(file_metadata.id, 'delete', user_id)
            
            # Delete database records (cascading will handle related records)
            self.db.delete(file_metadata)
            self.db.commit()
            
            return True
            
        except Exception as e:
            self.db.rollback()
            raise e

    @monitor_performance
    def get_file_statistics(self) -> Dict[str, Any]:
        """Get comprehensive file management statistics"""
        total_files = self.db.query(FileMetadata).count()
        total_size = self.db.query(func.sum(FileMetadata.file_size)).scalar() or 0
        
        # Content type breakdown
        content_types = self.db.query(
            FileMetadata.content_type,
            func.count(FileMetadata.id).label('count'),
            func.sum(FileMetadata.file_size).label('total_size')
        ).group_by(FileMetadata.content_type).all()
        
        # File extension breakdown
        extensions = self.db.query(
            FileMetadata.file_extension,
            func.count(FileMetadata.id).label('count')
        ).group_by(FileMetadata.file_extension).order_by(desc('count')).limit(10).all()
        
        # Recent uploads
        recent_uploads = self.db.query(FileMetadata).order_by(desc(FileMetadata.created_at)).limit(10).all()
        
        # Duplicate statistics
        duplicate_count = self.db.query(FileDuplicate).filter(FileDuplicate.is_resolved == False).count()
        
        return {
            'total_files': total_files,
            'total_size': total_size,
            'total_size_formatted': self._format_file_size(total_size),
            'content_types': [
                {
                    'type': ct.content_type,
                    'count': ct.count,
                    'size': ct.total_size or 0,
                    'size_formatted': self._format_file_size(ct.total_size or 0)
                }
                for ct in content_types
            ],
            'top_extensions': [
                {'extension': ext.file_extension, 'count': ext.count}
                for ext in extensions
            ],
            'recent_uploads': [
                {
                    'id': f.file_id,
                    'filename': f.filename,
                    'size': f.file_size,
                    'created_at': f.created_at.isoformat()
                }
                for f in recent_uploads
            ],
            'duplicate_files': duplicate_count
        }

    def _format_file_size(self, size_bytes: int) -> str:
        """Format file size in human readable format"""
        if size_bytes == 0:
            return "0 B"
        
        size_names = ["B", "KB", "MB", "GB", "TB"]
        i = 0
        while size_bytes >= 1024 and i < len(size_names) - 1:
            size_bytes /= 1024.0
            i += 1
        
        return f"{size_bytes:.1f} {size_names[i]}"