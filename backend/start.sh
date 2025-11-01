#!/bin/bash

# Activate virtual environment
source /home/ubuntu/aria-erp/backend/venv/bin/activate

# Start FastAPI with uvicorn
cd /home/ubuntu/aria-erp/backend
exec uvicorn erp_api:app --host 0.0.0.0 --port 8000
