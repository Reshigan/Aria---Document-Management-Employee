"""
ERP Database Helper - Complete CRUD operations for all ERP modules
Uses PostgreSQL with asyncpg for high-performance async operations
"""

import asyncpg
import os
from typing import Optional, List, Dict, Any
from datetime import datetime, date
import json
import logging

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv(
    "DATABASE_URL_PG",
    os.getenv("DATABASE_URL", "postgresql://aria_user:AriaSecure2025!@localhost/aria_erp")
)

async def get_db_connection():
    """Get async PostgreSQL connection"""
    return await asyncpg.connect(DATABASE_URL)

async def get_db_pool():
    """Get connection pool for better performance"""
    return await asyncpg.create_pool(
        DATABASE_URL,
        min_size=5,
        max_size=20,
        command_timeout=60
    )

# ========================================
# ========================================

async def create_document_intake(
    filename: str,
    vendor: str,
    document_type: str,
    file_hash: str,
    company_id: str,
    parsed_data: Dict[str, Any],
    confidence: float = 1.0
) -> Dict[str, Any]:
    """Create document intake record"""
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow("""
            INSERT INTO document_intake (
                filename, vendor, document_type, file_hash, company_id,
                parsed_data, confidence, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())
            RETURNING id, filename, vendor, document_type, file_hash, company_id,
                      parsed_data, confidence, status, created_at
        """, filename, vendor, document_type, file_hash, company_id,
             json.dumps(parsed_data), confidence)
        
        return dict(row)
    finally:
        await conn.close()

async def get_document_intake(document_id: str) -> Optional[Dict[str, Any]]:
    """Get document intake by ID"""
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow("""
            SELECT id, filename, vendor, document_type, file_hash, company_id,
                   parsed_data, confidence, status, created_at, processed_at
            FROM document_intake
            WHERE id = $1
        """, document_id)
        
        if row:
            result = dict(row)
            if result.get('parsed_data'):
                result['parsed_data'] = json.loads(result['parsed_data'])
            return result
        return None
    finally:
        await conn.close()

async def update_document_status(document_id: str, status: str, posted_at: Optional[datetime] = None):
    """Update document processing status"""
    conn = await get_db_connection()
    try:
        if posted_at:
            await conn.execute("""
                UPDATE document_intake
                SET status = $1, processed_at = $2
                WHERE id = $3
            """, status, posted_at, document_id)
        else:
            await conn.execute("""
                UPDATE document_intake
                SET status = $1
                WHERE id = $2
            """, status, document_id)
    finally:
        await conn.close()

async def create_payment_allocation(
    payment_id: int,
    invoice_id: int,
    amount: float,
    company_id: str
) -> Dict[str, Any]:
    """Create payment allocation"""
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow("""
            INSERT INTO payment_allocations (
                payment_id, invoice_id, amount, company_id, created_at
            ) VALUES ($1, $2, $3, $4, NOW())
            RETURNING id, payment_id, invoice_id, amount, company_id, created_at
        """, payment_id, invoice_id, amount, company_id)
        
        return dict(row)
    finally:
        await conn.close()

# ========================================
# ========================================

async def create_service_request(
    customer_id: str,
    description: str,
    priority: str,
    company_id: str,
    contact_name: Optional[str] = None,
    contact_phone: Optional[str] = None,
    location: Optional[str] = None
) -> Dict[str, Any]:
    """Create service request"""
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow("""
            INSERT INTO service_requests (
                customer_id, description, priority, status, company_id,
                contact_name, contact_phone, location, created_at
            ) VALUES ($1, $2, $3, 'new', $4, $5, $6, $7, NOW())
            RETURNING id, customer_id, description, priority, status, company_id,
                      contact_name, contact_phone, location, created_at
        """, customer_id, description, priority, company_id,
             contact_name, contact_phone, location)
        
        return dict(row)
    finally:
        await conn.close()

async def get_service_request(request_id: str) -> Optional[Dict[str, Any]]:
    """Get service request by ID"""
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow("""
            SELECT id, customer_id, description, priority, status, company_id,
                   contact_name, contact_phone, location, created_at, updated_at
            FROM service_requests
            WHERE id = $1
        """, request_id)
        
        return dict(row) if row else None
    finally:
        await conn.close()

async def create_work_order(
    service_request_id: str,
    technician_id: str,
    scheduled_date: date,
    company_id: str,
    description: Optional[str] = None
) -> Dict[str, Any]:
    """Create work order"""
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow("""
            INSERT INTO work_orders (
                service_request_id, technician_id, scheduled_date, status,
                company_id, description, created_at
            ) VALUES ($1, $2, $3, 'scheduled', $4, $5, NOW())
            RETURNING id, service_request_id, technician_id, scheduled_date,
                      status, company_id, description, created_at
        """, service_request_id, technician_id, scheduled_date,
             company_id, description)
        
        return dict(row)
    finally:
        await conn.close()

