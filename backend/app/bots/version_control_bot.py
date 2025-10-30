import logging
from typing import Dict, Optional
from sqlalchemy.orm import Session
from ..models.document import Document, DocumentVersion

logger = logging.getLogger(__name__)

class VersionControlBot:
    def __init__(self, db: Session = None):
        self.bot_id = "version_control"
        self.name = "Version Control Bot"
        self.db = db
        self.capabilities = ["create_version", "list_versions"]
    
    async def execute_async(self, query: str, context: Optional[Dict] = None) -> Dict:
        return self.execute(query, context)
    
    def execute(self, query: str, context: Optional[Dict] = None) -> Dict:
        if not self.db:
            return {'success': False, 'error': 'Database not available', 'bot_id': self.bot_id}
        context = context or {}
        action = context.get('action', '').lower()
        try:
            if action == 'create_version':
                doc_id = context.get('document_id')
                doc = self.db.query(Document).filter_by(id=doc_id).first()
                if doc:
                    ver_count = self.db.query(DocumentVersion).filter_by(document_id=doc_id).count()
                    version = DocumentVersion(document_id=doc_id, version_number=ver_count + 1)
                    self.db.add(version)
                    self.db.commit()
                    return {'success': True, 'version_id': version.id, 'version_number': version.version_number, 'bot_id': self.bot_id}
                return {'success': False, 'error': 'Document not found', 'bot_id': self.bot_id}
            return {'success': False, 'error': f'Unknown action: {action}', 'bot_id': self.bot_id}
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error: {str(e)}")
            return {'success': False, 'error': str(e), 'bot_id': self.bot_id}
