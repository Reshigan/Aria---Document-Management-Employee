"""
Encryption Service
Handles data encryption at rest and in transit
"""
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
import os
import base64
import hashlib
import secrets
from typing import Optional, Dict, Any
import logging
import json
import pyotp
import qrcode
import io

logger = logging.getLogger(__name__)


class EncryptionService:
    """Service for encrypting and decrypting sensitive data"""
    
    def __init__(self, master_key: Optional[str] = None):
        """
        Initialize encryption service
        
        Args:
            master_key: Master encryption key (should be stored securely in environment)
        """
        if master_key:
            self.master_key = master_key.encode()
        else:
            # Generate a master key if none provided (store this securely!)
            self.master_key = Fernet.generate_key()
            logger.warning("Generated new encryption key - store this securely!")
        
        self.fernet = Fernet(self.master_key)
    
    # ==================== Symmetric Encryption ====================
    
    def encrypt_string(self, plaintext: str) -> str:
        """
        Encrypt a string using Fernet (symmetric encryption)
        
        Args:
            plaintext: String to encrypt
            
        Returns:
            Base64 encoded encrypted string
        """
        try:
            if not plaintext:
                return ""
            
            encrypted = self.fernet.encrypt(plaintext.encode())
            return base64.urlsafe_b64encode(encrypted).decode('utf-8')
        except Exception as e:
            logger.error(f"Encryption error: {str(e)}")
            raise
    
    def decrypt_string(self, encrypted_text: str) -> str:
        """
        Decrypt a string encrypted with encrypt_string
        
        Args:
            encrypted_text: Base64 encoded encrypted string
            
        Returns:
            Decrypted plaintext string
        """
        try:
            if not encrypted_text:
                return ""
            
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_text.encode('utf-8'))
            decrypted = self.fernet.decrypt(encrypted_bytes)
            return decrypted.decode('utf-8')
        except Exception as e:
            logger.error(f"Decryption error: {str(e)}")
            raise
    
    def encrypt_dict(self, data: Dict[str, Any]) -> str:
        """
        Encrypt a dictionary by converting to JSON first
        
        Args:
            data: Dictionary to encrypt
            
        Returns:
            Encrypted string
        """
        try:
            json_str = json.dumps(data)
            return self.encrypt_string(json_str)
        except Exception as e:
            logger.error(f"Dictionary encryption error: {str(e)}")
            raise
    
    def decrypt_dict(self, encrypted_text: str) -> Dict[str, Any]:
        """
        Decrypt an encrypted dictionary
        
        Args:
            encrypted_text: Encrypted string
            
        Returns:
            Decrypted dictionary
        """
        try:
            json_str = self.decrypt_string(encrypted_text)
            return json.loads(json_str)
        except Exception as e:
            logger.error(f"Dictionary decryption error: {str(e)}")
            raise
    
    def encrypt_file_content(self, content: bytes) -> bytes:
        """
        Encrypt file content
        
        Args:
            content: File content as bytes
            
        Returns:
            Encrypted bytes
        """
        try:
            return self.fernet.encrypt(content)
        except Exception as e:
            logger.error(f"File encryption error: {str(e)}")
            raise
    
    def decrypt_file_content(self, encrypted_content: bytes) -> bytes:
        """
        Decrypt file content
        
        Args:
            encrypted_content: Encrypted file content
            
        Returns:
            Decrypted bytes
        """
        try:
            return self.fernet.decrypt(encrypted_content)
        except Exception as e:
            logger.error(f"File decryption error: {str(e)}")
            raise
    
    # ==================== Field-Level Encryption ====================
    
    def encrypt_field(self, field_value: str, field_key: Optional[str] = None) -> str:
        """
        Encrypt a database field with optional field-specific key
        
        Args:
            field_value: Value to encrypt
            field_key: Optional field-specific key
            
        Returns:
            Encrypted value
        """
        try:
            if field_key:
                # Use field-specific key derived from master key
                derived_key = self._derive_key(field_key)
                fernet = Fernet(derived_key)
                encrypted = fernet.encrypt(field_value.encode())
            else:
                encrypted = self.fernet.encrypt(field_value.encode())
            
            return base64.urlsafe_b64encode(encrypted).decode('utf-8')
        except Exception as e:
            logger.error(f"Field encryption error: {str(e)}")
            raise
    
    def decrypt_field(self, encrypted_value: str, field_key: Optional[str] = None) -> str:
        """
        Decrypt a database field
        
        Args:
            encrypted_value: Encrypted value
            field_key: Optional field-specific key used during encryption
            
        Returns:
            Decrypted value
        """
        try:
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_value.encode('utf-8'))
            
            if field_key:
                derived_key = self._derive_key(field_key)
                fernet = Fernet(derived_key)
                decrypted = fernet.decrypt(encrypted_bytes)
            else:
                decrypted = self.fernet.decrypt(encrypted_bytes)
            
            return decrypted.decode('utf-8')
        except Exception as e:
            logger.error(f"Field decryption error: {str(e)}")
            raise
    
    # ==================== Hashing ====================
    
    def hash_data(self, data: str, salt: Optional[str] = None) -> str:
        """
        Hash data using SHA-256
        
        Args:
            data: Data to hash
            salt: Optional salt
            
        Returns:
            Hexadecimal hash string
        """
        if salt:
            data = f"{data}{salt}"
        return hashlib.sha256(data.encode()).hexdigest()
    
    def verify_hash(self, data: str, hash_value: str, salt: Optional[str] = None) -> bool:
        """
        Verify data against a hash
        
        Args:
            data: Original data
            hash_value: Hash to verify against
            salt: Optional salt used during hashing
            
        Returns:
            True if hash matches, False otherwise
        """
        computed_hash = self.hash_data(data, salt)
        return computed_hash == hash_value
    
    def generate_salt(self, length: int = 32) -> str:
        """
        Generate a random salt
        
        Args:
            length: Length of salt in bytes
            
        Returns:
            Hexadecimal salt string
        """
        return secrets.token_hex(length)
    
    # ==================== API Key Encryption ====================
    
    def encrypt_api_key(self, api_key: str) -> Dict[str, str]:
        """
        Encrypt an API key and return encrypted value and prefix
        
        Args:
            api_key: API key to encrypt
            
        Returns:
            Dictionary with encrypted_key and key_prefix
        """
        encrypted = self.encrypt_string(api_key)
        prefix = api_key[:10] if len(api_key) >= 10 else api_key
        
        return {
            "encrypted_key": encrypted,
            "key_prefix": prefix,
            "key_hash": self.hash_data(api_key)
        }
    
    def decrypt_api_key(self, encrypted_key: str) -> str:
        """
        Decrypt an API key
        
        Args:
            encrypted_key: Encrypted API key
            
        Returns:
            Decrypted API key
        """
        return self.decrypt_string(encrypted_key)
    
    # ==================== Password Encryption ====================
    
    def encrypt_password_for_storage(self, password: str) -> Dict[str, str]:
        """
        Encrypt a password for secure storage (e.g., for third-party integrations)
        Note: This is different from password hashing for authentication
        
        Args:
            password: Password to encrypt
            
        Returns:
            Dictionary with encrypted_password and salt
        """
        salt = self.generate_salt()
        encrypted = self.encrypt_field(password, salt)
        
        return {
            "encrypted_password": encrypted,
            "salt": salt
        }
    
    def decrypt_password_from_storage(self, encrypted_password: str, salt: str) -> str:
        """
        Decrypt a stored password
        
        Args:
            encrypted_password: Encrypted password
            salt: Salt used during encryption
            
        Returns:
            Decrypted password
        """
        return self.decrypt_field(encrypted_password, salt)
    
    # ==================== Database Encryption ====================
    
    def encrypt_sensitive_fields(self, data: Dict[str, Any], sensitive_fields: list) -> Dict[str, Any]:
        """
        Encrypt sensitive fields in a dictionary
        
        Args:
            data: Dictionary containing data
            sensitive_fields: List of field names to encrypt
            
        Returns:
            Dictionary with encrypted fields
        """
        encrypted_data = data.copy()
        
        for field in sensitive_fields:
            if field in encrypted_data and encrypted_data[field]:
                encrypted_data[field] = self.encrypt_field(str(encrypted_data[field]))
        
        return encrypted_data
    
    def decrypt_sensitive_fields(self, data: Dict[str, Any], sensitive_fields: list) -> Dict[str, Any]:
        """
        Decrypt sensitive fields in a dictionary
        
        Args:
            data: Dictionary containing encrypted data
            sensitive_fields: List of field names to decrypt
            
        Returns:
            Dictionary with decrypted fields
        """
        decrypted_data = data.copy()
        
        for field in sensitive_fields:
            if field in decrypted_data and decrypted_data[field]:
                try:
                    decrypted_data[field] = self.decrypt_field(decrypted_data[field])
                except Exception as e:
                    logger.error(f"Error decrypting field {field}: {str(e)}")
                    decrypted_data[field] = None
        
        return decrypted_data
    
    # ==================== Utility Methods ====================
    
    def _derive_key(self, key_material: str) -> bytes:
        """
        Derive an encryption key from key material using PBKDF2
        
        Args:
            key_material: Input key material
            
        Returns:
            Derived key suitable for Fernet
        """
        kdf = PBKDF2(
            algorithm=hashes.SHA256(),
            length=32,
            salt=self.master_key[:16],  # Use part of master key as salt
            iterations=100000,
            backend=default_backend()
        )
        key = base64.urlsafe_b64encode(kdf.derive(key_material.encode()))
        return key
    
    def generate_encryption_key(self) -> str:
        """
        Generate a new encryption key
        
        Returns:
            Base64 encoded encryption key
        """
        return Fernet.generate_key().decode('utf-8')
    
    def rotate_encryption_key(self, old_key: str, new_key: str, encrypted_data: str) -> str:
        """
        Re-encrypt data with a new key
        
        Args:
            old_key: Old encryption key
            new_key: New encryption key
            encrypted_data: Data encrypted with old key
            
        Returns:
            Data encrypted with new key
        """
        # Decrypt with old key
        old_fernet = Fernet(old_key.encode())
        decrypted = old_fernet.decrypt(base64.urlsafe_b64decode(encrypted_data.encode('utf-8')))
        
        # Encrypt with new key
        new_fernet = Fernet(new_key.encode())
        encrypted = new_fernet.encrypt(decrypted)
        
        return base64.urlsafe_b64encode(encrypted).decode('utf-8')