async def update_work_order_status(work_order_id: str, status: str, completed_at: Optional[datetime] = None):
    """Update work order status"""
    conn = await get_db_connection()
    try:
        if completed_at:
            await conn.execute("""
                UPDATE work_orders
                SET status = $1, completed_at = $2
                WHERE id = $3
            """, status, completed_at, work_order_id)
        else:
            await conn.execute("""
                UPDATE work_orders
                SET status = $1
                WHERE id = $2
            """, status, work_order_id)
    finally:
        await conn.close()

# ========================================
# ========================================

async def create_customer(
    code: str,
    name: str,
    email: str,
    company_id: str,
    phone: Optional[str] = None,
    address: Optional[str] = None,
    tax_number: Optional[str] = None,
    payment_terms: Optional[str] = None
) -> Dict[str, Any]:
    """Create customer"""
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow("""
            INSERT INTO customers (
                code, name, email, phone, address, tax_number, payment_terms,
                company_id, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', NOW())
            RETURNING id, code, name, email, phone, address, tax_number,
                      payment_terms, company_id, status, created_at
        """, code, name, email, phone, address, tax_number, payment_terms, company_id)
        
        return dict(row)
    finally:
        await conn.close()

async def get_customer(customer_id: str) -> Optional[Dict[str, Any]]:
    """Get customer by ID"""
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow("""
            SELECT id, code, name, email, phone, address, tax_number,
                   payment_terms, company_id, status, created_at
            FROM customers
            WHERE id = $1
        """, customer_id)
        
        return dict(row) if row else None
    finally:
        await conn.close()

