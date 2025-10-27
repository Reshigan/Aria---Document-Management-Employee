#!/usr/bin/env python3
"""
Auto-start backend with dependency installation
"""
import subprocess
import sys
import os

os.chdir('/workspace/project/Aria---Document-Management-Employee/backend')

# Common missing dependencies
deps = [
    'email-validator',
    'pyotp',
    'qrcode',
    'pillow',
    'python-multipart',
    'bcrypt',
    'passlib[bcrypt]',
    'python-jose[cryptography]',
    'reportlab',
    'openpyxl',
    'python-docx',
    'PyPDF2',
    'Pillow',
]

print("Installing dependencies...")
for dep in deps:
    try:
        subprocess.run([sys.executable, '-m', 'pip', 'install', dep, '-q'], 
                      check=False, capture_output=True)
    except:
        pass

print("Starting backend...")
subprocess.run([
    sys.executable, '-m', 'uvicorn', 
    'main:app', 
    '--host', '0.0.0.0', 
    '--port', '8000',
    '--reload'
])
