from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

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

router = APIRouter()


@router.get("/serial-number/{serial_number}/complete-history")
async def get_serial_number_complete_history(
    serial_number: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get complete transaction history for a serial number"""
    try:
        company_id = current_user.get("company_id", "default")
        
        serial_query = text("""
            SELECT 
                ist.id,
                ist.product_id,
                p.product_code,
                p.name as product_name,
                ist.warehouse_id,
                w.name as warehouse_name,
                ist.status,
                ist.warranty_expiry,
                ist.manufacture_date,
                ist.current_location,
                ist.last_transaction_date,
                ist.created_at
            FROM inventory_serial_tracking ist
            JOIN products p ON ist.product_id = p.id
            LEFT JOIN warehouses w ON ist.warehouse_id = w.id
            WHERE ist.serial_number = :serial_number
                AND ist.company_id = :company_id
            ORDER BY ist.created_at DESC
            LIMIT 1
        """)
        
        serial_result = db.execute(serial_query, {
            "serial_number": serial_number,
            "company_id": company_id
        }).fetchone()
        
        if not serial_result:
            raise HTTPException(status_code=404, detail="Serial number not found")
        
        transaction_query = text("""
            SELECT 
                il.id,
                il.transaction_date,
                il.transaction_type,
                il.quantity,
                il.unit_cost,
                il.reference_type,
                il.reference_id,
                w.name as warehouse_name,
                il.bin_location,
                il.notes,
                il.created_by,
                il.created_at
            FROM item_ledger il
            LEFT JOIN warehouses w ON il.warehouse_id = w.id
            WHERE il.serial_number = :serial_number
                AND il.company_id = :company_id
            ORDER BY il.transaction_date DESC, il.created_at DESC
        """)
        
        transaction_result = db.execute(transaction_query, {
            "serial_number": serial_number,
            "company_id": company_id
        })
        
        transactions = []
        for row in transaction_result.fetchall():
            ref_type = row[5]
            ref_id = row[6]
            
            ref_document = None
            if ref_type == "SALES_ORDER":
                ref_query = text("""
                    SELECT order_number, customer_id, c.name as customer_name
                    FROM sales_orders so
                    JOIN customers c ON so.customer_id = c.id
                    WHERE so.id = :ref_id AND so.company_id = :company_id
                """)
                
                ref_result = db.execute(ref_query, {
                    "ref_id": ref_id,
                    "company_id": company_id
                }).fetchone()
                
                if ref_result:
                    ref_document = {
                        "type": "SALES_ORDER",
                        "number": ref_result[0],
                        "customer_id": ref_result[1],
                        "customer_name": ref_result[2]
                    }
            
            elif ref_type == "PURCHASE_ORDER":
                ref_query = text("""
                    SELECT po_number, supplier_id, s.name as supplier_name
                    FROM purchase_orders po
                    JOIN suppliers s ON po.supplier_id = s.id
                    WHERE po.id = :ref_id AND po.company_id = :company_id
                """)
                
                ref_result = db.execute(ref_query, {
                    "ref_id": ref_id,
                    "company_id": company_id
                }).fetchone()
                
                if ref_result:
                    ref_document = {
                        "type": "PURCHASE_ORDER",
                        "number": ref_result[0],
                        "supplier_id": ref_result[1],
                        "supplier_name": ref_result[2]
                    }
            
            elif ref_type == "GOODS_RECEIPT":
                ref_query = text("""
                    SELECT gr.receipt_number, po.po_number, s.name as supplier_name
                    FROM goods_receipts gr
                    JOIN purchase_orders po ON gr.purchase_order_id = po.id
                    JOIN suppliers s ON po.supplier_id = s.id
                    WHERE gr.id = :ref_id AND gr.company_id = :company_id
                """)
                
                ref_result = db.execute(ref_query, {
                    "ref_id": ref_id,
                    "company_id": company_id
                }).fetchone()
                
                if ref_result:
                    ref_document = {
                        "type": "GOODS_RECEIPT",
                        "receipt_number": ref_result[0],
                        "po_number": ref_result[1],
                        "supplier_name": ref_result[2]
                    }
            
            transactions.append({
                "id": row[0],
                "transaction_date": str(row[1]) if row[1] else None,
                "transaction_type": row[2],
                "quantity": float(row[3]) if row[3] else 0,
                "unit_cost": float(row[4]) if row[4] else 0,
                "reference_type": ref_type,
                "reference_id": ref_id,
                "reference_document": ref_document,
                "warehouse_name": row[7],
                "bin_location": row[8],
                "notes": row[9],
                "created_by": row[10],
                "created_at": str(row[11]) if row[11] else None
            })
        
        inspection_query = text("""
            SELECT 
                qi.id,
                qi.inspection_number,
                qi.inspection_date,
                qi.inspector_id,
                e.first_name || ' ' || e.last_name as inspector_name,
                qi.overall_result,
                qi.status
            FROM quality_inspections qi
            LEFT JOIN employees e ON qi.inspector_id = e.id
            WHERE qi.serial_number = :serial_number
                AND qi.company_id = :company_id
            ORDER BY qi.inspection_date DESC
        """)
        
        inspection_result = db.execute(inspection_query, {
            "serial_number": serial_number,
            "company_id": company_id
        })
        
        inspections = []
        for row in inspection_result.fetchall():
            inspections.append({
                "id": row[0],
                "inspection_number": row[1],
                "inspection_date": str(row[2]) if row[2] else None,
                "inspector_id": row[3],
                "inspector_name": row[4],
                "overall_result": row[5],
                "status": row[6]
            })
        
        warranty_query = text("""
            SELECT 
                wc.id,
                wc.claim_number,
                wc.claim_date,
                wc.issue_description,
                wc.resolution,
                wc.status,
                wc.resolved_date
            FROM warranty_claims wc
            WHERE wc.serial_number = :serial_number
                AND wc.company_id = :company_id
            ORDER BY wc.claim_date DESC
        """)
        
        warranty_result = db.execute(warranty_query, {
            "serial_number": serial_number,
            "company_id": company_id
        })
        
        warranty_claims = []
        for row in warranty_result.fetchall():
            warranty_claims.append({
                "id": row[0],
                "claim_number": row[1],
                "claim_date": str(row[2]) if row[2] else None,
                "issue_description": row[3],
                "resolution": row[4],
                "status": row[5],
                "resolved_date": str(row[6]) if row[6] else None
            })
        
        current_owner_query = text("""
            SELECT 
                c.id,
                c.name,
                c.email,
                c.phone,
                so.order_number,
                so.order_date
            FROM item_ledger il
            JOIN sales_orders so ON il.reference_type = 'SALES_ORDER' 
                AND il.reference_id = so.id
            JOIN customers c ON so.customer_id = c.id
            WHERE il.serial_number = :serial_number
                AND il.transaction_type = 'OUT'
                AND il.company_id = :company_id
            ORDER BY il.transaction_date DESC
            LIMIT 1
        """)
        
        owner_result = db.execute(current_owner_query, {
            "serial_number": serial_number,
            "company_id": company_id
        }).fetchone()
        
        current_owner = None
        if owner_result:
            current_owner = {
                "customer_id": owner_result[0],
                "customer_name": owner_result[1],
                "email": owner_result[2],
                "phone": owner_result[3],
                "purchase_order": owner_result[4],
                "purchase_date": str(owner_result[5]) if owner_result[5] else None
            }
        
        return {
            "serial_number_info": {
                "id": serial_result[0],
                "serial_number": serial_number,
                "product_id": serial_result[1],
                "product_code": serial_result[2],
                "product_name": serial_result[3],
                "warehouse_id": serial_result[4],
                "warehouse_name": serial_result[5],
                "status": serial_result[6],
                "warranty_expiry": str(serial_result[7]) if serial_result[7] else None,
                "manufacture_date": str(serial_result[8]) if serial_result[8] else None,
                "current_location": serial_result[9],
                "last_transaction_date": str(serial_result[10]) if serial_result[10] else None,
                "created_at": str(serial_result[11]) if serial_result[11] else None
            },
            "current_owner": current_owner,
            "transactions": transactions,
            "quality_inspections": inspections,
            "warranty_claims": warranty_claims,
            "summary": {
                "total_transactions": len(transactions),
                "total_inspections": len(inspections),
                "total_warranty_claims": len(warranty_claims),
                "is_under_warranty": serial_result[7] and str(serial_result[7]) > str(db.execute(text("SELECT CURRENT_DATE")).fetchone()[0]) if serial_result[7] else False
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/serial-number/{serial_number}/ownership-chain")
async def get_serial_number_ownership_chain(
    serial_number: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get complete ownership chain for a serial number"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                il.id,
                il.transaction_date,
                il.transaction_type,
                CASE 
                    WHEN il.reference_type = 'SALES_ORDER' THEN c.name
                    WHEN il.reference_type = 'PURCHASE_ORDER' THEN s.name
                    ELSE 'Internal Transfer'
                END as party_name,
                CASE 
                    WHEN il.reference_type = 'SALES_ORDER' THEN 'CUSTOMER'
                    WHEN il.reference_type = 'PURCHASE_ORDER' THEN 'SUPPLIER'
                    ELSE 'INTERNAL'
                END as party_type,
                il.reference_type,
                il.reference_id,
                CASE 
                    WHEN il.reference_type = 'SALES_ORDER' THEN so.order_number
                    WHEN il.reference_type = 'PURCHASE_ORDER' THEN po.po_number
                    ELSE NULL
                END as document_number
            FROM item_ledger il
            LEFT JOIN sales_orders so ON il.reference_type = 'SALES_ORDER' 
                AND il.reference_id = so.id
            LEFT JOIN customers c ON so.customer_id = c.id
            LEFT JOIN purchase_orders po ON il.reference_type = 'PURCHASE_ORDER' 
                AND il.reference_id = po.id
            LEFT JOIN suppliers s ON po.supplier_id = s.id
            WHERE il.serial_number = :serial_number
                AND il.company_id = :company_id
                AND il.transaction_type IN ('IN', 'OUT')
            ORDER BY il.transaction_date ASC, il.created_at ASC
        """)
        
        result = db.execute(query, {
            "serial_number": serial_number,
            "company_id": company_id
        })
        
        ownership_chain = []
        for row in result.fetchall():
            ownership_chain.append({
                "id": row[0],
                "transaction_date": str(row[1]) if row[1] else None,
                "transaction_type": row[2],
                "party_name": row[3],
                "party_type": row[4],
                "reference_type": row[5],
                "reference_id": row[6],
                "document_number": row[7]
            })
        
        return {"ownership_chain": ownership_chain}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/serial-number/{serial_number}/register-warranty-claim")
