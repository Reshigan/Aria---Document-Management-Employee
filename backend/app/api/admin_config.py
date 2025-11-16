"""
Admin & Configuration API
Comprehensive admin screens for system configuration, number sequences, posting profiles, etc.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import date, datetime

try:
    from auth import get_db
except ImportError:
    try:
        from auth_integrated import get_db
    except ImportError:
        import sys
        sys.path.insert(0, '/var/www/aria/backend')
        from auth import get_db

try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter(prefix="/api/admin-config", tags=["Admin & Configuration"])

# ===================== SCHEMAS =====================

class NumberSequenceCreate(BaseModel):
    document_type: str
    prefix: str
    next_number: int
    padding: int = 6
    suffix: Optional[str] = None
    is_active: bool = True

class NumberSequenceUpdate(BaseModel):
    prefix: Optional[str] = None
    next_number: Optional[int] = None
    padding: Optional[int] = None
    suffix: Optional[str] = None
    is_active: Optional[bool] = None

class DocumentTemplateCreate(BaseModel):
    template_name: str
    document_type: str
    template_content: str
    is_default: bool = False
    is_active: bool = True

class AuditRetentionPolicyCreate(BaseModel):
    entity_type: str
    retention_days: int
    archive_after_days: Optional[int] = None
    is_active: bool = True

class BackupConfigCreate(BaseModel):
    backup_type: str  # full, incremental, differential
    schedule_cron: str
    retention_count: int
    backup_location: str
    is_active: bool = True


@router.get("/number-sequences")
async def get_number_sequences(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all number sequences for the company"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                id,
                document_type,
                prefix,
                next_number,
                padding,
                suffix,
                is_active,
                created_at,
                updated_at
            FROM number_sequences
            WHERE company_id = :company_id
            ORDER BY document_type
        """)
        
        result = db.execute(query, {"company_id": company_id})
        rows = result.fetchall()
        
        sequences = []
        for row in rows:
            sequences.append({
                "id": row[0],
                "document_type": row[1],
                "prefix": row[2],
                "next_number": row[3],
                "padding": row[4],
                "suffix": row[5],
                "is_active": row[6],
                "created_at": str(row[7]) if row[7] else None,
                "updated_at": str(row[8]) if row[8] else None
            })
        
        return {"number_sequences": sequences}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/number-sequences")
async def create_number_sequence(
    sequence: NumberSequenceCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new number sequence"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        insert_query = text("""
            INSERT INTO number_sequences (
                company_id, document_type, prefix, next_number, padding, suffix, is_active,
                created_by, created_at, updated_at
            ) VALUES (
                :company_id, :document_type, :prefix, :next_number, :padding, :suffix, :is_active,
                :created_by, NOW(), NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "company_id": company_id,
            "document_type": sequence.document_type,
            "prefix": sequence.prefix,
            "next_number": sequence.next_number,
            "padding": sequence.padding,
            "suffix": sequence.suffix,
            "is_active": sequence.is_active,
            "created_by": user_email
        })
        
        db.commit()
        sequence_id = result.fetchone()[0]
        
        return {"id": sequence_id, "message": "Number sequence created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/number-sequences/{sequence_id}")
