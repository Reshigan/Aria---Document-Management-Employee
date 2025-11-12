"""
ARIA ERP - Document Classification Bot
AI-powered document classification and routing
"""
import sqlite3

class DocumentClassificationBot:
    CATEGORIES = {
        'invoice': ['invoice', 'tax invoice', 'bill'],
        'receipt': ['receipt', 'proof of payment'],
        'statement': ['statement', 'account statement'],
        'contract': ['agreement', 'contract', 'terms'],
        'report': ['report', 'analysis', 'summary']
    }
    
    def __init__(self, database_path: str = 'aria_erp_production.db'):
        self.db_path = database_path
    
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