async def list_customers(company_id: str, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
    """List customers for company"""
    conn = await get_db_connection()
    try:
        rows = await conn.fetch("""
            SELECT id, code, name, email, phone, address, tax_number,
                   payment_terms, company_id, status, created_at
            FROM customers
            WHERE company_id = $1
            ORDER BY name
            LIMIT $2 OFFSET $3
        """, company_id, limit, offset)
        
        return [dict(row) for row in rows]
    finally:
        await conn.close()

async def create_ar_invoice(
    invoice_number: str,
    customer_id: str,
    invoice_date: date,
    due_date: date,
    total_amount: float,
    tax_amount: float,
    company_id: str,
    line_items: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Create AR invoice"""
    conn = await get_db_connection()
    try:
        async with conn.transaction():
            invoice_row = await conn.fetchrow("""
                INSERT INTO ar_invoices (
                    invoice_number, customer_id, invoice_date, due_date,
                    total_amount, tax_amount, status, company_id, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, NOW())
                RETURNING id, invoice_number, customer_id, invoice_date, due_date,
                          total_amount, tax_amount, status, company_id, created_at
            """, invoice_number, customer_id, invoice_date, due_date,
                 total_amount, tax_amount, company_id)
            
            invoice = dict(invoice_row)
            invoice_id = invoice['id']
            
            for item in line_items:
                await conn.execute("""
                    INSERT INTO ar_invoice_lines (
                        invoice_id, product_id, description, quantity,
                        unit_price, line_total, tax_amount, company_id
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                """, invoice_id, item.get('product_id'), item.get('description'),
                     item.get('quantity'), item.get('unit_price'), item.get('line_total'),
                     item.get('tax_amount'), company_id)
            
            return invoice
    finally:
        await conn.close()

async def get_ar_invoice(invoice_id: str) -> Optional[Dict[str, Any]]:
    """Get AR invoice with line items"""
    conn = await get_db_connection()
    try:
        invoice_row = await conn.fetchrow("""
            SELECT id, invoice_number, customer_id, invoice_date, due_date,
                   total_amount, tax_amount, status, company_id, created_at
            FROM ar_invoices
            WHERE id = $1
        """, invoice_id)
        
        if not invoice_row:
            return None
        
        invoice = dict(invoice_row)
        
        line_rows = await conn.fetch("""
            SELECT id, product_id, description, quantity, unit_price,
                   line_total, tax_amount
            FROM ar_invoice_lines
            WHERE invoice_id = $1
            ORDER BY id
        """, invoice_id)
        
        invoice['line_items'] = [dict(row) for row in line_rows]
        
        return invoice
    finally:
        await conn.close()

# ========================================
# ========================================

async def create_supplier(
    code: str,
    name: str,
    email: str,
    company_id: str,
    phone: Optional[str] = None,
    address: Optional[str] = None,
    tax_number: Optional[str] = None,
    payment_terms: Optional[str] = None,
    bbbee_level: Optional[int] = None
) -> Dict[str, Any]:
    """Create supplier"""
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow("""
            INSERT INTO suppliers (
                code, name, email, phone, address, tax_number, payment_terms,
                bbbee_level, company_id, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', NOW())
            RETURNING id, code, name, email, phone, address, tax_number,
                      payment_terms, bbbee_level, company_id, status, created_at
        """, code, name, email, phone, address, tax_number, payment_terms,
             bbbee_level, company_id)
        
        return dict(row)
    finally:
        await conn.close()

async def create_ap_invoice(
    invoice_number: str,
    supplier_id: str,
    invoice_date: date,
    due_date: date,
    total_amount: float,
    tax_amount: float,
    company_id: str,
    line_items: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Create AP invoice"""
    conn = await get_db_connection()
    try:
        async with conn.transaction():
            invoice_row = await conn.fetchrow("""
                INSERT INTO ap_invoices (
                    invoice_number, supplier_id, invoice_date, due_date,
                    total_amount, tax_amount, status, company_id, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, NOW())
                RETURNING id, invoice_number, supplier_id, invoice_date, due_date,
                          total_amount, tax_amount, status, company_id, created_at
            """, invoice_number, supplier_id, invoice_date, due_date,
                 total_amount, tax_amount, company_id)
            
            invoice = dict(invoice_row)
            invoice_id = invoice['id']
            
            for item in line_items:
                await conn.execute("""
                    INSERT INTO ap_invoice_lines (
                        invoice_id, product_id, description, quantity,
                        unit_price, line_total, tax_amount, company_id
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                """, invoice_id, item.get('product_id'), item.get('description'),
                     item.get('quantity'), item.get('unit_price'), item.get('line_total'),
                     item.get('tax_amount'), company_id)
            
            return invoice
    finally:
        await conn.close()

# ========================================
# ========================================

async def create_gl_account(
    code: str,
    name: str,
    account_type: str,
    company_id: str,
    parent_code: Optional[str] = None,
    description: Optional[str] = None
) -> Dict[str, Any]:
    """Create GL account"""
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow("""
            INSERT INTO chart_of_accounts (
                code, name, account_type, parent_code, description,
                company_id, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW())
            RETURNING id, code, name, account_type, parent_code, description,
                      company_id, status, created_at
        """, code, name, account_type, parent_code, description, company_id)
        
        return dict(row)
    finally:
        await conn.close()

async def create_journal_entry(
    entry_number: str,
    entry_date: date,
    description: str,
    company_id: str,
    line_items: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Create journal entry with line items"""
    conn = await get_db_connection()
    try:
        async with conn.transaction():
            total_debit = sum(item.get('debit', 0) for item in line_items)
            total_credit = sum(item.get('credit', 0) for item in line_items)
            
            if abs(total_debit - total_credit) > 0.01:
                raise ValueError(f"Debits ({total_debit}) must equal credits ({total_credit})")
            
            entry_row = await conn.fetchrow("""
                INSERT INTO journal_entries (
                    entry_number, entry_date, description, status,
                    company_id, created_at
                ) VALUES ($1, $2, $3, 'draft', $4, NOW())
                RETURNING id, entry_number, entry_date, description, status,
                          company_id, created_at
            """, entry_number, entry_date, description, company_id)
            
            entry = dict(entry_row)
            entry_id = entry['id']
            
            for item in line_items:
                await conn.execute("""
                    INSERT INTO journal_entry_lines (
                        entry_id, account_code, description, debit, credit,
                        company_id
                    ) VALUES ($1, $2, $3, $4, $5, $6)
                """, entry_id, item.get('account_code'), item.get('description'),
                     item.get('debit', 0), item.get('credit', 0), company_id)
            
            return entry
    finally:
        await conn.close()

async def post_journal_entry(entry_id: str) -> Dict[str, Any]:
    """Post journal entry to GL"""
    conn = await get_db_connection()
    try:
        async with conn.transaction():
            await conn.execute("""
                UPDATE journal_entries
                SET status = 'posted', posted_at = NOW()
                WHERE id = $1
            """, entry_id)
            
            entry_row = await conn.fetchrow("""
                SELECT id, entry_number, entry_date, description, status,
                       company_id, created_at, posted_at
                FROM journal_entries
                WHERE id = $1
            """, entry_id)
            
            return dict(entry_row)
    finally:
        await conn.close()

# ========================================
# ========================================

async def create_product(
    code: str,
    name: str,
    unit_price: float,
    company_id: str,
    category_id: Optional[str] = None,
    description: Optional[str] = None,
    unit_of_measure: Optional[str] = None
) -> Dict[str, Any]:
    """Create product"""
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow("""
            INSERT INTO products (
                code, name, description, unit_price, unit_of_measure,
                category_id, company_id, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW())
            RETURNING id, code, name, description, unit_price, unit_of_measure,
                      category_id, company_id, status, created_at
        """, code, name, description, unit_price, unit_of_measure,
             category_id, company_id)
        
        return dict(row)
    finally:
        await conn.close()

async def get_product(product_id: str) -> Optional[Dict[str, Any]]:
    """Get product by ID"""
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow("""
            SELECT id, code, name, description, unit_price, unit_of_measure,
                   category_id, company_id, status, created_at
            FROM products
            WHERE id = $1
        """, product_id)
        
        return dict(row) if row else None
    finally:
        await conn.close()

# ========================================
# ========================================

async def create_sales_order(
    order_number: str,
    customer_id: str,
    order_date: date,
    total_amount: float,
    company_id: str,
    line_items: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Create sales order"""
    conn = await get_db_connection()
    try:
        async with conn.transaction():
            order_row = await conn.fetchrow("""
                INSERT INTO sales_orders (
                    order_number, customer_id, order_date, total_amount,
                    status, company_id, created_at
                ) VALUES ($1, $2, $3, $4, 'draft', $5, NOW())
                RETURNING id, order_number, customer_id, order_date, total_amount,
                          status, company_id, created_at
            """, order_number, customer_id, order_date, total_amount, company_id)
            
            order = dict(order_row)
            order_id = order['id']
            
            for item in line_items:
                await conn.execute("""
                    INSERT INTO sales_order_lines (
                        order_id, product_id, description, quantity,
                        unit_price, line_total, company_id
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                """, order_id, item.get('product_id'), item.get('description'),
                     item.get('quantity'), item.get('unit_price'), item.get('line_total'),
                     company_id)
            
            return order
    finally:
        await conn.close()

async def approve_sales_order(order_id: str) -> Dict[str, Any]:
    """Approve sales order"""
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow("""
            UPDATE sales_orders
            SET status = 'approved', approved_at = NOW()
            WHERE id = $1
            RETURNING id, order_number, customer_id, order_date, total_amount,
                      status, company_id, created_at, approved_at
        """, order_id)
        
        return dict(row)
    finally:
        await conn.close()

# ========================================
# ========================================

async def create_delivery(
    delivery_number: str,
    sales_order_id: str,
    delivery_date: date,
    company_id: str,
    line_items: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Create delivery"""
    conn = await get_db_connection()
    try:
        async with conn.transaction():
            delivery_row = await conn.fetchrow("""
                INSERT INTO deliveries (
                    delivery_number, sales_order_id, delivery_date,
                    status, company_id, created_at
                ) VALUES ($1, $2, $3, 'pending', $4, NOW())
                RETURNING id, delivery_number, sales_order_id, delivery_date,
                          status, company_id, created_at
            """, delivery_number, sales_order_id, delivery_date, company_id)
            
            delivery = dict(delivery_row)
            delivery_id = delivery['id']
            
            for item in line_items:
                await conn.execute("""
                    INSERT INTO delivery_lines (
                        delivery_id, product_id, quantity, company_id
                    ) VALUES ($1, $2, $3, $4)
                """, delivery_id, item.get('product_id'), item.get('quantity'), company_id)
            
            return delivery
    finally:
        await conn.close()

async def ship_delivery(delivery_id: str) -> Dict[str, Any]:
    """Ship delivery"""
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow("""
            UPDATE deliveries
            SET status = 'shipped', shipped_at = NOW()
            WHERE id = $1
            RETURNING id, delivery_number, sales_order_id, delivery_date,
                      status, company_id, created_at, shipped_at
        """, delivery_id)
        
        return dict(row)
    finally:
        await conn.close()

# ========================================
# ========================================

async def execute_query(query: str, *args) -> List[Dict[str, Any]]:
    """Execute a query and return results"""
    conn = await get_db_connection()
    try:
        rows = await conn.fetch(query, *args)
        return [dict(row) for row in rows]
    finally:
        await conn.close()

async def execute_one(query: str, *args) -> Optional[Dict[str, Any]]:
    """Execute a query and return one result"""
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow(query, *args)
        return dict(row) if row else None
    finally:
        await conn.close()

async def execute_update(query: str, *args) -> int:
    """Execute an update/insert/delete query"""
    conn = await get_db_connection()
    try:
        result = await conn.execute(query, *args)
        return int(result.split()[-1]) if result else 0
    finally:
        await conn.close()
