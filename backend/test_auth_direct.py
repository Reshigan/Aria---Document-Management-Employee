#!/usr/bin/env python3
"""
Direct auth test
"""
import sys
sys.path.insert(0, '/workspace/project/aria-erp/backend')

from app.core.security import get_password_hash, verify_password

# Test password hashing
password = "AdminPass123!"
print(f"Original password: {password}")

hash1 = get_password_hash(password)
print(f"Hash: {hash1}")

# Test verification
result = verify_password(password, hash1)
print(f"Verification result: {result}")

# Test with wrong password
result2 = verify_password("WrongPass", hash1)
print(f"Wrong password verification: {result2}")