# ==================== Two-Factor Authentication Service ====================

class TwoFactorAuthService:
    """Service for managing two-factor authentication"""
    
    def __init__(self):
        self.issuer_name = "ARIA Document Management"
    
    def generate_secret(self) -> str:
        """
        Generate a new TOTP secret
        
        Returns:
            Base32 encoded secret
        """
        return pyotp.random_base32()
    
    def generate_qr_code(self, user_email: str, secret: str) -> str:
        """
        Generate QR code for TOTP setup
        
        Args:
            user_email: User's email address
            secret: TOTP secret
            
        Returns:
            Base64 encoded QR code image
        """
        try:
            # Create provisioning URI
            totp = pyotp.TOTP(secret)
            uri = totp.provisioning_uri(
                name=user_email,
                issuer_name=self.issuer_name
            )
            
            # Generate QR code
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(uri)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            
            # Convert to base64
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            return f"data:image/png;base64,{img_base64}"
        except Exception as e:
            logger.error(f"Error generating QR code: {str(e)}")
            raise
    
    def verify_totp(self, secret: str, token: str) -> bool:
        """
        Verify a TOTP token
        
        Args:
            secret: User's TOTP secret
            token: 6-digit token to verify
            
        Returns:
            True if valid, False otherwise
        """
        try:
            totp = pyotp.TOTP(secret)
            return totp.verify(token, valid_window=1)
        except Exception as e:
            logger.error(f"Error verifying TOTP: {str(e)}")
            return False
    
    def generate_backup_codes(self, count: int = 10) -> list:
        """
        Generate backup codes for 2FA
        
        Args:
            count: Number of backup codes to generate
            
        Returns:
            List of backup codes
        """
        codes = []
        for _ in range(count):
            code = f"{secrets.randbelow(10000):04d}-{secrets.randbelow(10000):04d}"
            codes.append(code)
        return codes
    
    def hash_backup_code(self, code: str) -> str:
        """
        Hash a backup code for storage
        
        Args:
            code: Backup code
            
        Returns:
            Hashed code
        """
        return hashlib.sha256(code.encode()).hexdigest()
    
    def verify_backup_code(self, code: str, hashed_code: str) -> bool:
        """
        Verify a backup code
        
        Args:
            code: Backup code to verify
            hashed_code: Stored hashed code
            
        Returns:
            True if valid, False otherwise
        """
        return self.hash_backup_code(code) == hashed_code
