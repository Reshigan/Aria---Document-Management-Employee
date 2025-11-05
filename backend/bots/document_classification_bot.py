"""
ARIA ERP - Document Classification Bot
AI-powered document classification and routing with SAP posting suggestions
"""
from typing import Optional, Dict
from .bot_api_client import BotAPIClient
import re

class DocumentClassificationBot:
    CATEGORIES = {
        'invoice': {
            'keywords': ['invoice', 'tax invoice', 'bill', 'factura'],
            'sap_module': 'FI-AP',
            'sap_tcode': 'FB60',
            'description': 'Vendor Invoice (without PO reference)'
        },
        'invoice_with_po': {
            'keywords': ['purchase order', 'po number', 'po#', 'p.o.'],
            'sap_module': 'MM',
            'sap_tcode': 'MIRO',
            'description': 'Vendor Invoice (with PO reference)'
        },
        'credit_note': {
            'keywords': ['credit note', 'credit memo', 'refund'],
            'sap_module': 'FI-AP',
            'sap_tcode': 'FB65',
            'description': 'Vendor Credit Note'
        },
        'remittance_advice': {
            'keywords': ['remittance advice', 'remittance', 'payment advice'],
            'sap_module': 'FI',
            'sap_tcode': 'F-28',
            'description': 'Remittance Advice (incoming payment)'
        },
        'receipt': {
            'keywords': ['receipt', 'proof of payment', 'payment receipt'],
            'sap_module': 'FI',
            'sap_tcode': 'FB03',
            'description': 'Payment Receipt (display only)'
        },
        'statement': {
            'keywords': ['statement', 'account statement', 'bank statement'],
            'sap_module': 'FI',
            'sap_tcode': 'FF_5',
            'description': 'Bank Statement (Electronic Bank Statement)'
        },
        'delivery_note': {
            'keywords': ['delivery note', 'delivery order', 'shipping note', 'packing slip'],
            'sap_module': 'SD',
            'sap_tcode': 'VL02N',
            'description': 'Delivery Note (not an accounting posting)'
        },
        'purchase_order': {
            'keywords': ['purchase order', 'order confirmation'],
            'sap_module': 'MM',
            'sap_tcode': 'ME23N',
            'description': 'Purchase Order (display)'
        },
        'customer_invoice': {
            'keywords': ['sales invoice', 'customer invoice'],
            'sap_module': 'SD',
            'sap_tcode': 'VF01',
            'description': 'Customer Invoice'
        },
        'contract': {
            'keywords': ['agreement', 'contract', 'terms'],
            'sap_module': 'N/A',
            'sap_tcode': 'N/A',
            'description': 'Contract (no direct posting)'
        },
        'report': {
            'keywords': ['report', 'analysis', 'summary'],
            'sap_module': 'N/A',
            'sap_tcode': 'N/A',
            'description': 'Report (no direct posting)'
        }
    }
    
    def __init__(
        self,
        api_client: Optional[BotAPIClient] = None,
        mode: str = "api",
        api_base_url: str = "http://localhost:8000",
        api_token: Optional[str] = None,
        db_session = None,
        tenant_id: Optional[int] = None
    ):
        if api_client:
            self.client = api_client
        else:
            self.client = BotAPIClient(
                mode=mode,
                api_base_url=api_base_url,
                api_token=api_token,
                db_session=db_session,
                tenant_id=tenant_id
            )
    
    def classify_document(self, file_path: str) -> dict:
        """Classify document from file path"""
        try:
            from .ocr_invoice_bot import OCRInvoiceBot
            ocr_bot = OCRInvoiceBot()
            text = ocr_bot.extract_text_from_pdf(file_path)
            return self.classify_text(text)
        except Exception as e:
            return {
                'category': 'unknown',
                'confidence': 0.0,
                'sap_posting': None,
                'error': str(e)
            }
    
    def classify_text(self, text: str) -> dict:
        """Classify document from extracted text"""
        if not text or len(text.strip()) < 10:
            return {
                'category': 'unknown',
                'confidence': 0.0,
                'sap_posting': None
            }
        
        text_lower = text.lower()
        scores = {}
        
        has_po_reference = bool(re.search(r'(?:purchase order|po|p\.o\.)\s*(?:no|number|#)?\s*:?\s*[A-Z0-9\-/]+', text, re.IGNORECASE))
        
        for category, info in self.CATEGORIES.items():
            score = 0
            for keyword in info['keywords']:
                if keyword in text_lower:
                    score += 1
            scores[category] = score
        
        if scores.get('invoice', 0) > 0 and has_po_reference:
            scores['invoice_with_po'] = scores.get('invoice', 0) + 2
            scores['invoice'] = 0
        
        if not scores or max(scores.values()) == 0:
            category = 'invoice'  # Default to invoice if no clear match
            confidence = 0.5
        else:
            category = max(scores, key=scores.get)
            max_score = scores[category]
            confidence = min(0.95, 0.6 + (max_score * 0.1))
        
        category_info = self.CATEGORIES.get(category, {})
        sap_posting = {
            'module': category_info.get('sap_module', 'N/A'),
            'tcode': category_info.get('sap_tcode', 'N/A'),
            'description': category_info.get('description', ''),
            'rationale': self._get_posting_rationale(category, text, has_po_reference),
            'confidence': confidence
        }
        
        return {
            'category': category,
            'confidence': confidence,
            'sap_posting': sap_posting,
            'has_po_reference': has_po_reference
        }
    
    def _get_posting_rationale(self, category: str, text: str, has_po_reference: bool) -> str:
        """Generate rationale for SAP posting suggestion"""
        rationales = {
            'invoice': 'Standard vendor invoice without PO reference → Post via FB60 (FI-AP)',
            'invoice_with_po': f'Vendor invoice with PO reference detected → Post via MIRO (MM) for goods receipt matching',
            'credit_note': 'Credit note detected → Post via FB65 (FI-AP Credit Memo)',
            'remittance_advice': 'Remittance advice detected → Process via F-28 (FI incoming payment)',
            'statement': 'Bank statement detected → Import via FF_5 (Electronic Bank Statement)',
            'delivery_note': 'Delivery note detected → Reference only, no accounting posting required',
            'purchase_order': 'Purchase order detected → Reference document, display via ME23N',
            'customer_invoice': 'Customer invoice detected → Post via VF01 (SD Billing)',
            'receipt': 'Payment receipt detected → Reference only, view via FB03',
            'contract': 'Contract document → No direct SAP posting',
            'report': 'Report document → No direct SAP posting'
        }
        
        return rationales.get(category, 'Document classification uncertain')
    
    def route_document(self, classification: dict) -> dict:
        """Route document to appropriate bot/workflow based on classification"""
        category = classification.get('category', 'unknown')
        
        routing = {
            'invoice': {
                'bot': 'ocr_invoice_bot',
                'workflow': 'ap_invoice_processing',
                'priority': 'high'
            },
            'invoice_with_po': {
                'bot': 'ocr_invoice_bot',
                'workflow': 'ap_invoice_with_po_processing',
                'priority': 'high'
            },
            'credit_note': {
                'bot': 'credit_note_bot',
                'workflow': 'ap_credit_note_processing',
                'priority': 'medium'
            },
            'remittance_advice': {
                'bot': 'remittance_bot',
                'workflow': 'payment_processing',
                'priority': 'high'
            },
            'statement': {
                'bot': 'bank_reconciliation_bot',
                'workflow': 'bank_statement_import',
                'priority': 'medium'
            },
            'receipt': {
                'bot': 'expense_approval_bot',
                'workflow': 'expense_processing',
                'priority': 'low'
            },
            'delivery_note': {
                'bot': 'goods_receipt_bot',
                'workflow': 'goods_receipt_processing',
                'priority': 'medium'
            }
        }
        
        return routing.get(category, {
            'bot': 'manual_review',
            'workflow': 'manual_classification',
            'priority': 'low'
        })

def main():
    print("\n" + "="*60)
    print("ARIA ERP - DOCUMENT CLASSIFICATION BOT")
    print("="*60 + "\n")
    print("✓ Bot ready - AI document routing")
    print("✓ Categories: 5 types")
    print("\n" + "="*60 + "\n")

if __name__ == '__main__':
    main()