async def update_number_sequence(
    sequence_id: int,
    sequence: NumberSequenceUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a number sequence"""
    try:
        company_id = current_user.get("company_id", "default")
        
        updates = []
        params = {"sequence_id": sequence_id, "company_id": company_id}
        
        if sequence.prefix is not None:
            updates.append("prefix = :prefix")
            params["prefix"] = sequence.prefix
        if sequence.next_number is not None:
            updates.append("next_number = :next_number")
            params["next_number"] = sequence.next_number
        if sequence.padding is not None:
            updates.append("padding = :padding")
            params["padding"] = sequence.padding
        if sequence.suffix is not None:
            updates.append("suffix = :suffix")
            params["suffix"] = sequence.suffix
        if sequence.is_active is not None:
            updates.append("is_active = :is_active")
            params["is_active"] = sequence.is_active
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        updates.append("updated_at = NOW()")
        
        update_query = text(f"""
            UPDATE number_sequences
            SET {", ".join(updates)}
            WHERE id = :sequence_id AND company_id = :company_id
        """)
        
        db.execute(update_query, params)
        db.commit()
        
        return {"message": "Number sequence updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/number-sequences/{sequence_id}")
async def delete_number_sequence(
    sequence_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a number sequence"""
    try:
        company_id = current_user.get("company_id", "default")
        
        delete_query = text("""
            DELETE FROM number_sequences
            WHERE id = :sequence_id AND company_id = :company_id
        """)
        
        db.execute(delete_query, {"sequence_id": sequence_id, "company_id": company_id})
        db.commit()
        
        return {"message": "Number sequence deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/document-templates")
async def get_document_templates(
    document_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all document templates"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                id,
                template_name,
                document_type,
                template_content,
                is_default,
                is_active,
                created_at,
                updated_at
            FROM document_templates
            WHERE company_id = :company_id
            """ + (" AND document_type = :document_type" if document_type else "") + """
            ORDER BY document_type, template_name
        """)
        
        params = {"company_id": company_id}
        if document_type:
            params["document_type"] = document_type
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        templates = []
        for row in rows:
            templates.append({
                "id": row[0],
                "template_name": row[1],
                "document_type": row[2],
                "template_content": row[3],
                "is_default": row[4],
                "is_active": row[5],
                "created_at": str(row[6]) if row[6] else None,
                "updated_at": str(row[7]) if row[7] else None
            })
        
        return {"document_templates": templates}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/document-templates")
async def create_document_template(
    template: DocumentTemplateCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new document template"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        insert_query = text("""
            INSERT INTO document_templates (
                company_id, template_name, document_type, template_content, is_default, is_active,
                created_by, created_at, updated_at
            ) VALUES (
                :company_id, :template_name, :document_type, :template_content, :is_default, :is_active,
                :created_by, NOW(), NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "company_id": company_id,
            "template_name": template.template_name,
            "document_type": template.document_type,
            "template_content": template.template_content,
            "is_default": template.is_default,
            "is_active": template.is_active,
            "created_by": user_email
        })
        
        db.commit()
        template_id = result.fetchone()[0]
        
        return {"id": template_id, "message": "Document template created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/audit-retention-policies")
async def get_audit_retention_policies(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all audit retention policies"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                id,
                entity_type,
                retention_days,
                archive_after_days,
                is_active,
                created_at,
                updated_at
            FROM audit_retention_policies
            WHERE company_id = :company_id
            ORDER BY entity_type
        """)
        
        result = db.execute(query, {"company_id": company_id})
        rows = result.fetchall()
        
        policies = []
        for row in rows:
            policies.append({
                "id": row[0],
                "entity_type": row[1],
                "retention_days": row[2],
                "archive_after_days": row[3],
                "is_active": row[4],
                "created_at": str(row[5]) if row[5] else None,
                "updated_at": str(row[6]) if row[6] else None
            })
        
        return {"audit_retention_policies": policies}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/audit-retention-policies")
async def create_audit_retention_policy(
    policy: AuditRetentionPolicyCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new audit retention policy"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        insert_query = text("""
            INSERT INTO audit_retention_policies (
                company_id, entity_type, retention_days, archive_after_days, is_active,
                created_by, created_at, updated_at
            ) VALUES (
                :company_id, :entity_type, :retention_days, :archive_after_days, :is_active,
                :created_by, NOW(), NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "company_id": company_id,
            "entity_type": policy.entity_type,
            "retention_days": policy.retention_days,
            "archive_after_days": policy.archive_after_days,
            "is_active": policy.is_active,
            "created_by": user_email
        })
        
        db.commit()
        policy_id = result.fetchone()[0]
        
        return {"id": policy_id, "message": "Audit retention policy created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/backup-configs")
async def get_backup_configs(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all backup configurations"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                id,
                backup_type,
                schedule_cron,
                retention_count,
                backup_location,
                is_active,
                last_backup_at,
                created_at,
                updated_at
            FROM backup_configs
            WHERE company_id = :company_id
            ORDER BY backup_type
        """)
        
        result = db.execute(query, {"company_id": company_id})
        rows = result.fetchall()
        
        configs = []
        for row in rows:
            configs.append({
                "id": row[0],
                "backup_type": row[1],
                "schedule_cron": row[2],
                "retention_count": row[3],
                "backup_location": row[4],
                "is_active": row[5],
                "last_backup_at": str(row[6]) if row[6] else None,
                "created_at": str(row[7]) if row[7] else None,
                "updated_at": str(row[8]) if row[8] else None
            })
        
        return {"backup_configs": configs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/backup-configs")
async def create_backup_config(
    config: BackupConfigCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new backup configuration"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        insert_query = text("""
            INSERT INTO backup_configs (
                company_id, backup_type, schedule_cron, retention_count, backup_location, is_active,
                created_by, created_at, updated_at
            ) VALUES (
                :company_id, :backup_type, :schedule_cron, :retention_count, :backup_location, :is_active,
                :created_by, NOW(), NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "company_id": company_id,
            "backup_type": config.backup_type,
            "schedule_cron": config.schedule_cron,
            "retention_count": config.retention_count,
            "backup_location": config.backup_location,
            "is_active": config.is_active,
            "created_by": user_email
        })
        
        db.commit()
        config_id = result.fetchone()[0]
        
        return {"id": config_id, "message": "Backup configuration created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


print("✅ Admin & Configuration API loaded")
