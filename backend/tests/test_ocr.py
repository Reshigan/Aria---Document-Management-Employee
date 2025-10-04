"""
Tests for OCR service
"""
import pytest
from pathlib import Path
from backend.services.processing.ocr_service import ocr_service


class TestOCRService:
    """Test OCR service functionality"""
    
    def test_ocr_service_initialization(self):
        """Test OCR service initializes correctly"""
        assert ocr_service is not None
        assert ocr_service.languages == "eng"
    
    @pytest.mark.skipif(not Path("/usr/bin/tesseract").exists(), reason="Tesseract not installed")
    def test_extract_text_from_image(self, tmp_path):
        """Test text extraction from image"""
        # This would need a real test image
        # For now, we test that the method exists
        assert hasattr(ocr_service, 'extract_text_from_image')
        assert callable(ocr_service.extract_text_from_image)
    
    @pytest.mark.skipif(not Path("/usr/bin/tesseract").exists(), reason="Tesseract not installed")
    def test_extract_text_from_pdf(self):
        """Test text extraction from PDF"""
        assert hasattr(ocr_service, 'extract_text_from_pdf')
        assert callable(ocr_service.extract_text_from_pdf)
    
    def test_process_document_unsupported_type(self, tmp_path):
        """Test processing unsupported file type raises error"""
        test_file = tmp_path / "test.txt"
        test_file.write_text("test")
        
        with pytest.raises(ValueError, match="Unsupported file type"):
            ocr_service.process_document(str(test_file))
    
    def test_process_document_nonexistent_file(self):
        """Test processing nonexistent file raises error"""
        with pytest.raises(FileNotFoundError):
            ocr_service.process_document("/nonexistent/file.pdf")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
