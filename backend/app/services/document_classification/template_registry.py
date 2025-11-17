"""
Template Registry for SAP Documents
Loads and manages SAP document templates
"""
import json
import os
from pathlib import Path
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class TemplateRegistry:
    """Registry for SAP document templates"""
    
    def __init__(self, templates_path: Optional[str] = None):
        if templates_path is None:
            templates_path = Path(__file__).parent.parent / "templates" / "sap_templates.json"
        
        self.templates_path = templates_path
        self.templates: List[Dict] = []
        self.templates_by_id: Dict[str, Dict] = {}
        self.templates_by_type: Dict[str, Dict] = {}
        
        self.load_templates()
    
    def load_templates(self):
        """Load templates from JSON file"""
        try:
            with open(self.templates_path, 'r') as f:
                self.templates = json.load(f)
            
            for template in self.templates:
                self.templates_by_id[template['id']] = template
                self.templates_by_type[template['doc_type']] = template
            
            logger.info(f"Loaded {len(self.templates)} SAP document templates")
        except Exception as e:
            logger.error(f"Failed to load templates: {e}")
            self.templates = []
    
    def get_template(self, template_id: str) -> Optional[Dict]:
        """Get template by ID"""
        return self.templates_by_id.get(template_id)
    
    def get_template_by_type(self, doc_type: str) -> Optional[Dict]:
        """Get template by document type"""
        return self.templates_by_type.get(doc_type)
    
    def get_all_templates(self) -> List[Dict]:
        """Get all templates"""
        return self.templates
    
    def get_templates_by_module(self, module: str) -> List[Dict]:
        """Get templates for a specific SAP module"""
        return [t for t in self.templates if module in t.get('module', '')]


template_registry = TemplateRegistry()
