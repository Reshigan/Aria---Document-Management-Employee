"""
Data Import API
Provides CSV import functionality for bulk data migration
"""
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Any
import csv
import io
import uuid
from datetime import datetime

from core.database import get_db
from core.auth import get_current_user

router = APIRouter(prefix="/api/data-import", tags=["Data Import"])

@router.post("/customers")
async def import_customers(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Import customers from CSV file
    
    CSV Format: customer_code,customer_name,email,phone,address,city,country,tax_number
    """
    try:
        contents = await file.read()
        csv_file = io.StringIO(contents.decode('utf-8'))
        csv_reader = csv.DictReader(csv_file)
        
        company_id = getattr(current_user, 'company_id', None)
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        imported = 0
        errors = []
        
        for row_num, row in enumerate(csv_reader, start=2):
            try:
                customer_id = str(uuid.uuid4())
                query = text("""
                    INSERT INTO customers (
                        id, company_id, customer_code, customer_name, email, phone,
                        address, city, country, tax_number, created_at, updated_at
                    ) VALUES (
                        :id, :company_id, :customer_code, :customer_name, :email, :phone,
                        :address, :city, :country, :tax_number, NOW(), NOW()
                    )
                """)
                
                db.execute(query, {
                    "id": customer_id,
                    "company_id": str(company_id),
                    "customer_code": row.get('customer_code'),
                    "customer_name": row.get('customer_name'),
                    "email": row.get('email'),
                    "phone": row.get('phone'),
                    "address": row.get('address'),
                    "city": row.get('city'),
                    "country": row.get('country', 'South Africa'),
                    "tax_number": row.get('tax_number')
                })
                
                imported += 1
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
        
        db.commit()
        
        return {
            "success": True,
            "imported": imported,
            "errors": errors
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

@router.post("/suppliers")
async def import_suppliers(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Import suppliers from CSV file
    
    CSV Format: supplier_code,supplier_name,email,phone,address,city,country,tax_number
    """
    try:
        contents = await file.read()
        csv_file = io.StringIO(contents.decode('utf-8'))
        csv_reader = csv.DictReader(csv_file)
        
        company_id = getattr(current_user, 'company_id', None)
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        imported = 0
        errors = []
        
        for row_num, row in enumerate(csv_reader, start=2):
            try:
                supplier_id = str(uuid.uuid4())
                query = text("""
                    INSERT INTO suppliers (
                        id, company_id, supplier_code, supplier_name, email, phone,
                        address, city, country, tax_number, created_at, updated_at
                    ) VALUES (
                        :id, :company_id, :supplier_code, :supplier_name, :email, :phone,
                        :address, :city, :country, :tax_number, NOW(), NOW()
                    )
                """)
                
                db.execute(query, {
                    "id": supplier_id,
                    "company_id": str(company_id),
                    "supplier_code": row.get('supplier_code'),
                    "supplier_name": row.get('supplier_name'),
                    "email": row.get('email'),
                    "phone": row.get('phone'),
                    "address": row.get('address'),
                    "city": row.get('city'),
                    "country": row.get('country', 'South Africa'),
                    "tax_number": row.get('tax_number')
                })
                
                imported += 1
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
        
        db.commit()
        
        return {
            "success": True,
            "imported": imported,
            "errors": errors
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

@router.post("/products")
async def import_products(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Import products from CSV file
    
    CSV Format: product_code,product_name,description,unit_price,cost_price,unit_of_measure,category
    """
    try:
        contents = await file.read()
        csv_file = io.StringIO(contents.decode('utf-8'))
        csv_reader = csv.DictReader(csv_file)
        
        company_id = getattr(current_user, 'company_id', None)
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        imported = 0
        errors = []
        
        for row_num, row in enumerate(csv_reader, start=2):
            try:
                product_id = str(uuid.uuid4())
                query = text("""
                    INSERT INTO products (
                        id, company_id, product_code, product_name, description,
                        unit_price, cost_price, unit_of_measure, category, created_at, updated_at
                    ) VALUES (
                        :id, :company_id, :product_code, :product_name, :description,
                        :unit_price, :cost_price, :unit_of_measure, :category, NOW(), NOW()
                    )
                """)
                
                db.execute(query, {
                    "id": product_id,
                    "company_id": str(company_id),
                    "product_code": row.get('product_code'),
                    "product_name": row.get('product_name'),
                    "description": row.get('description'),
                    "unit_price": float(row.get('unit_price', 0)),
                    "cost_price": float(row.get('cost_price', 0)),
                    "unit_of_measure": row.get('unit_of_measure', 'EA'),
                    "category": row.get('category')
                })
                
                imported += 1
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
        
        db.commit()
        
        return {
            "success": True,
            "imported": imported,
            "errors": errors
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

@router.get("/template/{entity_type}")
async def download_import_template(entity_type: str):
    """Download CSV template for import"""
    templates = {
        "customers": "customer_code,customer_name,email,phone,address,city,country,tax_number\n",
        "suppliers": "supplier_code,supplier_name,email,phone,address,city,country,tax_number\n",
        "products": "product_code,product_name,description,unit_price,cost_price,unit_of_measure,category\n"
    }
    
    if entity_type not in templates:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {
        "template": templates[entity_type],
        "filename": f"{entity_type}_import_template.csv"
    }