async def register_warranty_claim(
    serial_number: str,
    issue_description: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Register a warranty claim for a serial number"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        serial_query = text("""
            SELECT 
                ist.product_id,
                ist.warranty_expiry
            FROM inventory_serial_tracking ist
            WHERE ist.serial_number = :serial_number
                AND ist.company_id = :company_id
        """)
        
        serial_result = db.execute(serial_query, {
            "serial_number": serial_number,
            "company_id": company_id
        }).fetchone()
        
        if not serial_result:
            raise HTTPException(status_code=404, detail="Serial number not found")
        
        warranty_expiry = serial_result[1]
        if warranty_expiry:
            current_date = db.execute(text("SELECT CURRENT_DATE")).fetchone()[0]
            if str(warranty_expiry) < str(current_date):
                raise HTTPException(status_code=400, detail="Warranty has expired")
        
        claim_query = text("""
            INSERT INTO warranty_claims (
                claim_number, serial_number, product_id,
                claim_date, issue_description, status,
                company_id, created_by, created_at
            ) VALUES (
                'WC-' || LPAD(NEXTVAL('warranty_claim_seq')::TEXT, 6, '0'),
                :serial_number, :product_id,
                CURRENT_DATE, :issue_description, 'OPEN',
                :company_id, :created_by, NOW()
            ) RETURNING id, claim_number
        """)
        
        result = db.execute(claim_query, {
            "serial_number": serial_number,
            "product_id": serial_result[0],
            "issue_description": issue_description,
            "company_id": company_id,
            "created_by": user_email
        })
        
        claim_id, claim_number = result.fetchone()
        
        db.commit()
        
        return {
            "message": "Warranty claim registered successfully",
            "claim_id": claim_id,
            "claim_number": claim_number
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
