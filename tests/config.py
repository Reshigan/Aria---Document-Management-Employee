"""
Test Configuration for Go-Live Testing
"""
import os

BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:8000")
FRONTEND_URL = os.getenv("TEST_FRONTEND_URL", "http://localhost:12001")
COMPANY_ID = os.getenv("TEST_COMPANY_ID", "6dbbf872-eebc-4341-8e2c-cac36587a5cb")

ADMIN_EMAIL = os.getenv("TEST_ADMIN_EMAIL", "admin@test.com")
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "admin123")
TEST_USER_EMAIL = os.getenv("TEST_USER_EMAIL", "user@test.com")
TEST_USER_PASSWORD = os.getenv("TEST_USER_PASSWORD", "user123")

TIMEOUT = int(os.getenv("TEST_TIMEOUT", "30"))
ENABLE_SEED = os.getenv("TEST_ENABLE_SEED", "true").lower() == "true"
ENABLE_CLEANUP = os.getenv("TEST_ENABLE_CLEANUP", "false").lower() == "true"

MAX_API_LATENCY_MS = int(os.getenv("MAX_API_LATENCY_MS", "500"))
MAX_P95_LATENCY_MS = int(os.getenv("MAX_P95_LATENCY_MS", "1500"))
MIN_P0_PASS_RATE = float(os.getenv("MIN_P0_PASS_RATE", "1.0"))  # 100%
MIN_P1_PASS_RATE = float(os.getenv("MIN_P1_PASS_RATE", "0.9"))  # 90%

TEST_PREFIX = "GOLIVE_TEST_"
