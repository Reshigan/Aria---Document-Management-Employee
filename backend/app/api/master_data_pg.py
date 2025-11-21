"""
ARIA ERP - Master Data Module (PostgreSQL)
Provides full CRUD operations for Customers, Suppliers, Products
Matches frontend API contract: /erp/master-data/*
"""

from fastapi import APIRouter, HTTPException, Path, Depends, Body, Query
from typing import Dict, Any, List, Optional
import psycopg2
import psycopg2.extras
import os
import uuid

from core.auth import get_current_user

DATABASE_URL = os.getenv("DATABASE_URL_PG") or os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL_PG or DATABASE_URL environment variable must be set")

def get_connection():
    """Get PostgreSQL database connection"""
    return psycopg2.connect(DATABASE_URL)

# ========================================
# ========================================

customers_router = APIRouter(prefix="/api/erp/master-data/customers", tags=["Master Data Customers"])

@customers_router.get("")
async def list_customers(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(50, ge=1, le=1000, description="Items per page"),
    sort: Optional[str] = Query("customer_name", description="Sort field"),
    current_user: Dict = Depends(get_current_user)
):
    """List all customers with pagination, search, and sorting"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        count_query = "SELECT COUNT(*) FROM customers WHERE company_id = %s"
        count_params = [company_id]
        
        if search:
            count_query += " AND (customer_name ILIKE %s OR customer_code ILIKE %s OR email ILIKE %s)"
            search_pattern = f"%{search}%"
            count_params.extend([search_pattern, search_pattern, search_pattern])
        
        cursor.execute(count_query, count_params)
        total_count = cursor.fetchone()['count']
        
        query = """
            SELECT id, customer_code, customer_name, email, phone, address, 
                   credit_limit, payment_terms, tax_number, created_at, updated_at
            FROM customers
            WHERE company_id = %s
        """
        params = [company_id]
        
        if search:
            query += " AND (customer_name ILIKE %s OR customer_code ILIKE %s OR email ILIKE %s)"
            search_pattern = f"%{search}%"
            params.extend([search_pattern, search_pattern, search_pattern])
        
        valid_sort_fields = ['customer_name', 'customer_code', 'created_at', 'updated_at']
        sort_field = sort if sort in valid_sort_fields else 'customer_name'
        query += f" ORDER BY {sort_field}"
        
        # Apply pagination
        offset = (page - 1) * page_size
        query += " LIMIT %s OFFSET %s"
        params.extend([page_size, offset])
        
        cursor.execute(query, params)
        customers = cursor.fetchall()
        
        result = []
        for customer in customers:
            result.append({
                'id': str(customer['id']),
                'code': customer['customer_code'],
                'customer_code': customer['customer_code'],
                'name': customer['customer_name'],
                'customer_name': customer['customer_name'],
                'email': customer['email'],
                'phone': customer.get('phone'),
                'address': customer.get('address'),
                'credit_limit': float(customer['credit_limit']) if customer.get('credit_limit') else 0.0,
                'payment_terms': customer.get('payment_terms'),
                'tax_number': customer.get('tax_number'),
                'created_at': customer['created_at'].isoformat() if customer.get('created_at') else None,
                'updated_at': customer['updated_at'].isoformat() if customer.get('updated_at') else None
            })
        
        return {
            "data": result,
            "meta": {
                "page": page,
                "page_size": page_size,
                "total_count": total_count,
                "total_pages": (total_count + page_size - 1) // page_size
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@customers_router.get("/{customer_id}")
async def get_customer(
    customer_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single customer"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT c.*,
                   (SELECT COUNT(*) FROM quotes WHERE customer_id = c.id) as total_quotes,
                   (SELECT COUNT(*) FROM sales_orders WHERE customer_id = c.id) as total_orders,
                   (SELECT COALESCE(SUM(total_amount), 0) FROM customer_invoices WHERE customer_id = c.id AND status = 'posted') as total_revenue
            FROM customers c
            WHERE c.id = %s AND c.company_id = %s
        """, (customer_id, company_id))
        
        customer = cursor.fetchone()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        return {
            'id': str(customer['id']),
            'customer_code': customer['customer_code'],
            'customer_name': customer['customer_name'],
            'email': customer['email'],
            'phone': customer.get('phone'),
            'address': customer.get('address'),
            'credit_limit': float(customer['credit_limit']) if customer.get('credit_limit') else 0.0,
            'payment_terms': customer.get('payment_terms'),
            'tax_number': customer.get('tax_number'),
            'total_quotes': customer.get('total_quotes', 0),
            'total_orders': customer.get('total_orders', 0),
            'total_revenue': float(customer.get('total_revenue', 0)),
            'created_at': customer['created_at'].isoformat() if customer.get('created_at') else None,
            'updated_at': customer['updated_at'].isoformat() if customer.get('updated_at') else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@customers_router.post("")
async def create_customer(
    customer_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new customer"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        customer_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO customers (id, company_id, customer_code, customer_name, email, phone, address, credit_limit, payment_terms, tax_number, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, customer_code, customer_name
        """, (customer_id, company_id, customer_data.get('customer_code'), customer_data.get('customer_name'), 
              customer_data.get('email'), customer_data.get('phone'), customer_data.get('address'),
              customer_data.get('credit_limit', 0), customer_data.get('payment_terms'), customer_data.get('tax_number')))
        
        result = cursor.fetchone()
        conn.commit()
        return {'id': str(result['id']), 'customer_code': result['customer_code'], 'customer_name': result['customer_name']}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@customers_router.put("/{customer_id}")
async def update_customer(
    customer_id: str = Path(...),
    customer_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Update a customer"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            UPDATE customers
            SET customer_name = %s, email = %s, phone = %s, address = %s, 
                credit_limit = %s, payment_terms = %s, tax_number = %s, updated_at = NOW()
            WHERE id = %s AND company_id = %s
        """, (customer_data.get('customer_name'), customer_data.get('email'), customer_data.get('phone'),
              customer_data.get('address'), customer_data.get('credit_limit'), customer_data.get('payment_terms'),
              customer_data.get('tax_number'), customer_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        conn.commit()
        return {"message": "Customer updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@customers_router.delete("/{customer_id}")
async def delete_customer(
    customer_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a customer"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("DELETE FROM customers WHERE id = %s AND company_id = %s", (customer_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        conn.commit()
        return {"message": "Customer deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

# ========================================
# ========================================

suppliers_router = APIRouter(prefix="/api/erp/master-data/suppliers", tags=["Master Data Suppliers"])

@suppliers_router.get("")
async def list_suppliers(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(50, ge=1, le=1000, description="Items per page"),
    sort: Optional[str] = Query("supplier_name", description="Sort field"),
    current_user: Dict = Depends(get_current_user)
):
    """List all suppliers with pagination, search, and sorting"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        count_query = "SELECT COUNT(*) FROM suppliers WHERE company_id = %s"
        count_params = [company_id]
        
        if search:
            count_query += " AND (supplier_name ILIKE %s OR supplier_code ILIKE %s OR email ILIKE %s)"
            search_pattern = f"%{search}%"
            count_params.extend([search_pattern, search_pattern, search_pattern])
        
        cursor.execute(count_query, count_params)
        total_count = cursor.fetchone()['count']
        
        query = """
            SELECT id, supplier_code, supplier_name, email, phone, address,
                   payment_terms, tax_number, created_at, updated_at
            FROM suppliers
            WHERE company_id = %s
        """
        params = [company_id]
        
        if search:
            query += " AND (supplier_name ILIKE %s OR supplier_code ILIKE %s OR email ILIKE %s)"
            search_pattern = f"%{search}%"
            params.extend([search_pattern, search_pattern, search_pattern])
        
        valid_sort_fields = ['supplier_name', 'supplier_code', 'created_at', 'updated_at']
        sort_field = sort if sort in valid_sort_fields else 'supplier_name'
        query += f" ORDER BY {sort_field}"
        
        offset = (page - 1) * page_size
        query += " LIMIT %s OFFSET %s"
        params.extend([page_size, offset])
        
        cursor.execute(query, params)
        suppliers = cursor.fetchall()
        
        result = []
        for supplier in suppliers:
            result.append({
                'id': str(supplier['id']),
                'code': supplier['supplier_code'],
                'supplier_code': supplier['supplier_code'],
                'name': supplier['supplier_name'],
                'supplier_name': supplier['supplier_name'],
                'email': supplier['email'],
                'phone': supplier.get('phone'),
                'address': supplier.get('address'),
                'payment_terms': supplier.get('payment_terms'),
                'tax_number': supplier.get('tax_number'),
                'created_at': supplier['created_at'].isoformat() if supplier.get('created_at') else None,
                'updated_at': supplier['updated_at'].isoformat() if supplier.get('updated_at') else None
            })
        
        return {
            "data": result,
            "meta": {
                "page": page,
                "page_size": page_size,
                "total_count": total_count,
                "total_pages": (total_count + page_size - 1) // page_size
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@suppliers_router.get("/{supplier_id}")
async def get_supplier(
    supplier_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single supplier"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT s.*,
                   (SELECT COUNT(*) FROM purchase_orders WHERE supplier_id = s.id) as total_orders,
                   (SELECT COALESCE(SUM(total_amount), 0) FROM supplier_invoices WHERE supplier_id = s.id) as total_spend
            FROM suppliers s
            WHERE s.id = %s AND s.company_id = %s
        """, (supplier_id, company_id))
        
        supplier = cursor.fetchone()
        if not supplier:
            raise HTTPException(status_code=404, detail="Supplier not found")
        
        return {
            'id': str(supplier['id']),
            'supplier_code': supplier['supplier_code'],
            'supplier_name': supplier['supplier_name'],
            'email': supplier['email'],
            'phone': supplier.get('phone'),
            'address': supplier.get('address'),
            'payment_terms': supplier.get('payment_terms'),
            'tax_number': supplier.get('tax_number'),
            'total_orders': supplier.get('total_orders', 0),
            'total_spend': float(supplier.get('total_spend', 0)),
            'created_at': supplier['created_at'].isoformat() if supplier.get('created_at') else None,
            'updated_at': supplier['updated_at'].isoformat() if supplier.get('updated_at') else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@suppliers_router.post("")
async def create_supplier(
    supplier_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new supplier"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        supplier_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO suppliers (id, company_id, supplier_code, supplier_name, email, phone, address, payment_terms, tax_number, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, supplier_code, supplier_name
        """, (supplier_id, company_id, supplier_data.get('supplier_code'), supplier_data.get('supplier_name'),
              supplier_data.get('email'), supplier_data.get('phone'), supplier_data.get('address'),
              supplier_data.get('payment_terms'), supplier_data.get('tax_number')))
        
        result = cursor.fetchone()
        conn.commit()
        return {'id': str(result['id']), 'supplier_code': result['supplier_code'], 'supplier_name': result['supplier_name']}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

# ========================================
# ========================================

products_router = APIRouter(prefix="/api/erp/order-to-cash/products", tags=["Master Data Products"])

@products_router.get("")
async def list_products(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(50, ge=1, le=1000, description="Items per page"),
    sort: Optional[str] = Query("product_name", description="Sort field"),
    current_user: Dict = Depends(get_current_user)
):
    """List all products with pagination, search, and sorting"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        count_query = "SELECT COUNT(*) FROM products WHERE company_id = %s"
        count_params = [company_id]
        
        if search:
            count_query += " AND (product_name ILIKE %s OR product_code ILIKE %s OR description ILIKE %s)"
            search_pattern = f"%{search}%"
            count_params.extend([search_pattern, search_pattern, search_pattern])
        
        cursor.execute(count_query, count_params)
        total_count = cursor.fetchone()['count']
        
        query = """
            SELECT id, product_code, product_name, description, unit_of_measure,
                   selling_price, cost_price, tax_rate, is_active, created_at, updated_at
            FROM products
            WHERE company_id = %s
        """
        params = [company_id]
        
        if search:
            query += " AND (product_name ILIKE %s OR product_code ILIKE %s OR description ILIKE %s)"
            search_pattern = f"%{search}%"
            params.extend([search_pattern, search_pattern, search_pattern])
        
        valid_sort_fields = ['product_name', 'product_code', 'selling_price', 'created_at', 'updated_at']
        sort_field = sort if sort in valid_sort_fields else 'product_name'
        query += f" ORDER BY {sort_field}"
        
        offset = (page - 1) * page_size
        query += " LIMIT %s OFFSET %s"
        params.extend([page_size, offset])
        
        cursor.execute(query, params)
        products = cursor.fetchall()
        
        result = []
        for product in products:
            result.append({
                'id': str(product['id']),
                'code': product['product_code'],
                'product_code': product['product_code'],
                'name': product['product_name'],
                'product_name': product['product_name'],
                'description': product.get('description'),
                'unit_of_measure': product.get('unit_of_measure', 'EA'),
                'selling_price': float(product['selling_price']) if product.get('selling_price') else 0.0,
                'cost_price': float(product['cost_price']) if product.get('cost_price') else 0.0,
                'tax_rate': float(product.get('tax_rate', 0)),
                'is_active': product.get('is_active', True),
                'created_at': product['created_at'].isoformat() if product.get('created_at') else None,
                'updated_at': product['updated_at'].isoformat() if product.get('updated_at') else None
            })
        
        return {
            "data": result,
            "meta": {
                "page": page,
                "page_size": page_size,
                "total_count": total_count,
                "total_pages": (total_count + page_size - 1) // page_size
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@products_router.get("/{product_id}")
async def get_product(
    product_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single product"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT * FROM products
            WHERE id = %s AND company_id = %s
        """, (product_id, company_id))
        
        product = cursor.fetchone()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        return {
            'id': str(product['id']),
            'product_code': product['product_code'],
            'product_name': product['product_name'],
            'description': product.get('description'),
            'unit_of_measure': product.get('unit_of_measure', 'EA'),
            'selling_price': float(product['selling_price']) if product.get('selling_price') else 0.0,
            'cost_price': float(product['cost_price']) if product.get('cost_price') else 0.0,
            'tax_rate': float(product.get('tax_rate', 0)),
            'is_active': product.get('is_active', True),
            'created_at': product['created_at'].isoformat() if product.get('created_at') else None,
            'updated_at': product['updated_at'].isoformat() if product.get('updated_at') else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@products_router.post("")
async def create_product(
    product_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new product"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        product_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO products (id, company_id, product_code, product_name, description, unit_of_measure, selling_price, cost_price, tax_rate, is_active, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, product_code, product_name
        """, (product_id, company_id, product_data.get('product_code'), product_data.get('product_name'),
              product_data.get('description'), product_data.get('unit_of_measure', 'EA'),
              product_data.get('selling_price', 0), product_data.get('cost_price', 0),
              product_data.get('tax_rate', 0), product_data.get('is_active', True)))
        
        result = cursor.fetchone()
        conn.commit()
        return {'id': str(result['id']), 'product_code': result['product_code'], 'product_name': result['product_name']}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()
