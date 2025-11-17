"""
Workflow Definition Loader

Loads workflow definitions from YAML files and stores them in the database.
"""

import os
import yaml
import json
from pathlib import Path
from typing import Dict, Any, List
from uuid import UUID, uuid4
from sqlalchemy.orm import Session


class WorkflowLoader:
    """Loads workflow definitions from YAML files."""
    
    def __init__(self, db: Session):
        self.db = db
        self.definitions_dir = Path(__file__).parent / "definitions"
    
    def load_all_workflows(self) -> List[Dict[str, Any]]:
        """Load all workflow definitions from the definitions directory."""
        workflows = []
        
        if not self.definitions_dir.exists():
            return workflows
        
        for yaml_file in self.definitions_dir.glob("*.yaml"):
            try:
                workflow = self.load_workflow_from_file(yaml_file)
                workflows.append(workflow)
            except Exception as e:
                print(f"Error loading workflow from {yaml_file}: {e}")
        
        return workflows
    
    def load_workflow_from_file(self, file_path: Path) -> Dict[str, Any]:
        """Load a workflow definition from a YAML file."""
        with open(file_path, 'r') as f:
            definition = yaml.safe_load(f)
        
        required_fields = ['name', 'description', 'initial_state', 'states']
        for field in required_fields:
            if field not in definition:
                raise ValueError(f"Missing required field: {field}")
        
        workflow_id = self.upsert_workflow_definition(definition)
        
        return {
            'id': workflow_id,
            'name': definition['name'],
            'description': definition['description'],
            'definition': definition
        }
    
    def upsert_workflow_definition(self, definition: Dict[str, Any]) -> UUID:
        """Insert or update workflow definition in database."""
        name = definition['name']
        version = definition.get('version', 1)
        
        result = self.db.execute("""
            SELECT id FROM workflow_definitions
            WHERE name = :name
        """, {'name': name}).fetchone()
        
        if result:
            workflow_id = UUID(result[0])
            self.db.execute("""
                UPDATE workflow_definitions
                SET description = :description,
                    version = :version,
                    definition = :definition,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
            """, {
                'id': str(workflow_id),
                'description': definition['description'],
                'version': version,
                'definition': json.dumps(definition)
            })
        else:
            workflow_id = uuid4()
            self.db.execute("""
                INSERT INTO workflow_definitions (
                    id, name, description, version, definition, is_active
                ) VALUES (
                    :id, :name, :description, :version, :definition, true
                )
            """, {
                'id': str(workflow_id),
                'name': name,
                'description': definition['description'],
                'version': version,
                'definition': json.dumps(definition)
            })
        
        self.db.commit()
        return workflow_id
    
    def get_workflow_definition(self, name: str) -> Dict[str, Any]:
        """Get a workflow definition by name."""
        result = self.db.execute("""
            SELECT id, name, description, definition
            FROM workflow_definitions
            WHERE name = :name AND is_active = true
        """, {'name': name}).fetchone()
        
        if not result:
            return None
        
        return {
            'id': result[0],
            'name': result[1],
            'description': result[2],
            'definition': json.loads(result[3]) if isinstance(result[3], str) else result[3]
        }
    
    def list_workflow_definitions(self) -> List[Dict[str, Any]]:
        """List all active workflow definitions."""
        results = self.db.execute("""
            SELECT id, name, description, version
            FROM workflow_definitions
            WHERE is_active = true
            ORDER BY name
        """).fetchall()
        
        return [
            {
                'id': str(row[0]),
                'name': row[1],
                'description': row[2],
                'version': row[3]
            }
            for row in results
        ]
