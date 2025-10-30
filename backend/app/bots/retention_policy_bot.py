import logging
from typing import Dict, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from ..models.document import Document

logger = logging.getLogger(__name__)

class RetentionPolicyBot:
    def __init__(self, db: Session = None):
        self.bot_id = "retention_policy"
        self.name = "Retention Policy Bot"
        self.db = db
        self.capabilities = ["set_retention", "archive_documents"]
    
    async def execute_async(self, query: str, context: Optional[Dict] = None) -> Dict:
        return self.execute(query, context)
    
    def execute(self, query: str, context: Optional[Dict] = None) -> Dict:
        if not self.db:
            return {'success': False, 'error': 'Database not available', 'bot_id': self.bot_id}
        context = context or {}
        action = context.get('action', '').lower()
        try:
            if action == 'set_retention':
                doc_id = context.get('document_id')
                years = context.get('retention_years', 7)
                doc = self.db.query(Document).filter_by(id=doc_id).first()
                if doc:
                    doc.retention_date = (datetime.utcnow() + timedelta(days=365*years)).date()
                    self.db.commit()
                    return {'success': True, 'document_id': doc_id, 'retention_date': doc.retention_date.isoformat(), 'bot_id': self.bot_id}
                return {'success': False, 'error': 'Document not found', 'bot_id': self.bot_id}
            return {'success': False, 'error': f'Unknown action: {action}', 'bot_id': self.bot_id}
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error: {str(e)}")
            return {'success': False, 'error': str(e), 'bot_id': self.bot_id}
