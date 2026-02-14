"""
Unit tests for ARIA ERP configuration module.
"""
import pytest
from unittest.mock import patch


class TestSettings:
    def test_settings_has_required_fields(self):
        from app.core.config import settings
        assert hasattr(settings, 'APP_NAME')
        assert hasattr(settings, 'APP_VERSION')
        assert hasattr(settings, 'ENVIRONMENT')
        assert hasattr(settings, 'SECRET_KEY')
        assert hasattr(settings, 'JWT_SECRET_KEY')
        assert hasattr(settings, 'JWT_ALGORITHM')
        assert hasattr(settings, 'DATABASE_URL')

    def test_default_app_name(self):
        from app.core.config import settings
        assert settings.APP_NAME == "ARIA ERP"

    def test_default_app_version(self):
        from app.core.config import settings
        assert settings.APP_VERSION == "1.0.0"

    def test_default_environment(self):
        from app.core.config import settings
        assert settings.ENVIRONMENT == "development"

    def test_jwt_algorithm(self):
        from app.core.config import settings
        assert settings.JWT_ALGORITHM == "HS256"

    def test_access_token_expire_minutes(self):
        from app.core.config import settings
        assert settings.ACCESS_TOKEN_EXPIRE_MINUTES == 30

    def test_refresh_token_expire_days(self):
        from app.core.config import settings
        assert settings.REFRESH_TOKEN_EXPIRE_DAYS == 7

    def test_api_v1_prefix(self):
        from app.core.config import settings
        assert settings.API_V1_PREFIX == "/api/v1"

    def test_cors_origins_returns_list(self):
        from app.core.config import settings
        origins = settings.get_cors_origins()
        assert isinstance(origins, list)
        assert len(origins) > 0

    def test_cors_origins_splits_comma_separated(self):
        from app.core.config import Settings
        s = Settings(CORS_ORIGINS="http://localhost:3000,http://localhost:5173")
        origins = s.get_cors_origins()
        assert "http://localhost:3000" in origins
        assert "http://localhost:5173" in origins

    def test_database_pool_size(self):
        from app.core.config import settings
        assert settings.DATABASE_POOL_SIZE == 5
        assert settings.DATABASE_MAX_OVERFLOW == 10

    def test_max_file_size(self):
        from app.core.config import settings
        assert settings.MAX_FILE_SIZE_MB == 10

    def test_upload_dir(self):
        from app.core.config import settings
        assert settings.UPLOAD_DIR == "./uploads"

    def test_default_openai_model(self):
        from app.core.config import settings
        assert settings.OPENAI_MODEL == "gpt-4-turbo-preview"

    def test_sa_specific_settings(self):
        from app.core.config import settings
        assert "sars" in settings.SARS_API_URL.lower()
