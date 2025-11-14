"""
Tool definitions and implementations for Ask Aria
These tools allow the LLM to interact with the ERP system
"""
import uuid
from typing import Dict, List, Any, Optional
import psycopg2
import psycopg2.extras
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class ERPTools:
    """ERP operation tools for Ask Aria conversational AI"""
    
    def __init__(self, db_connection_string: str):
        self.db_connection_string = db_connection_string
    
    def get_connection(self):
        """Get database connection"""
        return psycopg2.connect(self.db_connection_string)
    
    def list_customers(self, company_id: str, search: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
        """List customers for the company"""
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    if search:
                        cur.execute("""
                            SELECT id, name, email, phone, address, city, country
                            FROM customers
                            WHERE company_id = %s 
                            AND (name ILIKE %s OR email ILIKE %s)
                            ORDER BY name
                            LIMIT %s
                        """, (company_id, f"%{search}%", f"%{search}%", limit))
                    else:
                        cur.execute("""
                            SELECT id, name, email, phone, address, city, country
                            FROM customers
                            WHERE company_id = %s
                            ORDER BY name
                            LIMIT %s
                        """, (company_id, limit))
                    
                    results = cur.fetchall()
                    return [dict(row) for row in results]
        except Exception as e:
            logger.error(f"Failed to list customers: {str(e)}")
            return []
    
    def list_products(self, company_id: str, search: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """List products for the company"""
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    if search:
                        cur.execute("""
                            SELECT id, sku, name, description, unit_price, unit_of_measure, category
                            FROM products
                            WHERE company_id = %s 
                            AND (name ILIKE %s OR sku ILIKE %s OR description ILIKE %s)
                            AND is_active = true
                            ORDER BY name
                            LIMIT %s
                        """, (company_id, f"%{search}%", f"%{search}%", f"%{search}%", limit))
                    else:
                        cur.execute("""
                            SELECT id, sku, name, description, unit_price, unit_of_measure, category
                            FROM products
                            WHERE company_id = %s AND is_active = true
                            ORDER BY name
                            LIMIT %s
                        """, (company_id, limit))
                    
                    results = cur.fetchall()
                    return [dict(row) for row in results]
        except Exception as e:
            logger.error(f"Failed to list products: {str(e)}")
            return []
    
    def create_quote_draft(
        self,
        company_id: str,
        customer_id: str,
        valid_until: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a draft quote"""
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    quote_id = str(uuid.uuid4())
                    
                    if not valid_until:
                        valid_until = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
                    
                    cur.execute("""
                        SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM 9) AS INTEGER)), 0) + 1 as next_num
                        FROM quotes
                        WHERE company_id = %s AND quote_number LIKE 'QT-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-%'
                    """, (company_id,))
                    next_num = cur.fetchone()['next_num']
                    quote_number = f"QT-{datetime.now().year}-{next_num:05d}"
                    
                    cur.execute("""
                        INSERT INTO quotes 
                        (id, company_id, customer_id, quote_number, quote_date, valid_until, 
                         status, subtotal, tax_amount, total_amount, notes)
                        VALUES (%s, %s, %s, %s, CURRENT_DATE, %s, 'draft', 0, 0, 0, %s)
                        RETURNING id, quote_number, quote_date, valid_until, status
                    """, (quote_id, company_id, customer_id, quote_number, valid_until, notes))
                    
                    result = cur.fetchone()
                    conn.commit()
                    
                    logger.info(f"Created draft quote {quote_number}")
                    return dict(result)
        except Exception as e:
            logger.error(f"Failed to create quote draft: {str(e)}")
            raise
    
    def add_quote_line(
        self,
        quote_id: str,
        product_id: str,
        quantity: float,
        unit_price: Optional[float] = None,
        discount_percent: float = 0.0,
        tax_rate: float = 0.15
    ) -> Dict[str, Any]:
        """Add a line item to a quote"""
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    if unit_price is None:
                        cur.execute("SELECT unit_price FROM products WHERE id = %s", (product_id,))
                        product = cur.fetchone()
                        if not product:
                            raise ValueError(f"Product {product_id} not found")
                        unit_price = float(product['unit_price'])
                    
                    line_id = str(uuid.uuid4())
                    subtotal = quantity * unit_price
                    discount_amount = subtotal * (discount_percent / 100)
                    taxable_amount = subtotal - discount_amount
                    tax_amount = taxable_amount * tax_rate
                    line_total = taxable_amount + tax_amount
                    
                    cur.execute("""
                        INSERT INTO quote_lines
                        (id, quote_id, product_id, quantity, unit_price, discount_percent,
                         discount_amount, tax_rate, tax_amount, line_total)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                    """, (line_id, quote_id, product_id, quantity, unit_price, discount_percent,
                          discount_amount, tax_rate, tax_amount, line_total))
                    
                    cur.execute("""
                        UPDATE quotes
                        SET subtotal = (SELECT SUM(quantity * unit_price) FROM quote_lines WHERE quote_id = %s),
                            tax_amount = (SELECT SUM(tax_amount) FROM quote_lines WHERE quote_id = %s),
                            total_amount = (SELECT SUM(line_total) FROM quote_lines WHERE quote_id = %s)
                        WHERE id = %s
                    """, (quote_id, quote_id, quote_id, quote_id))
                    
                    conn.commit()
                    
                    logger.info(f"Added line item to quote {quote_id}")
                    return {"line_id": line_id, "line_total": line_total}
        except Exception as e:
            logger.error(f"Failed to add quote line: {str(e)}")
            raise
    
    def finalize_quote(self, quote_id: str) -> Dict[str, Any]:
        """Finalize a draft quote (change status to 'sent')"""
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        UPDATE quotes
                        SET status = 'sent'
                        WHERE id = %s AND status = 'draft'
                        RETURNING id, quote_number, total_amount, status
                    """, (quote_id,))
                    
                    result = cur.fetchone()
                    conn.commit()
                    
                    if result:
                        logger.info(f"Finalized quote {result['quote_number']}")
                        return dict(result)
                    else:
                        raise ValueError(f"Quote {quote_id} not found or not in draft status")
        except Exception as e:
            logger.error(f"Failed to finalize quote: {str(e)}")
            raise
    
    def get_quote_summary(self, quote_id: str) -> Dict[str, Any]:
        """Get quote summary with line items"""
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        SELECT q.*, c.name as customer_name, c.email as customer_email
                        FROM quotes q
                        JOIN customers c ON q.customer_id = c.id
                        WHERE q.id = %s
                    """, (quote_id,))
                    
                    quote = cur.fetchone()
                    if not quote:
                        raise ValueError(f"Quote {quote_id} not found")
                    
                    cur.execute("""
                        SELECT ql.*, p.name as product_name, p.sku as product_sku
                        FROM quote_lines ql
                        JOIN products p ON ql.product_id = p.id
                        WHERE ql.quote_id = %s
                        ORDER BY ql.created_at
                    """, (quote_id,))
                    
                    lines = cur.fetchall()
                    
                    return {
                        "quote": dict(quote),
                        "lines": [dict(line) for line in lines]
                    }
        except Exception as e:
            logger.error(f"Failed to get quote summary: {str(e)}")
            raise
    
    def list_suppliers(self, company_id: str, search: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
        """List suppliers for the company"""
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    if search:
                        cur.execute("""
                            SELECT id, name, email, phone, address, city, country
                            FROM suppliers
                            WHERE company_id = %s 
                            AND (name ILIKE %s OR email ILIKE %s)
                            ORDER BY name
                            LIMIT %s
                        """, (company_id, f"%{search}%", f"%{search}%", limit))
                    else:
                        cur.execute("""
                            SELECT id, name, email, phone, address, city, country
                            FROM suppliers
                            WHERE company_id = %s
                            ORDER BY name
                            LIMIT %s
                        """, (company_id, limit))
                    
                    results = cur.fetchall()
                    return [dict(row) for row in results]
        except Exception as e:
            logger.error(f"Failed to list suppliers: {str(e)}")
            return []
    
    def create_purchase_order_draft(
        self,
        company_id: str,
        supplier_id: str,
        delivery_date: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a draft purchase order"""
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    po_id = str(uuid.uuid4())
                    
                    if not delivery_date:
                        delivery_date = (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d")
                    
                    cur.execute("""
                        SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM 9) AS INTEGER)), 0) + 1 as next_num
                        FROM purchase_orders
                        WHERE company_id = %s AND po_number LIKE 'PO-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-%'
                    """, (company_id,))
                    next_num = cur.fetchone()['next_num']
                    po_number = f"PO-{datetime.now().year}-{next_num:05d}"
                    
                    cur.execute("""
                        INSERT INTO purchase_orders
                        (id, company_id, supplier_id, po_number, po_date, delivery_date,
                         status, subtotal, tax_amount, total_amount, notes)
                        VALUES (%s, %s, %s, %s, CURRENT_DATE, %s, 'draft', 0, 0, 0, %s)
                        RETURNING id, po_number, po_date, delivery_date, status
                    """, (po_id, company_id, supplier_id, po_number, delivery_date, notes))
                    
                    result = cur.fetchone()
                    conn.commit()
                    
                    logger.info(f"Created draft PO {po_number}")
                    return dict(result)
        except Exception as e:
            logger.error(f"Failed to create PO draft: {str(e)}")
            raise


TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "list_customers",
            "description": "List customers for the company. Use this to find customer information when creating quotes or sales orders.",
            "parameters": {
                "type": "object",
                "properties": {
                    "search": {
                        "type": "string",
                        "description": "Optional search term to filter customers by name or email"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of results to return (default 20)"
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_products",
            "description": "List products available for sale. Use this to find products when creating quotes or sales orders.",
            "parameters": {
                "type": "object",
                "properties": {
                    "search": {
                        "type": "string",
                        "description": "Optional search term to filter products by name, SKU, or description"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of results to return (default 50)"
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_quote_draft",
            "description": "Create a new draft quote for a customer. This is the first step in creating a quote.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_id": {
                        "type": "string",
                        "description": "UUID of the customer"
                    },
                    "valid_until": {
                        "type": "string",
                        "description": "Quote validity date in YYYY-MM-DD format (optional, defaults to 30 days from now)"
                    },
                    "notes": {
                        "type": "string",
                        "description": "Optional notes or terms for the quote"
                    }
                },
                "required": ["customer_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "add_quote_line",
            "description": "Add a line item (product) to a quote. Call this for each product to add to the quote.",
            "parameters": {
                "type": "object",
                "properties": {
                    "quote_id": {
                        "type": "string",
                        "description": "UUID of the quote"
                    },
                    "product_id": {
                        "type": "string",
                        "description": "UUID of the product"
                    },
                    "quantity": {
                        "type": "number",
                        "description": "Quantity of the product"
                    },
                    "unit_price": {
                        "type": "number",
                        "description": "Unit price (optional, defaults to product's standard price)"
                    },
                    "discount_percent": {
                        "type": "number",
                        "description": "Discount percentage (optional, default 0)"
                    }
                },
                "required": ["quote_id", "product_id", "quantity"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_quote_summary",
            "description": "Get a summary of a quote including all line items. Use this to show the quote details to the user for confirmation.",
            "parameters": {
                "type": "object",
                "properties": {
                    "quote_id": {
                        "type": "string",
                        "description": "UUID of the quote"
                    }
                },
                "required": ["quote_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "finalize_quote",
            "description": "Finalize a draft quote and mark it as 'sent'. Only call this after the user confirms the quote details.",
            "parameters": {
                "type": "object",
                "properties": {
                    "quote_id": {
                        "type": "string",
                        "description": "UUID of the quote to finalize"
                    }
                },
                "required": ["quote_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_suppliers",
            "description": "List suppliers for the company. Use this when creating purchase orders.",
            "parameters": {
                "type": "object",
                "properties": {
                    "search": {
                        "type": "string",
                        "description": "Optional search term to filter suppliers by name or email"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of results to return (default 20)"
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_purchase_order_draft",
            "description": "Create a new draft purchase order for a supplier.",
            "parameters": {
                "type": "object",
                "properties": {
                    "supplier_id": {
                        "type": "string",
                        "description": "UUID of the supplier"
                    },
                    "delivery_date": {
                        "type": "string",
                        "description": "Expected delivery date in YYYY-MM-DD format (optional, defaults to 14 days from now)"
                    },
                    "notes": {
                        "type": "string",
                        "description": "Optional notes for the purchase order"
                    }
                },
                "required": ["supplier_id"]
            }
        }
    }
]
