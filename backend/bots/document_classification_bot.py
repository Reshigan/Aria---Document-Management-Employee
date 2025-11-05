"""
ARIA ERP - Document Classification Bot
AI-powered document classification and routing
"""
from typing import Optional
from .bot_api_client import BotAPIClient

class DocumentClassificationBot:
    CATEGORIES = {
        'invoice': ['invoice', 'tax invoice', 'bill'],
        'receipt': ['receipt', 'proof of payment'],
        'statement': ['statement', 'account statement'],
        'contract': ['agreement', 'contract', 'terms'],
        'report': ['report', 'analysis', 'summary']
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
    
    def classify_document(self, file_name: str, content: str = '') -> dict:
        """Classify document by analyzing name and content"""
        file_lower = file_name.lower()
        content_lower = content.lower()
        
        scores = {}
        for category, keywords in self.CATEGORIES.items():
            score = 0
            for keyword in keywords:
                if keyword in file_lower:
                    score += 10
                if keyword in content_lower:
                    score += 5
            scores[category] = score
        
        best_category = max(scores, key=scores.get)
        confidence = scores[best_category] / 15 * 100
        
        return {
            'filename': file_name,
            'category': best_category,
            'confidence': min(confidence, 95),
            'suggested_action': f'Route to {best_category.upper()} processing'
        }

def main():
    print("\n" + "="*60)
    print("ARIA ERP - DOCUMENT CLASSIFICATION BOT")
    print("="*60 + "\n")
    print("✓ Bot ready - AI document routing")
    print("✓ Categories: 5 types")
    print("\n" + "="*60 + "\n")

if __name__ == '__main__':
    main()
