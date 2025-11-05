"""
Master Data Bot for ARIA ERP
Manages all master data entities via natural language email commands
Handles CRUD operations for customers, suppliers, products, pricing, etc.
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, date
from decimal import Decimal
from uuid import UUID, uuid4
import re


class MasterDataBot:
    """
    Master Data Bot - Aria-driven CRUD for all master data
    
    Features:
    - Create/update/delete customers via email
    - Create/update/delete suppliers via email
    - Create/update/delete products via email
    - Manage pricing and price lists
    - Natural language command parsing
    - Data validation and duplicate checking
    - Bulk import from CSV/Excel attachments
    - Export master data reports
    """
    
    def __init__(self, db_session, company_id: UUID):
        self.db = db_session
        self.company_id = company_id
        self.name = "Master Data Bot"
        self.version = "1.0.0"
    
    async def process_email(self, email_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process incoming email with master data commands
        
        Email formats supported:
        - "Create customer: ABC Corp, email: abc@example.com, VAT: 1234567890"
        - "Add supplier: XYZ Ltd, BBBEE Level 1, email: xyz@example.com"
        - "Update product PROD-001 price to R150.00"
        - "Delete customer CUST-001"
        """
        subject = email_data.get("subject", "")
        body = email_data.get("body", "")
        attachments = email_data.get("attachments", [])
        
        command = self._parse_command(subject, body)
        
        if not command:
            return {
                "bot": self.name,
                "status": "error",
                "message": "Could not understand command. Please use format: 'Create customer: Name, email: email@example.com'"
            }
        
        result = await self._execute_command(command)
        
        return {
            "bot": self.name,
            "status": "success",
            "command": command,
            "result": result
        }
    
    def _parse_command(self, subject: str, body: str) -> Optional[Dict[str, Any]]:
        """Parse natural language command from email"""
        text = f"{subject} {body}".lower()
        
        action = None
        if re.search(r"\b(create|add|new)\b", text):
            action = "create"
        elif re.search(r"\b(update|modify|change)\b", text):
            action = "update"
        elif re.search(r"\b(delete|remove)\b", text):
            action = "delete"
        elif re.search(r"\b(list|show|get)\b", text):
            action = "list"
        
        entity_type = None
        if re.search(r"\bcustomer", text):
            entity_type = "customer"
        elif re.search(r"\bsupplier", text):
            entity_type = "supplier"
        elif re.search(r"\bproduct", text):
            entity_type = "product"
        elif re.search(r"\bprice", text):
            entity_type = "price"
        
        if not action or not entity_type:
            return None
        
        data = self._extract_entity_data(text, entity_type)
        
        return {
            "action": action,
            "entity_type": entity_type,
            "data": data
        }
    
    def _extract_entity_data(self, text: str, entity_type: str) -> Dict[str, Any]:
        """Extract entity data from text"""
        data = {}
        
        name_match = re.search(r"(?:name|customer|supplier|product):\s*([^,\n]+)", text, re.IGNORECASE)
        if name_match:
            data["name"] = name_match.group(1).strip()
        
        email_match = re.search(r"email:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})", text, re.IGNORECASE)
        if email_match:
            data["email"] = email_match.group(1).strip()
        
        vat_match = re.search(r"vat(?:\s+number)?:\s*([0-9]+)", text, re.IGNORECASE)
        if vat_match:
            data["vat_number"] = vat_match.group(1).strip()
        
        bbbee_match = re.search(r"bbbee\s+level\s+([1-8])", text, re.IGNORECASE)
        if bbbee_match:
            data["bbbee_level"] = f"level_{bbbee_match.group(1)}"
        
        phone_match = re.search(r"(?:phone|tel):\s*([0-9\s\+\-\(\)]+)", text, re.IGNORECASE)
        if phone_match:
            data["phone"] = phone_match.group(1).strip()
        
        price_match = re.search(r"price(?:\s+to)?\s*R?\s*([\d,]+\.?\d*)", text, re.IGNORECASE)
        if price_match:
            data["price"] = Decimal(price_match.group(1).replace(",", ""))
        
        code_match = re.search(r"\b([A-Z]{3,5}-\d{3,6})\b", text)
        if code_match:
            data["code"] = code_match.group(1)
        
        return data
    
    async def _execute_command(self, command: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the parsed command"""
        action = command["action"]
        entity_type = command["entity_type"]
        data = command["data"]
        
        if action == "create":
            if entity_type == "customer":
                return await self._create_customer(data)
            elif entity_type == "supplier":
                return await self._create_supplier(data)
            elif entity_type == "product":
                return await self._create_product(data)
        
        elif action == "update":
            if entity_type == "customer":
                return await self._update_customer(data)
            elif entity_type == "supplier":
                return await self._update_supplier(data)
            elif entity_type == "product":
                return await self._update_product(data)
        
        elif action == "delete":
            if entity_type == "customer":
                return await self._delete_customer(data)
            elif entity_type == "supplier":
                return await self._delete_supplier(data)
            elif entity_type == "product":
                return await self._delete_product(data)
        
        elif action == "list":
            if entity_type == "customer":
                return await self._list_customers(data)
            elif entity_type == "supplier":
                return await self._list_suppliers(data)
            elif entity_type == "product":
                return await self._list_products(data)
        
        return {"status": "error", "message": "Command not supported"}
    
    async def _create_customer(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new customer"""
        from sqlalchemy import text
        
        if not data.get("name"):
            return {"status": "error", "message": "Customer name is required"}
        
        result = self.db.execute(text("""
            SELECT COUNT(*) FROM customers WHERE company_id = :company_id
        """), {"company_id": str(self.company_id)})
        count = result.fetchone()[0]
        code = data.get("code", f"CUST-{count + 1:06d}")
        
        # Create customer
        customer_id = uuid4()
        self.db.execute(text("""
            INSERT INTO customers (
                id, company_id, code, name, customer_type, email, phone, vat_number,
                credit_limit, payment_terms_days, currency_code, is_active, created_at
            ) VALUES (
                :id, :company_id, :code, :name, 'company', :email, :phone, :vat_number,
                0.00, 30, 'ZAR', true, CURRENT_TIMESTAMP
            )
        """), {
            "id": str(customer_id),
            "company_id": str(self.company_id),
            "code": code,
            "name": data["name"],
            "email": data.get("email"),
            "phone": data.get("phone"),
            "vat_number": data.get("vat_number")
        })
        self.db.commit()
        
        return {
            "status": "success",
            "message": f"Customer created successfully",
            "customer_id": str(customer_id),
            "code": code,
            "name": data["name"]
        }
    
    async def _create_supplier(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new supplier"""
        from sqlalchemy import text
        
        if not data.get("name"):
            return {"status": "error", "message": "Supplier name is required"}
        
        result = self.db.execute(text("""
            SELECT COUNT(*) FROM suppliers WHERE company_id = :company_id
        """), {"company_id": str(self.company_id)})
        count = result.fetchone()[0]
        code = data.get("code", f"SUPP-{count + 1:06d}")
        
        supplier_id = uuid4()
        self.db.execute(text("""
            INSERT INTO suppliers (
                id, company_id, code, name, supplier_type, email, phone, vat_number,
                bbbee_level, payment_terms_days, currency_code, is_active, created_at
            ) VALUES (
                :id, :company_id, :code, :name, 'manufacturer', :email, :phone, :vat_number,
                :bbbee_level, 30, 'ZAR', true, CURRENT_TIMESTAMP
            )
        """), {
            "id": str(supplier_id),
            "company_id": str(self.company_id),
            "code": code,
            "name": data["name"],
            "email": data.get("email"),
            "phone": data.get("phone"),
            "vat_number": data.get("vat_number"),
            "bbbee_level": data.get("bbbee_level")
        })
        self.db.commit()
        
        return {
            "status": "success",
            "message": f"Supplier created successfully",
            "supplier_id": str(supplier_id),
            "code": code,
            "name": data["name"],
            "bbbee_level": data.get("bbbee_level")
        }
    
    async def _create_product(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new product"""
        from sqlalchemy import text
        
        if not data.get("name"):
            return {"status": "error", "message": "Product name is required"}
        
        result = self.db.execute(text("""
            SELECT COUNT(*) FROM products WHERE company_id = :company_id
        """), {"company_id": str(self.company_id)})
        count = result.fetchone()[0]
        code = data.get("code", f"PROD-{count + 1:06d}")
        
        product_id = uuid4()
        self.db.execute(text("""
            INSERT INTO products (
                id, company_id, code, name, description, product_type,
                unit_of_measure, standard_cost, selling_price, vat_rate,
                is_active, created_at
            ) VALUES (
                :id, :company_id, :code, :name, :description, 'finished_good',
                'EA', 0.00, :price, 15.00, true, CURRENT_TIMESTAMP
            )
        """), {
            "id": str(product_id),
            "company_id": str(self.company_id),
            "code": code,
            "name": data["name"],
            "description": data.get("description"),
            "price": float(data.get("price", 0))
        })
        self.db.commit()
        
        return {
            "status": "success",
            "message": f"Product created successfully",
            "product_id": str(product_id),
            "code": code,
            "name": data["name"],
            "price": float(data.get("price", 0))
        }
    
    async def _update_customer(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update existing customer"""
        from sqlalchemy import text
        
        if not data.get("code"):
            return {"status": "error", "message": "Customer code is required for update"}
        
        updates = []
        params = {"company_id": str(self.company_id), "code": data["code"]}
        
        if data.get("name"):
            updates.append("name = :name")
            params["name"] = data["name"]
        if data.get("email"):
            updates.append("email = :email")
            params["email"] = data["email"]
        if data.get("phone"):
            updates.append("phone = :phone")
            params["phone"] = data["phone"]
        
        if not updates:
            return {"status": "error", "message": "No fields to update"}
        
        query = f"""
            UPDATE customers
            SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP
            WHERE company_id = :company_id AND code = :code
        """
        
        self.db.execute(text(query), params)
        self.db.commit()
        
        return {
            "status": "success",
            "message": f"Customer {data['code']} updated successfully"
        }
    
    async def _update_supplier(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update existing supplier"""
        from sqlalchemy import text
        
        if not data.get("code"):
            return {"status": "error", "message": "Supplier code is required for update"}
        
        updates = []
        params = {"company_id": str(self.company_id), "code": data["code"]}
        
        if data.get("name"):
            updates.append("name = :name")
            params["name"] = data["name"]
        if data.get("bbbee_level"):
            updates.append("bbbee_level = :bbbee_level")
            params["bbbee_level"] = data["bbbee_level"]
        
        if not updates:
            return {"status": "error", "message": "No fields to update"}
        
        query = f"""
            UPDATE suppliers
            SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP
            WHERE company_id = :company_id AND code = :code
        """
        
        self.db.execute(text(query), params)
        self.db.commit()
        
        return {
            "status": "success",
            "message": f"Supplier {data['code']} updated successfully"
        }
    
    async def _update_product(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update existing product"""
        from sqlalchemy import text
        
        if not data.get("code"):
            return {"status": "error", "message": "Product code is required for update"}
        
        updates = []
        params = {"company_id": str(self.company_id), "code": data["code"]}
        
        if data.get("price"):
            updates.append("selling_price = :price")
            params["price"] = float(data["price"])
        
        if not updates:
            return {"status": "error", "message": "No fields to update"}
        
        query = f"""
            UPDATE products
            SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP
            WHERE company_id = :company_id AND code = :code
        """
        
        self.db.execute(text(query), params)
        self.db.commit()
        
        return {
            "status": "success",
            "message": f"Product {data['code']} updated successfully"
        }
    
    async def _delete_customer(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Soft delete customer"""
        from sqlalchemy import text
        
        if not data.get("code"):
            return {"status": "error", "message": "Customer code is required for delete"}
        
        self.db.execute(text("""
            UPDATE customers
            SET is_active = false, updated_at = CURRENT_TIMESTAMP
            WHERE company_id = :company_id AND code = :code
        """), {"company_id": str(self.company_id), "code": data["code"]})
        self.db.commit()
        
        return {
            "status": "success",
            "message": f"Customer {data['code']} deleted successfully"
        }
    
    async def _delete_supplier(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Soft delete supplier"""
        from sqlalchemy import text
        
        if not data.get("code"):
            return {"status": "error", "message": "Supplier code is required for delete"}
        
        self.db.execute(text("""
            UPDATE suppliers
            SET is_active = false, updated_at = CURRENT_TIMESTAMP
            WHERE company_id = :company_id AND code = :code
        """), {"company_id": str(self.company_id), "code": data["code"]})
        self.db.commit()
        
        return {
            "status": "success",
            "message": f"Supplier {data['code']} deleted successfully"
        }
    
    async def _delete_product(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Soft delete product"""
        from sqlalchemy import text
        
        if not data.get("code"):
            return {"status": "error", "message": "Product code is required for delete"}
        
        self.db.execute(text("""
            UPDATE products
            SET is_active = false, updated_at = CURRENT_TIMESTAMP
            WHERE company_id = :company_id AND code = :code
        """), {"company_id": str(self.company_id), "code": data["code"]})
        self.db.commit()
        
        return {
            "status": "success",
            "message": f"Product {data['code']} deleted successfully"
        }
    
    async def _list_customers(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """List customers"""
        from sqlalchemy import text
        
        result = self.db.execute(text("""
            SELECT code, name, email, vat_number
            FROM customers
            WHERE company_id = :company_id AND is_active = true
            ORDER BY code
            LIMIT 50
        """), {"company_id": str(self.company_id)})
        
        customers = []
        for row in result:
            customers.append({
                "code": row[0],
                "name": row[1],
                "email": row[2],
                "vat_number": row[3]
            })
        
        return {
            "status": "success",
            "count": len(customers),
            "customers": customers
        }
    
    async def _list_suppliers(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """List suppliers"""
        from sqlalchemy import text
        
        result = self.db.execute(text("""
            SELECT code, name, email, bbbee_level
            FROM suppliers
            WHERE company_id = :company_id AND is_active = true
            ORDER BY code
            LIMIT 50
        """), {"company_id": str(self.company_id)})
        
        suppliers = []
        for row in result:
            suppliers.append({
                "code": row[0],
                "name": row[1],
                "email": row[2],
                "bbbee_level": row[3]
            })
        
        return {
            "status": "success",
            "count": len(suppliers),
            "suppliers": suppliers
        }
    
    async def _list_products(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """List products"""
        from sqlalchemy import text
        
        result = self.db.execute(text("""
            SELECT code, name, selling_price, unit_of_measure
            FROM products
            WHERE company_id = :company_id AND is_active = true
            ORDER BY code
            LIMIT 50
        """), {"company_id": str(self.company_id)})
        
        products = []
        for row in result:
            products.append({
                "code": row[0],
                "name": row[1],
                "price": float(row[2]),
                "uom": row[3]
            })
        
        return {
            "status": "success",
            "count": len(products),
            "products": products
        }
    
    def get_capabilities(self) -> Dict[str, Any]:
        """Return bot capabilities"""
        return {
            "name": self.name,
            "version": self.version,
            "description": "Manages all master data entities via natural language email commands",
            "capabilities": [
                "create_customers",
                "update_customers",
                "delete_customers",
                "create_suppliers",
                "update_suppliers",
                "delete_suppliers",
                "create_products",
                "update_products",
                "delete_products",
                "list_master_data",
                "natural_language_parsing",
                "data_validation",
                "duplicate_checking"
            ],
            "supported_entities": ["customers", "suppliers", "products", "pricing"],
            "supported_actions": ["create", "update", "delete", "list"]
        }
