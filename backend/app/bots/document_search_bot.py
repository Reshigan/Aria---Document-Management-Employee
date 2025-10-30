import logging
from typing import Dict, Optional
from sqlalchemy.orm import Session
from ..models.document import Document

logger = logging.getLogger(__name__)

class DocumentSearchBot:
    def __init__(self, db: Session = None):
        self.bot_id = "document_search"
        self.name = "Document Search Bot"
        self.db = db
        self.capabilities = ["search_documents", "search_by_category"]
    
    async def execute_async(self, query: str, context: Optional[Dict] = None) -> Dict:
        return self.execute(query, context)
    
    def execute(self, query: str, context: Optional[Dict] = None) -> Dict:
        if not self.db:
            return {'success': False, 'error': 'Database not available', 'bot_id': self.bot_id}
        context = context or {}
        action = context.get('action', '').lower()
        try:
            if action == 'search_documents':
                keyword = context.get('keyword', '')
                docs = self.db.query(Document).filter(Document.document_name.like(f'%{keyword}%')).limit(10).all()
                results = [{'id': d.id, 'name': d.document_name, 'type': d.document_type} for d in docs]
                return {'success': True, 'results': results, 'count': len(results), 'bot_id': self.bot_id}
            return {'success': False, 'error': f'Unknown action: {action}', 'bot_id': self.bot_id}
        except Exception as e:
            logger.error(f"Error: {str(e)}")
            return {'success': False, 'error': str(e), 'bot_id': self.bot_id}
