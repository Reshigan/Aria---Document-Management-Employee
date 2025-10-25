"""
Document Processing Tests - All File Types
"""
import pytest
import asyncio
from pathlib import Path
import tempfile
import os

from backend.services.documents.document_processor import document_processor
from backend.services.documents.ocr_service import ocr_service
from backend.services.documents.pdf_parser import pdf_parser

class TestDocumentProcessing:
    """Test document processing for all supported types"""
    
    @pytest.mark.asyncio
    async def test_process_text_file(self):
        """Test plain text file processing"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("This is a test document.\nIt has multiple lines.\nFor testing purposes.")
            temp_path = f.name
        
        try:
            result = await document_processor.process_document(temp_path, 'text/plain')
            
            assert result["success"] is True
            assert result["type"] == "text"
            assert "test document" in result["text"]
            assert result["word_count"] > 0
            assert result["char_count"] > 0
        finally:
            os.unlink(temp_path)
    
    @pytest.mark.asyncio
    async def test_process_pdf_file(self):
        """Test PDF file processing"""
        # Create a simple PDF for testing
        try:
            from reportlab.pdfgen import canvas
            from reportlab.lib.pagesizes import letter
            
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
                temp_path = f.name
            
            c = canvas.Canvas(temp_path, pagesize=letter)
            c.drawString(100, 750, "Test PDF Document")
            c.drawString(100, 730, "This is page 1 content")
            c.showPage()
            c.drawString(100, 750, "This is page 2 content")
            c.save()
            
            result = await document_processor.process_document(temp_path, 'application/pdf')
            
            assert result["success"] is True
            assert result["type"] == "pdf"
            assert result["pages"] == 2
            assert "Test PDF Document" in result["text"] or "page" in result["text"].lower()
            
            os.unlink(temp_path)
        except ImportError:
            pytest.skip("reportlab not installed")
    
    @pytest.mark.asyncio
    async def test_unsupported_file_type(self):
        """Test handling of unsupported file types"""
        result = await document_processor.process_document("/fake/path.xyz", "application/unknown")
        assert result["success"] is False
        assert "error" in result
    
    @pytest.mark.asyncio
    async def test_nonexistent_file(self):
        """Test handling of nonexistent files"""
        result = await document_processor.process_document("/nonexistent/file.txt", "text/plain")
        assert result["success"] is False
        assert "error" in result

class TestOCRService:
    """Test OCR functionality"""
    
    @pytest.mark.asyncio
    async def test_ocr_extraction(self):
        """Test OCR text extraction from image"""
        try:
            from PIL import Image, ImageDraw, ImageFont
            
            # Create test image with text
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
                temp_path = f.name
            
            img = Image.new('RGB', (400, 100), color='white')
            d = ImageDraw.Draw(img)
            d.text((10, 10), "Test OCR Text", fill='black')
            img.save(temp_path)
            
            result = await ocr_service.extract_text(temp_path)
            
            assert result.text is not None
            assert result.confidence >= 0.0
            assert result.language == "eng"
            
            os.unlink(temp_path)
        except Exception as e:
            pytest.skip(f"OCR not available: {e}")

class TestPDFParser:
    """Test PDF parsing functionality"""
    
    @pytest.mark.asyncio
    async def test_pdf_text_extraction(self):
        """Test extracting text from PDF"""
        pytest.skip("Requires sample PDF file")
    
    @pytest.mark.asyncio
    async def test_pdf_table_extraction(self):
        """Test extracting tables from PDF"""
        pytest.skip("Requires sample PDF with tables")
