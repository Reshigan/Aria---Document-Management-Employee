"""
Storage service for file management
Supports local filesystem and MinIO S3-compatible storage
"""
import os
import shutil
from pathlib import Path
from typing import BinaryIO, Optional
from datetime import datetime
import uuid
import aiofiles
import magic

from backend.core.config import settings


class StorageService:
    """
    File storage service with support for local and cloud storage
    """
    
    def __init__(self):
        self.storage_type = getattr(settings, 'STORAGE_TYPE', 'local')
        self.base_path = Path(getattr(settings, 'STORAGE_PATH', './storage'))
        
        # Create base directories
        self.base_path.mkdir(parents=True, exist_ok=True)
        (self.base_path / 'uploads').mkdir(exist_ok=True)
        (self.base_path / 'processed').mkdir(exist_ok=True)
        (self.base_path / 'temp').mkdir(exist_ok=True)
    
    def get_file_type(self, file_path: str) -> str:
        """
        Detect file MIME type
        """
        try:
            return magic.from_file(file_path, mime=True)
        except Exception:
            # Fallback to extension-based detection
            ext = Path(file_path).suffix.lower()
            mime_types = {
                '.pdf': 'application/pdf',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.tiff': 'image/tiff',
                '.tif': 'image/tiff',
            }
            return mime_types.get(ext, 'application/octet-stream')
    
    def generate_filename(self, original_filename: str) -> tuple[str, str]:
        """
        Generate unique filename
        Returns: (unique_name, original_name)
        """
        ext = Path(original_filename).suffix
        unique_name = f"{uuid.uuid4()}{ext}"
        return unique_name, original_filename
    
    async def save_upload(self, file_content: bytes, filename: str) -> dict:
        """
        Save uploaded file
        Returns file info dict
        """
        unique_name, original_name = self.generate_filename(filename)
        file_path = self.base_path / 'uploads' / unique_name
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(file_content)
        
        # Get file info
        file_size = len(file_content)
        mime_type = self.get_file_type(str(file_path))
        
        return {
            'unique_name': unique_name,
            'original_name': original_name,
            'file_path': str(file_path),
            'file_size': file_size,
            'mime_type': mime_type,
            'uploaded_at': datetime.utcnow()
        }
    
    async def get_file(self, unique_name: str) -> Optional[bytes]:
        """
        Retrieve file content
        """
        file_path = self.base_path / 'uploads' / unique_name
        
        if not file_path.exists():
            return None
        
        async with aiofiles.open(file_path, 'rb') as f:
            return await f.read()
    
    async def delete_file(self, unique_name: str) -> bool:
        """
        Delete file
        """
        file_path = self.base_path / 'uploads' / unique_name
        
        try:
            if file_path.exists():
                os.remove(file_path)
                return True
            return False
        except Exception:
            return False
    
    async def move_to_processed(self, unique_name: str) -> bool:
        """
        Move file to processed folder
        """
        src = self.base_path / 'uploads' / unique_name
        dst = self.base_path / 'processed' / unique_name
        
        try:
            if src.exists():
                shutil.move(str(src), str(dst))
                return True
            return False
        except Exception:
            return False
    
    def get_file_path(self, unique_name: str, folder: str = 'uploads') -> Path:
        """
        Get full file path
        """
        return self.base_path / folder / unique_name


# Global storage service instance
storage_service = StorageService()
